export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    if (!process.env.OPENAI_API_KEY) return res.status(400).send('AI not configured');
    const { kind, data } = req.body || {};

    const sys = "You are an elite resume and career copy editor. Optimize for ATS, clarity, and impact. Use tight bullet verbs. Keep to one page where possible.";
    const prompt = `
Kind: ${kind}
Job title: ${data?.job_title || ""}
Target posting summary: ${data?.job_desc || ""}
Experience bullets (raw): ${data?.experience || ""}
Skills: ${data?.skills || ""}
Achievements: ${data?.achievements || ""}
Tone: confident. precise. results focused.
Output:
- If resume. Return a structured one page resume in plain text with clear sections.
- If cover. Return a concise one page cover letter.
- If linkedin. Return an About paragraph plus 5 bullet starters for latest role.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
        temperature: 0.3
      })
    });
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content || 'No output';
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
