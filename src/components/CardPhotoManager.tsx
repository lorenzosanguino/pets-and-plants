/* eslint-disable react-hooks/set-state-in-effect */
import React, { useRef, useState, useEffect } from 'react';
import { ImageOptimizer } from '../utils/imageOptimizer';
import { PhotoEditorModal } from './PhotoEditorModal';
import { ImageLightbox } from './ImageLightbox';

interface CardPhotoManagerProps {
  currentPhotoUrl?: string;
  photos?: string[];
  onPhotosChange: (updatedPhotos: string[], newPrimaryUrl: string) => void;
  theme?: string;
}

export const CardPhotoManager: React.FC<CardPhotoManagerProps> = ({
  currentPhotoUrl = '',
  photos = [],
  onPhotosChange,
  theme = 'nature'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhoto, setActivePhoto] = useState<string>(currentPhotoUrl || (photos.length > 0 ? photos[0] : ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleSaveEditedPhoto = (newPhotoBase64: string) => {
    const idx = allPhotos.indexOf(activePhoto);
    if (idx !== -1) {
      const updatedPhotos = [...allPhotos];
      updatedPhotos[idx] = newPhotoBase64;
      let newPrimary = currentPhotoUrl;
      if (activePhoto === currentPhotoUrl) {
        newPrimary = newPhotoBase64;
      }
      onPhotosChange(updatedPhotos, newPrimary);
      setActivePhoto(newPhotoBase64);
    }
    setIsEditingPhoto(false);
  };

  // Ensure all photos list includes the current primary photo if it's not already in it
  const allPhotos = [...photos];
  if (currentPhotoUrl && !allPhotos.includes(currentPhotoUrl)) {
    allPhotos.unshift(currentPhotoUrl);
  }

  // BUG-1 FIX: Move state update out of render body into useEffect to avoid infinite loop
  // BUG-2 FIX: Sync activePhoto when currentPhotoUrl prop changes
  useEffect(() => {
    if (!activePhoto && allPhotos.length > 0) {
      setActivePhoto(allPhotos[0]);
    }
  }, [allPhotos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentPhotoUrl) {
      setActivePhoto(currentPhotoUrl);
    }
  }, [currentPhotoUrl]);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setError(null);
      try {
        const optimized = await ImageOptimizer.optimize(file);
        const newPhotoBase64 = optimized.dataUrl;
        
        // Append to list of photos
        const updatedPhotos = [...allPhotos, newPhotoBase64];
        
        // If there was no primary photo, make this the primary
        const newPrimary = currentPhotoUrl || newPhotoBase64;
        
        onPhotosChange(updatedPhotos, newPrimary);
        setActivePhoto(newPhotoBase64);
      } catch (err: any) {
        console.error(err);
        setError("Error al optimizar y procesar la imagen.");
      } finally {
        setLoading(false);
        // BUG-3 FIX: Reset file input so same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleSetPrimary = (photo: string) => {
    onPhotosChange(allPhotos, photo);
  };

  const handleDeletePhoto = (photoToDelete: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta foto?")) {
      return;
    }
    const updatedPhotos = allPhotos.filter(p => p !== photoToDelete);
    let newPrimary = currentPhotoUrl;
    
    // If we deleted the primary photo
    if (photoToDelete === currentPhotoUrl) {
      newPrimary = updatedPhotos.length > 0 ? updatedPhotos[0] : '';
    }
    
    onPhotosChange(updatedPhotos, newPrimary);
    
    // Set next active preview
    if (activePhoto === photoToDelete) {
      setActivePhoto(updatedPhotos.length > 0 ? updatedPhotos[0] : '');
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  // Theme-specific colors
  const accentColor = theme === 'gaming' ? '#00ff7f' : (theme === 'kawaii' ? '#ff6b8b' : '#2e7d32');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      margin: '8px 0 16px 0',
      padding: '0',
      background: 'transparent',
      border: 'none',
      boxSizing: 'border-box'
    }}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleAddPhoto}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: 'var(--game-text-bright)' }}>
          📸 Galería de Fotos del Expediente
        </h4>
        <button
          type="button"
          onClick={triggerInput}
          disabled={loading}
          style={{
            padding: '6px 12px',
            background: accentColor,
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            fontFamily: 'var(--game-font, sans-serif)'
          }}
        >
          {loading ? 'Subiendo...' : '+ Añadir Foto 📷'}
        </button>
      </div>

      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', padding: '0' }}>⚠️ {error}</span>
      )}

      {allPhotos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Active Preview - FRAMED */}
          <div style={(() => {
            const radius = theme === 'gaming' ? '4px' : (theme === 'kawaii' ? '16px' : '12px');
            if (theme === 'gaming') {
              return {
                position: 'relative',
                width: '100%',
                aspectRatio: '3/4',
                borderRadius: radius,
                overflow: 'hidden',
                background: '#121212',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45), 0 0 15px rgba(51, 243, 255, 0.4)',
                border: '2.5px solid var(--game-border-color, #33f3ff)',
                boxSizing: 'border-box' as const,
                padding: '12px'
              };
            }
            if (theme === 'kawaii') {
              return {
                position: 'relative',
                width: '100%',
                aspectRatio: '3/4',
                borderRadius: radius,
                overflow: 'hidden',
                background: '#fff5f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 30px rgba(255, 107, 139, 0.2)',
                border: '8px solid #ffffff',
                outline: '2px solid #ff6b8b',
                boxSizing: 'border-box' as const,
                padding: '12px'
              };
            }
            return {
              position: 'relative',
              width: '100%',
              aspectRatio: '3/4',
              borderRadius: radius,
              overflow: 'hidden',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(46, 125, 50, 0.15)',
              border: '8px solid #ffffff',
              outline: '1.5px solid rgba(0, 0, 0, 0.06)',
              boxSizing: 'border-box' as const,
              padding: '12px'
            };
          })()}>
            <img
              src={activePhoto}
              alt="Vista previa"
              onClick={() => setShowLightbox(true)}
              style={{
                maxWidth: 'calc(100% - 8px)',
                maxHeight: 'calc(100% - 8px)',
                objectFit: 'contain',
                borderRadius: theme === 'gaming' ? '0px' : (theme === 'kawaii' ? '12px' : '8px'),
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                cursor: 'zoom-in'
              }}
            />
            {/* Gradiente de superposición para profundidad física */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.05) 50%, rgba(0, 0, 0, 0.25) 100%)',
              pointerEvents: 'none',
              zIndex: 1
            }} />
            {/* Borde interior secundario brillante para efecto marco 3D */}
            <div style={(() => {
              if (theme === 'gaming') {
                return {
                  position: 'absolute' as const,
                  top: '4px', left: '4px', right: '4px', bottom: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 'calc(var(--game-radius, 12px) - 4px)',
                  pointerEvents: 'none' as const,
                  zIndex: 2,
                  boxSizing: 'border-box' as const
                };
              }
              if (theme === 'kawaii') {
                return {
                  position: 'absolute' as const,
                  top: '2px', left: '2px', right: '2px', bottom: '2px',
                  border: '1.5px solid rgba(255, 107, 139, 0.25)',
                  borderRadius: '12px',
                  pointerEvents: 'none' as const,
                  zIndex: 2,
                  boxSizing: 'border-box' as const
                };
              }
              return {
                position: 'absolute' as const,
                top: '2px', left: '2px', right: '2px', bottom: '2px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '8px',
                pointerEvents: 'none' as const,
                zIndex: 2,
                boxSizing: 'border-box' as const
              };
            })()} />
            {activePhoto === currentPhotoUrl && (
              <span style={{
                position: 'absolute',
                top: '12px',
                left: '20px',
                background: 'rgba(46, 125, 50, 0.9)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '10px',
                fontWeight: 'bold',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                zIndex: 2
              }}>
                Principal ★
              </span>
            )}
            
            {/* Actions overlay */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '20px',
              display: 'flex',
              gap: '6px',
              zIndex: 2
            }}>
              {activePhoto !== currentPhotoUrl && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(activePhoto)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#2e7d32',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  Hacer Principal ⭐
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditingPhoto(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                Editar 🎨
              </button>
              <button
                type="button"
                onClick={() => handleDeletePhoto(activePhoto)}
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                Eliminar 🗑️
              </button>
            </div>
          </div>

          {/* Thumbnails Row */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            paddingLeft: '0',
            paddingRight: '0',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {allPhotos.map((photo, idx) => {
              const isSelected = photo === activePhoto;
              const isPrimary = photo === currentPhotoUrl;
              return (
                <div
                  key={idx}
                  onClick={() => setActivePhoto(photo)}
                  style={(() => {
                    const radius = theme === 'gaming' ? '4px' : (theme === 'kawaii' ? '8px' : '6px');
                    let borderStyle: string;
                    let shadow: string;

                    if (theme === 'gaming') {
                      borderStyle = isSelected 
                        ? '2.5px solid var(--game-border-color, #33f3ff)' 
                        : (isPrimary ? '1.5px dashed var(--game-border-color, #33f3ff)' : '1.5px solid rgba(255, 255, 255, 0.15)');
                      shadow = isSelected ? '0 0 8px rgba(51, 243, 255, 0.6)' : 'none';
                    } else if (theme === 'kawaii') {
                      borderStyle = isSelected 
                        ? '3.5px solid #ff6b8b' 
                        : (isPrimary ? '2px dashed #ff6b8b' : '2px solid #ffffff');
                      shadow = isSelected ? '0 3px 6px rgba(255, 107, 139, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.06)';
                    } else { // nature
                      borderStyle = isSelected 
                        ? '3.5px solid #2e7d32' 
                        : (isPrimary ? '2px dashed #2e7d32' : '2px solid #ffffff');
                      shadow = isSelected ? '0 3px 8px rgba(46, 125, 50, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.08)';
                    }

                    return {
                      position: 'relative' as const,
                      flexShrink: 0,
                      width: '60px',
                      height: '60px',
                      borderRadius: radius,
                      overflow: 'hidden' as const,
                      cursor: 'pointer' as const,
                      border: borderStyle,
                      boxShadow: shadow,
                      boxSizing: 'border-box' as const,
                      transition: 'all 0.15s'
                    };
                  })()}
                >
                  <img
                    src={photo}
                    alt={`Miniatura ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {isPrimary && (
                    <span style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      fontSize: '10px',
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                    }}>
                      ★
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          margin: '0',
          padding: '20px',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
          border: '1px dashed rgba(0,0,0,0.1)',
          fontSize: '12px',
          color: '#777'
        }}>
          No hay fotos cargadas en este expediente. Pulsa el botón superior para subir fotos de tu mascota o planta.
        </div>
      )}

      {isEditingPhoto && activePhoto && (
        <PhotoEditorModal
          imageUrl={activePhoto}
          onSave={handleSaveEditedPhoto}
          onClose={() => setIsEditingPhoto(false)}
          theme={theme}
        />
      )}

      {showLightbox && activePhoto && (
        <ImageLightbox
          imageUrl={activePhoto}
          onClose={() => setShowLightbox(false)}
          theme={theme}
        />
      )}
    </div>
  );
};
