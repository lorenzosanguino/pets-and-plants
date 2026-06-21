import DOMPurify from 'dompurify';

/**
 * Parsea una cadena de texto en formato Markdown simple y la convierte en HTML sanitizado.
 * Soporta negrita (**), cursiva (*), bloques de código (`) y listas de viñetas (- o •).
 * Protege contra inyecciones XSS escapando HTML bruto e inyectando con DOMPurify.
 */
export const renderMarkdownToHTML = (markdown: string | null | undefined): string => {
  if (!markdown) return '';

  // 1. Escapar cualquier etiqueta HTML bruta para neutralizar inyecciones de código antes de formatear
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Formatear negrita (**texto**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 3. Formatear cursiva (*texto*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 4. Formatear código en línea (`código`)
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // 5. Formatear listas de viñetas (- elemento o • elemento)
  // Reemplazar líneas individuales que empiezan con - o • por <li>
  html = html.replace(/^\s*[-•]\s+(.*?)$/gm, '<li>$1</li>');

  // Agrupar elementos <li> adyacentes dentro de una etiqueta <ul>
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

  // 6. Formatear párrafos y saltos de línea
  // Doble salto de línea crea nuevos párrafos
  html = html.replace(/\n\n/g, '</p><p>');
  
  // Salto de línea individual crea un salto físico (<br />)
  html = html.replace(/\n/g, '<br />');

  // Asegurar que todo esté envuelto en un párrafo inicial
  html = `<p>${html}</p>`;

  // Limpiar etiquetas vacías e intermedias huérfanas
  html = html
    .replace(/<p><\/p>/g, '')
    .replace(/<p><br \/>/g, '<p>')
    .replace(/<br \/><\/p>/g, '</p>')
    .replace(/<\/ul><br \/>/g, '</ul>')
    .replace(/<br \/><ul>/g, '<ul>');

  // 7. Sanitizar el HTML final con DOMPurify para eliminar cualquier payload residual
  return DOMPurify.sanitize(html);
};
