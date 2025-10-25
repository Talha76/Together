import React from 'react';
import { Shield, QrCode, Key } from 'lucide-react';

export default function ChooseMethodScreen({ onSelectMethod, onBack }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-pink-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose Setup Method</h2>
          <p className="text-gray-600 text-sm">How do you want to exchange encryption keys?</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelectMethod('qr')}
            className="w-full p-6 border-2 border-pink-200 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition text-left"
          >
            <div className="flex items-start gap-4">
              <QrCode className="w-8 h-8 text-pink-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">QR Code (Most Secure)</h3>
                <p className="text-sm text-gray-600 mb-2">Perfect Forward Secrecy</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>✓ Unique keys per session</li>
                  <li>✓ One shows QR, other scans</li>
                  <li>✓ Like Signal/WhatsApp</li>
                </ul>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectMethod('code')}
            className="w-full p-6 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition text-left"
          >
            <div className="flex items-start gap-4">
              <Key className="w-8 h-8 text-purple-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Shared Secret Code</h3>
                <p className="text-sm text-gray-600 mb-2">Simple - Both enter same code</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>✓ Easy remote setup</li>
                  <li>✓ Deterministic keys</li>
                  <li>✓ Still fully encrypted</li>
                </ul>
              </div>
            </div>
          </button>
        </div>

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
