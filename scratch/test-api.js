const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";

async function testModel(modelName) {
  console.log(`\nProbando modelo: ${modelName}...`);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
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

    console.log(`Status: ${response.status} ${response.statusText}`);
    const resText = await response.text();
    if (response.ok) {
      console.log(`Respuesta de ${modelName}:`, resText);
    } else {
      console.error(`Error de ${modelName}:`, resText);
    }
  } catch (err) {
    console.error(`Excepción probando ${modelName}:`, err);
  }
}

async function run() {
  await testModel("gemini-2.5-flash");
  await testModel("gemini-1.5-flash");
  await testModel("gemini-2.0-flash");
}

run();
