// /api/identify-plant.js - Enhanced API endpoint with timeout fixes

export default async function handler(req, res) {
  // Set headers for CORS and caching
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { images } = req.body;
    
    if (!images?.[0]) {
      return res.status(400).json({ 
        error: 'No image provided',
        message: 'Please upload an image to identify',
        plantName: 'No Image',
        healthScore: 0
      });
    }

    const base64Image = images[0];
    const imageSizeKB = (base64Image.length * 0.75) / 1024;
    
    console.log(`Processing image: ${imageSizeKB.toFixed(2)}KB`);
    
    // Reject very large images immediately
    if (imageSizeKB > 1024) { // 1MB limit
      return res.status(400).json({
        error: 'Image too large',
        message: 'Please use a smaller image (under 1MB). Try taking a new photo or compressing the image.',
        plantName: 'Image Too Large',
        healthScore: 0
      });
    }

    // UNCOMMENT THE NEXT 4 LINES TO TEST WITH MOCK DATA (bypassing Plant.id API):
    // const mockResponse = { result: { is_plant: { binary: true, probability: 0.99 }, classification: { suggestions: [{ name: "Test Plant", probability: 0.95, details: { common_names: ["Mock Plant"] } }] }, health_assessment: { is_healthy: { binary: true }, diseases: { suggestions: [] } } } };
    // console.log('Using mock response for testing');
    // return res.status(200).json(mockResponse);
    // 

    // Shorter timeout for external API (12 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('Plant.id API timeout after 12 seconds');
    }, 12000);

    console.log('Calling Plant.id API...');
    
    const apiResponse = await fetch('https://api.plant.id/v3/identification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.PLANT_ID_API_KEY
      },
      body: JSON.stringify({
        images: [base64Image],
        similar_images: true,
        plant_details: ['common_names', 'url', 'name_authority'],
        health_assessment: true
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      console.error(`Plant.id API error: ${apiResponse.status}`);
      
      // Handle specific API errors
      if (apiResponse.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests to the plant identification service. Please wait 30 seconds and try again.',
          plantName: 'Rate Limited',
          healthScore: 0
        });
      }
      
      if (apiResponse.status >= 500) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'The plant identification service is temporarily down. Please try again in a few minutes.',
          plantName: 'Service Down',
          healthScore: 0
        });
      }

      if (apiResponse.status === 402) {
        return res.status(402).json({
          error: 'API quota exceeded',
          message: 'Plant identification quota exceeded. Please check your Plant.id account.',
          plantName: 'Quota Exceeded',
          healthScore: 0
        });
      }

      throw new Error(`Plant.id API error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    console.log('Plant.id API success');
    
    // Validate response data
    if (!data || !data.result) {
      console.error('Invalid response from Plant.id API:', data);
      return res.status(502).json({
        error: 'Invalid API response',
        message: 'Received invalid data from plant identification service. Please try again.',
        plantName: 'Invalid Response',
        healthScore: 0
      });
    }
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('API Handler Error:', error.message);

    if (error.name === 'AbortError') {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'The plant identification took too long. Please try with a simpler image or check your connection.',
        plantName: 'Timeout',
        healthScore: 0
      });
    }

    if (error.message.includes('fetch') || error.message.includes('network')) {
      return res.status(503).json({
        error: 'Network error',
        message: 'Cannot connect to plant identification service. Please check your internet connection and try again.',
        plantName: 'Network Error',
        healthScore: 0
      });
    }

    if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
      return res.status(503).json({
        error: 'DNS error',
        message: 'Cannot resolve plant identification service. Please try again later.',
        plantName: 'DNS Error',
        healthScore: 0
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Identification failed',
      message: 'An unexpected error occurred. Please try again with a different image.',
      plantName: 'Error',
      healthScore: 0
    });
  }
}
