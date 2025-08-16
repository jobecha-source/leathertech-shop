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

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: SUCCESS_URL, // ideal: /success?session_id={CHECKOUT_SESSION_ID}
      cancel_url: CANCEL_URL,

      // Datos del cliente
      customer_creation: 'always',
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },

      // Envío
      shipping_address_collection: { allowed_countries: ['ES', 'PT', 'FR', 'DE', 'IT'] },
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

      // Si usas cupones:
      // allow_promotion_codes: true,

      // Si has configurado Stripe Tax correctamente:
      // automatic_tax: { enabled: true },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
