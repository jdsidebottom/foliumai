export default async function handler(req, res) {
  const apiKey = process.env.PLANT_ID_API_KEY;
  
  if (req.method !== 'POST') {
    return res.json({ 
      error: 'Use POST method', 
      method_received: req.method,
      endpoint_working: true
    });
  }

  try {
    const { images } = req.body;
    
    const plantIdResponse = await fetch('https://api.plant.id/v3/identification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({
        images: images,
        classification_level: 'all',
        similar_images: true,
        health: 'all'
      }),
    });

    const responseText = await plantIdResponse.text();

    return res.json({
      debug: 'Plant.id API test',
      api_key_exists: !!apiKey,
      plant_id_status: plantIdResponse.status,
      plant_id_ok: plantIdResponse.ok,
      response_length: responseText.length,
      response_preview: responseText.substring(0, 500),
      is_json: responseText.trim().startsWith('{'),
      content_type: plantIdResponse.headers.get('content-type')
    });

  } catch (error) {
    return res.json({
      debug: 'Error calling Plant.id',
      error: error.message,
      api_key_exists: !!apiKey
    });
  }
}
