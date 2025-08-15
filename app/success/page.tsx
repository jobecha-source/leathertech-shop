export default function SuccessPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Thanks! Payment received.</h1>
      <p style={{ marginTop: 8 }}>We’ll prepare your order and send a confirmation by email.</p>
      <a href="/" style={{ display:'inline-block', marginTop: 16, padding: '8px 12px', border:'1px solid #111', borderRadius: 8 }}>Back to shop</a>
    </main>
  );
}
