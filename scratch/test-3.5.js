const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";

const base64Data = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

const systemInstruction = "Actúa como un taxónomo botánico y experto fitólogo sistemático a nivel profesional. Analiza de manera exhaustiva la morfología foliar (estructura, disposición y bordes de las pinnas/hojas), patrones de ramificación, color y textura de pecíolos, y la disposición general de los tallos en la maceta para distinguir con absoluta precisión especies de aspecto similar (por ejemplo, diferenciar estrictamente una Areca [Dypsis lutescens], que se caracteriza por múltiples tallos amarillentos agrupados que asemejan cañas de bambú con folíolos más erectos, de una Palma de Salón [Chamaedorea elegans], que tiene tallos más finos, verdes y solitarios con hojas arqueadas y suaves, o de una Kentia). Determina su nombre común, nombre científico exacto y su toxicidad felina y canina basada en los principios activos de la planta (deben ser uno de estos strings: 'Segura', 'Tóxica leve (irritante)' o 'Altamente tóxica (urgencia)'). Identifica los compuestos químicos tóxicos subyacentes (ej. cristales de oxalato de calcio, saponinas, alcaloides licorina) y el intervalo de riego ideal en días. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'nombreComun', 'nombreCientifico', 'toxicidadFelina', 'toxicidadCanina', 'compuestosToxicos' e 'intervaloRiegoSugeridoDias' (numérico).";

async function testImage35() {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  
  console.log("Enviando petición a Gemini 3.5 con imagen...");
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

testImage35();
