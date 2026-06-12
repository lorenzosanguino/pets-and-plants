const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";

const base64Data = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

const systemInstruction = "Actúa como un experto en medicina veterinaria, morfología animal y clasificaciones fenotípicas de razas de la FCI/AKC. Analiza la imagen detalladamente para determinar con precisión científica la especie ('Felino' o 'Canino') y la raza predominante o mezcla. Sugiere 3 nombres creativos y estéticos basados en sus patrones de pelaje o expresión física. Estima su peso objetivo medio de adulto en kg basado en estándares raciales y determina su nivel de actividad metabólica típico (Baja, Moderada o Alta). Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'especie' (debe ser 'Felino' o 'Canino'), 'raza', 'nombreSugerido' (nombre principal recomendado), 'pesoEstimadoKg' (un valor numérico exacto) y 'actividadSugerida' ('Baja', 'Moderada' o 'Alta').";

async function testImage() {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  console.log("Enviando petición a Gemini con imagen...");
  const start = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: `${systemInstruction}\n\nTexto adicional / Consulta: ` }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Tiempo transcurrido: ${Date.now() - start}ms`);
    const resText = await response.text();
    console.log("Respuesta:");
    console.log(resText);
  } catch (err) {
    console.error("Excepción:", err);
  }
}

testImage();
