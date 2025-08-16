'use client';
import { useEffect, useMemo, useState } from 'react';


export type Variant = {
  id: string;
  label: string;
  stripePriceId: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  stripePriceId: string;
  image?: string;
  variants?: Variant[];   // si existe, el producto tiene medidas
};

export type CartItem = {
  productId: string;
  priceId: string;
  qty: number;
  unitPriceCents: number; // precio unitario en céntimos
  variantLabel?: string;  // p.ej. 'Ø50 mm (1.97")' (solo cuando hay medidas)
};


const PRODUCTS: Product[] = [
 {
  id: 'cup-washer',
  name: 'Leather Cup Washer',
  description: 'Leather cup washer for sprayer pumps (Hardi, Ilemo, Mañez y Lozano, Abella).',
  // priceCents y stripePriceId se ignoran cuando hay variants, pero mantenlos para compatibilidad:
  priceCents: 0,
  stripePriceId: 'price_placeholder',
  image: '/Ilemos%202.JPG',
  variants: [
    { id: 'd45', label: 'Ø45 mm (1.77")', stripePriceId: 'price_1RwS0lKpM0dEkwAqGpLvj7se' },
    { id: 'd50', label: 'Ø50 mm (1.97")', stripePriceId: 'price_1RwflJKpM0dEkwAqyfVOlu4i' },
    { id: 'd55', label: 'Ø55 mm (2.17")', stripePriceId: 'price_1RwflJKpM0dEkwAqQ2u4z7rN' },
    { id: 'd60', label: 'Ø60 mm (2.36")', stripePriceId: 'price_1RwflJKpM0dEkwAq2oDqTNbZ' },
  ],
},

  {
    id: 'valve-leather',
    name: 'Valve Leather Disc',
    description: 'Smooth finish, controlled flatness for valves & compressors.',
    priceCents: 400,
    stripePriceId: 'price_1RwS1dKpM0dEkwAqj82rF4Ea', // <-- PON AQUÍ TU price_ REAL
    image: '/Cierre%20valvula.JPG',
  },
  {
    id: 'leather-washer',
    name: 'Leather Washer',
    description: 'Custom die-cut washers for restoration & OEM needs.',
    priceCents: 400,
    stripePriceId: 'price_1RwS2iKpM0dEkwAqNgWt778n', // <-- PON AQUÍ TU price_ REAL
    image: '/Racort.JPG',
  },
  {
    id: 'leather-cone-cup', // sin espacios
    name: 'Leather cone cup',
    description: 'Cone cup for pumps/valves. Custom OD/ID.',
    priceCents: 600,
    stripePriceId: 'price_1Rwe7xKpM0dEkwAqi1ZgCkAZ', // <-- PON AQUÍ TU price_ REAL
    image: '/Sombreretes.JPG',
  },
];



export default function Page() {
  const [cart, setCart] = useState<CartItem[]>([]);
  // === PASO 3 · PRECIOS DE VARIANTES ===
const [selected, setSelected] = useState<Record<string, string>>(
  Object.fromEntries(
    PRODUCTS.map(p => [p.id, p.variants && p.variants.length ? p.variants[0].id : ''])
  )
);

const [priceMap, setPriceMap] = useState<Record<string, number>>({});
const [priceError, setPriceError] = useState<string | null>(null);

// Carga precios reales desde Stripe (vía /api/prices)
useEffect(() => {
  const allIds = PRODUCTS.flatMap(p => p.variants?.map(v => v.stripePriceId) || []);
  if (allIds.length === 0) return;

  fetch('/api/prices?ids=' + allIds.join(','))
    .then(async r => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    })
    .then(m => setPriceMap(m))
    .catch(e => {
      console.error('Price fetch failed', e);
      setPriceError('No se pudieron cargar los precios');
    });
}, []);

const getSelectedVariant = (p: Product) => {
  if (!p.variants || p.variants.length === 0) return undefined;
  const chosen = selected[p.id] || p.variants[0].id;
  return p.variants.find(v => v.id === chosen) || p.variants[0];
};

const priceText = (priceId?: string, fallbackCents = 0) => {
  if (!priceId) return (fallbackCents/100).toFixed(2) + ' €';
  if (priceMap[priceId] != null) return (priceMap[priceId] / 100).toFixed(2) + ' €';
  if (priceError) return '—';
  return '…'; // cargando
};


  const totalCents = useMemo(() => {
    return cart.reduce((sum, item) => {
      const p = PRODUCTS.find(pr => pr.id === item.productId);
      return sum + (p ? p.priceCents * item.qty : 0);
    }, 0);
  }, [cart]);

  const addToCart = (productId: string) => {
    const p = PRODUCTS.find(pr => pr.id === productId);
    if (!p) return;
    setCart(prev => {
      const found = prev.find(i => i.productId === productId);
      if (found) {
        return prev.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i);
      }
      // guardamos también el priceId de Stripe
      return [...prev, { productId, priceId: p.stripePriceId, qty: 1 }];
    });
  };

  const changeQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.productId !== productId));
    } else {
      setCart(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i));
    }
  };

  const checkout = async () => {
    if (cart.length === 0) return alert('Your cart is empty');
    try {
      // El backend espera [{ priceId, qty }]
      const payload = { items: cart.map(({ priceId, qty }) => ({ priceId, qty })) };
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Checkout failed: ${txt}`);
      }
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
      else throw new Error('No checkout URL received');
    } catch (err: any) {
      alert(err.message || 'Error during checkout');
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
              <div
                style={{
                  aspectRatio:'4 / 3',
                  background:'#f3f4f6',
                  borderRadius:8,
                  marginBottom:8,
                  overflow:'hidden',
                  display:'grid',
                  placeItems:'center'
                }}
              >
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  />
                ) : (
                  <span style={{ color:'#6b7280', fontSize:12 }}>Add product photo</span>
                )}
              </div>
              <h3 style={{ fontWeight:600 }}>{p.name}</h3>
              <p style={{ color:'#6b7280', fontSize:14 }}>{p.description}</p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                {p.variants?.length ? (
  <div style={{ margin: '8px 0' }}>
    <label style={{ fontSize:12, color:'#6b7280' }}>Size</label>
    <select
      value={selected[p.id] || p.variants[0].id}
      onChange={e => setSelected(s => ({ ...s, [p.id]: e.target.value }))}
      style={{ width:'100%', marginTop:4, padding:6, border:'1px solid #e5e7eb', borderRadius:8 }}
    >
      {p.variants.map(vr => (
        <option key={vr.id} value={vr.id}>
          {vr.label} — {priceText(vr.stripePriceId)}
        </option>
      ))}
    </select>
  </div>
) : null}

                <span style={{ fontWeight:700 }}>
  {p.variants?.length
    ? priceText(getSelectedVariant(p)?.stripePriceId)
    : (p.priceCents/100).toFixed(2) + ' €'}
</span>

                <button onClick={() => addToCart(p.id)} style={{ padding:'6px 10px', border:'1px solid #111', borderRadius:8, background:'#fff' }}>
                  Add to cart
                </button>
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
                  <input
                    type="number"
                    min={0}
                    value={item.qty}
                    onChange={e => changeQty(item.productId, Number(e.target.value))}
                    style={{ width:100, padding:6, border:'1px solid #e5e7eb', borderRadius:8 }}
                  />
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
