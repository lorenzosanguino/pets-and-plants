import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert current module URL to path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("Iniciando navegador Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Añadir script de inicialización para inyectar la sesión simulada antes de cargar
  await context.addInitScript(() => {
    const simulatedUser = {
      name: "Lorenzo Sanguino (Simulado)",
      email: "lorenzo@sanguino.com"
    };
    localStorage.setItem('petplant_user_session', JSON.stringify(simulatedUser));
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const networkRequests = [];

  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type().toUpperCase()}]: ${msg.text()}`);
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log(`[Browser Page Error]: ${err.message}\nStack: ${err.stack}`);
  });

  page.on('requestfailed', req => {
    console.log(`[Network Request Failed]: ${req.method()} ${req.url()} - Error: ${req.failure()?.errorText}`);
  });

  page.on('response', res => {
    if (res.url().includes('googleapis.com') || res.status() >= 400) {
      console.log(`[Network Response]: ${res.status()} ${res.url()}`);
      res.text().then(text => {
        console.log(`[Network Response Body]:`, text);
      }).catch(() => {});
    }
  });

  console.log("Navegando a http://localhost:5173/...");
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  // Intentar saltar la pantalla de splash haciendo clic en "Continuar al Dashboard"
  console.log("Buscando botón 'Continuar al Dashboard'...");
  try {
    await page.click('text="Continuar al Dashboard 🚀"', { timeout: 5000 });
    console.log("Haciendo clic en 'Continuar al Dashboard'...");
    await page.waitForTimeout(1000);
  } catch (err) {
    console.log("No se necesitó hacer clic en 'Continuar al Dashboard' o no se encontró.");
  }

  console.log("Haciendo clic en 'Registrar con IA (Escanear)'...");
  await page.click('text="Registrar con IA (Escanear)"');
  await page.waitForTimeout(1000);

  console.log("Subiendo archivo test_image.jpg...");
  const imagePath = path.resolve(__dirname, '../../test_image.jpg');
  console.log(`Ruta de la imagen de prueba: ${imagePath}`);
  
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('text="Subir Archivo 📁"')
  ]);
  await fileChooser.setFiles(imagePath);

  console.log("Esperando 15 segundos para el procesamiento de la IA...");
  await page.waitForTimeout(15000);

  console.log("Cerrando navegador...");
  await browser.close();
}

run().catch(console.error);
