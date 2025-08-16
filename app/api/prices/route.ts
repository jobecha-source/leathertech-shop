import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const idsParam = new URL(req.url).searchParams.get('ids') || '';
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({}, { status: 200 });

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
    }

    const stripe = new Stripe(secret);
    const out: Record<string, number> = {};

    for (const id of ids) {
      const price = await stripe.prices.retrieve(id);
      out[id] = price.unit_amount ?? 0; // céntimos
    }

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'price-lookup-failed' }, { status: 500 });
  }
}

