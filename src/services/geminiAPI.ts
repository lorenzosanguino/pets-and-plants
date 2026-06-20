import type { Mascota, Planta, AnimalExotico } from '../database/types';
import type { DatosClimaticos } from './weatherService';
import { IAQuotaManager } from '../utils/iaQuota';

export interface AnalisisMultimodalResult {
  diagnostico: string;
  tratamiento: string;
  advertencia: string;
  esUrgente: boolean;
  abrirFicha?: {
    tipo: 'mascota' | 'planta' | 'exotico';
    id: string;
  } | null;
}

export interface RegistrarMascotaResult {
  especie: 'Felino' | 'Canino';
  raza: string;
  nombreSugerido: string;
  pesoEstimadoKg: number;
  actividadSugerida: 'Baja' | 'Moderada' | 'Alta';
}

export interface RegistrarPlantaResult {
  nombreComun: string;
  nombreCientifico: string;
  toxicidadFelina: 'Segura' | 'Tóxica leve (irritante)' | 'Altamente tóxica (urgencia)';
  compuestosToxicos?: string;
  intervaloRiegoSugeridoDias: number;
}

// Base de datos de diagnósticos expertos clínicos simulados para pruebas inmediatas
const CLINICAL_KNOWLEDGE_BASE = {
  vet_garrapata: {
    diagnostico: "Sospecha de infestación por Rhipicephalus sanguineus (Garrapata común del perro). Se visualiza artrópodo hematófago anclado en la epidermis epidérmica.",
    tratamiento: "1. No tirar de ella bruscamente para evitar que las piezas bucales (hipostoma) queden incrustadas causándole una infección o granuloma.\n2. Aplicar un algodón impregnado en alcohol o aceite mineral durante 2 minutos para relajar al parásito.\n3. Usar pinzas de punta fina o un extractor específico de garrapatas, sujetándola lo más cerca posible de la piel, y tirar firmemente hacia arriba con una fuerza constante y suave.\n4. Desinfectar la zona con clorhexidina o povidona yodada diluida.",
    advertencia: "Vigilar al animal en los próximos 14 días. Si presenta letargia, fiebre o cojera, derivar inmediatamente al hospital veterinario por riesgo de transmisión de Ehrlichiosis o Babesiosis.",
    esUrgente: false
  },
  vet_herida: {
    diagnostico: "Sospecha de laceración epidérmica superficial o abrasión por rascado/rozadura. Pérdida focal de continuidad cutánea con eritema leve periférico sin exudado purulento.",
    tratamiento: "1. Limpiar cuidadosamente la zona afectada con suero fisiológico estéril para retirar residuos externos.\n2. Recortar el pelo circundante con tijeras de punta roma desinfectadas si obstruye la ventilación de la herida.\n3. Aplicar antiséptico de uso veterinario (clorhexidina diluida al 2%).\n4. Evitar que el animal se lama la zona colocando un collar isabelino o vendaje protector transpirable.",
    advertencia: "Si la herida presenta secreción verdosa, olor fétido, inflamación severa, calor local o el animal muestra dolor agudo al tacto, acude a urgencias para prescripción de antibioterapia sistémica.",
    esUrgente: true
  },
  plant_marron: {
    diagnostico: "Sospecha de estrés hídrico por baja humedad ambiental o quemadura química foliar por sales acumuladas (puntas marrones y crujientes).",
    tratamiento: "1. Recortar las puntas marrones secas con tijeras desinfectadas, dejando un pequeño borde seco para no abrir una nueva herida en tejido vivo.\n2. Cambiar inmediatamente el suministro de riego a agua blanda reposada, destilada o agua de lluvia.\n3. Agrupar la planta con otras especies para generar un microclima húmedo o colocar un plato inferior con guijarros húmedos (sin que la base de la maceta toque directamente el agua).",
    advertencia: "Evita pulverizar las hojas si la temperatura de la habitación es inferior a 18°C, ya que favorece la proliferación de esporas de hongos fitopatógenos.",
    esUrgente: false
  },
  plant_parasito: {
    diagnostico: "Sospecha de infestation por Pseudococcus (Cochinilla algodonosa). Se aprecian depósitos algodonosos blancos cerosos en las axilas de los pecíolos y envés foliar.",
    tratamiento: "1. Aislar físicamente la planta afectada de forma inmediata para evitar la propagación al resto de cultivos.\n2. Limpiar las colonias visibles una a una utilizando un bastoncillo de algodón impregnado en alcohol isopropílico diluido al 70%.\n3. Aplicar una solución pulverizada de Jabón Potásico (20g/L) combinado con Aceite de Neem para disolver la capa cerosa protectora de las ninfas.\n4. Repetir el tratamiento cada 5 días durante 3 semanas consecutivas para romper el ciclo biológico.",
    advertencia: "La cochinilla secreta una melaza dulce que propicia la aparición del hongo Negrilla (Fumagina), debilitando la fotosíntesis de la planta de forma crítica.",
    esUrgente: true
  },
  exo_muda: {
    diagnostico: "Sospecha de disecdisis (muda retenida) en la zona cefálica y extremidades distales debido a bajos niveles de humedad relativa en el terrario.",
    tratamiento: "1. No retirar la piel muerta a la fuerza, ya que podría dañar las escamas o la epidermis subyacente.\n2. Preparar un baño de agua tibia (25-28°C) durante 15-20 minutos para ablandar la queratina vieja.\n3. Proporcionar un escondite húmedo con musgo esfagno humedecido dentro del terrario.\n4. Utilizar suavemente un bastoncillo húmedo para ayudar a deslizar la piel suelta.",
    advertencia: "Prestar especial atención a las lentes oculares (espectáculos) en serpientes; si la muda de los ojos queda retenida consecutivamente, puede provocar ceguera o de lo contrario infección ocular.",
    esUrgente: false
  },
  exo_quemadura: {
    diagnostico: "Sospecha de quemadura térmica de primer o segundo grado focal por contacto directo con bombilla de calefacción cerámica o de infrarrojos desprovista de rejilla protectora.",
    tratamiento: "1. Retirar inmediatamente el acceso directo a la fuente de calor instalando una rejilla de protección.\n2. Lavar la herida con suero fisiológico templado y aplicar pomada de sulfadiazina de plata al 1%.\n3. Mantener al animal en un recinto de cuarentena limpio sobre papel absorbente (sin sustrato de fibra de coco o arena para evitar contaminación).",
    advertencia: "Si la quemadura cubre más del 15% del cuerpo o presenta exudado denso y letargia, acudir urgentemente a un veterinario de exóticos para antibioterapia sistémica.",
    esUrgente: true
  }
};

function cleanAndParseJSON(text: string): any {
  let cleanText = text.trim();
  // Quitar bloques de código markdown si existen (e.g. ```json ... ```)
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
  }
  return JSON.parse(cleanText);
}

const ANALISIS_MULTIMODAL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    diagnostico: { type: 'STRING' },
    tratamiento: { type: 'STRING' },
    advertencia: { type: 'STRING' },
    esUrgente: { type: 'BOOLEAN' },
    abrirFicha: {
      type: 'OBJECT',
      properties: {
        tipo: { type: 'STRING', enum: ['mascota', 'planta', 'exotico'] },
        id: { type: 'STRING' }
      },
      required: ['tipo', 'id']
    }
  },
  required: ['diagnostico', 'tratamiento', 'advertencia', 'esUrgente']
};

const REGISTRAR_MASCOTA_SCHEMA = {
  type: 'OBJECT',
  properties: {
    especie: { type: 'STRING', enum: ['Felino', 'Canino'] },
    raza: { type: 'STRING' },
    nombreSugerido: { type: 'STRING' },
    pesoEstimadoKg: { type: 'NUMBER' },
    actividadSugerida: { type: 'STRING', enum: ['Baja', 'Moderada', 'Alta'] }
  },
  required: ['especie', 'raza', 'nombreSugerido', 'pesoEstimadoKg', 'actividadSugerida']
};

const SALUD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    diagnostico: { type: 'STRING' },
    tratamiento: { type: 'STRING' },
    advertencia: { type: 'STRING' },
    esUrgente: { type: 'BOOLEAN' }
  },
  required: ['diagnostico', 'tratamiento', 'advertencia', 'esUrgente']
};

const REGISTRAR_PLANTA_SCHEMA = {
  type: 'OBJECT',
  properties: {
    nombreComun: { type: 'STRING' },
    nombreCientifico: { type: 'STRING' },
    toxicidadFelina: { type: 'STRING', enum: ['Segura', 'Tóxica leve (irritante)', 'Altamente tóxica (urgencia)'] },
    toxicidadCanina: { type: 'STRING', enum: ['Segura', 'Tóxica leve (irritante)', 'Altamente tóxica (urgencia)'] },
    compuestosToxicos: { type: 'STRING' },
    intervaloRiegoSugeridoDias: { type: 'INTEGER' }
  },
  required: ['nombreComun', 'nombreCientifico', 'toxicidadFelina', 'toxicidadCanina', 'compuestosToxicos', 'intervaloRiegoSugeridoDias']
};

const REGISTRAR_EXOTICO_SCHEMA = {
  type: 'OBJECT',
  properties: {
    especie: { type: 'STRING' },
    tipoEspecifico: { type: 'STRING' },
    nombreSugerido: { type: 'STRING' },
    temperaturaTerrario: { type: 'NUMBER' },
    humedadTerrario: { type: 'NUMBER' },
    intervaloAlimentacionDias: { type: 'NUMBER' }
  },
  required: ['especie', 'tipoEspecifico', 'nombreSugerido', 'temperaturaTerrario', 'humedadTerrario', 'intervaloAlimentacionDias']
};

export class GeminiAPIService {
  static _lastApiError: string | null = null;
  /**
   * Obtiene la clave de API disponible con fallbacks robustos para entornos de desarrollo y producción.
   */
  static getApiKey(): string {
    const envProcess = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
    return (typeof window !== 'undefined' ? localStorage.getItem('petplant_gemini_api_key') : null) ||
           (import.meta.env.VITE_GEMINI_API_KEY as string) ||
           (envProcess?.env?.GEMINI_API_KEY || '') ||
           ''; // Sin clave de API fallback por motivos de seguridad
  }

  /**
   * Envía una petición HTTP a la API de Gemini (directamente o a través del proxy seguro)
   */
  static async requestGemini(payload: any, signal: AbortSignal): Promise<Response> {
    const customKey = typeof window !== 'undefined' ? localStorage.getItem('petplant_gemini_api_key') : null;
    
    if (customKey) {
      // Si el usuario introdujo su propia API key, llamamos directamente a Google Gemini
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${customKey}`;
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      });
    } else {
      // Si usamos la API key por defecto, llamamos al proxy de Vercel para no exponerla.
      // Si estamos en entorno de desarrollo local sin Vercel Dev y tenemos la clave local, podemos usarla de fallback directo.
      const devKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && devKey) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${devKey}`;
        return fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal
        });
      }
      
      const endpoint = '/api/gemini';
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      });
    }
  }

  /**
   * Realiza un diagnóstico multimodal utilizando la clave API real o el simulador experto offline (Backwards compatibility).
   */
  static async analizarImagen(
    imageBlob: Blob | null,
    tipoConsultor: 'veterinario' | 'agronomo' | 'exoticos' | 'chef' | 'chef_exoticos',
    promptTexto: string,
    simulatedTemplateKey?: 'vet_garrapata' | 'vet_herida' | 'plant_marron' | 'plant_parasito',
    dbInfo?: { mascotas: Mascota[]; plantas: Planta[]; exoticos: AnimalExotico[] },
    gpsCoords?: DatosClimaticos,
    historial?: { sender: 'user' | 'ia'; text: string }[]
  ): Promise<AnalisisMultimodalResult> {
    GeminiAPIService._lastApiError = null;
    if (!simulatedTemplateKey) {
      const cuota = IAQuotaManager.obtenerEstadoCuota();
      if (!cuota.esIlimitado && cuota.restantes <= 0) {
        throw new Error(`Límite diario de análisis de IA alcanzado. Estará disponible de nuevo en ${IAQuotaManager.obtenerMensajeTiempoRestante()}. Por favor, introduce tu propia API Key en Ajustes ⚙️.`);
      }
    }

    const apiKey = this.getApiKey();
    const shouldTryApi = !!apiKey || !simulatedTemplateKey;

    if (shouldTryApi) {
      try {
        let base64Data: string | null = null;
        if (imageBlob) {
          base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const resultStr = reader.result as string;
              resolve(resultStr.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
          });
        }

        let dbContext = '';
        if (dbInfo) {
          dbContext = `\n\n--- DATOS DE ELEMENTOS REGISTRADOS EN LA APP ---
El usuario tiene registrados los siguientes elementos. Úsalos como contexto inmediato de consulta. Si el usuario pregunta o se refiere a un elemento por su nombre o descripción (ej. "Enzo", "cactus del salón"), identifícalo a partir de esta lista y responde refiriéndote a él:
- Mascotas: ${dbInfo.mascotas.map(m => {
            const ultimoPeso = m.registroPeso && m.registroPeso.length > 0 ? m.registroPeso[m.registroPeso.length - 1].pesoKg : 'No registrado';
            return `ID: ${m.id}, Nombre: ${m.nombre}, Especie: ${m.especie}, F.Nacimiento: ${m.fechaNacimiento}, Chip: ${m.numeroChip || 'No registrado'}, Peso: ${ultimoPeso}kg`;
          }).join(' | ') || 'Ninguna'}
- Plantas: ${dbInfo.plantas.map(p => `ID: ${p.id}, Nombre Común: ${p.nombreComun}, Nombre Científico: ${p.nombreCientifico || 'Desconocido'}, Ubicación: ${p.ubicacionHabitacion}, Riego cada: ${p.intervaloRiegoDias || 7} días`).join(' | ') || 'Ninguna'}
- Animales Exóticos: ${dbInfo.exoticos.map(e => `ID: ${e.id}, Nombre: ${e.nombre}, Especie: ${e.especie}, Tipo Específico: ${e.tipoEspecifico || 'Desconocido'}, Terrario: Temp ${e.temperaturaTerrario || 26}°C / Hum ${e.humedadTerrario || 60}%`).join(' | ') || 'Ninguno'}`;
        }

        let gpsContext = '';
        if (gpsCoords) {
          gpsContext = `\n\n--- CONTEXTO GPS Y CLIMATOLOGÍA EN VIVO ---
El usuario se encuentra en las siguientes coordenadas y condiciones climáticas obtenidas por GPS en tiempo real. Utiliza esta información (temperatura, humedad, estación del año) para ajustar tus consejos y alertas preventivas de forma proactiva (ej. olas de calor o frío extremo):
- Latitud: ${gpsCoords.latitud}, Longitud: ${gpsCoords.longitud}
- Temperatura: ${gpsCoords.temperatura}°C
- Humedad Relativa: ${gpsCoords.humedad}% HR
- Estación: ${gpsCoords.estacion} (Mes de ${gpsCoords.mesNombre})`;
        }

        const navigationInstruction = `
CRÍTICO - NAVEGACIÓN Y ACCESO A FICHAS: Si el usuario te pide abrir, ir, ver, examinar o acceder a la ficha/tarjeta de una mascota, planta o exótico específico que está registrado, o si te habla de él con clara intención de querer visualizar sus detalles en pantalla (ej. "quiero ver la ficha de Enzo", "ir al cactus de salon", "muestra la tarántula"), DEBES identificar cuál de los elementos de la base de datos coincide. En tal caso, incluye en el JSON una clave llamada "abrirFicha" cuyo valor sea un objeto con la estructura { "tipo": "mascota" | "planta" | "exotico", "id": "id-del-elemento" }. Si el usuario no está pidiendo ver o ir a ninguna ficha en particular, omite por completo la clave "abrirFicha" de la respuesta JSON (no la incluyas).`;

        let systemInstruction = '';
        if (imageBlob) {
          const baseSystemInstruction = tipoConsultor === 'veterinario'
            ? "Actúa como un veterinario clínico experto con especialización en patología comparada y medicina preventiva. Realiza una evaluación exhaustiva y rigurosa de la imagen y los datos clínicos del usuario. Analiza la morfología de las lesiones, eritemas, distensión, secreciones, parásitos (ej. garrapatas, pulgas) o anomalías de comportamiento visual. Tu diagnóstico debe ser altamente técnico y preciso en su terminología médica. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'diagnostico' (descripción detallada con terminología clínica, ej. 'Sospecha de dermatitis húmeda aguda con eritema periférico' en lugar de 'herida'), 'tratamiento' (instrucciones paso a paso detalladas para primeros auxilios preventivos en el hogar), 'advertencia' (alertas clínicas críticas, signos de empeoramiento o riesgos de patógenos vectoriales como ehrlichia/babesia), 'esUrgente' (un booleano true/false que indica si requiere derivación inmediata a urgencias hospitalarias veterinarias), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica)."
            : tipoConsultor === 'exoticos'
            ? "Actúa como un veterinario especialista en animales exóticos, herpetólogo y entomólogo clínico. Analiza minuciosamente la imagen en busca de anomalías dermatológicas, retención de mudas (disecdisis), quemaduras térmicas de bombillas o mantas calefactoras, signos de deshidratación, ácaros del terrario, letargia o distensión. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'diagnostico' (descripción técnica y específica de la especie y su síntoma, ej. 'Disecdisis focal en placas oculares o extremidades distales'), 'tratamiento' (procedimiento terapéutico detallado e hidratación controlada en cautiverio), 'advertencia' (riesgo de constricción de extremidades, septicemia por quemaduras o ceguera por mudas oculares retenidas), 'esUrgente' (un booleano true/false si requiere intervención clínica inmediata o ajuste crítico de parámetros de terrario), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica)."
            : "Actúa como un agrónomo, fitopatólogo y botánico clínico experto. Analiza la imagen minuciosamente identificando patrones de daño foliar, clorosis, necrosis apical, marchitez vascular, presencia de plagas (cochinilla, chips, araña roja, pulgón) o micosis foliares. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'diagnostico' (diagnóstico fitopatológico detallado y preciso, ej. 'Necrosis apical foliar simétrica compatible con estrés osmótico por acumulación de sales solubles' en lugar de 'puntas marrones'), 'tratamiento' (paso a paso detallado que abarque control cultural, físico y tratamientos biológicos o fitosanitarios como jabón potásico/aceite de neem), 'advertencia' (riesgos de negrilla, defoliación total o propagación horizontal a cultivos sanos), 'esUrgente' (un booleano true/false que indica si requiere aislamiento inmediato o intervención de choque para salvar la planta), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";

          const aspectInstruction = `\n\nCRÍTICO - ASPECTO Y RESOLUCIÓN COMPLETOS: Analiza la imagen completa en su resolución y relación de aspecto originales. No asumes que la imagen ha sido recortada a un cuadrado; evalúa todos los elementos visibles en todo el encuadre enviado.`;
          systemInstruction = `${baseSystemInstruction}${dbContext}${gpsContext}${navigationInstruction}${aspectInstruction}`;
        } else {
          let baseSystemInstruction = '';
          if (tipoConsultor === 'chef') {
            baseSystemInstruction = "Actúa como un chef y veterinario nutricionista de mascotas experto. Diseña una receta casera o plan alimentario detallado, saludable y equilibrado para la mascota en base a sus datos de especie, peso y actividad. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'diagnostico' (la receta y desglose de ingredientes detallado en gramos con sus calorías recomendadas, estructurada de forma clara y directa con puntos cortos), 'tratamiento' (instrucciones de preparación paso a paso), 'advertencia' (advertencias de alimentos prohibidos o suplementación como taurina en gatos), 'esUrgente' (un booleano false), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";
          } else if (tipoConsultor === 'chef_exoticos') {
            baseSystemInstruction = "Actúa como un chef y veterinario especialista en nutrición de animales exóticos. Diseña un plan de alimentación detallado, saludable y equilibrado para el animal en base a su especie, peso, temperatura y humedad del terrario. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'diagnostico' (los alimentos recomendados, frecuencia y proporciones, estructurada de forma clara y directa con puntos cortos), 'tratamiento' (instrucciones de preparación o consejos de administración paso a paso), 'advertencia' (advertencias de alimentos prohibidos o suplementos críticos necesarios), 'esUrgente' (un booleano false), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";
          } else if (tipoConsultor === 'veterinario') {
            baseSystemInstruction = "Actúa como un veterinario clínico experto con especialización en bienestar animal and medicina preventiva. Estás en una conversación de chat fluida y natural con el usuario, quien no ha adjuntado ninguna imagen. Responde a su consulta o duda de forma profesional, detallada y comprensiva, como lo haría un experto en una conversación real. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves: 'diagnostico' (tu respuesta completa y fluida al usuario, estructurada con párrafos o listas si es necesario, sin pedirle fotos a menos que sea estrictamente necesario para diagnosticar una lesión física oculta), 'tratamiento' (debe ser una cadena vacía ''), 'advertencia' (debe ser una cadena vacía ''), 'esUrgente' (un booleano false, a menos que el usuario describa una emergencia letal explícita), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";
          } else if (tipoConsultor === 'exoticos') {
            baseSystemInstruction = "Actúa como un veterinario especialista en animales exóticos y terrariofilia. Estás en una conversación de chat fluida y natural con el usuario, quien no ha adjuntado ninguna imagen. Responde a sus dudas sobre parámetros de terrario, alimentación, muda o comportamiento de forma experta, clara y detallada. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves: 'diagnostico' (tu respuesta completa y fluida al usuario, estructurada con párrafos o listas si es necesario, sin pedirle fotos a menos que sea estrictamente necesario para diagnosticar una lesión física oculta), 'tratamiento' (debe ser una cadena vacía ''), 'advertencia' (debe ser una cadena vacía ''), 'esUrgente' (un booleano false, a menos que el usuario describa una emergencia letal explícita), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";
          } else {
            baseSystemInstruction = "Actúa como un agrónomo, botánico y fitopatólogo experto. Estás en una conversación de chat fluida y natural con el usuario, quien no ha adjuntado ninguna imagen. Responde a sus dudas sobre sustratos, riego, luz, abono o cuidados de plantas de forma experta, práctica y detallada. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves: 'diagnostico' (tu respuesta completa y fluida al usuario, estructurada con párrafos o listas si es necesario, sin pedirle fotos a menos que sea estrictamente necesario para diagnosticar una plaga física oculta), 'tratamiento' (debe ser una cadena vacía ''), 'advertencia' (debe ser una cadena vacía ''), 'esUrgente' (un booleano false, a menos que el usuario describa una emergencia letal explícita), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";
          }
          systemInstruction = `${baseSystemInstruction}${dbContext}${gpsContext}${navigationInstruction}`;
        }

        const contents: any[] = [];
        if (historial && historial.length > 0) {
          let expectedRole: 'user' | 'model' = 'user';
          for (const msg of historial) {
            const role = msg.sender === 'user' ? 'user' : 'model';
            if (role === expectedRole) {
              contents.push({
                role,
                parts: [{ text: msg.text }]
              });
              expectedRole = expectedRole === 'user' ? 'model' : 'user';
            }
          }
        }
        
        const currentParts: any[] = [];
        if (imageBlob && base64Data) {
          currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
        }
        currentParts.push({ text: promptTexto });

        if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
          contents[contents.length - 1].parts.push(...currentParts);
        } else {
          contents.push({
            role: 'user',
            parts: currentParts
          });
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout

        let response: Response | null = null;
        let retries = 3;
        let delay = 1000;

        while (retries > 0) {
          try {
            response = await this.requestGemini({
              contents: contents,
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              },
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: ANALISIS_MULTIMODAL_SCHEMA
              }
            }, controller.signal);

            if (response.status === 429 || response.status === 503) {
              console.warn(`Gemini API returned ${response.status} in analizarImagen. Retrying in ${delay}ms...`);
              retries--;
              if (retries === 0) break;
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2;
              continue;
            }
            break;
          } catch (fetchErr) {
            console.warn(`Fetch error in analizarImagen: ${fetchErr}, retrying...`);
            retries--;
            if (retries === 0) throw fetchErr;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          }
        }
        clearTimeout(timeoutId);

        if (response && response.ok) {
          const resData = await response.json();
          const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            const parsed = cleanAndParseJSON(responseText);
            if (!simulatedTemplateKey) {
              IAQuotaManager.registrarUso();
            }
            return {
              diagnostico: parsed.diagnostico || "No se pudo extraer el diagnóstico detallado.",
              tratamiento: parsed.tratamiento || "No se especificó tratamiento.",
              advertencia: parsed.advertencia || "Sin alertas adicionales registradas.",
              esUrgente: !!parsed.esUrgente,
              abrirFicha: parsed.abrirFicha || null
            };
          }
        } else if (response) {
          const errText = await response.text();
          let parsedError = "";
          try {
            const errObj = JSON.parse(errText);
            parsedError = errObj.error?.message || errText;
          } catch {
            parsedError = errText;
          }
          throw new Error(`HTTP ${response.status}: ${parsedError}`);
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Límite diario")) {
          throw err;
        }
        console.error("Fallo en llamada a API de Gemini en analizarImagen, desviando a simulado:", err);
        GeminiAPIService._lastApiError = err.message || String(err);
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        let abrirFicha: any = null;
        if (dbInfo) {
          const textLower = promptTexto.toLowerCase();
          // Buscar mascota
          const matchedPet = dbInfo.mascotas.find(m => textLower.includes(m.nombre.toLowerCase()));
          if (matchedPet) {
            abrirFicha = { tipo: 'mascota', id: matchedPet.id };
          } else {
            // Buscar planta
            const matchedPlant = dbInfo.plantas.find(p => 
              textLower.includes(p.nombreComun.toLowerCase()) || 
              (p.nombreCientifico && textLower.includes(p.nombreCientifico.toLowerCase()))
            );
            if (matchedPlant) {
              abrirFicha = { tipo: 'planta', id: matchedPlant.id };
            } else {
              // Buscar exótico
              const matchedExotic = dbInfo.exoticos.find(e => textLower.includes(e.nombre.toLowerCase()));
              if (matchedExotic) {
                abrirFicha = { tipo: 'exotico', id: matchedExotic.id };
              }
            }
          }
        }

        const text = promptTexto.toLowerCase();

        // Si NO hay imagen física adjunta, forzamos respuestas fluidas y conversacionales (sin tratamientos ni advertencias en cajas adicionales)
        if (!imageBlob && !simulatedTemplateKey) {
          // Interceptar Chef Nutricional (Mascotas caninas/felinas)
          if (tipoConsultor === 'chef') {
            const nombreMatch = promptTexto.match(/Nombre:\s*(.*)/i);
            const especieMatch = promptTexto.match(/Especie:\s*(.*)/i);
            const pesoMatch = promptTexto.match(/Peso:\s*([\d.]+)/i);
            const actividadMatch = promptTexto.match(/Actividad:\s*(.*)/i);

            const nombre = nombreMatch ? nombreMatch[1].trim() : 'Mascota';
            const especie = especieMatch ? especieMatch[1].trim() : 'Perro';
            const peso = pesoMatch ? parseFloat(pesoMatch[1]) : 5;
            const actividad = actividadMatch ? actividadMatch[1].trim() : 'Moderada';

            const esGato = especie.toLowerCase().includes('gato') || especie.toLowerCase().includes('felino');
            const kcal = Math.round(70 * Math.pow(peso, 0.75) * (actividad === 'Alta' ? 1.6 : actividad === 'Baja' ? 1.2 : 1.4));
            const proteina = Math.round(peso * 12);
            const verduras = Math.round(peso * 4);
            const carbohidratos = Math.round(peso * 3);

            const receta = `[Modo Offline - Receta Estimada para ${nombre}]
Requerimiento energético estimado: ${kcal} Kcal/día.

Ingredientes recomendados diariamente:
${esGato ? '🍗 Carne de pollo/pavo magra o salmón' : '🍗 Carne de pollo, pavo o ternera magra'}: ${proteina}g
🥕 Verduras al vapor (Zanahoria, Calabaza, Calabacín): ${verduras}g
${esGato ? '🍚 Arroz cocido (opcional, muy poco)' : '🍚 Arroz o patata cocida'}: ${carbohidratos}g
🦴 Aceite de salmón / Calcio: 1 cucharadita.
${esGato ? '💊 Taurina: Suplemento esencial diario.' : ''}`;

            const errWarning = GeminiAPIService._lastApiError
              ? `\n\n[Error de API: ${GeminiAPIService._lastApiError}]`
              : "";

            resolve({
              diagnostico: receta,
              tratamiento: "Cocinar las proteínas y verduras al vapor sin sal, ajo, cebolla ni condimentos. Mezclar bien con los aceites/suplementos una vez templado.",
              advertencia: `Esta receta es una estimación aproximada sin conexión. Activa el internet o ingresa tu clave API en Ajustes ⚙️ para obtener recetas totalmente personalizadas y dinámicas.${errWarning}`,
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // Interceptar Chef Nutricional (Exóticos)
          if (tipoConsultor === 'chef_exoticos') {
            const nombreMatch = promptTexto.match(/Nombre:\s*(.*)/i);
            const especieMatch = promptTexto.match(/Especie:\s*(.*)/i);
            const tempMatch = promptTexto.match(/Temperatura del terrario:\s*([\d.]+)/i);
            const humMatch = promptTexto.match(/Humedad del terrario:\s*([\d.]+)/i);

            const nombre = nombreMatch ? nombreMatch[1].trim() : 'Animal';
            const especieCompleta = especieMatch ? especieMatch[1].trim() : 'Exótico';
            const temp = tempMatch ? tempMatch[1] : '26';
            const hum = humMatch ? humMatch[1] : '60';

            const especieLower = especieCompleta.toLowerCase();
            let alimentosAdecuados: string;
            let alimentosProhibidos: string;
            let frecuencia: string;
            let suplementos: string;

            if (especieLower.includes('serpiente') || especieLower.includes('pitón') || especieLower.includes('boa') || especieLower.includes('python')) {
              alimentosAdecuados = '• Ratones o ratas de tamaño adecuado (diámetro similar a la parte más ancha de su cuerpo).\n• Se recomienda ofrecer alimento previamente congelado y descongelado a temperatura ambiente.';
              alimentosProhibidos = '• Presas vivas (pueden morder y causar heridas graves e infecciones).\n• Carne procesada, embutidos o alimentos cocinados.';
              frecuencia = '• Ejemplares jóvenes: Cada 5-7 días.\n• Ejemplares adultos: Cada 10-15 días.';
              suplementos = '• No suele requerir si la presa entera está sana, pero se puede espolvorear calcio esporádicamente.';
            } else if (especieLower.includes('rana') || especieLower.includes('sapo') || especieLower.includes('anfibio')) {
              alimentosAdecuados = '• Insectos vivos pequeños cargados de nutrientes (gut-loaded): grillos, moscas de la fruta (Drosophila), pequeñas cucarachas.';
              alimentosProhibidos = '• Insectos capturados en la naturaleza (pueden contener pesticidas o parásitos).\n• Alimentos comerciales para perros o gatos.';
              frecuencia = '• Cada 2-3 días, preferiblemente al atardecer (hábitos crepusculares/nocturnos).';
              suplementos = '• Espolvorear Calcio + Vitamina D3 en los insectos 2 veces por semana, y un complejo multivitamínico para reptiles 1 vez al mes.';
            } else if (especieLower.includes('tarántula') || especieLower.includes('araña') || especieLower.includes('escorpión')) {
              alimentosAdecuados = '• Insectos vivos: grillos, cucarachas Dubia, runners o tenebrios adecuados al tamaño de su prosoma/opistosoma.';
              alimentosProhibidos = '• Insectos grandes o agresivos mientras esté en periodo de premuda o recién mudada (su exoesqueleto es blando y vulnerable).';
              frecuencia = '• Jóvenes: 1-2 veces por semana.\n• Adultos: Cada 10-14 días.';
              suplementos = '• No requiere suplementación de calcio o vitaminas. Mantener agua limpia en un tapón plano.';
            } else {
              alimentosAdecuados = '• Dieta variada según sea insectívoro, herbívoro o carnívoro.\n• Verduras de hoja verde (diente de león, canónigos) e insectos vivos.';
              alimentosProhibidos = '• Lechuga iceberg, espinacas en exceso, aguacate, cítricos, chocolate, azúcares.';
              frecuencia = '• Variable según edad y especie (diaria para herbívoros jóvenes, espaciada para carnívoros).';
              suplementos = '• Calcio sin fósforo espolvoreado en la comida 2-3 veces por semana; Vitamina D3 según exposición a luz UVB.';
            }

            const receta = `[Modo Offline - Guía Nutricional para ${nombre} (${especieCompleta})]
Temperatura de terrario registrada: ${temp}°C
Humedad de terrario registrada: ${hum}%

Alimentos Recomendados:
${alimentosAdecuados}

Frecuencia sugerida:
${frecuencia}`;

            const errWarning = GeminiAPIService._lastApiError
              ? `\n\n[Error de API: ${GeminiAPIService._lastApiError}]`
              : "";

            resolve({
              diagnostico: receta,
              tratamiento: `Administración y Suplementos:\n${suplementos}`,
              advertencia: `Alimentos Prohibidos:\n${alimentosProhibidos}\n\nNota: Esta es una guía de referencia rápida sin conexión. Activa el internet o ingresa tu clave API en Ajustes ⚙️ para obtener un plan nutricional dinámico por IA.${errWarning}`,
              esUrgente: false,
              abrirFicha
            });
            return;
          }
          // 0. Interceptar preguntas sobre cómo enviar o mandar fotos
          if (text.includes('cómo mando') || text.includes('como mando') || text.includes('cómo enviar') || text.includes('como enviar') || text.includes('subir foto') || text.includes('adjuntar')) {
            resolve({
              diagnostico: "Para enviarme una foto de tu mascota, planta o exótico, puedes presionar el botón de la cámara 📷 (para tomar una foto en tiempo real) o hacer clic en el clip de adjunto 📎 (para seleccionar una imagen de tu galería o dispositivo) que se encuentran en la barra inferior del chat, justo al lado del campo de entrada de texto.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // 0.1 Interceptar consultas sobre ácaros en los oídos / otitis (veterinario)
          if (tipoConsultor === 'veterinario' && (text.includes('ácaro') || text.includes('acaro') || text.includes('otitis') || text.includes('sarna'))) {
            resolve({
              diagnostico: "Sospecha de infestación por Otodectes cynotis (ácaros del oído) o bien otitis infecciosa de origen bacteriano/fúngico.\n\nEs sumamente común en felinos observar una secreción auricular de color marrón oscuro, similar a los posos del café, acompañada de prurito intenso (el animal se rasca obsesivamente las orejas o sacude la cabeza de forma repetitiva).\n\nPara el manejo y alivio inicial seguro de tu gato, te recomiendo seguir este protocolo:\n\n1. **Limpieza superficial**: Envuelve tu dedo índice en una gasa estéril humedecida en suero fisiológico y limpia suavemente la cara interna de la oreja, retirando el exceso de cera acumulado. **Nunca introduzcas bastoncillos de algodón** en el conducto auditivo, ya que podrías compactar el cerumen o causar una perforación de tímpano.\n2. **Aislamiento preventivo**: Si convive con otros gatos o perros, sepáralo temporalmente. Los ácaros del oído son sumamente contagiosos por contacto directo entre mascotas, aunque no se transmiten a los humanos.\n3. **Evita gotas óticas no prescritas**: No apliques tratamientos antiguos que tengas en casa. Si la membrana timpánica estuviera perforada debido a la infección, el uso de ciertas gotas óticas puede tener efectos ototóxicos graves, ocasionando sordera o pérdida de equilibrio.\n\n**Recomendación clínica**: Acude al veterinario para que confirme la presencia de ácaros vivos mediante otoscopia o citología microscópica. El tratamiento es muy sencillo y eficaz, consistiendo habitualmente en pipetas spot-on específicas (como selamectina o moxidectina) y antiinflamatorios si hay otitis secundaria dolorosa.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // 0.2 Interceptar consultas sobre gatas en celo y maullidos por celo (veterinario)
          if (tipoConsultor === 'veterinario' && (text.includes('celo') || ((text.includes('maulla') || text.includes('maúlla') || text.includes('maullido')) && (text.includes('gata') || text.includes('celo'))))) {
            resolve({
              diagnostico: "Tu gata está experimentando el estro (fase de celo activo), lo cual es perfectamente normal en hembras enteras (no esterilizadas).\n\nLas gatas son poliéstricas estacionales y su celo está muy influenciado por la luz solar. Durante este período, muestran conductas muy intensas destinadas a atraer machos, incluyendo maullidos extremadamente fuertes y agudos (que parecen lamentos o llantos), frotarse constantemente contra el suelo y objetos, y adoptar una postura característica con el pecho al suelo y la cola alzada (lordosis).\n\nPuedes aplicar estas pautas en casa para calmarla y mantenerla segura durante este ciclo:\n\n1. **Seguridad absoluta**: Mantén todas las ventanas y puertas bien cerradas. Las gatas en celo tienen un instinto reproductivo potentísimo y harán lo imposible por escapar para buscar un macho, arriesgándose a caídas, atropellos o embarazos no deseados.\n2. **Enriquecimiento y distracción**: Dedica más tiempo a jugar con ella usando cañas de juguete o láser para canalizar su energía. Las sesiones de cepillado suave en el lomo y la cabeza también pueden relajarla temporalmente.\n3. **Difusores de feromonas**: Conectar un difusor de feromonas faciales felinas (como Feliway) en la estancia principal puede ayudar a mitigar el estrés y la ansiedad ambiental.\n4. **Zonas cálidas**: Proporciónale mantas térmicas o bolsas de agua templada en su cama, ya que el calor suave suele reconfortar a las gatas en esta fase.\n\n**Nota clínica importante**: El celo suele durar entre 5 y 10 días y se repetirá cada 2 o 3 semanas si no hay fecundación. La solución definitiva y más saludable es la **esterilización (ovariohisterectomía)**. Se aconseja programar la cirugía una vez haya finalizado por completo el celo actual, ya que operar durante el estro conlleva un mayor riesgo de sangrado debido a la congestión de los vasos sanguíneos del aparato reproductor.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // 1. Interceptar preguntas sobre viajes y vacaciones
          if (text.includes('viaje') || text.includes('vacacio') || text.includes('viajar') || text.includes('vacas') || text.includes('ausencia') || text.includes('ir fuera') || text.includes('solo en casa') || text.includes('irme')) {
            if (tipoConsultor === 'veterinario') {
              resolve({
                diagnostico: "Entiendo perfectamente tu duda sobre viajar o ausentarte. Para las vacaciones con tu mascota o si se queda sola, aquí tienes mis recomendaciones profesionales:\n\n1. Si dejas a tu gato solo en casa: Es ideal instalar fuentes de agua eléctrica en movimiento y comederos automáticos. Lo más recomendable es encargar visitas de supervisión al menos cada 48 horas para limpiar el arenero y hacerle compañía.\n2. Si viaja contigo (perro/gato): Utiliza un transportín homologado o arnés de seguridad de doble anclaje. Lleva siempre su cartilla veterinaria al día, microchip y agua fresca para realizar paradas de descanso cada 2 horas.\n\nTen en cuenta que los cambios de entorno pueden causar estrés severo, especialmente a los felinos. Dejarlos en su hogar con visitas de confianza suele ser preferible a trasladarlos, a menos que la ausencia sea muy prolongada.",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });
            } else if (tipoConsultor === 'exoticos') {
              resolve({
                diagnostico: "Preparar un terrario para tu ausencia durante un viaje es fundamental para la seguridad de tus animales exóticos. Te recomiendo seguir este protocolo:\n\n1. Automatización: Conecta las mantas térmicas, bombillas cerámicas y sistemas de iluminación UVB a temporizadores automáticos digitales de confianza.\n2. Parámetros de seguridad: Deja un termohigrómetro con registro de máximas y mínimas a la vista. Facilita las instrucciones de rango óptimo y el contacto de tu veterinario de exóticos de urgencia a la persona encargada de la supervisión.\n\nRecuerda que los reptiles, anfibios e invertebrados son sumamente sensibles a las fluctuaciones de temperatura. Nunca dejes el terrario desatendido por más de 48 horas sin una inspección visual de control.",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });
            } else {
              resolve({
                diagnostico: "Para que tus plantas no sufran durante tus vacaciones o viajes, puedes implementar estos sistemas sencillos de cuidado autónomo:\n\n1. Riego autónomo: Utiliza hidrogel de liberación lenta en el sustrato, o bien cordones de algodón grueso comunicados desde un depósito de agua elevado hacia la maceta.\n2. Agrupación y microclima: Reúne tus plantas en la habitación más fresca y que reciba luz indirecta. La cercanía física incrementa la humedad ambiental local por transpiración compartida.\n\nEvita encharcar las macetas antes de salir, ya que la acumulación de agua estancada y sin ventilación favorece la pudrición radicular acelerada.",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });
            }
            return;
          }

          // 2. Interceptar preguntas sobre comportamiento y conducta (incluyendo agresivo/pacífico)
          if (text.includes('comporta') || text.includes('conducta') || text.includes('maulla') || text.includes('ladra') || text.includes('agresiv') || text.includes('miedo') || text.includes('rasca') || text.includes('orina fuera') || text.includes('pacífic') || text.includes('pacific')) {
            if (tipoConsultor === 'veterinario') {
              resolve({
                diagnostico: "El comportamiento de tu mascota (como mostrarse agresivo, pacífico, con miedo o cambios en su maullido/ladrido) puede estar influenciado por el dolor físico, el estrés o cambios en su entorno. Por ejemplo, en gatos, la agresividad repentina suele ser signo de dolor (como cistitis o problemas dentales), mientras que un estado pacífico/apático repentino puede indicar letargo por fiebre o enfermedad.\n\nPara ayudarte mejor, puedes enviarme una foto de su lenguaje corporal (la postura, las orejas, la cola) o de la situación. ¿Cómo puedes mandarme una foto? Muy fácil: pulsa en el botón de la cámara 📷 para hacer una foto al instante o en el icono del clip 📎 al lado del cuadro de texto de chat para adjuntar una de tu dispositivo.\n\nNo es obligatorio que adjuntes una foto para este tipo de consultas, por lo que podemos seguir charlando por aquí. ¿Ha habido algún cambio reciente en su apetito, juego o rutina?",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });
            } else if (tipoConsultor === 'exoticos') {
              resolve({
                diagnostico: "El comportamiento en animales exóticos (como la letargia, agresividad o conductas defensivas) suele ser una respuesta directa a desajustes en las condiciones de su hábitat. Si notas cambios de temperamento, es vital revisar los parámetros de temperatura y humedad en el terrario.\n\nSi deseas compartir una foto del terrario o de la postura de tu exótico para que la analice, puedes usar el botón de la cámara 📷 o pulsar el clip 📎 al lado del cuadro de texto para adjuntar una imagen.\n\nTambién podemos resolver tus dudas sin fotos. Cuéntame: ¿de qué especie se trata, cuáles son sus parámetros de temperatura/humedad actuales y qué comportamiento específico has observado?",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });
            } else {
              resolve({
                diagnostico: "El movimiento y la respuesta de las hojas de tus plantas (como curvarse, cerrarse o marchitarse) son sus mecanismos de defensa conductuales ante el estrés del entorno (falta de agua, exceso de calor o corrientes de aire).\n\nPara resolver tus dudas no es obligatorio subir una foto, podemos seguir charlando aquí. Si en algún momento deseas mostrarme el estado de sus hojas, puedes presionar el icono de la cámara 📷 para tomar una foto en vivo o usar el clip de adjunto 📎 para subir un archivo.\n\nCuéntame: ¿cada cuántos días la estás regando y qué cambios has notado en sus hojas?",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });
            }
            return;
          }

          // 3. Interceptar temas médicos y plagas específicos para dar respuesta fluida y detallada sin forzar fotos
          if (tipoConsultor === 'veterinario' && (text.includes('garrapata') || text.includes('bicho') || text.includes('parásito'))) {
            resolve({
              diagnostico: "Si sospechas de una garrapata o algún parásito externo en tu mascota, es importante actuar con cuidado para evitar complicaciones. Aquí tienes las pautas recomendadas:\n\n1. Extracción segura: No tires del parásito bruscamente. Aplica un algodón impregnado en alcohol o aceite mineral durante 2 minutos para relajarlo.\n2. Uso de pinzas: Sujeta el parásito con unas pinzas de punta fina lo más cerca posible de la piel del animal y tira firmemente hacia arriba con una fuerza constante y suave.\n3. Desinfección local: Limpia bien la zona afectada con clorhexidina diluida o povidona yodada.\n\nVigila a tu mascota durante las próximas dos semanas. Si presenta fiebre, cojera o letargo, acude al veterinario por riesgo de enfermedades vectoriales como la Ehrlichiosis.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('herida') || text.includes('corte') || text.includes('sangre') || text.includes('laceración'))) {
            resolve({
              diagnostico: "Para tratar una herida superficial, rasguño o corte leve en tu mascota, sigue estas pautas de primeros auxilios:\n\n1. Limpieza inicial: Lava cuidadosamente la zona con suero fisiológico estéril para arrastrar la suciedad.\n2. Desinfección: Aplica un antiséptico apto para mascotas como clorhexidina diluida al 2%.\n3. Protección: Coloca un collar isabelino o un vendaje transpirable temporal si el animal intenta lamerse continuamente.\n\nSi la herida es profunda, no para de sangrar, tiene mal olor o secreción verdosa, acude urgentemente a la clínica veterinaria para valorar puntos de sutura y antibióticos.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('vomit') || text.includes('diarrea') || text.includes('estómago') || text.includes('estomago') || text.includes('barriga') || text.includes('caca') || text.includes('heces') || text.includes('orina') || text.includes('pipi'))) {
            resolve({
              diagnostico: "Si tu mascota presenta vómitos o diarrea, es importante evaluar su estado de hidratación y apetito:\n\n1. Ayuno controlado: Para perros adultos, se aconseja un ayuno de alimentos sólidos de 12 horas (nunca de agua) seguido de una dieta blanda (arroz blanco cocido y pechuga de pollo hervida sin sal ni piel) en pequeñas cantidades.\n2. Felinos: Nunca dejes a un gato en ayuno prolongado (más de 12-24h) por riesgo de lipidosis hepática. Ofrécele directamente comida húmeda digestiva.\n3. Signos de alarma: Si los vómitos son continuados, hay sangre en el vómito o las heces, o notas una gran postración, acude urgentemente al veterinario.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('cojea') || text.includes('pata') || text.includes('cojo') || text.includes('cojera') || text.includes('dolor') || text.includes('hueso') || text.includes('articulación') || text.includes('articulacion') || text.includes('andar') || text.includes('caminar'))) {
            resolve({
              diagnostico: "Si observas que tu mascota cojea o tiene dolor al apoyar una extremidad:\n\n1. Inspección visual y física: Revisa las almohadillas y el espacio interdigital con cuidado. Busca espinas, cortes, trozos de vidrio o uñas rotas.\n2. Reposo absoluto: Evita que salte de sofás, suba escaleras o corra. Realiza paseos cortos únicamente para que haga sus necesidades.\n3. Advertencia crítica: No le administres analgésicos humanos (como ibuprofeno o paracetamol) bajo ningún concepto; son extremadamente tóxicos para perros y gatos. Si no apoya la pata en absoluto o hay inflamación notable, acude a consulta.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('rasca') || text.includes('pica') || text.includes('picor') || text.includes('alergia') || text.includes('dermatitis') || text.includes('calva') || text.includes('pelo') || text.includes('piel') || text.includes('pulga'))) {
            resolve({
              diagnostico: "El rascado frecuente, picor o pérdida de pelo local suele deberse a dermatitis, pulgas, alergias o infecciones dermatológicas:\n\n1. Control antiparasitario: Verifica que su desparasitación externa (pipeta o collar) esté activa y al día.\n2. Baño calmante: Para perros, un baño con agua tibia y champú de avena coloidal específico para mascotas puede aliviar el picor de forma temporal.\n3. Evitar autolesiones: Si se rasca o lame de forma obsesiva en una zona concreta, colócale un collar isabelino temporal para evitar que se produzca una infección secundaria. Consulta con el especialista para realizar un raspado de piel o citología.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('ojo') || text.includes('oreja') || text.includes('oído') || text.includes('oido') || text.includes('secreción') || text.includes('secrecion') || text.includes('legaña') || text.includes('lagrima') || text.includes('sacude'))) {
            resolve({
              diagnostico: "Ante secreciones oculares (parpadeo constante, legañas) o molestias auriculares (se rasca la oreja, sacude la cabeza, mal olor):\n\n1. Limpieza de ojos: Usa una gasa estéril distinta para cada ojo humedecida en suero fisiológico, arrastrando de dentro hacia fuera.\n2. Limpieza de oídos: Limpia únicamente el pabellón externo con una gasa limpia seca. Nunca introduzcas bastoncillos en el conducto auditivo de tu mascota.\n3. Precaución: No uses colirios ni gotas óticas sobrantes que contengan corticoides o antibióticos sin supervisión veterinaria, ya que podrían empeorar una úlcera corneal o una perforación timpánica.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('triste') || text.includes('decaido') || text.includes('decai') || text.includes('apático') || text.includes('apatico') || text.includes('fiebre') || text.includes('temblor') || text.includes('tiembla') || text.includes('calentura'))) {
            resolve({
              diagnostico: "Si observas que tu mascota está decaída, triste, tiembla o tiene fiebre:\n\n1. Temperatura: La temperatura rectal normal de un perro o gato es de 38.0°C a 39.2°C. Si supera los 39.5°C se considera fiebre.\n2. Confort: Asegúrate de colocarlo en un ambiente fresco, tranquilo y ofrécele agua fresca de forma constante.\n3. Valoración clínica: El decaimiento es un síntoma de alarma inespecífico. Si transcurren más de 24 horas apático, rehúsa la comida o se muestra desorientado, llévalo al veterinario.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'exoticos' && (text.includes('muda') || text.includes('piel') || text.includes('retención'))) {
            resolve({
              diagnostico: "La retención de muda (disecdisis) en reptiles suele ser consecuencia de una humedad ambiental insuficiente. Puedes ayudarle de esta manera:\n\n1. Hidratación pasiva: Dale baños de agua tibia (25-28°C) durante 15-20 minutos para reblandecer la queratina vieja.\n2. Escondite húmedo: Introduce una caja refugio con musgo esfagno humedecido dentro del terrario.\n3. Ayuda manual suave: Pasa un bastoncillo húmedo con suavidad sobre las escamas sueltas, pero nunca tires a la fuerza.\n\nPresta especial atención a la punta de la cola y los párpados, ya que la piel retenida en estas zonas puede causar constricción de flujo sanguíneo o ceguera.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'exoticos' && (text.includes('quemadura') || text.includes('calor') || text.includes('bombilla'))) {
            resolve({
              diagnostico: "Si sospechas de una quemadura térmica en tu exótico (generalmente por bombillas o mantas calefactoras desprotegidas), actúa rápido:\n\n1. Aislamiento térmico: Retira al animal de la fuente de calor y coloca rejillas protectoras en las lámparas.\n2. Tratamiento local: Enjuaga con suero templado y aplica pomada de sulfadiazina de plata al 1%.\n3. Cuarentena estéril: Aloja temporalmente al animal en un recinto limpio sobre papel de cocina absorbente como sustrato para evitar infecciones por tierra o arena.\n\nLas quemaduras en reptiles pueden infectarse y causar septicemia rápidamente. Es aconsejable que lo revise un veterinario de exóticos.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'agronomo' && (text.includes('marrón') || text.includes('punta') || text.includes('seca'))) {
            resolve({
              diagnostico: "Las hojas secas o con bordes y puntas marrones en plantas suelen ser causadas por baja humedad ambiental o exceso de sales en el sustrato:\n\n1. Poda cosmética: Recorta las puntas marrones con tijeras desinfectadas, dejando una línea seca fina para evitar abrir nuevas heridas al tejido foliar vivo.\n2. Riego mejorado: Utiliza agua filtrada, destilada o deja reposar el agua del grifo 24 horas para que se evapore el cloro.\n3. Humedad local: Agrupa tus plantas o sitúa la maceta sobre una bandeja con piedras húmedas sin que la base toque el agua.\n\nEvita rociar las hojas si hace frío para no propiciar la proliferación de esporas fúngicas.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'agronomo' && (text.includes('bicho') || text.includes('plaga') || text.includes('parásito') || text.includes('cochinilla'))) {
            resolve({
              diagnostico: "Para combatir plagas comunes como la cochinilla algodonosa, pulgones o araña roja en tu planta:\n\n1. Cuarentena inmediata: Separa la planta de las demás para evitar contagios.\n2. Limpieza manual: Usa un bastoncillo de algodón empapado en alcohol isopropílico al 70% para retirar las cochinillas visibles una a una.\n3. Tratamiento ecológico: Aplica una mezcla pulverizada de Jabón Potásico y Aceite de Neem cada 5 días para romper el ciclo biológico de los insectos.\n\nLimpia también la melaza que dejan para prevenir la aparición del hongo Negrilla, el cual cubre las hojas impidiendo la fotosíntesis.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // 4. Saludos simples: solo para textos cortos de saludo puro
          const esTextoMuyCortoPuroSaludo = text.trim().length < 15 &&
            (text.includes('hola') || text.includes('buenas') || text.includes('hey') || text.includes('buenos') || text === 'hi' || text === 'hello');
          if (esTextoMuyCortoPuroSaludo) {
            let saludoMsg: string;
            if (tipoConsultor === 'veterinario') {
              saludoMsg = "Hola. Como consultor de bienestar y medicina preventiva veterinaria, estoy aquí para resolver tus dudas de forma cercana y profesional. Puedes preguntarme sobre la dieta de tu mascota, su comportamiento, enriquecimiento ambiental, cuidados en casa o pautas preventivas generales. ¡Dime en qué te puedo ayudar hoy!";
            } else if (tipoConsultor === 'exoticos') {
              saludoMsg = "Hola. Soy tu consultor especialista en animales exóticos. Estoy a tu disposición para ayudarte a optimizar las condiciones de tu terrario o acuario, responder dudas sobre la temperatura, humedad y alimentación recomendadas para reptiles, anfibios, aves o artrópodos. ¿Qué especie tienes hoy?";
            } else {
              saludoMsg = "Hola. Como consultor agrónomo y botánico, te doy la bienvenida. Estoy aquí para resolver todas tus dudas sobre el cuidado de tus plantas de interior o jardín, sustratos, frecuencias de riego, fertilización adecuada o microclimas domésticos. ¿De qué planta te gustaría hablar?";
            }
            resolve({ diagnostico: saludoMsg, tratamiento: "", advertencia: "", esUrgente: false, abrirFicha });
            return;
          }

          // 5. Dieta y alimentación
          if (text.includes('dieta') || text.includes('comer') || text.includes('comida') || text.includes('alimentar') || text.includes('alimento') || text.includes('pienso') || text.includes('ración') || text.includes('comid') || text.includes('hambre') || text.includes('apetito') || text.includes('come poco') || text.includes('no come')) {
            if (tipoConsultor === 'veterinario') {
              resolve({
                diagnostico: "La alimentación es uno de los pilares fundamentales de la salud de tu mascota. Aquí te doy las pautas generales más importantes:\n\n🐱 **Para gatos**: Los felinos son carnívoros estrictos. Prioriza piensos con alto contenido en proteína animal (>35%) y bajo en carbohidratos. La alimentación mixta (pienso seco + comida húmeda) mejora la hidratación y reduce el riesgo de problemas renales. Evita el atún de lata en conserva como dieta base (exceso de mercurio y déficit de taurina).\n\n🐶 **Para perros**: La dieta óptima depende de la raza, el peso, la edad y el nivel de actividad. Un adulto sano necesita entre 25-30g de pienso premium por kg de peso al día, dividido en 2 tomas. Los perros de razas grandes se benefician de piensos específicos con glucosamina y condroitina para las articulaciones.\n\n**¿Qué especie tienes y qué duda específica tienes sobre su alimentación?** Puedo darte recomendaciones mucho más precisas si me das más detalles.",
                tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
              });
            } else if (tipoConsultor === 'exoticos') {
              resolve({
                diagnostico: "La alimentación de animales exóticos varía enormemente según la especie. Aquí están los principios más importantes por grupo:\n\n🦎 **Reptiles herbívoros** (iguanas, tortugas): Hojas oscuras ricas en calcio (col rizada, diente de león, endivia) representan el 80% de la dieta. Evita la lechuga iceberg (nulo valor nutricional) y los alimentos con oxalatos en exceso como la espinaca.\n\n🐍 **Serpientes y reptiles carnívoros**: La mayoría se alimentan de ratones o ratas de tamaño apropiado (el roedor no debe superar el ancho del cuerpo de la serpiente). Siempre presas descongeladas, no vivas, para evitar lesiones al animal.\n\n🕷️ **Tarántulas y artrópodos**: Grillos, cucarachas Dubia o moscas del vinagre adaptadas al tamaño del arácnido. Retira las presas vivas no consumidas tras 24h para evitar estrés.\n\n¿Qué especie tienes? Te doy las pautas exactas de frecuencia y tipo de alimento.",
                tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
              });
            } else {
              resolve({
                diagnostico: "La fertilización y el sustrato son la 'dieta' de tus plantas. Estos son los principios clave:\n\n🌿 **Macronutrientes esenciales**: Nitrógeno (N) para el crecimiento foliar y el verde intenso, Fósforo (P) para raíces fuertes y floración, Potasio (K) para la resistencia general y la regulación hídrica.\n\n📅 **Frecuencia de abono**: En temporada de crecimiento (primavera/verano) cada 2-3 semanas con abono líquido equilibrado. En otoño/invierno, reduce o elimina la fertilización, ya que la planta está en reposo y el exceso de sales quema las raíces.\n\n⚠️ **El exceso de fertilizante es más dañino que la falta**: Provoca quemaduras radiculares por acumulación de sales, que se manifiesta como puntas marrones y hojas amarillas con bordes quemados.\n\n¿Qué tipo de planta tienes y en qué fase de crecimiento está? Te oriento con la pauta más adecuada.",
                tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
              });
            }
            return;
          }

          // 6. Vacunas y revisiones veterinarias
          if (tipoConsultor === 'veterinario' && (text.includes('vacuna') || text.includes('vacunaci') || text.includes('cartilla') || text.includes('revisión') || text.includes('revision') || text.includes('veterinario') || text.includes('consulta'))) {
            resolve({
              diagnostico: "El calendario de vacunación y las revisiones periódicas son esenciales para la salud preventiva de tu mascota. Aquí tienes las pautas clave:\n\n🐶 **Perros**:\n- Cachorro: Primera dosis de polivalente (moquillo, parvovirus, adenovirus, parainfluenza) a las 6-8 semanas, con dos refuerzos.\n- Rabia: Obligatoria a partir de los 3 meses (legal en la mayoría de comunidades autónomas).\n- Adulto: Revisión anual con refuerzo de vacunas y análisis de sangre completo a partir de los 7 años.\n\n🐱 **Gatos**:\n- Trivalente felina (rinotraqueítis, calicivirus, panleucopenia) desde las 8 semanas, con refuerzo al mes.\n- Leucemia felina (FeLV) recomendada si tiene acceso al exterior o contacto con otros gatos.\n- Adulto: Revisión anual y control de peso, dientes y parásitos internos/externos.\n\n¿Tienes la cartilla al día o necesitas orientación sobre qué vacunas son prioritarias?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 7. Castración y esterilización
          if (tipoConsultor === 'veterinario' && (text.includes('castr') || text.includes('esteriliz') || text.includes('operar') || text.includes('operaci') || text.includes('celo') || text.includes('reproduc'))) {
            resolve({
              diagnostico: "La esterilización/castración es una de las decisiones más importantes para la salud y bienestar de tu mascota a largo plazo. Aquí tienes los datos clínicos clave:\n\n**Beneficios médicos probados**:\n✅ Elimina completamente el riesgo de cáncer de testículos o útero.\n✅ Reduce en un 85% el riesgo de hiperplasia prostática benigna en perros machos.\n✅ Previene la piómetra (infección uterina potencialmente mortal) en hembras.\n✅ Reduce notablemente las conductas territoriales y el marcaje con orina.\n\n**Edad recomendada**:\n- Gatos: Entre 4 y 6 meses, antes del primer celo.\n- Perros pequeños y medianos: 6-8 meses.\n- Perros de razas grandes: Se recomienda esperar hasta los 12-18 meses para no interferir con el cierre de las placas de crecimiento óseo.\n\n**Post-operatorio**: Período de reposo de 10-14 días. Collar isabelino para evitar que lama la herida. Revisión de sutura a los 10 días.\n\n¿Quieres que te explique algo más sobre el procedimiento o el postoperatorio?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 8. Higiene, baño y cuidado externo
          if (tipoConsultor === 'veterinario' && (text.includes('baño') || text.includes('limpiar') || text.includes('higiene') || text.includes('cepillar') || text.includes('diente') || text.includes('oído') || text.includes('peinar') || text.includes('pelo') || text.includes('uñas') || text.includes('grooming'))) {
            resolve({
              diagnostico: "El cuidado externo y la higiene rutinaria son fundamentales para prevenir infecciones y mantener el bienestar de tu mascota:\n\n🛁 **Baños**:\n- Perros: Cada 4-6 semanas con champú específico para mascotas (pH neutro). Secado completo para evitar otitis húmeda.\n- Gatos: Generalmente no necesitan baños. Se asean solos. Solo en casos de suciedad extrema o condición médica.\n\n🦷 **Higiene dental**: El sarro afecta al 80% de los perros mayores de 3 años. Cepillado dental 2-3 veces a semana con pasta veterinaria (nunca pasta humana, el flúor es tóxico). Snacks dentales como complemento.\n\n👂 **Limpieza de oídos**: Con solución limpiadora veterinaria, una vez al mes o si el animal sacude la cabeza frecuentemente. Nunca uses bastoncillos de algodón dentro del canal auditivo.\n\n✂️ **Uñas**: Recorte cada 3-4 semanas. Evita cortar la zona rosada (pulpa vascular) para no producir sangrado.\n\n¿Hay algún aspecto específico del cuidado en el que necesites orientación más detallada?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 9. Riego y agua para plantas (agrónomo)
          if (tipoConsultor === 'agronomo' && (text.includes('riego') || text.includes('regar') || text.includes('agua') || text.includes('humedad') || text.includes('encharch') || text.includes('seco') || text.includes('sustrato'))) {
            resolve({
              diagnostico: "El riego es el factor que más plantas mata en el hogar, normalmente por exceso, no por defecto. Aquí están las claves:\n\n💧 **Regla de oro**: Introduce el dedo 2-3 cm en el sustrato. Si está húmedo, espera. Si está seco, riega abundantemente hasta que el agua salga por los agujeros de drenaje del fondo.\n\n📏 **Señales de exceso de riego**: Hojas amarillas y blandas, base del tallo oscura y blanda (pudrición), olor a tierra húmeda permanente. La pudrición de raíces es la principal causa de muerte de plantas de interior.\n\n📏 **Señales de falta de riego**: Hojas arrugadas o caídas pero firmes, sustrato completamente seco y separado de las paredes de la maceta, color del sustrato muy claro.\n\n🚿 **Calidad del agua**: Usa agua a temperatura ambiente. Si el agua de tu zona es muy calcárea (deja manchas blancas), deja reposar el agua 24h o usa agua filtrada para evitar la acumulación de sales en el sustrato.\n\n¿Qué planta tienes y cuál es tu patrón de riego actual? Así puedo orientarte mejor.",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 10. Luz y ubicación de plantas (agrónomo)
          if (tipoConsultor === 'agronomo' && (text.includes('luz') || text.includes('sol') || text.includes('sombra') || text.includes('ubicac') || text.includes('ventana') || text.includes('interior') || text.includes('exterior') || text.includes('amarilla') || text.includes('amarillo'))) {
            resolve({
              diagnostico: "La luz es el motor de la fotosíntesis y determina completamente el potencial de crecimiento de tus plantas. Aquí los puntos clave:\n\n☀️ **Luz directa intensa**: Suculentas, cactus, hibiscos, geranios. Ubicadas a menos de 30cm de una ventana sur o suroeste.\n\n🌤️ **Luz indirecta brillante**: La mayoría de plantas tropicales de interior (ficus, monsteras, pothos, helechos). Cerca de una ventana con luz difusa, sin sol directo que queme las hojas.\n\n🌑 **Poca luz**: Sansevieria (lengua de tigre), zamioculcas, aglaonema. Toleran rincones alejados de ventanas.\n\n⚠️ **Hojas amarillas**: Aunque puede tener múltiples causas (exceso de riego, falta de nutrientes), en plantas de interior suele ser señal de luz insuficiente o exceso de riego. Si las hojas amarillas caen por la base, es falta de luz. Si son blandas y uniformes, es exceso de agua.\n\n¿Qué planta tienes y dónde está ubicada actualmente? Con esa información puedo decirte si su emplazamiento es el adecuado.",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 11. Temperatura y terrario (exóticos)
          if (tipoConsultor === 'exoticos' && (text.includes('temperatur') || text.includes('terrario') || text.includes('calor') || text.includes('frio') || text.includes('frío') || text.includes('humedad') || text.includes('uvb') || text.includes('lámpara') || text.includes('lampara'))) {
            resolve({
              diagnostico: "Los parámetros ambientales del terrario son la base de la salud de cualquier animal exótico. Aquí los rangos orientativos más importantes:\n\n🦎 **Gecko leopardo**: Zona cálida 30-32°C / Zona fría 24-26°C. Humedad 30-40%. Iluminación UVB no imprescindible pero sí recomendable.\n\n🐍 **Serpientes de maíz/Ball Python**: Zona cálida 28-32°C / Zona fría 24-26°C. Humedad 50-60% (Ball Python hasta 70% en muda). Nunca usar piedras calefactoras de contacto directo.\n\n🐸 **Ranas arbóreas (ej. Litoria)**: Temperatura 22-28°C con gradiente. Humedad 60-80%. Rociar el terrario cada noche para simular el ciclo húmedo nocturno.\n\n🕷️ **Tarántulas terrestres**: 22-28°C temperatura ambiente. Humedad según especie (áridas 30-50%, selváticas 70-80%). Ventilación cruzada esencial para evitar ácaros.\n\n⚠️ **CRÍTICO**: Las fluctuaciones bruscas de temperatura son más peligrosas que una temperatura ligeramente incorrecta pero estable. Invierte en un termostato y termohigrómetro digital con sonda.\n\n¿Qué especie tienes y qué parámetros tienes actualmente?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 12. Edad, longevidad y esperanza de vida
          if (tipoConsultor === 'veterinario' && (text.includes('edad') || text.includes('viejo') || text.includes('anciano') || text.includes('años') || text.includes('cuánto vive') || text.includes('cuanto vive') || text.includes('longev') || text.includes('esperanza'))) {
            resolve({
              diagnostico: "La esperanza de vida y el cuidado del animal mayor son temas muy importantes. Aquí los datos más relevantes:\n\n🐱 **Gatos**: Promedio 13-17 años. Los gatos de interior bien cuidados pueden llegar a los 20 años. A partir de los 10 años, se consideran 'senior' y necesitan controles bianuales, dieta específica para riñones y análisis de tiroides.\n\n🐶 **Perros**: Varía enormemente con la raza. Las razas pequeñas (Chihuahua, Yorkshire) viven 13-18 años. Las razas gigantes (Gran Danés, Mastín) tienen una esperanza de vida de solo 7-10 años. A partir de los 7 años en razas grandes (10 en pequeñas), se consideran 'senior'.\n\n🏥 **Cuidados geriátricos**: El perro/gato senior necesita revisiones cada 6 meses (no anuales), análisis de sangre y orina, control de artritis con suplementos de omega-3 y condroitina/glucosamina, y dieta de mantenimiento con menos calorías y más proteína de calidad.\n\n¿Quieres saber más sobre los cuidados específicos para la edad de tu mascota?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 13. Pregunta genérica conversacional: respuesta contextual en lugar del saludo
          let respuestaGenerica: string;
          const esConversacionIniciada = historial && historial.length > 1;

          if (tipoConsultor === 'veterinario') {
            if (esConversacionIniciada) {
              respuestaGenerica = "Entendido. Para darte una pauta más precisa, ¿me podrías dar algún detalle adicional (como la edad de tu mascota, su peso o si muestra otros síntomas como decaimiento)? Si tienes una foto de la zona o del problema, también puedes adjuntarla usando el botón de la cámara 📷.";
            } else {
              respuestaGenerica = `Entiendo tu consulta. Como especialista en medicina y bienestar animal, intentaré orientarte de la mejor manera posible.\n\nPara darte una respuesta más precisa y útil, necesitaría un poco más de contexto sobre lo que estás observando en tu mascota. Puedo ayudarte con temas como:\n\n• 🍽️ Dieta y alimentación específica por especie y edad\n• 💊 Medicamentos, desparasitación y calendario de vacunas\n• 🏠 Enriquecimiento ambiental y bienestar en el hogar\n• 🩺 Interpretación de síntomas y cuándo acudir a urgencias\n• ✂️ Castración, cirugías y postoperatorios\n• 👵 Cuidados de mascotas senior\n\n¿Me puedes contar con más detalle qué está pasando o qué te preocupa? Si tienes una foto del problema (herida, lesión, parásito), también puedes enviármela usando el botón 📷 de la barra inferior.`;
            }
          } else if (tipoConsultor === 'exoticos') {
            if (esConversacionIniciada) {
              respuestaGenerica = "De acuerdo. Para poder aconsejarte de forma más exacta sobre tu exótico, ¿me indicarías de qué especie se trata, y cuáles son sus parámetros actuales de temperatura o humedad en el terrario?";
            } else {
              respuestaGenerica = `Recibido. Como especialista en animales exóticos y terrariofilia, estoy aquí para ayudarte.\n\nPara orientarte de manera precisa, sería muy útil que me indicaras:\n\n• 🦎 La especie exacta que tienes (gecko leopardo, ball python, tarántula, rana, etc.)\n• 📐 Las dimensiones del terrario/recinto\n• 🌡️ Los parámetros actuales de temperatura y humedad\n• 🍗 Qué y con qué frecuencia come\n\nPuedo ayudarte con configuración de terrarios, identificación de problemas de salud, parámetros óptimos de hábitat, ciclos de alimentación y manejo. Si tienes una foto del animal o del terrario, puedes enviármela con el botón 📷 para un diagnóstico visual más preciso.`;
            }
          } else {
            if (esConversacionIniciada) {
              respuestaGenerica = "Entendido. Para darte la mejor recomendación botánica, ¿podrías indicarme qué especie de planta es, con qué frecuencia la riegas o cuánta luz recibe en su ubicación actual?";
            } else {
              respuestaGenerica = `Entendido. Como agrónomo y fitopatólogo, puedo orientarte sobre el cuidado de tus plantas.\n\nPara darte la recomendación más precisa, cuéntame:\n\n• 🌿 ¿Qué tipo de planta tienes? (nombre si lo conoces)\n• 📍 ¿Dónde está ubicada? (junto a ventana, rincón oscuro, exterior)\n• 💧 ¿Con qué frecuencia la riegas?\n• 🌡️ ¿Qué síntomas concretos observas? (hojas amarillas, marrones, caídas, manchas...)\n\nSi tienes una foto del estado actual de tu planta, puedes enviar la con el botón 📷 para un diagnóstico visual directo y preciso.`;
            }
          }
          resolve({
            diagnostico: respuestaGenerica,
            tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
          });
          return;
        }

        // Si SÍ hay una imagen adjunta (o simulatedTemplateKey), usamos las respuestas clínicas por defecto (con tratamientos y alertas separados)
        let key: any;
        if (simulatedTemplateKey) {
          key = simulatedTemplateKey;
        } else {
          if (tipoConsultor === 'veterinario') {
            key = (text.includes('garrapata') || text.includes('bicho') || text.includes('parásito')) ? 'vet_garrapata' : 'vet_herida';
          } else if (tipoConsultor === 'exoticos') {
            key = (text.includes('muda') || text.includes('piel') || text.includes('retención')) ? 'exo_muda' : 'exo_quemadura';
          } else {
            key = (text.includes('marrón') || text.includes('punta') || text.includes('seca')) ? 'plant_marron' : 'plant_parasito';
          }
        }

        const baseResult = CLINICAL_KNOWLEDGE_BASE[key as keyof typeof CLINICAL_KNOWLEDGE_BASE] || CLINICAL_KNOWLEDGE_BASE['vet_herida'];

        resolve({
          diagnostico: baseResult.diagnostico,
          tratamiento: baseResult.tratamiento,
          advertencia: baseResult.advertencia,
          esUrgente: baseResult.esUrgente,
          abrirFicha
        });
      }, 1000);
    });
  }

  /**
   * Método principal para los 4 modos del Escáner Inteligente Clínico.
   */
  static async analizarSmartScanner(
    imageBlob: Blob | null,
    mode: 'registrar_mascota' | 'salud_mascota' | 'registrar_planta' | 'enfermedad_planta' | 'registrar_exotico' | 'salud_exotico',
    promptTexto?: string
  ): Promise<any> {
    const cuota = IAQuotaManager.obtenerEstadoCuota();
    if (!cuota.esIlimitado && cuota.restantes <= 0) {
      throw new Error(`Límite diario de análisis de IA alcanzado. Estará disponible de nuevo en ${IAQuotaManager.obtenerMensajeTiempoRestante()}. Por favor, introduce tu propia API Key en Ajustes ⚙️.`);
    }



    if (imageBlob) {
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            resolve(resultStr.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageBlob);
        });

        let systemInstruction = "";
        if (mode === 'registrar_mascota') {
          systemInstruction = "Actúa como un experto veterinario genetista y clasificador fenotípico de razas de la FCI/AKC a nivel profesional. Analiza detalladamente la morfología craneal, inserción y forma de orejas, estructura corporal, textura, coloración y patrones del pelaje (por ejemplo, diferenciando rigurosamente gatos de raza común europeo con patrón atigrado/tabby de razas con puntos de color como el Siamés, o identificando mezclas complejas). Sugiere 3 nombres creativos y estéticos basados en sus rasgos o expresión física. Estima su peso objetivo medio de adulto en kg basado en estándares raciales y determina su nivel de actividad metabólica típico (Baja, Moderada o Alta). Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'especie' (debe ser 'Felino' o 'Canino'), 'raza', 'nombreSugerido' (nombre principal recomendado), 'pesoEstimadoKg' (un valor numérico exacto) y 'actividadSugerida' ('Baja', 'Moderada' o 'Alta').";
        } else if (mode === 'salud_mascota') {
          systemInstruction = "Actúa como un veterinario clínico experto con especialización en patología comparada y medicina preventiva. Realiza una evaluación exhaustiva y rigurosa de la imagen y los datos clínicos del usuario. Analiza la morfología de las lesiones, eritemas, distensión, secreciones, parásitos o anomalías de comportamiento visual. Tu diagnóstico debe ser altamente técnico y preciso en su terminología médica. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas cuatro claves de texto: 'diagnostico' (descripción detallada con terminología clínica, ej. 'Sospecha de dermatitis húmeda aguda con eritema periférico' en lugar de 'herida'), 'tratamiento' (instrucciones paso a paso detalladas para primeros auxilios preventivos en el hogar), 'advertencia' (alertas clínicas críticas, signos de empeoramiento o riesgos de patógenos vectoriales como ehrlichia/babesia), y 'esUrgente' (un booleano true/false que indica si requiere derivación inmediata a urgencias hospitalarias veterinarias).";
        } else if (mode === 'registrar_planta') {
          systemInstruction = "Actúa como un taxónomo botánico y experto fitólogo sistemático a nivel profesional. Analiza de manera exhaustiva la morfología foliar (estructura, disposición y bordes de las pinnas/hojas), patrones de ramificación, color y textura de pecíolos, y la disposición general de los tallos en la maceta para distinguir con absoluta precisión especies de aspecto similar (por ejemplo, diferenciar estrictamente una Areca [Dypsis lutescens], que se caracteriza por múltiples tallos amarillentos agrupados que asemejan cañas de bambú con folíolos más erectos, de una Palma de Salón [Chamaedorea elegans], que tiene tallos más finos, verdes y solitarios con hojas arqueadas y suaves, o de una Kentia). Determina su nombre común, nombre científico exacto y su toxicidad felina y canina basada en los principios activos de la planta (deben ser uno de estos strings: 'Segura', 'Tóxica leve (irritante)' o 'Altamente tóxica (urgencia)'). Identifica los compuestos químicos tóxicos subyacentes (ej. cristales de oxalato de calcio, saponinas, alcaloides licorina) y el intervalo de riego ideal en días. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'nombreComun', 'nombreCientifico', 'toxicidadFelina', 'toxicidadCanina', 'compuestosToxicos' e 'intervaloRiegoSugeridoDias' (numérico).";
        } else if (mode === 'enfermedad_planta') {
          systemInstruction = "Actúa como un agrónomo, fitopatólogo y botánico clínico experto. Analiza la imagen minuciosamente identificando patrones de daño foliar, clorosis, necrosis apical, marchitez vascular, presencia de plagas o micosis foliares. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas cuatro claves de texto: 'diagnostico' (diagnóstico fitopatológico detallado y preciso, ej. 'Necrosis apical foliar simétrica compatible con estrés osmótico por acumulación de sales solubles' en lugar de 'puntas marrones'), 'tratamiento' (paso a paso detallado que abarque control cultural, físico y tratamientos biológicos o fitosanitarios como jabón potásico/aceite de neem), 'advertencia' (riesgos de negrilla, defoliación total o propagación horizontal a cultivos sanos), y 'esUrgente' (un booleano true/false que indica si requiere aislamiento inmediato o intervención de choque para salvar la planta).";
        } else if (mode === 'registrar_exotico') {
          systemInstruction = "Actúa como un especialista experto en herpetología, entomología y mantenimiento de especies exóticas a nivel profesional. Analiza de forma minuciosa patrones de coloración, escamas, setas corporales, proporciones y anatomía ocular para identificar con máxima precisión taxonómica la especie exacta (por ejemplo, distinguiendo especies de tarántulas, geckos, serpientes o ranas). Recomienda un nombre característico, la temperatura óptima del terrario (zona cálida/gradiente) en °C (número), la humedad relativa ambiental en % (número), y el intervalo de alimentación recomendado en días (número). Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'especie', 'tipoEspecifico', 'nombreSugerido', 'temperaturaTerrario', 'humedadTerrario', e 'intervaloAlimentacionDias' (todos los valores numéricos deben ser números puros).";
        } else if (mode === 'salud_exotico') {
          systemInstruction = "Actúa como un veterinario especialista en animales exóticos, herpetólogo y entomólogo clínico. Analiza minuciosamente la imagen en busca de anomalías dermatológicas, retención de mudas (disecdisis), quemaduras térmicas de bombillas o mantas calefactoras, signos de deshidratación, ácaros del terrario, letargia o distensión. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas cuatro claves de texto: 'diagnostico' (descripción técnica y específica de la especie y su síntoma, ej. 'Disecdisis focal en placas oculares o extremidades distales'), 'tratamiento' (procedimiento terapéutico detallado e hidratación controlada en cautiverio), 'advertencia' (riesgo de constricción de extremidades, septicemia por quemaduras o ceguera por mudas oculares retenidas), y 'esUrgente' (un booleano true/false si requiere intervención clínica inmediata o ajuste crítico de parámetros de terrario).";
        }
        
        const aspectInstruction = `\n\nCRÍTICO - ASPECTO Y RESOLUCIÓN COMPLETOS: Analiza la imagen completa en su resolución y relación de aspecto originales. No asumes que la imagen ha sido recortada a un cuadrado; evalúa todos los elementos visibles en todo el encuadre enviado.`;
        systemInstruction += aspectInstruction;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout

        const userParts: any[] = [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
        ];
        if (promptTexto) {
          userParts.push({ text: promptTexto });
        }

        let responseSchema: any = SALUD_SCHEMA;
        if (mode === 'registrar_mascota') {
          responseSchema = REGISTRAR_MASCOTA_SCHEMA;
        } else if (mode === 'registrar_planta') {
          responseSchema = REGISTRAR_PLANTA_SCHEMA;
        } else if (mode === 'registrar_exotico') {
          responseSchema = REGISTRAR_EXOTICO_SCHEMA;
        }

        let response: Response | null = null;
        let retries = 3;
        let delay = 1000;

        while (retries > 0) {
          try {
            response = await this.requestGemini({
              systemInstruction: {
                parts: [{ text: systemInstruction }]
              },
              contents: [{
                role: 'user',
                parts: userParts
              }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema
              }
            }, controller.signal);

            if (response.status === 429 || response.status === 503) {
              console.warn(`Gemini API returned ${response.status} in analizarSmartScanner. Retrying in ${delay}ms...`);
              retries--;
              if (retries === 0) break;
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2;
              continue;
            }
            break;
          } catch (fetchErr) {
            console.warn(`Fetch error in analizarSmartScanner: ${fetchErr}, retrying...`);
            retries--;
            if (retries === 0) throw fetchErr;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          }
        }
        clearTimeout(timeoutId);

        if (response && response.ok) {
          const resData = await response.json();
          const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            IAQuotaManager.registrarUso();
            return cleanAndParseJSON(responseText);
          }
        } else if (response) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Límite diario")) {
          throw err;
        }
        console.error("Fallo en llamada a API Gemini en analizarSmartScanner, desviando a simulado:", err);
        const mockRes = this.obtenerResultadoSimuladoSmartScanner(mode, promptTexto);
        return {
          ...mockRes,
          _isSimulated: true,
          _apiError: err.message || err
        };
      }
    }

    // Fallbacks Simulados
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.obtenerResultadoSimuladoSmartScanner(mode, promptTexto));
      }, 1000);
    });
  }

  /**
   * Obtiene resultados simulados offline para el Smart Scanner
   */
  static obtenerResultadoSimuladoSmartScanner(
    mode: string,
    promptTexto?: string
  ): any {
    if (mode === 'registrar_mascota') {
      return {
        especie: 'Felino',
        raza: 'Siamés',
        nombreSugerido: 'Copito',
        pesoEstimadoKg: 4.1,
        actividadSugerida: 'Moderada'
      };
    } else if (mode === 'registrar_planta') {
      return {
        nombreComun: 'Helecho de Boston',
        nombreCientifico: 'Nephrolepis exaltata',
        toxicidadFelina: 'Segura',
        toxicidadCanina: 'Segura',
        compuestosToxicos: '',
        intervaloRiegoSugeridoDias: 5
      };
    } else if (mode === 'registrar_exotico') {
      return {
        especie: 'Tarántula',
        tipoEspecifico: 'Tarántula de rodillas rojas mexicana',
        nombreSugerido: 'Pelusa',
        temperaturaTerrario: 26,
        humedadTerrario: 65,
        intervaloAlimentacionDias: 7
      };
    } else if (mode === 'salud_exotico') {
      return {
        diagnostico: 'Muda retenida leve en extremidades posteriores.',
        tratamiento: 'Incrementar la humedad local rociando agua tibia y proporcionar un refugio húmedo con musgo sphagnum.',
        advertencia: 'Vigilar si la muda no se desprende en 48 horas para evitar constricción.',
        esUrgente: false
      };
    } else if (mode === 'salud_mascota') {
      const text = (promptTexto || '').toLowerCase();
      const key = (text.includes('garrapata') || text.includes('bicho') || text.includes('parásito')) ? 'vet_garrapata' : 'vet_herida';
      return CLINICAL_KNOWLEDGE_BASE[key as keyof typeof CLINICAL_KNOWLEDGE_BASE];
    } else {
      const text = (promptTexto || '').toLowerCase();
      const key = (text.includes('marrón') || text.includes('punta') || text.includes('seca')) ? 'plant_marron' : 'plant_parasito';
      return CLINICAL_KNOWLEDGE_BASE[key as keyof typeof CLINICAL_KNOWLEDGE_BASE];
    }
  }
}
