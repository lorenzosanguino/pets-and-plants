/**
 * PremiumManager — controla acceso a funcionalidades según plan del usuario.
 *
 * PLAN GRATUITO (sin clave API propia):
 *  - Máximo 2 mascotas y 2 plantas registradas
 *  - Máximo 2 respuestas IA por tipo de agente (veterinario, agrónomo, etc.)
 *  - Las restricciones aplican siempre en modo gratuito
 *
 * PLAN PREMIUM (usuario con clave API propia en Ajustes → campo API Key):
 *  - Sin límites en mascotas, plantas ni respuestas IA
 */

const KEY_INSTALL_DATE = 'petplant_install_date';
const KEY_AI_RESPONSES = 'petplant_ai_responses_free';
const FREE_MAX_MASCOTAS = 2;
const FREE_MAX_PLANTAS = 2;
const FREE_MAX_AI_RESPONSES = 2;
const TRIAL_DAYS = 15;

export interface PremiumStatus {
  isPremium: boolean;
  isTrialActive: boolean;
  daysLeftInTrial: number;
  installDate: number;
}

export class PremiumManager {
  // ── Instalación ──────────────────────────────────────────────────────────

  static getOrSetInstallDate(): number {
    if (typeof window === 'undefined') return Date.now();
    let stored = localStorage.getItem(KEY_INSTALL_DATE);
    if (!stored) {
      const now = Date.now().toString();
      localStorage.setItem(KEY_INSTALL_DATE, now);
      stored = now;
    }
    return parseInt(stored, 10);
  }

  // ── Plan ─────────────────────────────────────────────────────────────────

  static isPremium(): boolean {
    if (typeof window === 'undefined') return false;
    const key = localStorage.getItem('petplant_gemini_api_key');
    return !!(key && key.trim().length > 0);
  }

  static getStatus(): PremiumStatus {
    const installDate = this.getOrSetInstallDate();
    const isPremium = this.isPremium();
    const elapsedMs = Date.now() - installDate;
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    const isTrialActive = elapsedDays < TRIAL_DAYS;
    const daysLeftInTrial = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
    return { isPremium, isTrialActive, daysLeftInTrial, installDate };
  }

  // ── Límites de registro ───────────────────────────────────────────────────

  static canAddMascota(currentCount: number): boolean {
    if (this.isPremium()) return true;
    return currentCount < FREE_MAX_MASCOTAS;
  }

  static canAddPlanta(currentCount: number): boolean {
    if (this.isPremium()) return true;
    return currentCount < FREE_MAX_PLANTAS;
  }

  static get maxMascotas(): number { return FREE_MAX_MASCOTAS; }
  static get maxPlantas(): number { return FREE_MAX_PLANTAS; }

  // ── Límites de IA ─────────────────────────────────────────────────────────

  /**
   * Devuelve cuántas respuestas IA ha consumido ya este agente en modo free.
   * `agentKey` puede ser: 'veterinario', 'agronomo', 'exoticos', 'chef', 'vacaciones', etc.
   */
  static getAIResponseCount(agentKey: string): number {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(KEY_AI_RESPONSES);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      return map[agentKey] || 0;
    } catch {
      return 0;
    }
  }

  static incrementAIResponse(agentKey: string): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(KEY_AI_RESPONSES);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      map[agentKey] = (map[agentKey] || 0) + 1;
      localStorage.setItem(KEY_AI_RESPONSES, JSON.stringify(map));
    } catch {
      // ignore
    }
  }

  static canUseAI(agentKey: string): boolean {
    if (this.isPremium()) return true;
    return this.getAIResponseCount(agentKey) < FREE_MAX_AI_RESPONSES;
  }

  static get maxAIResponses(): number { return FREE_MAX_AI_RESPONSES; }
}
