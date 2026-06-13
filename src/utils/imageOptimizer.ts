import { APP_CONFIG } from '../config/appConfig';

export class ImageOptimizer {
  /**
   * Redimensiona una imagen y la comprime a formato JPEG en base a límites globales.
   * @param file Archivo original o string base64
   * @returns Promesa que resuelve a un objeto con la URL temporal (objectURL) y el Blob optimizado
   */
  static optimize(file: File): Promise<{ blob: Blob; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = APP_CONFIG.IMAGE_OPTIMIZATION.MAX_WIDTH;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("No se pudo obtener el contexto 2D del Canvas"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          try {
            const dataUrl = canvas.toDataURL('image/jpeg', APP_CONFIG.IMAGE_OPTIMIZATION.JPEG_QUALITY);
            
            // Convertir dataURL a Blob de forma síncrona (altamente compatible con iOS Safari/WebKit)
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            
            resolve({ blob, dataUrl });
          } catch (err) {
            reject(new Error("Fallo al optimizar y generar el Blob de la imagen: " + (err instanceof Error ? err.message : String(err))));
          }
        };
        img.onerror = () => reject(new Error("Error al cargar la imagen en memoria"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo original"));
      reader.readAsDataURL(file);
    });
  }
}
