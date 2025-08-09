const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    const body = req.body || {};
    const tiers = body.tiers;
    const priceMap = {
      starter: process.env.STRIPE_PRICE_STARTER,
      pro: process.env.STRIPE_PRICE_PRO,
      linkedin: process.env.STRIPE_PRICE_LINKEDIN
    };
    const selected = (tiers || ['starter']).map(t => priceMap[t]).filter(Boolean);
    if (!selected.length) return res.status(400).json({ error: 'No valid tiers' });

    const line_items = selected.map(pid => ({ price: pid, quantity: 1 }));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.SITE_URL || ''}/index.html#success={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || ''}/index.html#cancelled=1`,
      allow_promotion_codes: true,
      client_reference_id: (body?.utm?.campaign) || undefined,
      metadata: (()=> {
        const m = {};
        const u = body?.utm || {};
        if (u.source) m.utm_source = u.source;
        if (u.medium) m.utm_medium = u.medium;
        if (u.campaign) m.utm_campaign = u.campaign;
        if (u.term) m.utm_term = u.term;
        if (u.content) m.utm_content = u.content;
        if (body.page) m.page = body.page;
        if (body.referrer) m.referrer = body.referrer;
        return m;
      })()
    });

    try {
      if (process.env.SHEETS_WEBHOOK_URL){
        await fetch(process.env.SHEETS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.id,
            tiers: (tiers || []),
            utm: body?.utm || {},
            page: body?.page,
            referrer: body?.referrer,
            created: Date.now()
          })
        });
      }
    } catch {}

    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
