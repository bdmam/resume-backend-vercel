// api/ga4_config.js
export default async function handler(req, res){
  res.status(200).json({ measurementId: process.env.GA4_ID || "" });
}
