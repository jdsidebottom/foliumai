export default async function handler(req, res) {
  const apiKey = process.env.PLANT_ID_API_KEY;
  
  if (req.method !== 'POST') {
    return res.json({ error: 'Use POST method', method_received: req.method });
  }

  try {
    const { images } = req.body;
    
    console.log('Debug: Making Plant.id API call...');
    
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

    console.log('Plant.id status:', plantIdResponse.status);

    const responseText = await plantIdResponse.text();
    console.log('Plant.id response preview:', responseText.substring(0, 500));

    return res.json({
      debug: 'Plant.id response analysis',
      status: plantIdResponse.status,
      ok: plantIdResponse.ok,
      response_length: responseText.length,
      response_preview: responseText.substring(0, 1000),
      is_json: responseText.startsWith('{') || responseText.startsWith('['),
      content_type: plantIdResponse.headers.get('content-type'),
      api_key_exists: !!apiKey,
      api_key_length: apiKey ? apiKey.length : 0
    });

  } catch (error) {
    console.error('Debug error:', error);
    return res.json({
      debug: 'Error occurred',
      error: error.message,
      error_type: error.constructor.name
    });
  }
}
