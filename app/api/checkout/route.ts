
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
  'cup-washer': 'price_1RwONbKqzrBffaobVvlewkrf',
  'valve-leather': 'price_1RwOO2KqzrBffaob241fs0C7',
  'leather-washer': 'price_1RwOOJKqzrBffaobcI9AD0sM' ,
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
      success_url: process.env.STRIPE_SUCCESS_URL!,
      cancel_url: process.env.STRIPE_CANCEL_URL!,
      customer_creation: 'always', // crea/asocia un Customer para emails de recibo
    });


    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
