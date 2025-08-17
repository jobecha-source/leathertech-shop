// app/api/checkout/route.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

// --- Tipado del body que llega del frontend ---
type Body = { items: { priceId: string; qty: number }[] };

// --- Helpers para respuestas de error consistentes ---
const bad = (msg: string, code = 400) =>
  NextResponse.json({ error: msg }, { status: code });

// --- Constantes de entorno (fallan rápido si falta algo) ---
const SECRET = process.env.STRIPE_SECRET_KEY;
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL; // ej: https://tu-dominio/success?session_id={CHECKOUT_SESSION_ID}
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || 'https://example.com/';

if (!SECRET) throw new Error('Falta STRIPE_SECRET_KEY');
if (!SUCCESS_URL) throw new Error('Falta STRIPE_SUCCESS_URL');

const stripe = new Stripe(SECRET /* , { apiVersion: '2024-06-20' } */);

// --- Listas de países permitidos para dirección de envío ---
const EU_UK = [
  'ES','PT','FR','DE','IT','AT','BE','BG','HR','CY','CZ','DK','EE','FI','GR',
  'HU','IE','LV','LT','LU','MT','NL','PL','RO','SK','SI','SE','GB','IS','NO','LI','CH',
  'AD','MC','SM','VA','AL','BA','ME','MK','RS','XK',
] as const;

const GLOBAL_BÁSICA = [
  ...EU_UK,
  // América
  'US','CA','MX','AR','BO','BR','CL','CO','CR','DO','EC','GT','HN','JM','NI','PA','PE','PR','PY','SV','UY','VE',
  // APAC / MENA básicos
  'AU','NZ','JP','KR','SG','HK','MY','TH','PH','VN','ID','IN',
  'AE','SA','QA','KW','BH','OM','TR','IL','EG','MA','ZA',
] as const;

// Elige aquí: EU_UK o GLOBAL_BÁSICA
const ALLOWED = GLOBAL_BÁSICA;

type AllowedCountry =
  Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
const ALLOWED_TYPED = ALLOWED as unknown as AllowedCountry;

// --- Opciones de envío (importes en céntimos) ---
const SHIPPING_OPTIONS: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
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
  // Descomenta para añadir urgente
  // {
  //   shipping_rate_data: {
  //     type: 'fixed_amount',
  //     fixed_amount: { amount: 1200, currency: 'eur' }, // 12,00 €
  //     display_name: 'Envío urgente (24–48h)',
  //   },
  // },
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return bad('No items');
    }

    // Validamos y construimos line_items: solo priceId + quantity
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const it of body.items) {
      const priceId = String(it?.priceId || '');
      const qty = Math.max(1, Number(it?.qty || 1));

      if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
        return bad(`Invalid priceId format: ${priceId}`);
      }

      // Verificamos que el price existe y es puntual (one_time)
      let price: Stripe.Price;
      try {
        price = await stripe.prices.retrieve(priceId);
      } catch (e: any) {
        const msg = e?.raw?.message || e?.message || 'Stripe price lookup failed';
        return bad(`No such price '${priceId}' en esta cuenta/modo. ${msg}`);
      }
      if (!price.active) return bad(`Price '${priceId}' is inactive`);
      if (price.type !== 'one_time')
        return bad(`Price '${priceId}' is recurring; only one-time allowed`);

      line_items.push({ price: priceId, quantity: qty });
    }

    // Creamos la sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'pay',
      locale: 'es', // 'es' (no 'es-ES')
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      line_items,

      // Datos del cliente
      customer_creation: 'always',            // crea/asocia Customer para recibos
      billing_address_collection: 'required', // pide dirección de facturación
      phone_number_collection: { enabled: true },
      // tax_id_collection: { enabled: true }, // si quieres NIF/VAT

      // Dirección de envío y opciones
      shipping_address_collection: { allowed_countries: ALLOWED_TYPED },
      shipping_options: SHIPPING_OPTIONS,

      // Campos extra opcionales visibles en Checkout
      custom_fields: [
        {
          key: 'province',
          label: { type: 'custom', custom: 'Provincia' },
          type: 'text',
          optional: true,
        },
        // {
        //   key: 'nif',
        //   label: { type: 'custom', custom: 'NIF/CIF' },
        //   type: 'text',
        //   optional: true,
        // },
      ],

      // Opcionales
      allow_promotion_codes: true,
      // automatic_tax: { enabled: true }, // si usas Stripe Tax

      // Útil para trazabilidad en Dashboard/Webhooks
      metadata: { cart: JSON.stringify(body.items) },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Unexpected server error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
