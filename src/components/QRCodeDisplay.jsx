// src/components/QRCodeDisplay.jsx
import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ data, size = 256 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (data && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      }, (error) => {
        if (error) console.error('QR generation error:', error);
      });
    }
  }, [data, size]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded-xl shadow-lg" />
    </div>
  );
}
