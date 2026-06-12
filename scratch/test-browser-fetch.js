import { chromium } from 'playwright';

async function run() {
  console.log("Iniciando Chromium...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navegando a una página en blanco...");
  await page.goto('about:blank');

  console.log("Ejecutando fetch a Gemini desde el contexto del navegador...");
  const result = await page.evaluate(async () => {
    const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: "Di 'hola' en una palabra." }]
          }]
        })
      });
      const text = await response.text();
      return {
        status: response.status,
        statusText: response.statusText,
        body: text
      };
    } catch (err) {
      return {
        error: err.message || err.toString()
      };
    }
  });

  console.log("\n--- RESULTADO DE FETCH EN NAVEGADOR ---");
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
}

run().catch(console.error);
