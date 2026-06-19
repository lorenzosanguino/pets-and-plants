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
    const historialReciente = this.getHistorialUso();
    if (historialReciente.length === 0) return 0;
    
    const ahora = Date.now();
    
    // El elemento más antiguo es el que primero saldrá de la ventana de 24 horas
    const masAntiguo = Math.min(...historialReciente);
    const tiempoParaLiberarse = masAntiguo + 24 * 60 * 60 * 1000;
    
    return Math.max(0, tiempoParaLiberarse - ahora);
  }

  /**
   * Obtiene el tiempo restante formateado como un mensaje legible (horas, minutos y segundos).
   */
  static obtenerMensajeTiempoRestante(): string {
    const ms = this.obtenerTiempoRestanteMs();
    if (ms <= 0) return 'unos instantes';
    
    const totalSegundos = Math.floor(ms / 1000);
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    
    const partes: string[] = [];
    if (horas > 0) partes.push(`${horas} ${horas === 1 ? 'hora' : 'horas'}`);
    if (minutos > 0) partes.push(`${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`);
    if (horas === 0 && minutos === 0) partes.push(`${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`);
    
    return partes.join(' y ');
  }

  /**
   * Formatea un error de API en un mensaje amigable y legible para el usuario.
   */
  static formatearErrorCuota(errorStr: string): string {
    if (!errorStr) return "Límite de cuota excedido. Por favor, inténtalo más tarde.";
    
    const retryMatch = errorStr.match(/retry\s+in\s+([\d.]+)\s*s/i) || 
                       errorStr.match(/retryDelay["']?:\s*["']?(\d+)/i) ||
                       errorStr.match(/retry\s+after\s+(\d+)/i);
    
    if (retryMatch) {
      const segundosFloat = parseFloat(retryMatch[1]);
      const segundos = Math.max(1, Math.round(segundosFloat));
      if (segundos < 60) {
        return `Google Gemini está descansando un momento por exceso de peticiones. Estará listo de nuevo en ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}. Mientras tanto, cargamos datos simulados de demostración. 🐾`;
      } else {
        const minutos = Math.floor(segundos / 60);
        const segsRestantes = segundos % 60;
        const tiempoTexto = segsRestantes > 0 
          ? `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} y ${segsRestantes} ${segsRestantes === 1 ? 'segundo' : 'segundos'}`
          : `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
        return `Google Gemini está descansando un momento por exceso de peticiones. Estará listo de nuevo en ${tiempoTexto}. Mientras tanto, cargamos datos simulados de demostración. 🐾`;
      }
    }

    if (errorStr.includes("429") || errorStr.toLowerCase().includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED")) {
      return "Google Gemini está saturado en este momento. Por favor, espera un momento antes de realizar otra consulta. Mientras tanto, cargamos datos simulados de demostración. 🐾";
    }

    return `Conexión limitada (${errorStr}). Cargando datos simulados de demostración. 🐾`;
  }
}
