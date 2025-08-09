const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const id = req.query.id;
    if (!id) return res.status(400).send('Missing id');

    const session = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items.data.price'] });
    if (session.payment_status !== 'paid') return res.status(200).json({ paid: false });

    const owned = session.line_items.data.map(li => li.price.id);
    const map = {
      [process.env.STRIPE_PRICE_STARTER]: 'starter',
      [process.env.STRIPE_PRICE_PRO]: 'pro',
      [process.env.STRIPE_PRICE_LINKEDIN]: 'linkedin'
    };
    const tiers = owned.map(pid => map[pid]).filter(Boolean);
    return res.status(200).json({ paid: true, tiers });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
