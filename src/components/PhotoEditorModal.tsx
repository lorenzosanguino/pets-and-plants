/* eslint-disable react-hooks/set-state-in-effect */
import React, { useRef, useState, useEffect } from 'react';

interface PhotoEditorModalProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
  theme?: string;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  imageUrl,
  onSave,
  onClose,
  theme = 'nature'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Crop rect state in canvas display pixels
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragMode, setDragMode] = useState<'none' | 'move' | 'nw' | 'ne' | 'se' | 'sw'>('none');
  const dragStart = useRef({ x: 0, y: 0, rect: { x: 0, y: 0, w: 0, h: 0 } });

  // Theme Colors
  const accentColor = theme === 'gaming' ? '#00ff7f' : (theme === 'kawaii' ? '#ff6b8b' : '#2e7d32');
  const headerBg = theme === 'gaming' ? '#121212' : (theme === 'kawaii' ? '#fff0f3' : '#f1f8e9');
  const textColor = theme === 'gaming' ? '#00ff7f' : (theme === 'kawaii' ? '#d81b60' : '#2e7d32');

  // Load Image
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      setImg(image);
      setIsLoading(false);
      
      // Calculate initial crop box (80% of image size, centered)
      const maxDisplayWidth = Math.min(window.innerWidth - 40, 500);
      const maxDisplayHeight = 350;
      const scale = Math.min(maxDisplayWidth / image.width, maxDisplayHeight / image.height, 1);
      const displayW = image.width * scale;
      const displayH = image.height * scale;

      const w = Math.round(displayW * 0.8);
      const h = Math.round(displayH * 0.8);
      const x = Math.round((displayW - w) / 2);
      const y = Math.round((displayH - h) / 2);
      
      setCropRect({ x, y, w, h });
    };
    image.onerror = () => {
      setError("No se pudo cargar la imagen para editar.");
      setIsLoading(false);
    };
    image.src = imageUrl;
  }, [imageUrl]);

  // Redraw Canvas on changes
  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale canvas to fit container
    const maxDisplayWidth = Math.min(window.innerWidth - 40, 500);
    const maxDisplayHeight = 350;
    const scale = Math.min(maxDisplayWidth / img.width, maxDisplayHeight / img.height, 1);
    const displayW = img.width * scale;
    const displayH = img.height * scale;

    canvas.width = displayW;
    canvas.height = displayH;

    // Draw main image
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.save();
    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, 0, 0, displayW, displayH);
    ctx.restore();

    // Draw dark shaded overlay outside of crop rect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    
    // Top box
    ctx.fillRect(0, 0, displayW, cropRect.y);
    // Bottom box
    ctx.fillRect(0, cropRect.y + cropRect.h, displayW, displayH - (cropRect.y + cropRect.h));
    // Left box
    ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h);
    // Right box
    ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, displayW - (cropRect.x + cropRect.w), cropRect.h);

    // Draw crop boundary outline
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

    // Draw corner handles (circular, 12px diameter)
    const handleSize = 12;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.0;

    const corners = [
      { x: cropRect.x, y: cropRect.y }, // NW
      { x: cropRect.x + cropRect.w, y: cropRect.y }, // NE
      { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h }, // SE
      { x: cropRect.x, y: cropRect.y + cropRect.h } // SW
    ];

    corners.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, handleSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });

    // Draw grid lines inside crop rect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    // Verticals
    ctx.beginPath();
    ctx.moveTo(cropRect.x + cropRect.w / 3, cropRect.y);
    ctx.lineTo(cropRect.x + cropRect.w / 3, cropRect.y + cropRect.h);
    ctx.moveTo(cropRect.x + (cropRect.w * 2) / 3, cropRect.y);
    ctx.lineTo(cropRect.x + (cropRect.w * 2) / 3, cropRect.y + cropRect.h);
    // Horizontals
    ctx.moveTo(cropRect.x, cropRect.y + cropRect.h / 3);
    ctx.lineTo(cropRect.x + cropRect.w, cropRect.y + cropRect.h / 3);
    ctx.moveTo(cropRect.x, cropRect.y + (cropRect.h * 2) / 3);
    ctx.lineTo(cropRect.x + cropRect.w, cropRect.y + (cropRect.h * 2) / 3);
    ctx.stroke();

  }, [img, brightness, contrast, cropRect, accentColor]);

  // Handle Drag / Resize Mouse Events
  const getMousePos = (e: React.MouseEvent | React.TouchEvent | TouchEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.round(clientX - rect.left),
      y: Math.round(clientY - rect.top)
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!img) return;
    const pos = getMousePos(e);
    
    // Check if clicked near corners
    const handleDist = 20; // Aumentado a 20px
    const isNW = Math.hypot(pos.x - cropRect.x, pos.y - cropRect.y) < handleDist;
    const isNE = Math.hypot(pos.x - (cropRect.x + cropRect.w), pos.y - cropRect.y) < handleDist;
    const isSE = Math.hypot(pos.x - (cropRect.x + cropRect.w), pos.y - (cropRect.y + cropRect.h)) < handleDist;
    const isSW = Math.hypot(pos.x - cropRect.x, pos.y - (cropRect.y + cropRect.h)) < handleDist;

    let mode: typeof dragMode = 'none';
    if (isNW) mode = 'nw';
    else if (isNE) mode = 'ne';
    else if (isSE) mode = 'se';
    else if (isSW) mode = 'sw';
    // Check if clicked inside crop rect
    else if (pos.x >= cropRect.x && pos.x <= cropRect.x + cropRect.w && pos.y >= cropRect.y && pos.y <= cropRect.y + cropRect.h) {
      mode = 'move';
    }

    if (mode !== 'none') {
      setDragMode(mode);
      dragStart.current = { x: pos.x, y: pos.y, rect: { ...cropRect } };
    }
  };

  // Escuchar eventos a nivel de ventana cuando se arrastra
  useEffect(() => {
    if (dragMode === 'none' || !img) return;

    const handleWindowMove = (e: MouseEvent | TouchEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const pos = {
        x: Math.round(clientX - rect.left),
        y: Math.round(clientY - rect.top)
      };

      const dx = pos.x - dragStart.current.x;
      const dy = pos.y - dragStart.current.y;
      const canvas = canvasRef.current;

      const startRect = dragStart.current.rect;
      const newRect = { ...cropRect };

      if (dragMode === 'move') {
        newRect.x = Math.max(0, Math.min(canvas.width - startRect.w, startRect.x + dx));
        newRect.y = Math.max(0, Math.min(canvas.height - startRect.h, startRect.y + dy));
      } else {
        const minSize = 25;
        if (dragMode === 'nw') {
          const newX = Math.max(0, Math.min(startRect.x + startRect.w - minSize, startRect.x + dx));
          const newY = Math.max(0, Math.min(startRect.y + startRect.h - minSize, startRect.y + dy));
          newRect.w = startRect.x + startRect.w - newX;
          newRect.h = startRect.y + startRect.h - newY;
          newRect.x = newX;
          newRect.y = newY;
        } else if (dragMode === 'ne') {
          const newY = Math.max(0, Math.min(startRect.y + startRect.h - minSize, startRect.y + dy));
          newRect.w = Math.max(minSize, Math.min(canvas.width - startRect.x, startRect.w + dx));
          newRect.h = startRect.y + startRect.h - newY;
          newRect.y = newY;
        } else if (dragMode === 'se') {
          newRect.w = Math.max(minSize, Math.min(canvas.width - startRect.x, startRect.w + dx));
          newRect.h = Math.max(minSize, Math.min(canvas.height - startRect.y, startRect.h + dy));
        } else if (dragMode === 'sw') {
          const newX = Math.max(0, Math.min(startRect.x + startRect.w - minSize, startRect.x + dx));
          newRect.w = startRect.x + startRect.w - newX;
          newRect.h = Math.max(minSize, Math.min(canvas.height - startRect.y, startRect.h + dy));
          newRect.x = newX;
        }
      }

      setCropRect(newRect);
    };

    const handleWindowEnd = () => {
      setDragMode('none');
    };

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowEnd);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowEnd);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowEnd);
    };
  }, [dragMode, img, cropRect]);

  const handleSave = () => {
    if (!img || !canvasRef.current) return;
    try {
      // Calculate crop metrics relative to original image dimensions
      const canvas = canvasRef.current;
      const scale = canvas.width / img.width;

      const origX = cropRect.x / scale;
      const origY = cropRect.y / scale;
      const origW = cropRect.w / scale;
      const origH = cropRect.h / scale;

      // Create high-res offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = origW;
      offscreen.height = origH;
      const ctx = offscreen.getContext('2d');
      
      if (!ctx) {
        alert("Error al inicializar el procesador de imágenes.");
        return;
      }

      // Draw cropped section with brightness & contrast filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(img, origX, origY, origW, origH, 0, 0, origW, origH);

      const editedDataUrl = offscreen.toDataURL('image/jpeg', 0.9);
      onSave(editedDataUrl);
    } catch (err) {
      console.error(err);
      alert("Error al aplicar las ediciones clínicas a la foto.");
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '12px'
    }}>
      <div 
        ref={containerRef}
        style={{
          background: 'var(--game-card-bg, #ffffff)',
          borderRadius: theme === 'gaming' ? '4px' : '16px',
          border: 'var(--game-border, 1px solid #ddd)',
          padding: '24px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          paddingBottom: '10px',
          background: headerBg,
          margin: '-24px -24px 0 -24px',
          padding: '16px 24px',
          borderTopLeftRadius: theme === 'gaming' ? '0' : '16px',
          borderTopRightRadius: theme === 'gaming' ? '0' : '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: textColor, fontWeight: 'bold', fontFamily: 'var(--game-font, sans-serif)' }}>
            🔬 Editor de Foto Clínico
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--game-text)'
            }}
          >
            ×
          </button>
        </div>

        {/* Loading / Error States */}
        {isLoading && <div style={{ textAlign: 'center', padding: '40px', color: textColor }}>Cargando editor de imágenes...</div>}
        {error && <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>⚠️ {error}</div>}

        {/* Canvas Area */}
        <div style={{
          display: img ? 'flex' : 'none',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#121212',
          padding: '12px',
          borderRadius: '8px',
          overflow: 'hidden',
          maxHeight: '380px'
        }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleStart}
            onTouchStart={handleStart}
            style={{
              display: 'block',
              cursor: dragMode === 'move' ? 'move' : 'crosshair',
              touchAction: 'none',
              maxWidth: '100%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
          />
        </div>

        {/* Controls */}
        {img && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'var(--game-font, sans-serif)' }}>
            
            {/* Brightness Adjustment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '12px', color: 'var(--game-text-bright)' }}>
                <span>☀️ Brillo Clínico</span>
                <strong>{brightness}%</strong>
              </div>
              <input 
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                style={{
                  accentColor: accentColor,
                  width: '100%'
                }}
              />
            </div>

            {/* Contrast Adjustment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '12px', color: 'var(--game-text-bright)' }}>
                <span>🌗 Contraste Diagnóstico</span>
                <strong>{contrast}%</strong>
              </div>
              <input 
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                style={{
                  accentColor: accentColor,
                  width: '100%'
                }}
              />
            </div>

            {/* Manual Crop Rect Ajustes (as fallback/fine tuning) */}
            <div style={{
              display: 'flex',
              gap: '12px',
              background: 'rgba(0,0,0,0.02)',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'var(--game-text)'
            }}>
              <span>💡 Arrastra el recuadro brillante en la foto para encuadrar y recortar la lesión.</span>
            </div>

            {/* Actions Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '8px',
              borderTop: '1px solid rgba(0,0,0,0.08)',
              paddingTop: '16px'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: theme === 'gaming' ? '0' : '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: 'var(--game-text)'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: '8px 20px',
                  background: accentColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: theme === 'gaming' ? '0' : '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
              >
                Aplicar Ajustes ✓
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
