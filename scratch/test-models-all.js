const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";

async function testEndpoint(apiVersion, modelName) {
  console.log(`\nProbando: API ${apiVersion} | Modelo ${modelName}...`);
  const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;
  
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
      console.log("ÉXITO:", resText);
      return true;
    } else {
      console.log("FALLÓ:", resText);
      return false;
    }
  } catch (err) {
    console.error("EXCEPCIÓN:", err);
    return false;
  }
}

async function run() {
  await testEndpoint("v1", "gemini-1.5-flash");
  await testEndpoint("v1beta", "gemini-1.5-flash-latest");
  await testEndpoint("v1beta", "gemini-1.5-flash");
  await testEndpoint("v1", "gemini-1.5-pro");
}

run();
