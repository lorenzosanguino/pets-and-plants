import fs from 'fs';
import path from 'path';

const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";

const systemInstruction = "Actúa como un taxónomo botánico y experto fitólogo sistemático a nivel profesional. Analiza de manera exhaustiva la morfología foliar (estructura, disposición y bordes de las pinnas/hojas), patrones de ramificación, color y textura de pecíolos, y la disposición general de los tallos en la maceta para distinguir con absoluta precisión especies de aspecto similar (por ejemplo, diferenciar estrictamente una Areca [Dypsis lutescens], que se caracteriza por múltiples tallos amarillentos agrupados que asemejan cañas de bambú con folíolos más erectos, de una Palma de Salón [Chamaedorea elegans], que tiene tallos más finos, verdes y solitarios con hojas arqueadas y suaves, o de una Kentia). Determina su nombre común, nombre científico exacto y su toxicidad felina y canina basada en los principios activos de la planta (deben ser uno de estos strings: 'Segura', 'Tóxica leve (irritante)' o 'Altamente tóxica (urgencia)'). Identifica los compuestos químicos tóxicos subyacentes (ej. cristales de oxalato de calcio, saponinas, alcaloides licorina) y el intervalo de riego ideal en días. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'nombreComun', 'nombreCientifico', 'toxicidadFelina', 'toxicidadCanina', 'compuestosToxicos' e 'intervaloRiegoSugeridoDias' (numérico).";

const brainDir = "C:\\Users\\Loren\\.gemini\\antigravity\\brain\\e020591b-7424-4e6c-834b-c1ce29529324";
const files = [
  "media__1781110533784.jpg",
  "media__1781111566576.jpg",
  "media__1781111566578.jpg",
  "media__1781111566602.jpg",
  "media__1781113983348.jpg",
  "media__1781114162042.jpg",
  "media__1781115015208.jpg"
];

async function testWithImage(filename) {
  const filePath = path.join(brainDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filename} does not exist.`);
    return;
  }

  console.log(`\n--- Testing image: ${filename} ---`);
  const imageBuffer = fs.readFileSync(filePath);
  const base64Data = imageBuffer.toString('base64');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Identifica esta planta" }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const resText = await response.text();
    const data = JSON.parse(resText);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Response text:");
    console.log(text);
  } catch (err) {
    console.error(`Error processing ${filename}:`, err);
  }
}

async function runAll() {
  // Just test the latest ones first
  await testWithImage("media__1781115015208.jpg");
  await testWithImage("media__1781114162042.jpg");
}

runAll();
