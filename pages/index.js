import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Leaf, Droplets, Sun, Bug, Clock, Heart, Info, CheckCircle, Moon } from 'lucide-react';

export default function FoliumAI() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('identify');
  const [darkMode, setDarkMode] = useState(false);
  const fileInputRef = useRef(null);

  // Load dark mode preference on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('foliumai-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (typeof window !== 'undefined') {
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('foliumai-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('foliumai-theme', 'light');
      }
    }
  };

  // Image compression function
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // File validation
  const validateFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB limit
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (file.size > maxSize) {
      return { valid: false, message: 'Image too large. Please use an image smaller than 5MB.' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, message: 'Please use a JPEG, PNG, or WebP image format.' };
    }
    
    return { valid: true };
  };

  // Improved image upload handler with compression
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('=== IMAGE DEBUG ===');
      console.log('File name:', file.name);
      console.log('File type:', file.type);
      console.log('Original file size:', (file.size / 1024).toFixed(2) + 'KB');
      
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setAnalysis({
          error: true,
          message: validation.message,
          plantName: 'Invalid File',
          healthScore: 0
        });
        return;
      }
      
      // Show compression message
      setIsAnalyzing(true);
      setAnalysis({ message: 'Preparing image...' });
      
      try {
        // Compress image before processing
        const compressedImage = await compressImage(file, 800, 0.8);
        console.log('Compressed image size:', (compressedImage.length / 1024).toFixed(2) + 'KB');
        
        setSelectedImage(compressedImage);
        await analyzeImageWithAPI(compressedImage);
      } catch (error) {
        console.error('Image compression failed:', error);
        setAnalysis({
          error: true,
          message: 'Failed to process image. Please try a different photo.',
          plantName: 'Processing Failed',
          healthScore: 0
        });
        setIsAnalyzing(false);
      }
    }
  };

  // Enhanced API call with better timeout handling
  const analyzeImageWithAPI = async (imageDataUrl) => {
    setIsAnalyzing(true);
    setAnalysis({ message: 'FoliumAI is analyzing your plant...' });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const base64Image = imageDataUrl.split(',')[1];
      console.log('Base64 length being sent:', base64Image.length);

      const response = await fetch('/api/identify-plant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [base64Image]
        }),
        signal: controller.signal // Add abort signal
      });

      clearTimeout(timeoutId); // Clear timeout if request completes

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      
      const processedAnalysis = processPlantIdResponse(data);
      setAnalysis(processedAnalysis);

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error calling identification API:', error);
      
      let errorMessage = 'Unable to identify plant. Please try again.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try with a smaller image or check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'The plant identification service is taking too long. Please try again in a moment.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setAnalysis({
        error: true,
        message: errorMessage,
        plantName: 'Identification Failed',
        healthScore: 0,
        retry: true // Add retry flag
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processPlantIdResponse = (data) => {
    // Handle error responses from our API
    if (data.error) {
      return {
        error: true,
        message: data.message || 'Plant identification failed',
        plantName: data.plantName || 'Error',
        healthScore: data.healthScore || 0
      };
    }

    const isPlant = data.result?.is_plant?.binary || data.result?.is_plant?.probability > 0.5 || false;
    
    if (!isPlant) {
      return {
        error: true,
        message: 'This doesn\'t appear to be a plant. Please try again with a plant image.',
        plantName: 'Not a Plant',
        healthScore: 0
      };
    }

    const suggestions = data.result?.classification?.suggestions || [];
    const topSuggestion = suggestions[0];
    
    if (!topSuggestion) {
      return {
        error: true,
        message: 'Unable to identify this plant. Try a clearer image with visible leaves.',
        plantName: 'Unidentified Plant',
        healthScore: 0
      };
    }

    const healthData = data.result?.health_assessment || {};
    const isHealthy = healthData.is_healthy?.binary !== false;
    const diseases = healthData.diseases?.suggestions || [];
    
    let healthScore = isHealthy ? 90 : 60;
    if (diseases.length > 0) {
      healthScore = Math.max(30, 90 - (diseases.length * 20));
    }

    const issues = diseases.map(disease => disease.name || 'Unknown issue');

    return {
      plantName: topSuggestion.name,
      commonName: topSuggestion.details?.common_names?.[0] || 'No common name available',
      confidence: Math.round(topSuggestion.probability * 100),
      health: isHealthy ? 'Good' : 'Needs Attention',
      healthScore: healthScore,
      issues: issues.length > 0 ? issues : ['No major issues detected'],
      care: {
        watering: 'Water when soil feels dry',
        light: 'Bright, indirect light',
        humidity: 'Moderate humidity (40-60%)',
        temperature: 'Room temperature (65-75°F)'
      },
      treatments: [
        'Ensure proper drainage',
        'Maintain consistent watering schedule',
        'Provide adequate light'
      ],
      naturalRemedies: [
        'Neem oil spray for pest prevention',
        'Cinnamon powder on soil to prevent fungal issues',
        'Banana peel tea as natural fertilizer',
        'Coffee grounds mixed with soil for acid-loving plants'
      ]
    };
  };

  const takePhoto = () => {
    fileInputRef.current.click();
  };

  const careReminders = [
    { id: 1, plant: "Monstera Deliciosa", task: "Water", due: "Tomorrow", icon: Droplets },
    { id: 2, plant: "Peace Lily", task: "Mist leaves", due: "Today", icon: Droplets },
    { id: 3, plant: "Snake Plant", task: "Check for pests", due: "In 3 days", icon: Bug },
    { id: 4, plant: "Pothos", task: "Rotate for light", due: "This week", icon: Sun }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-800 dark:to-green-900 text-white p-6 shadow-lg transition-all duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Leaf className="w-8 h-8 text-yellow-300" />
              <div>
                <h1 className="text-3xl font-bold">FoliumAI</h1>
                <p className="text-green-100 dark:text-green-200">Your intelligent plant identification companion</p>
              </div>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 group"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="w-6 h-6 text-yellow-300 group-hover:rotate-180 transition-transform duration-300" />
              ) : (
                <Moon className="w-6 h-6 text-blue-200 group-hover:rotate-12 transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 p-1 transition-all duration-300">
          <div className="flex gap-1">
            {[
              { id: 'identify', label: 'Plant ID', icon: Camera },
              { id: 'reminders', label: 'Care Reminders', icon: Clock },
              { id: 'tips', label: 'Garden Tips', icon: Info }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-green-600 dark:bg-green-700 text-white shadow-md' 
                    : 'text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plant Identification Tab */}
        {activeTab === 'identify' && (
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-all duration-300">
              <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-6 text-center">Identify Your Plant</h2>
              
              {!selectedImage ? (
                <div className="text-center">
                  <div className="border-3 border-dashed border-green-300 dark:border-green-600 rounded-xl p-12 mb-6 bg-green-50 dark:bg-gray-700/50 transition-all duration-300">
                    <Leaf className="w-16 h-16 text-green-400 dark:text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Upload a photo of your plant for instant identification and care advice</p>
                    
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={takePhoto}
                        className="flex items-center gap-2 bg-green-600 dark:bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-300"
                      >
                        <Camera className="w-5 h-5" />
                        Take Photo
                      </button>
                      <button
                        onClick={() => fileInputRef.current.click()}
                        className="flex items-center gap-2 bg-yellow-500 dark:bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 dark:hover:bg-yellow-500 transition-colors duration-300"
                      >
                        <Upload className="w-5 h-5" />
                        Upload Image
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <img 
                    src={selectedImage} 
                    alt="Uploaded plant" 
                    className="max-w-md mx-auto rounded-lg shadow-lg mb-6"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setAnalysis(null);
                    }}
                    className="bg-gray-500 dark:bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors duration-300"
                  >
                    Upload Different Image
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                capture="environment"
              />
            </div>

            {/* Analysis Results */}
            {(isAnalyzing || analysis) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-all duration-300">
                {isAnalyzing ? (
                  <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-green-200 dark:border-green-700 border-t-green-600 dark:border-t-green-400 rounded-full mx-auto mb-4"></div>
                    <p className="text-green-700 dark:text-green-300 font-medium">
                      {analysis?.message || 'FoliumAI is analyzing your plant...'}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                      This may take up to 30 seconds
                    </p>
                    <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs mx-auto">
                      <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                  </div>
                ) : analysis && (
                  <div className="space-y-6">
                    {analysis.error ? (
                      // Error State
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center transition-all duration-300">
                        <div className="text-red-600 dark:text-red-400 text-xl font-bold mb-2">⚠️ {analysis.plantName}</div>
                        <p className="text-red-700 dark:text-red-300">{analysis.message}</p>
                        
                        {/* Retry Button */}
                        {analysis.retry && (
                          <div className="mt-4">
                            <button
                              onClick={() => selectedImage && analyzeImageWithAPI(selectedImage)}
                              className="bg-green-600 dark:bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-300"
                              disabled={isAnalyzing}
                            >
                              {isAnalyzing ? 'Retrying...' : 'Try Again'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Success State
                      <>
                        {/* Plant Identification */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 transition-all duration-300">
                          <div className="flex items-center gap-3 mb-4">
                            <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
                            <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Plant Identified</h3>
                            {analysis.confidence && (
                              <span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                                {analysis.confidence}% confident
                              </span>
                            )}
                          </div>
                          <h4 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-1">{analysis.plantName}</h4>
                          <p className="text-green-700 dark:text-green-300">Common name: {analysis.commonName}</p>
                        </div>

                        {/* Health Assessment */}
                        <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 rounded-lg p-6 text-white transition-all duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Heart className="w-6 h-6" />
                              <h3 className="text-xl font-bold">Health Assessment</h3>
                            </div>
                            <span className="text-2xl font-bold">{analysis.healthScore}%</span>
                          </div>
                          <div className="bg-white bg-opacity-20 rounded-full h-3 mb-4">
                            <div 
                              className="bg-yellow-300 dark:bg-yellow-400 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${analysis.healthScore}%` }}
                            ></div>
                          </div>
                          <p className="font-medium">Overall Status: {analysis.health}</p>
                        </div>

                        {/* Natural Treatments */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 transition-all duration-300">
                          <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-4">Natural Treatment Recommendations</h3>
                          <div className="grid gap-3">
                            {analysis.naturalRemedies.map((remedy, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <p className="text-green-700 dark:text-green-300">{remedy}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Care Reminders Tab */}
        {activeTab === 'reminders' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-all duration-300">
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-6">Upcoming Care Tasks</h2>
            <div className="space-y-4">
              {careReminders.map(reminder => (
                <div key={reminder.id} className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-300">
                  <reminder.icon className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <h3 className="font-medium text-green-800 dark:text-green-300">{reminder.plant}</h3>
                    <p className="text-green-600 dark:text-green-400">{reminder.task}</p>
                  </div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-800 px-3 py-1 rounded-full">
                    {reminder.due}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Garden Tips Tab */}
        {activeTab === 'tips' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-all duration-300">
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-6">Garden Tips & Natural Solutions</h2>
            <div className="grid gap-6">
              {[
                {
                  title: "Natural Pest Control",
                  content: "Mix 1 tsp dish soap with 1 quart water for aphid control. Neem oil is excellent for preventing various pests.",
                  icon: Bug
                },
                {
                  title: "Boost Humidity Naturally",
                  content: "Group plants together or place on pebble trays filled with water. This creates a micro-humid environment.",
                  icon: Droplets
                },
                {
                  title: "Homemade Fertilizer",
                  content: "Banana peels steeped in water for 24 hours make an excellent potassium-rich fertilizer for flowering plants.",
                  icon: Leaf
                }
              ].map((tip, index) => (
                <div key={index} className="flex gap-4 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg transition-all duration-300">
                  <tip.icon className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">{tip.title}</h3>
                    <p className="text-green-700 dark:text-green-400">{tip.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
    
    
