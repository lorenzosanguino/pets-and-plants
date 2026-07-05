import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swPath = path.join(__dirname, '../public/sw.js');

try {
  let content = fs.readFileSync(swPath, 'utf8');
  
  // Generar timestamp único del build
  const buildTimestamp = Date.now().toString();
  const newCacheName = `const CACHE_NAME = 'petplant-cache-v${buildTimestamp}';`;

  // Reemplazar la declaración const CACHE_NAME
  content = content.replace(/const CACHE_NAME = 'petplant-cache-v\w+';/, newCacheName);

  fs.writeFileSync(swPath, content, 'utf8');
  console.log(`[SW Versioning] Successfully automated CACHE_NAME to: petplant-cache-v${buildTimestamp}`);
} catch (err) {
  console.error('[SW Versioning] Failed to update service worker version:', err);
}
