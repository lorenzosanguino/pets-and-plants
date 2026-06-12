import fs from 'fs';
import path from 'path';

const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";

const brainDir = "C:\\Users\\Loren\\.gemini\\antigravity\\brain\\e020591b-7424-4e6c-834b-c1ce29529324";
const filename = "media__1781115015208.jpg";

async function analyzeAreca() {
  const filePath = path.join(brainDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filename} does not exist.`);
    return;
  }

  const imageBuffer = fs.readFileSync(filePath);
  const base64Data = imageBuffer.toString('base64');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Analiza esta planta en detalle. Describe las características visuales que ves (forma de los tallos, color de los tallos, forma de las hojas, disposición de las ramas). Explica botánicamente si se trata de una Areca (Dypsis lutescens), una Palma de Salón (Chamaedorea elegans) u otra especie de palma, y justifica detalladamente tu conclusión." }
          ]
        }]
      })
    });

    console.log(`Status: ${response.status}`);
    const resText = await response.text();
    const data = JSON.parse(resText);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Analysis response:");
    console.log(text);
  } catch (err) {
    console.error("Error:", err);
  }
}

analyzeAreca();
