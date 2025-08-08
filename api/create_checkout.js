// api/create_checkout.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res){
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
      client_reference_id: (body && body.utm && body.utm.campaign) || undefined,
      metadata: (()=>{
        const m = {};
        if (body && body.utm){
          if (body.utm.source) m.utm_source = body.utm.source;
          if (body.utm.medium) m.utm_medium = body.utm.medium;
          if (body.utm.campaign) m.utm_campaign = body.utm.campaign;
          if (body.utm.term) m.utm_term = body.utm.term;
          if (body.utm.content) m.utm_content = body.utm.content;
        }
        if (body && body.page) m.page = body.page;
        if (body && body.referrer) m.referrer = body.referrer;
        return m;
      })()
    });

    try{
      if (process.env.SHEETS_WEBHOOK_URL){
        await fetch(process.env.SHEETS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.id,
            tiers: (tiers || []),
            utm: body && body.utm ? body.utm : {},
            page: body && body.page,
            referrer: body && body.referrer,
            created: Date.now()
          })
        });
      }
    }catch(e){ /* ignore */ }

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
