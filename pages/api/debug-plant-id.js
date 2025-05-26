export default async function handler(req, res) {
  const apiKey = process.env.PLANT_ID_API_KEY;
  
  if (req.method !== 'POST') {
    return res.json({ error: 'Use POST method' });
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
    console.log('Plant.id headers:', [...plantIdResponse.headers.entries()]);

    const responseText = await plantIdResponse.text();
    console.log('Plant.id response length:', responseText.length);
    console.log('Plant.id response preview:', responseText.substring(0, 500));

    return res.json({
      debug: 'Plant.id response analysis',
      status: plantIdResponse.status,
      ok: plantIdResponse.ok,
      headers: Object.fromEntries(plantIdResponse.headers.entries()),
      response_length: responseText.length,
      response_preview: responseText.substring(0, 1000),
      is_json: responseText.startsWith('{') || responseText.startsWith('['),
      content_type: plantIdResponse.headers.get('content-type')
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
