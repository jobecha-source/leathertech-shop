import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

// Espera items: [{ priceId: string; qty: number }]
export async function POST(req: NextRequest) {
  try {
    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL;
    const CANCEL_URL = process.env.STRIPE_CANCEL_URL;

    if (!STRIPE_KEY || !SUCCESS_URL || !CANCEL_URL) {
      return NextResponse.json(
        { error: 'Config error: missing STRIPE_* envs' },
        { status: 500 },
      );
    }

    const body = await req.json();
    const items = body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    const stripe = new Stripe(STRIPE_KEY);

    // Valida cada priceId contra Stripe y construye line_items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const it of items) {
      const priceId = String(it?.priceId || '');
      const qty = Math.max(1, Number(it?.qty || 1));

      if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
        return NextResponse.json(
          { error: `Invalid priceId format: ${priceId}` },
          { status: 400 },
        );
      }

      let price: Stripe.Price;
      try {
        price = await stripe.prices.retrieve(priceId);
      } catch (e: any) {
        const msg = e?.raw?.message || e?.message || 'Stripe price lookup failed';
        return NextResponse.json(
          { error: `No such price '${priceId}' in this Stripe account/mode. ${msg}` },
          { status: 400 },
        );
      }

      if (!price.active) {
        return NextResponse.json(
          { error: `Price '${priceId}' is inactive` },
          { status: 400 },
        );
      }
      if (price.type !== 'one_time') {
        return NextResponse.json(
          { error: `Price '${priceId}' is recurring; only one-time allowed` },
          { status: 400 },
        );
      }

      line_items.push({ price: priceId, quantity: qty });
    }

    if (line_items.length === 0) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

    // ====== LISTAS DE PAÍSES ======
    const EU_UK = [
      'ES','PT','FR','DE','IT','AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR',
      'HU','IE','LV','LT','LU','MT','NL','PL','RO','SK','SI','SE','GB','IS','NO','LI','CH',
      'AD','MC','SM','VA','AL','BA','ME','MK','RS','XK',
    ] as const;

    const WIDE_LIST = [
      // Europa
      'ES','PT','FR','DE','IT','AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR',
      'HU','IE','LV','LT','LU','MT','NL','PL','RO','SK','SI','SE','GB','IS','NO','LI','CH',
      'AD','MC','SM','VA','AL','BA','ME','MK','RS','XK',
      // América
      'US','CA','MX','AR','BO','BR','CL','CO','CR','DO','EC','GT','HN','JM','NI','PA','PE','PR','PY','SV','UY','VE',
      // APAC / MENA básicos
      'AU','NZ','JP','KR','SG','HK','MY','TH','PH','VN','ID','IN','AE','SA','QA','KW','BH','OM','TR','IL','EG','MA','ZA',
    ] as const;

    // Elige la que prefieras:
    const ALLOWED = EU_UK;
    type AllowedCountry = Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
    const ALLOWED_TYPED = ALLOWED as unknown as AllowedCountry;

    // Crear sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: SUCCESS_URL, // ideal: /success?session_id={CHECKOUT_SESSION_ID}
      cancel_url: CANCEL_URL,

      // Idioma del Checkout -> 'es' (NO 'es-ES')
      locale: 'es',

      // Datos del cliente
      customer_creation: 'always',
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },

      // Envío
      shipping_address_collection: {
  allowed_countries: [
    // Europa
    'ES','PT','FR','DE','IT','AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR',
    'HU','IE','LV','LT','LU','MT','NL','PL','RO','SK','SI','SE','GB','IS','NO','LI','CH',
    'AD','MC','SM','VA','AL','BA','ME','MK','RS','XK',
    // América
    'US','CA','MX','AR','BO','BR','CL','CO','CR','DO','EC','GT','HN','JM','NI','PA','PE','PR','PY','SV','UY','VE',
    // APAC / MENA
    'AU','NZ','JP','KR','SG','HK','MY','TH','PH','VN','ID','IN',
    'AE','SA','QA','KW','BH','OM','TR','IL','EG','MA','ZA'
  ]
},

      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 500, currency: 'eur' }, // 5,00 €
            display_name: 'Envío estándar (2–5 días)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 2 },
              maximum: { unit: 'business_day', value: 5 },
            },
          },
        },
      ],

      // Campos extra opcionales
      custom_fields: [
        {
          key: 'province',
          label: { type: 'custom', custom: 'Provincia' },
          type: 'text',
          optional: true,
        },
        // { key: 'nif', label: { type: 'custom', custom: 'NIF/CIF' }, type: 'text', optional: true },
      ],

      // automatic_tax: { enabled: true }, // solo si lo has configurado
      // allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Unexpected server error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
