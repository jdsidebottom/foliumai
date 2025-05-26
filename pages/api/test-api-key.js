export default async function handler(req, res) {
  const apiKey = process.env.PLANT_ID_API_KEY;
  
  return res.json({
    status: 'API endpoint is working',
    api_key_exists: !!apiKey,
    api_key_length: apiKey ? apiKey.length : 0,
    api_key_preview: apiKey ? (apiKey.substring(0, 10) + '...') : 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
}
