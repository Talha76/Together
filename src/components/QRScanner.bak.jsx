// src/components/QRScanner.jsx
import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import { Camera, X, Keyboard } from 'lucide-react';

export default function QRScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [cameraStatus, setCameraStatus] = useState('initializing');

  useEffect(() => {
    console.log('QRScanner mounted');
    console.log('getUserMedia available?', !!navigator.mediaDevices?.getUserMedia);
    
    // Test camera access immediately
    testCameraAccess();
  }, []);

  const testCameraAccess = async () => {
    try {
      setCameraStatus('requesting permission...');
      console.log('Requesting camera permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      console.log('✓ Camera permission granted!');
      console.log('Stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      
      setCameraStatus('camera access granted');
      
      // Stop the test stream (QrReader will start its own)
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('✗ Camera access failed:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      
      setCameraStatus('camera access failed: ' + err.name);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera not supported. This might be due to insecure context.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Camera error: ' + err.message);
      }
    }
  };

  const handleScan = (result, error) => {
    console.log('handleScan called:', { result, error });
    
    if (result) {
      console.log('✓ QR Code detected:', result.text);
      onScan(result?.text);
    }
    
    if (error) {
      console.error('QR scan error:', error);
    }
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      console.log('Manual input submitted');
      onScan(manualInput.trim());
    }
  };

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
        <h3 className="text-lg font-bold text-gray-800">Scan QR Code</h3>
        <p className="text-sm text-gray-600">Point camera at partner's QR code</p>
      </div>

      {/* Camera Status Debug */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs">
        <p><strong>Status:</strong> {cameraStatus}</p>
        <p><strong>HTTPS:</strong> {window.location.protocol === 'https:' ? '✓ Yes' : '✗ No'}</p>
        <p><strong>getUserMedia:</strong> {navigator.mediaDevices?.getUserMedia ? '✓ Available' : '✗ Not available'}</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-800 font-semibold">{error}</p>
          <button
            onClick={() => setManualMode(true)}
            className="mt-3 w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <Keyboard className="w-4 h-4" />
            Use Manual Entry Instead
          </button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden bg-gray-900" style={{ minHeight: '300px' }}>
          <QrReader
            onResult={handleScan}
            constraints={{ 
              facingMode: 'environment',
              aspectRatio: 1
            }}
            videoId="video"
            scanDelay={300}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="text-xs text-gray-500 text-center">
          <p>📱 Hold steady and align QR code in frame</p>
          <p className="mt-1">Scanning happens automatically</p>
        </div>

        <button
          onClick={() => setManualMode(true)}
          className="w-full text-sm text-blue-600 hover:text-blue-700 py-2"
        >
          Can't scan? Use manual entry →
        </button>
      </div>
    </div>
  );
}
