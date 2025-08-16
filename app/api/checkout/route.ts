import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

// Espera items: [{ priceId: string; qty: number }]
export async function POST(req: NextRequest) {
  try {
    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL;
    const CANCEL_URL = process.env.STRIPE_CANCEL_URL;
    if (!STRIPE_KEY || !SUCCESS_URL || !CANCEL_URL) {
      console.error('Faltan variables de entorno Stripe');
      return NextResponse.json({ error: 'Config error' }, { status: 500 });
    }

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    const stripe = new Stripe(STRIPE_KEY);

    // Validamos cada priceId contra Stripe y construimos line_items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const it of items) {
      const priceId = String(it.priceId || '');
      const qty = Math.max(1, Number(it.qty || 1));

      // Validación básica de formato
      if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
        return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 });
      }

      // Validación con Stripe: activo y de pago único
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) {
        return NextResponse.json({ error: `Inactive price: ${priceId}` }, { status: 400 });
      }
      if (price.type !== 'one_time') {
        return NextResponse.json({ error: `Recurring price not allowed: ${priceId}` }, { status: 400 });
      }

      line_items.push({ price: priceId, quantity: qty });
    }

    if (line_items.length === 0) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

 // …mantén tus imports, lectura de items y line_items…

// ====== LISTAS DE PAÍSES ======
// Opción A: Europa + UK (recomendada si vendes principalmente en Europa)
const EU_UK: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  'ES','PT','FR','DE','IT','AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR',
  'HU','IE','LV','LT','LU','MT','NL','PL','RO','SK','SI','SE','GB','IS','NO','LI','CH',
  'AD','MC','SM','VA','AL','BA','ME','MK','RS','XK'
];

// Opción B: América + Europa + parte de APAC (amplia; usa si vendes “a casi todos”)
const WIDE_LIST: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  // Europa (igual que arriba)
  'ES','PT','FR','DE','IT','AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR',
  'HU','IE','LV','LT','LU','MT','NL','PL','RO','SK','SI','SE','GB','IS','NO','LI','CH',
  'AD','MC','SM','VA','AL','BA','ME','MK','RS','XK',
  // América
  'US','CA','MX','AR','BO','BR','CL','CO','CR','DO','EC','GT','HN','JM','NI','PA','PE','PR','PY','SV','UY','VE',
  // APAC básicos
  'AU','NZ','JP','KR','SG','HK','MY','TH','PH','VN','ID','IN','AE','SA','QA','KW','BH','OM','TR','IL','EG','MA','ZA'
];

// Elige una de las dos listas:
const ALLOWED = EU_UK; // <-- cambia a WIDE_LIST si quieres más países

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items,
  success_url: process.env.STRIPE_SUCCESS_URL!,
  cancel_url: process.env.STRIPE_CANCEL_URL!,

  // Idioma del Checkout
  locale: 'es-ES',

  // Datos del cliente (mostrará nombre, email, teléfono y dirección completa)
  customer_creation: 'always',
  billing_address_collection: 'required',
  phone_number_collection: { enabled: true },

  // Dirección de envío: país + dirección completa (calle, ciudad, CP, estado/provincia si aplica)
  shipping_address_collection: { allowed_countries: ALLOWED },
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

  // Campo(s) extra opcional(es). Útil si quieres forzar “Provincia” en España o recoger NIF/DNI.
  custom_fields: [
    {
      key: 'province',
      label: { type: 'custom', custom: 'Provincia' },
      type: 'text',
      optional: true,
    },
    // Descomenta si quieres NIF/CIF:
    // {
    //   key: 'nif',
    //   label: { type: 'custom', custom: 'NIF/CIF' },
    //   type: 'text',
    //   optional: true,
    // },
  ],

  // automatic_tax: { enabled: true }, // sólo si lo has configurado en Stripe
  // allow_promotion_codes: true,
});

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
