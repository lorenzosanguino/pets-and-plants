import React, { useRef, useState, useEffect } from 'react';
import { ImageOptimizer } from '../utils/imageOptimizer';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface CameraScannerProps {
  mode: 'mascota' | 'planta';
  onCapture: (optimizedData: { blob: Blob; dataUrl: string }[]) => void;
}

const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;

export const CameraScanner: React.FC<CameraScannerProps> = ({ mode, onCapture }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCapturing(true);
      setError(null);
      try {
        const fileList = Array.from(files).slice(0, 5);
        const optimizedList: { blob: Blob; dataUrl: string }[] = [];
        for (const file of fileList) {
          const optimized = await ImageOptimizer.optimize(file);
          optimizedList.push(optimized);
        }
        onCapture(optimizedList);
      } catch (err: any) {
        setError("Fallo al procesar y optimizar las imágenes seleccionadas.");
        console.error(err);
      } finally {
        setCapturing(false);
      }
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturing(true);
      setError(null);
      try {
        const optimized = await ImageOptimizer.optimize(file);
        onCapture([optimized]);
      } catch (err: any) {
        setError("Fallo al procesar y optimizar la imagen capturada.");
        console.error(err);
      } finally {
        setCapturing(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = async () => {
    if (isCapacitor) {
      setCapturing(true);
      setError(null);
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera
        });
        
        if (image.webPath) {
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          const file = new File([blob], `scan_capture.${image.format}`, { type: `image/${image.format}` });
          const optimized = await ImageOptimizer.optimize(file);
          onCapture([optimized]);
        }
      } catch (err: any) {
        // Only set error if not cancelled by user
        if (err.message && err.message.toLowerCase().indexOf('cancel') === -1) {
          setError("Fallo al capturar foto con la cámara nativa.");
          console.error(err);
        }
      } finally {
        setCapturing(false);
      }
    } else {
      cameraInputRef.current?.click();
    }
  };

  useEffect(() => {
    // Auto-open camera on mount
    triggerCameraInput();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '500px', margin: '0 auto', gap: '16px' }}>
      {/* Hidden native inputs for mobile/file compatibility */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0, opacity: 0, pointerEvents: 'none' }}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0, opacity: 0, pointerEvents: 'none' }}
      />

      {error && (
        <div style={{
          color: '#ff3333',
          padding: '12px',
          background: 'rgba(255, 51, 51, 0.1)',
          border: '1px solid #ff3333',
          borderRadius: '8px',
          fontSize: '13px',
          width: '100%',
          boxSizing: 'border-box',
          lineHeight: '1.4'
        }}>
          <strong>Aviso:</strong>
          <p style={{ margin: '4px 0 0 0' }}>{error}</p>
        </div>
      )}
      
      <div style={{
        width: '100%',
        aspectRatio: '4/3',
        background: 'var(--game-card-bg, #1a1a1a)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed var(--game-border-color, #33f3ff)',
        padding: '24px',
        boxSizing: 'border-box',
        textAlign: 'center',
        gap: '16px',
        color: 'var(--game-text, #ccc)'
      }}>
        <span style={{ fontSize: '56px', filter: 'drop-shadow(0 0 8px rgba(51, 243, 255, 0.35))' }}>📸</span>
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--game-text-bright, #fff)', fontSize: '18px', fontWeight: 'bold' }}>
            Transmisión en tiempo real
          </h4>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.85, lineHeight: '1.5' }}>
            Puedes tomar fotos o seleccionar una de tu galería usando los botones de abajo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', marginTop: '8px' }}>
          <button
            onClick={triggerCameraInput}
            disabled={capturing}
            style={{
              padding: '12px 24px',
              background: mode === 'planta' ? 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)' : 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              opacity: capturing ? 0.6 : 1,
              transition: 'all 0.2s',
              fontFamily: 'var(--game-font, sans-serif)'
            }}
          >
            {capturing ? 'Procesando...' : 'Capturar Imagen 📷'}
          </button>
          <button
            onClick={triggerFileInput}
            disabled={capturing}
            style={{
              padding: '12px 24px',
              background: 'var(--game-card-bg, #333)',
              color: 'var(--game-text, #fff)',
              border: '1.5px solid var(--game-border-color, #777)',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: capturing ? 0.6 : 1,
              transition: 'all 0.2s',
              fontFamily: 'var(--game-font, sans-serif)'
            }}
          >
            Subir Archivo 📁
          </button>
        </div>
      </div>
    </div>
  );
};
