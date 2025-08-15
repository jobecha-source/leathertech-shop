# LeatherTech Shop — Next.js + Stripe (ready for Vercel)

**What you get**
- Catalog of 3 products (cup washer, valve leather, leather washer)
- Cart + Stripe Checkout (test mode)
- Serverless API at `app/api/checkout/route.ts`

## Local setup
1) Install Node.js LTS from https://nodejs.org
2) In this folder:
```bash
npm install
```
3) Create `.env.local` (copy the sample below) and put your Stripe test keys
4) Run:
```bash
npm run dev
```
Open http://localhost:3000

## Env sample (.env.local)
```
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SUCCESS_URL=http://localhost:3000/success
STRIPE_CANCEL_URL=http://localhost:3000/
```

## Deploy to Vercel
- Create a repo on GitHub and push this folder
- On https://vercel.com → New Project → Import the repo
- Add the environment variables above (use your production domain or the .vercel.app URL)
- Deploy

## Replace these Stripe price IDs
Edit `app/page.tsx` and `app/api/checkout/route.ts` and replace:
- `price_cup_washer_test`
- `price_valve_leather_test`
- `price_leather_washer_test`
with your real **Price IDs** from Stripe (test mode)
