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
      console.log(`ÉXITO: ${modelName}:`, resText);
      return true;
    } else {
      console.log(`FALLÓ: ${modelName}:`, resText);
      return false;
    }
  } catch (err) {
    console.error(`Excepción: ${modelName}:`, err);
    return false;
  }
}

async function run() {
  await testModel("gemini-2.0-flash-lite");
  await testModel("gemini-3.1-flash-lite");
  await testModel("gemini-3.5-flash");
}

run();
