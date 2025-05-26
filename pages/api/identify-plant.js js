export default async function handler(req, res) {
  // Always set JSON response headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.PLANT_ID_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    console.log('=== PLANT ID API TEST ===');
    console.log('API Key exists:', !!apiKey);
    console.log('Images array length:', images.length);

    // Step 1: Submit to Plant.id
    console.log('Submitting to Plant.id...');
    const submitResponse = await fetch('https://api.plant.id/v3/identification', {
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

    console.log('Submit status:', submitResponse.status);

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.log('Submit error:', errorText);
      return res.status(200).json({ 
        error: true,
        message: `Plant.id submission failed: ${submitResponse.status}`,
        details: errorText,
        plantName: 'Submission Failed',
        healthScore: 0
      });
    }

    const submitData = await submitResponse.json();
    const jobId = submitData.id;
    const accessToken = submitData.access_token;
    
    console.log('Job ID received:', jobId);

    // Step 2: Simple polling (only 3 attempts for testing)
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1}...`);
      
      // Wait 2 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const pollResponse = await fetch(`https://api.plant.id/v3/identification/${jobId}`, {
          method: 'GET',
          headers: {
            'Api-Key': apiKey,
            'Authorization': `Bearer ${accessToken}`
          }
        });

        console.log('Poll status:', pollResponse.status);

        if (pollResponse.ok) {
          const pollData = await pollResponse.json();
          
          // Check if we have results
          if (pollData.result && pollData.result.classification && pollData.result.classification.suggestions) {
            console.log('SUCCESS: Got plant data!');
            return res.status(200).json(pollData);
          }
        }
      } catch (pollError) {
        console.log('Poll error:', pollError.message);
      }
      
      attempts++;
    }

    // If we get here, return a timeout but still valid JSON
    console.log('TIMEOUT: Returning mock data');
    return res.status(200).json({
      error: true,
      message: 'Plant identification timed out, but API is working',
      plantName: 'Timeout - Try Again',
      healthScore: 0,
      debug: {
        jobId: jobId,
        attempts: attempts,
        note: 'Job was submitted successfully but results not ready yet'
      }
    });

  } catch (error) {
    console.error('=== API ERROR ===', error);
    
    // Always return valid JSON, even for errors
    return res.status(200).json({ 
      error: true,
      message: `Server error: ${error.message}`,
      plantName: 'Server Error',
      healthScore: 0,
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message
      }
    });
  }
}
