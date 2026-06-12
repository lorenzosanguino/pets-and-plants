const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";

async function listModels() {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const response = await fetch(endpoint);
    console.log(`Status: ${response.status}`);
    const resText = await response.text();
    console.log("Modelos disponibles:");
    console.log(resText);
  } catch (err) {
    console.error("Excepción:", err);
  }
}

listModels();
