// src/components/QRScanner.jsx
import React, { useState, useEffect } from 'react';
import { X, Keyboard, Camera } from 'lucide-react';

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [cameraStatus, setCameraStatus] = useState('initializing');
  const [debugInfo, setDebugInfo] = useState({
    https: false,
    getUserMedia: false
  });

  useEffect(() => {
    console.log('=== QRScanner Component Mounted ===');
    
    // Check environment
    const isHttps = window.location.protocol === 'https:';
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    setDebugInfo({
      https: isHttps,
      getUserMedia: hasGetUserMedia
    });
    
    console.log('Protocol:', window.location.protocol);
    console.log('HTTPS:', isHttps);
    console.log('getUserMedia available:', hasGetUserMedia);
    
    if (!isHttps) {
      console.error('NOT HTTPS - Camera will not work!');
      setCameraStatus('error: not https');
      setError('Camera requires HTTPS connection');
      return;
    }
    
    if (!hasGetUserMedia) {
      console.error('getUserMedia not available');
      setCameraStatus('error: no getUserMedia');
      setError('Camera API not supported in this browser');
      return;
    }
    
    // Try to access camera
    testCameraAccess();
  }, []);

  const testCameraAccess = async () => {
    try {
      setCameraStatus('requesting permission...');
      console.log('>>> Requesting camera permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      console.log('✓✓✓ Camera permission GRANTED!');
      console.log('Stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      
      setCameraStatus('✓ camera access granted');
      setError(null);
      
      // Stop test stream
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.label);
        track.stop();
      });
      
    } catch (err) {
      console.error('✗✗✗ Camera access FAILED!');
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Full error:', err);
      
      setCameraStatus('✗ failed: ' + err.name);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera not supported. Make sure you are using HTTPS.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Camera error: ' + err.message);
      }
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      console.log('Manual QR data submitted');
      onScan(manualInput.trim());
    }
  };

  // Manual entry mode
  if (manualMode) {
    return (
      <div className="relative bg-white rounded-2xl p-6 max-w-md mx-auto w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-gray-100 rounded-full p-2 hover:bg-gray-200"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="text-center mb-6">
          <Keyboard className="w-12 h-12 text-purple-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">Manual Entry</h3>
          <p className="text-sm text-gray-600">Paste QR data from your partner</p>
        </div>

        <textarea
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder='Paste QR data here (e.g., {"v":1,"pk":"...", ...})'
          className="w-full h-32 px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 text-sm font-mono"
        />

        <div className="space-y-2 mt-4">
          <button
            onClick={handleManualSubmit}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition"
          >
            Submit QR Data
          </button>

          <button
            onClick={() => setManualMode(false)}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            Back to Camera
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>💡 Ask your partner to click "Copy QR Data" and send it to you</p>
        </div>
      </div>
    );
  }

  // Camera scanner mode
  return (
    <div className="relative bg-white rounded-2xl p-4 max-w-md mx-auto w-full">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
      >
        <X className="w-6 h-6 text-gray-600" />
      </button>

      <div className="text-center mb-4">
        <Camera className="w-12 h-12 text-pink-500 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-gray-800">QR Scanner Debug</h3>
        <p className="text-sm text-gray-600">Testing camera access</p>
      </div>

      {/* THIS IS THE DEBUG BOX YOU SHOULD SEE */}
      <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-sm">
        <p className="font-bold text-blue-900 mb-2">🔍 DEBUG INFO:</p>
        <p className="mb-1"><strong>Status:</strong> <span className="text-blue-700">{cameraStatus}</span></p>
        <p className="mb-1"><strong>HTTPS:</strong> {debugInfo.https ? '✅ Yes' : '❌ No'}</p>
        <p className="mb-1"><strong>getUserMedia:</strong> {debugInfo.getUserMedia ? '✅ Available' : '❌ Not available'}</p>
        <p className="mb-1"><strong>URL:</strong> <span className="text-xs break-all">{window.location.href}</span></p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-800 font-semibold mb-2">{error}</p>
          <button
            onClick={() => setManualMode(true)}
            className="mt-3 w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <Keyboard className="w-4 h-4" />
            Use Manual Entry Instead
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-green-800">
            ✅ Camera test passed! In a real scanner, camera would open here.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-600 text-center">
          Check the blue DEBUG INFO box above
        </p>
        
        <button
          onClick={() => setManualMode(true)}
          className="w-full text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-300 rounded-lg"
        >
          Switch to Manual Entry →
        </button>

        <button
          onClick={testCameraAccess}
          className="w-full text-sm text-green-600 hover:text-green-700 py-2 border border-green-300 rounded-lg"
        >
          🔄 Test Camera Again
        </button>
      </div>
    </div>
  );
}
