'use client';
import { useMemo, useState } from 'react';

export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stripePriceId: string;
};

const PRODUCTS: Product[] = [
  {
    id: 'cup-washer',
    name: 'Leather Cup Washer',
    description: 'Oil/fuel resistant leather; precise ID/OD & thickness.',
    priceCents: 1000,
    stripePriceId: 'price_cup_washer_test',
    image: '/Ilemos 2.jpg',
  },
  {
    id: 'valve-leather',
    name: 'Valve Leather Disc',
    description: 'Smooth finish, controlled flatness for valves & compressors.',
    priceCents: 578,
    stripePriceId: 'price_valve_leather_test',
    image: '/Cierre valvula.jpg',
  },
  {
    id: 'leather-washer',
    name: 'Leather Washer',
    description: 'Custom die-cut washers for restoration & OEM needs.',
    priceCents: 267,
    stripePriceId: 'price_leather_washer_test',
    image: '/Racort.jpg',
  },
];
```
export type CartItem = { productId: string; qty: number };

export default function Page() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const totalCents = useMemo(() => {
    return cart.reduce((sum, item) => {
      const p = PRODUCTS.find(pr => pr.id === item.productId);
      return sum + (p ? p.priceCents * item.qty : 0);
    }, 0);
  }, [cart]);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const found = prev.find(i => i.productId === productId);
      if (found) return prev.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId, qty: 1 }];
    });
  };

  const changeQty = (productId: string, qty: number) => {
    if (qty <= 0) return setCart(prev => prev.filter(i => i.productId !== productId));
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i));
  };

  const checkout = async () => {
    if (cart.length === 0) return alert('Your cart is empty');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else throw new Error('No checkout URL received');
    } catch (err: any) {
      alert(err?.message || 'Error during checkout');
    }
  };

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: '12px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>LeatherTech Components</h1>
        <button onClick={checkout} style={{ padding: '8px 12px', border: '1px solid #222', background:'#111', color:'#fff', borderRadius: 8 }}>
          Checkout · {(totalCents/100).toFixed(2)} €
        </button>
      </header>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin:'16px 0' }}>Products</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:12 }}>
          {PRODUCTS.map(p => (
            <article key={p.id} style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
              <div style={{ aspectRatio:'4 / 3', background:'#f3f4f6', borderRadius:8, marginBottom:8, display:'grid', placeItems:'center' }}>
                <span style={{ color:'#6b7280', fontSize:12 }}>Add product photo</span>
              </div>
              <h3 style={{ fontWeight:600 }}>{p.name}</h3>
              <p style={{ color:'#6b7280', fontSize:14 }}>{p.description}</p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                <span style={{ fontWeight:700 }}>{(p.priceCents/100).toFixed(2)} €</span>
                <button onClick={() => addToCart(p.id)} style={{ padding:'6px 10px', border:'1px solid #111', borderRadius:8, background:'#fff' }}>Add to cart</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop:24 }}>
        <h2 style={{ fontSize: 18, fontWeight:700, margin:'16px 0' }}>Cart</h2>
        {cart.length === 0 ? (
          <p style={{ color:'#6b7280' }}>Your cart is empty.</p>
        ) : (
          <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12 }}>
            {cart.map(item => {
              const p = PRODUCTS.find(pr => pr.id === item.productId)!;
              return (
                <div key={item.productId} style={{ display:'grid', gridTemplateColumns:'1fr 120px 120px', gap:8, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight:600 }}>{p.name}</div>
                    <div style={{ color:'#6b7280', fontSize:12 }}>{(p.priceCents/100).toFixed(2)} € / unit</div>
                  </div>
                  <input type="number" min={0} value={item.qty} onChange={e => changeQty(item.productId, Number(e.target.value))} style={{ width:100, padding:6, border:'1px solid #e5e7eb', borderRadius:8 }} />
                  <div style={{ textAlign:'right', fontWeight:700 }}>{((p.priceCents*item.qty)/100).toFixed(2)} €</div>
                </div>
              );
            })}
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontWeight:700 }}>
              <span>Total</span>
              <span>{(totalCents/100).toFixed(2)} €</span>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
              <button onClick={checkout} style={{ padding: '10px 14px', border: '1px solid #222', background:'#111', color:'#fff', borderRadius: 8 }}>
                Pay with Stripe
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
