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

  /**
   * Obtiene el tiempo restante en milisegundos para que se libere al menos una petición de la cuota local.
   */
  static obtenerTiempoRestanteMs(): number {
    const ahora = Date.now();
    const historialReciente = this.getHistorialUso();
    
    let msRestante = 0;
    if (historialReciente.length > 0) {
      const masAntiguo = Math.min(...historialReciente);
      const tiempoParaLiberarse = masAntiguo + 24 * 60 * 60 * 1000;
      msRestante = Math.max(0, tiempoParaLiberarse - ahora);
    }
    
    // Si el tiempo restante es 0 o menor a 5 minutos, estimamos el tiempo restante
    // hasta la medianoche local para asegurar que se muestren horas y minutos legibles.
    if (msRestante < 5 * 60 * 1000) {
      const ahoraDate = new Date();
      const medianoche = new Date(ahoraDate);
      medianoche.setHours(24, 0, 0, 0); // Siguiente medianoche
      msRestante = medianoche.getTime() - ahoraDate.getTime();
    }
    
    return msRestante;
  }

  /**
   * Formatea una cantidad de segundos en días, horas, minutos y segundos de forma legible en español.
   */
  static formatearSegundos(totalSegundos: number): string {
    if (totalSegundos <= 0) return 'a few moments';

    const dias = Math.floor(totalSegundos / 86400);
    const horas = Math.floor((totalSegundos % 86400) / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    const partes: string[] = [];
    if (dias > 0) {
      partes.push(`${dias} ${dias === 1 ? 'day' : 'days'}`);
    }
    if (horas > 0) {
      partes.push(`${horas} ${horas === 1 ? 'hour' : 'hours'}`);
    }
    if (minutos > 0) {
      partes.push(`${minutos} ${minutos === 1 ? 'minute' : 'minutes'}`);
    }
    if (segundos > 0 || partes.length === 0) {
      partes.push(`${segundos} ${segundos === 1 ? 'second' : 'seconds'}`);
    }

    if (partes.length === 1) return partes[0];
    
    const todasMenosUltima = partes.slice(0, -1).join(', ');
    const ultima = partes[partes.length - 1];
    return `${todasMenosUltima} and ${ultima}`;
  }

  /**
   * Obtiene el tiempo restante formateado como un mensaje legible (días, horas, minutos y segundos).
   */
  static obtenerMensajeTiempoRestante(): string {
    const ms = this.obtenerTiempoRestanteMs();
    if (ms <= 0) return 'a few moments';
    
    const totalSegundos = Math.floor(ms / 1000);
    return this.formatearSegundos(totalSegundos);
  }

  /**
   * Formatea un error de API en un mensaje amigable y legible para el usuario.
   */
  static formatearErrorCuota(errorStr: string): string {
    if (!errorStr) return "Quota limit exceeded. Please try again later.";
    
    const status = this.obtenerEstadoCuota();
    const tiempoRenovacion = this.obtenerMensajeTiempoRestante();
    
    const infoCuota = status.esIlimitado
      ? 'You have unlimited quota with your API key.'
      : status.restantes > 0
      ? `You have ${status.restantes} of ${status.limite} free queries left today.`
      : `Today's free limit reached.`;
    
    const tiempoRestablecimientoMsg = status.esIlimitado 
      ? '' 
      : `Time remaining to reset the daily quota: ${tiempoRenovacion}.`;

    const esErrorCuotaExcedida = errorStr.includes("429") || 
                                 errorStr.toLowerCase().includes("quota") || 
                                 errorStr.includes("RESOURCE_EXHAUSTED") ||
                                 status.restantes === 0;

    // If quota is exceeded or daily limit reached, show remaining time prominently
    if (esErrorCuotaExcedida) {
      return `AI query limit reached. It will be available again in ${tiempoRenovacion}. [${infoCuota}] (If this persists, the shared daily quota is exhausted; you can set up your own free API Key in Settings ⚙️ to use the app without waiting). In the meantime, loading demo simulation data. 🐾`;
    }

    const retryMatch = errorStr.match(/retry\s+in\s+([\d.]+)\s*s/i) || 
                       errorStr.match(/retryDelay["']?:\s*["']?(\d+)/i) ||
                       errorStr.match(/retry\s+after\s+(\d+)/i);

    if (retryMatch) {
      const segundosFloat = parseFloat(retryMatch[1]);
      const segundos = Math.max(1, Math.round(segundosFloat));
      const tiempoTexto = this.formatearSegundos(segundos);
      return `Google Gemini is taking a short break due to too many requests. It will be ready in ${tiempoTexto}. ${tiempoRestablecimientoMsg} [${infoCuota}] (You can set up your own free API Key in Settings ⚙️ to avoid waiting). In the meantime, loading demo simulation data. 🐾`;
    }

    return `Limited connection (${errorStr}). ${tiempoRestablecimientoMsg} [${infoCuota}] Loading demo simulation data. 🐾`;
  }
}
