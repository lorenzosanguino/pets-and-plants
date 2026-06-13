/**
 * Administrador de cuotas de análisis de IA para controlar el número de peticiones.
 * Define un límite diario gratuito de 10 peticiones.
 * Los usuarios con su propia clave de API en Ajustes tienen cuota ilimitada.
 */

export interface QuotaStatus {
  esIlimitado: boolean;
  restantes: number;
  totalUsadoHoy: number;
  limite: number;
}

const LIMITE_DIARIO_GRATUITO = 10;

export class IAQuotaManager {
  /**
   * Obtiene la lista de marcas de tiempo (timestamps) de uso guardadas en localStorage.
   */
  static getHistorialUso(): number[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('petplant_ia_usage_timestamps');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Registra una nueva llamada de IA añadiendo el timestamp actual.
   */
  static registrarUso(): void {
    if (typeof window === 'undefined') return;
    const historial = this.getHistorialUso();
    historial.push(Date.now());
    localStorage.setItem('petplant_ia_usage_timestamps', JSON.stringify(historial));
  }

  /**
   * Obtiene el estado de la cuota del usuario.
   */
  static obtenerEstadoCuota(): QuotaStatus {
    if (typeof window === 'undefined') {
      return { esIlimitado: false, restantes: 0, totalUsadoHoy: 0, limite: LIMITE_DIARIO_GRATUITO };
    }

    // Si el usuario configuró su propia clave API, no hay límites
    const tieneApiKeyPropia = !!localStorage.getItem('petplant_gemini_api_key');
    if (tieneApiKeyPropia) {
      return { esIlimitado: true, restantes: 999, totalUsadoHoy: 0, limite: 999 };
    }

    const ahora = Date.now();
    const hace24Horas = ahora - 24 * 60 * 60 * 1000;

    // Filtrar marcas de tiempo recientes y guardar el historial limpio
    const historialReciente = this.getHistorialUso().filter(time => time > hace24Horas);
    localStorage.setItem('petplant_ia_usage_timestamps', JSON.stringify(historialReciente));

    const totalUsadoHoy = historialReciente.length;
    const restantes = Math.max(0, LIMITE_DIARIO_GRATUITO - totalUsadoHoy);

    return {
      esIlimitado: false,
      restantes,
      totalUsadoHoy,
      limite: LIMITE_DIARIO_GRATUITO
    };
  }
}
