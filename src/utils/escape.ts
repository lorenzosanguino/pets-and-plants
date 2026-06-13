/**
 * Utilidad de saneamiento para escapar caracteres especiales HTML
 * y prevenir ataques de inyección de código (XSS) en plantillas de impresión.
 */
export function escapeHTML(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
