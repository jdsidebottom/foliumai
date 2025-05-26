import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { Camera, Upload, Leaf, Droplets, Sun, Bug, Clock, Heart, Info, CheckCircle, Moon } from 'lucide-react';

export default function FoliumAI() {
  // ALL your component code here
  
  return (
    // your JSX here
  );
}

const processPlantIdResponse = (data) => {
  // Handle Plant.id v3 response format
  const isPlant = data.result?.is_plant?.binary || data.result?.is_plant?.probability > 0.5 || false;
  
  if (!isPlant) {
    return {
      error: true,
      message: 'This doesn\'t appear to be a plant. Please try again with a plant image.',
      plantName: 'Not a Plant',
      healthScore: 0
    };
  }

  // Updated for correct Plant.id v3 response structure
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

  // Health assessment from correct API response
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

