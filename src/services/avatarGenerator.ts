import { APP_CONFIG } from '../config/appConfig';

export class AvatarGeneratorService {
  /**
   * Simula el entrenamiento estético.
   * @param images Array de blobs optimizados (5 a 10)
   * @param onProgress Callback de progreso (0 a 100)
   */
  static generate(
    images: Blob[],
    estilo: 'Óleo Clásico' | 'Cómic Hiperrealista' | 'Renderizado 3D' | 'Retrato Minimalista Claro',
    onProgress: (status: string, percent: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (images.length < 5 || images.length > 10) {
        reject(new Error("Se requieren entre 5 y 10 imágenes para el entrenamiento."));
        return;
      }

      const stages = [
        { status: "Alineando facciones y extrayendo landmarks", percent: 15 },
        { status: "Mapeando condición y estructura corporal", percent: 45 },
        { status: `Aplicando estilo ${estilo}`, percent: 75 },
        { status: `Renderizando y finalizando avatar (${estilo})`, percent: 100 }
      ];

      let index = 0;

      const interval = setInterval(() => {
        if (index < stages.length) {
          const stage = stages[index];
          onProgress(stage.status, stage.percent);
          index++;
        } else {
          clearInterval(interval);
          resolve("https://picsum.photos/id/1025/300/300"); // Simula una URL estable del avatar
        }
      }, APP_CONFIG.SIMULATION_LATENCY_MS);
    });
  }
}
