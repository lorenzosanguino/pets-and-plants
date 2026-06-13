import { APP_CONFIG } from '../config/appConfig';

export interface DiagnosticoPlanta {
  detectado: boolean;
  problema: string;
  probabilidad: number;
  tratamientoRecomendado: string;
  toxicidadFelina: 'Segura' | 'Tóxica leve (irritante)' | 'Altamente tóxica (urgencia)';
}

export class PlantDiagnosticService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static diagnose(_imageBlob: Blob): Promise<DiagnosticoPlanta> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Genera un diagnóstico basado en simulaciones botánicas
        const diagnosticos: DiagnosticoPlanta[] = [
          {
            detectado: true,
            problema: "Clorosis férrica foliar por alcalinidad del agua",
            probabilidad: 0.94,
            tratamientoRecomendado: "Regar con agua destilada acidificada ligeramente y añadir sustrato con perlita y humus de lombriz.",
            toxicidadFelina: "Segura"
          },
          {
            detectado: true,
            problema: "Intoxicación mecánica en hojas por mordedura felina compulsiva",
            probabilidad: 0.88,
            tratamientoRecomendado: "Elevar la planta de su ubicación actual. Proveer Catgrass (hierba gatera) en zonas bajas para enriquecimiento ambiental.",
            toxicidadFelina: "Tóxica leve (irritante)"
          }
        ];

        const result = diagnosticos[Math.floor(Math.random() * diagnosticos.length)];
        resolve(result);
      }, APP_CONFIG.SIMULATION_LATENCY_MS);
    });
  }
}
