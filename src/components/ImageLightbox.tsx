import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  imageUrl: string;
  onClose: () => void;
  title?: string;
  theme?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  onClose,
  title,
  theme = 'nature'
}) => {
  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!imageUrl) return null;

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
    return { // nature / vintage
      border: '8px solid #ffffff',
      outline: '1.5px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 10px 40px rgba(46, 125, 50, 0.3), 0 15px 50px rgba(0,0,0,0.6)',
      borderRadius: radius,
    };
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
        background: 'rgba(0, 0, 0, 0.85)',
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

      {/* Contenedor de la Imagen */}
      <div
        onClick={(e) => e.stopPropagation()} // Evita cerrar al hacer click sobre la propia imagen
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '90%',
          maxHeight: '80%',
          animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'default'
        }}
      >
        <img
          src={imageUrl}
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
    </div>,
    document.body
  );
};
