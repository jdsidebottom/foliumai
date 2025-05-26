export default async function handler(req, res) {
  const apiKey = process.env.PLANT_ID_API_KEY;
  
  try {
    console.log('Testing Plant.id API connection...');
    
    // Make a simple test call to Plant.id
    const response = await fetch('https://api.plant.id/v3/identification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({
        images: ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="], // Tiny test image
        plant_details: ['common_names']
      }),
    });

    console.log('Plant.id response status:', response.status);
    console.log('Plant.id response headers:', [...response.headers.entries()]);

    const responseText = await response.text();
    console.log('Plant.id response length:', responseText.length);
    console.log('Plant.id response preview:', responseText.substring(0, 500));

    // Try to parse as JSON
    let jsonData = null;
    let parseError = null;
    
    try {
      if (responseText.trim()) {
        jsonData = JSON.parse(responseText);
      }
    } catch (e) {
      parseError = e.message;
    }

    return res.json({
      status: 'Plant.id test complete',
      response_status: response.status,
      response_ok: response.ok,
      response_length: responseText.length,
      response_preview: responseText.substring(0, 200),
      is_json: !!jsonData,
      parse_error: parseError,
      content_type: response.headers.get('content-type'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Plant.id test error:', error);
    return res.json({
      status: 'Plant.id test failed',
      error: error.message,
      error_type: error.constructor.name,
      timestamp: new Date().toISOString()
    });
  }
}
