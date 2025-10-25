import React from 'react';
import { QrCode, Camera, CheckCircle } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

export default function QRSetupScreen({ 
  step, 
  userName, 
  qrCodeData,
  onUserNameChange,
  onGenerateQR,
  onScanQR,
  onOpenScanner,
  onComplete,
  onBack
}) {
  // QR Setup - Initial choice
  if (step === 'qr-setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <QrCode className="w-16 h-16 text-pink-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">QR Code Setup</h2>
            <p className="text-gray-600 text-sm">One generates, the other scans</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:border-pink-400"
            />
          </div>

          <div className="space-y-3">
            <button
              onClick={onGenerateQR}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition"
            >
              Generate QR Code
            </button>

            <button
              onClick={onScanQR}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition"
            >
              Scan Partner's QR Code
            </button>

            <button
              onClick={onBack}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QR Waiting - After generating
  if (step === 'qr-waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Your QR Code</h2>
            <p className="text-gray-600 text-sm">Show this to your partner to scan</p>
          </div>

          {qrCodeData && (
            <div className="bg-gray-100 p-6 rounded-xl mb-6">
              <div className="flex justify-center mb-4">
                <QRCodeDisplay data={qrCodeData} size={256} />
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeData);
                  alert('Copied to clipboard! Share with your partner.');
                }}
                className="w-full mt-3 bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600"
              >
                Copy QR Data (Backup)
              </button>
            </div>
          )}

          <div className="mb-4 text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
            <p>⏳ <strong>Next step:</strong> Wait for your partner to scan this QR code, then they'll show you their QR to scan.</p>
          </div>

          <button
            onClick={onOpenScanner}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Partner Scanned? Now Scan Theirs
          </button>
          <button
            onClick={onBack}
            className="w-full mt-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            Back
        </button>
        </div>
      </div>
    );
  }

  // QR Show Mine - After scanning theirs
  if (step === 'qr-show-mine') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Almost Done!</h2>
            <p className="text-gray-600 text-sm">Show YOUR QR code to your partner</p>
          </div>

          {qrCodeData && (
            <div className="bg-gray-100 p-6 rounded-xl mb-6">
              <div className="flex justify-center mb-4">
                <QRCodeDisplay data={qrCodeData} size={256} />
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeData);
                  alert('Copied to clipboard! Share with your partner.');
                }}
                className="w-full mt-3 bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600"
              >
                Copy QR Data (Backup)
              </button>
            </div>
          )}

          <div className="mb-4 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <p>✅ You scanned their QR code</p>
            <p>⏳ Now let them scan YOUR QR code</p>
          </div>

          <button
            onClick={onComplete}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition"
          >
            Done - Start Chatting
          </button>
        </div>
      </div>
    );
  }

  return null;
}
