
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    // productId -> Stripe Price ID (modo test)
   const priceMap: Record<string, string> = {
  'cup-washer': 'price_1RwS0lKpM0dEkwAqGpLvj7se',
  'valve-leather': 'price_1RwS1dKpM0dEkwAqj82rF4Ea',
  'leather-washer': 'price_1RwS2iKpM0dEkwAqNgWt778n' ,
   'leather-cone-cup': 'price_1Rwe7xKpM0dEkwAqi1ZgCkAZ'  
};

    // 👇 SIN apiVersion
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const line_items = items
      .map((i: { productId: string; qty: number }) => ({
        price: priceMap[i.productId],
        quantity: Math.max(1, Number(i.qty || 1)),
      }))
      .filter((li) => !!li.price);

    if (line_items.length === 0) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
    }

  const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items,
  success_url: process.env.STRIPE_SUCCESS_URL!,   // ideal: ?session_id={CHECKOUT_SESSION_ID}
  cancel_url: process.env.STRIPE_CANCEL_URL!,

  // Recomendados:
  customer_creation: 'always',                    // para que Stripe tenga email/cliente
  billing_address_collection: 'required',         // pide dirección de facturación
  phone_number_collection: { enabled: true },     // pide teléfono
  tax_id_collection: { enabled: true },           // NIF/VAT si aplica
  automatic_tax: { enabled: true },               // IVA automático (configura tu negocio en Stripe)

  // Envíos (ajusta países, precio y plazos):
  shipping_address_collection: { allowed_countries: ['ES','PT','FR','DE','IT'] },
  shipping_options: [{
    shipping_rate_data: {
      type: 'fixed_amount',
      fixed_amount: { amount: 500, currency: 'eur' }, // 5,00 €
      display_name: 'Envío estándar (2–5 días)',
      delivery_estimate: {
        minimum: { unit: 'business_day', value: 2 },
        maximum: { unit: 'business_day', value: 5 },
      },
    },
  }],
});


    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
