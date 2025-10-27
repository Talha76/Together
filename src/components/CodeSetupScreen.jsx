// src/components/CodeSetupScreen.jsx
import { Key } from 'lucide-react';

export default function CodeSetupScreen({ 
  userName, 
  sharedCode, 
  onUserNameChange, 
  onSharedCodeChange, 
  onConnect,
  onBack 
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Key className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Shared Secret Code</h2>
          <p className="text-gray-600 text-sm">Both of you enter the same code</p>
        </div>

        <div className="space-y-4">
          <div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shared Secret Code
            </label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={sharedCode}
              onChange={(e) => onSharedCodeChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Choose a strong code and share it securely (in person, phone call)
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 p-3 rounded-xl">
            <p className="text-xs text-green-800">
              <strong>🔐 Security:</strong> The code is used to derive encryption keys. Both of you will have matching keys for secure communication.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            Back
          </button>
          <button
            onClick={onConnect}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
