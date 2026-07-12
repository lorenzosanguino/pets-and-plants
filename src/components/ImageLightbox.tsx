import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  imageUrl: string;
  onClose: () => void;
  title?: string;
  theme?: string;
  /** All photos of this record, for left/right navigation */
  photos?: string[];
  /** Index of imageUrl within photos array */
  initialIndex?: number;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  onClose,
  title,
  theme = 'nature',
  photos = [],
  initialIndex,
}) => {
  // Resolve the starting index
  const startIndex = initialIndex !== undefined
    ? initialIndex
    : (photos.length > 0 ? Math.max(0, photos.indexOf(imageUrl)) : 0);

  const [currentIndex, setCurrentIndex] = useState(startIndex);

  // The actual displayed URL (either from gallery or the single passed URL)
  const displayUrl = photos.length > 1 ? photos[currentIndex] : imageUrl;

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(i => (i <= 0 ? photos.length - 1 : i - 1));
  }, [photos.length]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(i => (i >= photos.length - 1 ? 0 : i + 1));
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (photos.length <= 1) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentIndex(i => (i <= 0 ? photos.length - 1 : i - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(i => (i >= photos.length - 1 ? 0 : i + 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photos.length, onClose]);

  if (!displayUrl) return null;

  // Theme-specific borders and glows
  const getBorderStyles = () => {
    const radius = theme === 'gaming' ? '4px' : (theme === 'kawaii' ? '20px' : '12px');
    if (theme === 'gaming') {
      return {
        border: '3px solid var(--game-border-color, #33f3ff)',
        boxShadow: '0 0 30px rgba(51, 243, 255, 0.7), 0 10px 40px rgba(0, 0, 0, 0.8)',
        borderRadius: radius,
      };
    }
    if (theme === 'kawaii') {
      return {
        border: '10px solid #ffffff',
        outline: '3.5px solid #ff6b8b',
        boxShadow: '0 10px 40px rgba(255, 107, 139, 0.4), 0 15px 50px rgba(0,0,0,0.5)',
        borderRadius: radius,
      };
    }
    return { // nature
      border: '8px solid #ffffff',
      outline: '1.5px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 10px 40px rgba(46, 125, 50, 0.3), 0 15px 50px rgba(0,0,0,0.6)',
      borderRadius: radius,
    };
  };

  const navBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '52px',
    height: '52px',
    fontSize: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 100001,
    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    transition: 'background 0.15s',
    lineHeight: '1',
    padding: '0',
    flexShrink: 0,
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        cursor: 'zoom-out',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Styles animation helper */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .lightbox-close-btn:hover {
          background: rgba(255, 255, 255, 0.3) !important;
          transform: scale(1.1);
        }
        .lightbox-close-btn:active {
          transform: scale(0.95);
        }
        .lightbox-nav-btn:hover {
          background: rgba(0,0,0,0.8) !important;
        }
        @media (max-width: 480px) {
          .lightbox-nav-btn {
            width: 40px !important;
            height: 40px !important;
            font-size: 20px !important;
          }
        }
      `}</style>

      {/* Botón Cerrar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="lightbox-close-btn"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.15)',
          border: 'none',
          color: '#ffffff',
          fontSize: '28px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          zIndex: 100000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          lineHeight: '1'
        }}
        title="Cerrar"
      >
        ×
      </button>

      {/* Photo counter */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '22px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          padding: '6px 18px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 'bold',
          zIndex: 100000,
          letterSpacing: '0.5px'
        }}>
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Left arrow */}
      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox-nav-btn"
          onClick={handlePrev}
          style={{ ...navBtnStyle, left: '16px' }}
          aria-label="Foto anterior"
        >
          ‹
        </button>
      )}

      {/* Right arrow */}
      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox-nav-btn"
          onClick={handleNext}
          style={{ ...navBtnStyle, right: '16px' }}
          aria-label="Foto siguiente"
        >
          ›
        </button>
      )}

      {/* Contenedor de la Imagen */}
      <div
        onClick={(e) => e.stopPropagation()} // Evita cerrar al hacer click sobre la propia imagen
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '92%',
          maxHeight: '80%',
          animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'default'
        }}
      >
        <img
          key={displayUrl}
          src={displayUrl}
          alt={title || "Imagen a tamaño completo"}
          style={{
            maxWidth: '100%',
            maxHeight: '75vh',
            objectFit: 'contain',
            ...getBorderStyles(),
            boxSizing: 'border-box'
          }}
        />

        {title && (
          <div
            style={{
              marginTop: '16px',
              padding: '6px 16px',
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#ffffff',
              borderRadius: '20px',
              fontSize: '15px',
              fontWeight: 'bold',
              fontFamily: 'var(--game-font, sans-serif)',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              textAlign: 'center',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {title}
          </div>
        )}
      </div>

      {/* Thumbnail dots for quick navigation */}
      {photos.length > 1 && photos.length <= 12 && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 100000
        }}>
          {photos.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              style={{
                width: idx === currentIndex ? '22px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              aria-label={`Foto ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
};
