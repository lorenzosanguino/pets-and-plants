import { chromium } from 'playwright';

async function check() {
  console.log("Iniciando navegador Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err);
    console.log(`[Browser Page Error]: ${err.message}\nStack: ${err.stack}`);
  });

  console.log("Navegando a http://localhost:5173/...");
  try {
    await page.goto('http://localhost:5173/', { timeout: 10000, waitUntil: 'load' });
    await page.waitForTimeout(3000); // Esperar 3 segundos para que se asiente la renderización
    console.log("Página cargada con éxito.");
  } catch (err) {
    console.error("Error al navegar:", err.message);
  }

  console.log("\n--- RESULTADO ---");
  console.log(`Errores de consola: ${consoleErrors.length}`);
  console.log(`Errores de página: ${pageErrors.length}`);

  await browser.close();
}

check().catch(console.error);
