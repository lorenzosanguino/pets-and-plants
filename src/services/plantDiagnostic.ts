import { APP_CONFIG } from '../config/appConfig';

export interface DiagnosticoPlanta {
  detectado: boolean;
  problema: string;
  probabilidad: number;
  tratamientoRecomendado: string;
  toxicidadFelina: 'Segura' | 'Tóxica leve (irritante)' | 'Altamente tóxica (urgencia)';
}

/**
 * IMPORTANTE — SERVICIO DE SIMULACIÓN (STUB)
 * ─────────────────────────────────────────────────────────────
 * Este servicio es un PLACEHOLDER de demostración. NO llama a ninguna API real.
 * APP_CONFIG.API_ENDPOINTS.PLANT_DIAGNOSTIC apunta a un dominio interno ficticio
 * ("api.petplantapp.internal") que no existe.
 *
 * El diagnóstico real de plantas se realiza a través de geminiAPI.ts (análisis multimodal
 * con foto). Este servicio queda aquí como estructura base por si en el futuro se crea
 * un endpoint dedicado exclusivamente al diagnóstico botánico.
 *
 * TODO: Reemplazar este stub por una llamada real al endpoint cuando esté disponible,
 *       o eliminar el servicio si el diagnóstico siempre irá a través de Gemini.
 */
export class PlantDiagnosticService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static diagnose(_imageBlob: Blob): Promise<DiagnosticoPlanta> {
    console.warn(
      '[PlantDiagnosticService] MODO SIMULACIÓN: devolviendo diagnóstico de demostración. ' +
      'El endpoint real (' + APP_CONFIG.API_ENDPOINTS.PLANT_DIAGNOSTIC + ') no está disponible. ' +
      'Usa geminiAPI.ts para diagnósticos reales con IA.'
    );
    return new Promise((resolve) => {
      setTimeout(() => {
        // Genera un diagnóstico de demostración (NO basado en la imagen real)
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
