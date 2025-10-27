// src/components/MediaViewer.jsx
import { useState, useEffect, useRef } from 'react';
import { X, Download, Loader, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export function MediaViewer({ fileMetadata, decryptedData, onClose, onDownload }) {
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (!decryptedData || !fileMetadata) return;

    try {
      const byteCharacters = atob(decryptedData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileMetadata.type });
      
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
      setIsLoading(false);
    } catch (err) {
      console.error('Error creating media URL:', err);
      setError('Failed to load media');
      setIsLoading(false);
    }

    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [decryptedData, fileMetadata]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls && !isVideo) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const isImage = fileMetadata?.type?.startsWith('image/');
  const isVideo = fileMetadata?.type?.startsWith('video/');

  // Handle zoom
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Handle touch/mouse interactions for images
  const handleInteractionStart = (e) => {
    if (!isImage) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });

    // Show controls on interaction
    setShowControls(true);
  };

  const handleInteractionMove = (e) => {
    if (!isDragging || !isImage || scale === 1) return;
    
    e.preventDefault();
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleInteractionEnd = () => {
    setIsDragging(false);
  };

  // Handle double-tap to zoom (mobile)
  const handleDoubleTap = (e) => {
    if (!isImage) return;
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      e.preventDefault();
      if (scale === 1) {
        setScale(2);
      } else {
        handleResetZoom();
      }
    }
    
    lastTapRef.current = now;
  };

  // Handle pinch-to-zoom (mobile)
  const handlePinch = (e) => {
    if (!isImage || e.touches.length !== 2) return;
    
    e.preventDefault();
    
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const distance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    if (!imageRef.current.dataset.lastDistance) {
      imageRef.current.dataset.lastDistance = distance;
      return;
    }
    
    const lastDistance = parseFloat(imageRef.current.dataset.lastDistance);
    const delta = distance - lastDistance;
    const scaleChange = delta * 0.01;
    
    setScale(prev => Math.min(Math.max(prev + scaleChange, 0.5), 5));
    imageRef.current.dataset.lastDistance = distance;
  };

  const handleTouchEnd = (e) => {
    if (imageRef.current) {
      delete imageRef.current.dataset.lastDistance;
    }
    handleInteractionEnd();
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        // Lock orientation to landscape for videos on mobile
        if (isVideo && screen.orientation && screen.orientation.lock) {
          try {
            await screen.orientation.lock('landscape');
          } catch (e) {
            console.log('Orientation lock not supported');
          }
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Prevent default touch behaviors
  useEffect(() => {
    const preventDefault = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black touch-none"
      onMouseMove={() => setShowControls(true)}
      onTouchStart={() => setShowControls(true)}
    >
      {/* Header - Only show when controls are visible */}
      <div 
        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-3 sm:p-4 z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="text-white flex-1 min-w-0 mr-4">
            <h3 className="font-semibold truncate text-sm sm:text-base">{fileMetadata?.name}</h3>
            <p className="text-xs sm:text-sm text-gray-300">
              {((fileMetadata?.size || 0) / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="rounded-lg bg-white/10 p-2 sm:p-2.5 text-white hover:bg-white/20 transition active:scale-95"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="rounded-lg bg-white/10 p-2 sm:p-2.5 text-white hover:bg-white/20 transition active:scale-95"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </>
            )}
            <button
              onClick={toggleFullscreen}
              className="rounded-lg bg-white/10 p-2 sm:p-2.5 text-white hover:bg-white/20 transition active:scale-95"
              title="Fullscreen"
            >
              <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={onDownload}
              className="rounded-lg bg-white/10 p-2 sm:p-2.5 text-white hover:bg-white/20 transition active:scale-95"
              title="Download"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-white/10 p-2 sm:p-2.5 text-white hover:bg-white/20 transition active:scale-95"
              title="Close"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Zoom indicator for images */}
      {isImage && scale !== 1 && showControls && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm z-10">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Media Content */}
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader className="h-8 w-8 sm:h-10 sm:w-10 animate-spin" />
            <p className="text-sm sm:text-base">Loading media...</p>
          </div>
        )}

        {error && (
          <div className="text-center text-white px-4">
            <p className="text-lg sm:text-xl font-semibold mb-2">⚠️ Error</p>
            <p className="text-sm sm:text-base">{error}</p>
          </div>
        )}

        {!isLoading && !error && mediaUrl && (
          <>
            {isImage && (
              <img
                ref={imageRef}
                src={mediaUrl}
                alt={fileMetadata.name}
                className="max-w-full max-h-full object-contain select-none"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                  cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  touchAction: 'none',
                }}
                onMouseDown={handleInteractionStart}
                onMouseMove={handleInteractionMove}
                onMouseUp={handleInteractionEnd}
                onMouseLeave={handleInteractionEnd}
                onTouchStart={handleDoubleTap}
                onTouchMove={handlePinch}
                onTouchEnd={handleTouchEnd}
                onError={() => setError('Failed to load image')}
                draggable={false}
              />
            )}

            {isVideo && (
              <video
                src={mediaUrl}
                controls
                autoPlay
                playsInline
                controlsList="nodownload"
                className="max-w-full max-h-full w-full sm:w-auto rounded-lg"
                style={{
                  maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 8rem)',
                }}
                onError={() => setError('Failed to load video')}
                onPlay={() => setShowControls(false)}
                onPause={() => setShowControls(true)}
                onEnded={() => setShowControls(true)}
              >
                Your browser does not support video playback.
              </video>
            )}
          </>
        )}
      </div>

      {/* Instruction text for images (mobile) */}
      {isImage && !isLoading && !error && showControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs sm:text-sm z-10 sm:hidden">
          Double-tap to zoom • Pinch to zoom • Drag to pan
        </div>
      )}

      {/* Backdrop - Only clickable when not zoomed or for videos */}
      {(scale === 1 || isVideo) && (
        <div
          className="absolute inset-0 -z-10"
          onClick={onClose}
        />
      )}
    </div>
  );
}
