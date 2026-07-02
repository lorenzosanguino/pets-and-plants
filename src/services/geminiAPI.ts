import type { Mascota, Planta } from '../database/types';
import type { DatosClimaticos } from './weatherService';
import { IAQuotaManager } from '../utils/iaQuota';

export interface AnalisisMultimodalResult {
  diagnostico: string;
  tratamiento: string;
  advertencia: string;
  esUrgente: boolean;
  abrirFicha?: {
    tipo: 'mascota' | 'planta';
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

// Base de datos de diagnósticos expertos clínicos simulados en inglés para pruebas inmediatas
const CLINICAL_KNOWLEDGE_BASE_EN = {
  vet_garrapata: {
    diagnostico: "Suspected infestation by Rhipicephalus sanguineus (Brown dog tick). Hematophagous arthropod visualized anchored in the epidermal skin layer.",
    tratamiento: "1. Do not pull it off abruptly to prevent the mouthparts (hypostome) from remaining embedded, which can cause infection or granuloma.\n2. Apply a cotton swab soaked in alcohol or mineral oil for 2 minutes to relax the parasite.\n3. Use fine-tipped tweezers or a specific tick extractor, grasping it as close to the skin as possible, and pull straight up with steady, gentle force.\n4. Disinfect the area with chlorhexidine or diluted povidone-iodine.",
    advertencia: "Monitor the animal for the next 14 days. If it exhibits lethargy, fever, or limping, refer immediately to a veterinary hospital due to the risk of vector-borne transmission of Ehrlichiosis or Babesiosis.",
    esUrgente: false
  },
  vet_herida: {
    diagnostico: "Suspected superficial epidermal laceration or abrasion due to scratching/friction. Focal loss of skin continuity with mild peripheral erythema, no purulent exudate.",
    tratamiento: "1. Carefully clean the affected area with sterile saline solution to remove external debris.\n2. Clip the surrounding hair with disinfected blunt-nosed scissors if it obstructs wound ventilation.\n3. Apply veterinary antiseptic (diluted 2% chlorhexidine).\n4. Prevent the animal from licking the area by placing an Elizabethan collar or a breathable protective bandage.",
    advertencia: "If the wound exhibits greenish discharge, foul odor, severe swelling, local heat, or if the animal shows acute pain upon touch, go to emergency care for systemic antibiotic prescription.",
    esUrgente: true
  },
  plant_marron: {
    diagnostico: "Suspected water stress due to low environmental humidity or chemical leaf burn due to accumulated salts (brown and crispy tips).",
    tratamiento: "1. Trim dry brown tips with disinfected scissors, leaving a tiny dry border to avoid opening a new wound in live tissue.\n2. Immediately change water supply to soft rested, distilled, or rainwater.\n3. Group the plant with other species to generate a humid microclimate or place a tray underneath with wet pebbles (without the pot base touching the water directly).",
    advertencia: "Avoid spraying leaves if the room temperature is below 18°C, as this favors the proliferation of phytopathogenic fungal spores.",
    esUrgente: false
  },
  plant_parasito: {
    diagnostico: "Suspected infestation by Pseudococcus (Mealybugs). White waxy cottony deposits are visible in the leaf petiole axils and underside.",
    tratamiento: "1. Physically isolate the affected plant immediately to prevent spread to other crops.\n2. Clean visible colonies one by one using a cotton swab dipped in 70% isopropyl alcohol.\n3. Apply a sprayed solution of Potassium Soap (20g/L) combined with Neem Oil to dissolve the protective waxy coating of the nymphs.\n4. Repeat the treatment every 5 days for 3 consecutive weeks to break the biological cycle.",
    advertencia: "Mealybugs secrete sweet honeydew that fosters sooty mold (Fumagina) growth, critically weakening the plant's photosynthesis.",
    esUrgente: true
  },
  exo_muda: {
    diagnostico: "Suspected dysecdysis (retained shed) in the head area and distal extremities due to low relative humidity levels in the terrarium.",
    tratamiento: "1. Do not pull old skin off by force, as this could damage the scales or underlying epidermis.\n2. Prepare a warm water bath (25-28°C) for 15-20 minutes to soften the old keratin.\n3. Provide a humid hide with moistened sphagnum moss inside the terrarium.\n4. Gently use a damp cotton swab to help slide off the loose skin.",
    advertencia: "Pay special attention to ocular spectacles in snakes; if eye sheds are retained consecutively, it can lead to blindness or eye infection.",
    esUrgente: false
  },
  exo_quemadura: {
    diagnostico: "Suspected focal first or second-degree thermal burn due to direct contact with a ceramic or infrared heating bulb lacking a protective wire guard.",
    tratamiento: "1. Immediately remove direct access to the heat source by installing a protective cage.\n2. Wash the wound with lukewarm saline solution and apply 1% silver sulfadiazine ointment.\n3. Keep the animal in a clean quarantine enclosure on absorbent paper towels (no coconut fiber or sand substrate to prevent contamination).",
    advertencia: "If the burn covers more than 15% of the body or exhibits dense discharge and lethargy, urgently visit an exotic animal veterinarian for systemic antibiotics.",
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
        tipo: { type: 'STRING', enum: ['mascota', 'planta'] },
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

  // ---- Caché de respuestas de Gemini (sessionStorage) ----
  private static readonly CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 horas
  private static readonly CACHE_PREFIX = 'gemini_cache_';

  /** Genera una clave de caché simple a partir de un string */
  private static hashKey(text: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(text.length, 2048); i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return `${this.CACHE_PREFIX}${Math.abs(hash)}`;
  }

  /** Intenta leer una respuesta cacheada en sessionStorage */
  private static getCached(key: string): string | null {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > this.CACHE_TTL_MS) {
        sessionStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  /** Guarda una respuesta en sessionStorage */
  private static setCached(key: string, data: string): void {
    try {
      sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // sessionStorage puede estar lleno; ignorar silenciosamente
    }
  }

  /**
   * Envía una petición HTTP a la API de Gemini (directamente o a través del proxy seguro).
   * Las peticiones de texto puro (sin imagen) se cachean en sessionStorage por 4 horas.
   */
  static async requestGemini(payload: any, signal: AbortSignal): Promise<Response> {
    // Intentar caché solo en peticiones sin imagen (para que sean deterministas)
    const hasImage = payload?.contents?.some((c: any) =>
      c?.parts?.some((p: any) => p?.inlineData)
    );

    let cacheKey: string | null = null;
    if (!hasImage) {
      const payloadText = JSON.stringify(payload);
      cacheKey = this.hashKey(payloadText);
      const cached = this.getCached(cacheKey);
      if (cached) {
        // Devolver una Response sintética con el cuerpo cacheado
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Gemini-Cache': 'HIT' }
        });
      }
    }

    const customKey = typeof window !== 'undefined' ? localStorage.getItem('petplant_gemini_api_key') : null;

    let response: Response;
    if (customKey) {
      // Si el usuario introdujo su propia API key, llamamos directamente a Google Gemini
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${customKey}`;
      response = await fetch(endpoint, {
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
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal
        });
      } else {
        const endpoint = '/api/gemini';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal
        });
      }
    }

    // Cachear respuestas exitosas de texto puro
    if (cacheKey && response.ok) {
      const cloned = response.clone();
      cloned.text().then(text => this.setCached(cacheKey!, text)).catch(() => {});
    }

    return response;
  }

  /**
   * Realiza un diagnóstico multimodal utilizando la clave API real o el simulador experto offline (Backwards compatibility).
   */
  static async analizarImagen(
    imageBlob: Blob | null,
    tipoConsultor: 'veterinario' | 'agronomo' | 'chef',
    promptTexto: string,
    simulatedTemplateKey?: 'vet_garrapata' | 'vet_herida' | 'plant_marron' | 'plant_parasito',
    dbInfo?: { mascotas: Mascota[]; plantas: Planta[] },
    gpsCoords?: DatosClimaticos,
    historial?: { sender: 'user' | 'ia'; text: string }[]
  ): Promise<AnalisisMultimodalResult> {
    GeminiAPIService._lastApiError = null;
    const locale = (typeof window !== 'undefined' ? localStorage.getItem('petplant_locale') : null) || 'es';
    if (!simulatedTemplateKey) {
      const cuota = IAQuotaManager.obtenerEstadoCuota();
      if (!cuota.esIlimitado && cuota.restantes <= 0) {
        throw new Error(locale === 'en'
          ? `Daily AI analysis limit reached. It will be available again in ${IAQuotaManager.obtenerMensajeTiempoRestante()}. Please enter your own API Key in Settings ⚙️.`
          : `Límite diario de análisis de IA alcanzado. Estará disponible de nuevo en ${IAQuotaManager.obtenerMensajeTiempoRestante()}. Por favor, introduce tu propia API Key en Ajustes ⚙️.`);
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
          dbContext = locale === 'en'
            ? `\n\n--- REGISTERED APP ELEMENTS DATA ---
The user has registered the following elements. Use them as immediate query context. If the user asks or refers to an element by its name or description (e.g. "Enzo", "living room cactus"), identify it from this list and respond referring to it:
- Pets: ${dbInfo.mascotas.map(m => {
            const ultimoPeso = m.registroPeso && m.registroPeso.length > 0 ? m.registroPeso[m.registroPeso.length - 1].pesoKg : 'Not registered';
            return `ID: ${m.id}, Name: ${m.nombre}, Species: ${m.especie}, Birthdate: ${m.fechaNacimiento}, Chip: ${m.numeroChip || 'Not registered'}, Weight: ${ultimoPeso}kg`;
          }).join(' | ') || 'None'}
- Plants: ${dbInfo.plantas.map(p => `ID: ${p.id}, Common Name: ${p.nombreComun}, Scientific Name: ${p.nombreCientifico || 'Unknown'}, Location: ${p.ubicacionHabitacion}, Watering interval: ${p.intervaloRiegoDias || 7} days`).join(' | ') || 'None'}`
            : `\n\n--- DATOS DE ELEMENTOS REGISTRADOS EN LA APP ---
El usuario tiene registrados los siguientes elementos. Úsalos como contexto inmediato de consulta. Si el usuario pregunta o se refiere a un elemento por su nombre o descripción (ej. "Enzo", "cactus del salón"), identifícalo a partir de esta lista y responde refiriéndote a él:
- Mascotas: ${dbInfo.mascotas.map(m => {
            const ultimoPeso = m.registroPeso && m.registroPeso.length > 0 ? m.registroPeso[m.registroPeso.length - 1].pesoKg : 'No registrado';
            return `ID: ${m.id}, Nombre: ${m.nombre}, Especie: ${m.especie}, F.Nacimiento: ${m.fechaNacimiento}, Chip: ${m.numeroChip || 'No registrado'}, Peso: ${ultimoPeso}kg`;
          }).join(' | ') || 'Ninguna'}
- Plantas: ${dbInfo.plantas.map(p => `ID: ${p.id}, Nombre Común: ${p.nombreComun}, Nombre Científico: ${p.nombreCientifico || 'Desconocido'}, Ubicación: ${p.ubicacionHabitacion}, Riego cada: ${p.intervaloRiegoDias || 7} días`).join(' | ') || 'Ninguna'}`;
        }

        let gpsContext = '';
        if (gpsCoords) {
          gpsContext = locale === 'en'
            ? `\n\n--- LIVE GPS AND WEATHER CONTEXT ---
The user is at the following coordinates and weather conditions obtained by GPS in real time. Use this information (temperature, humidity, season of the year) to adjust your advice and preventive alerts proactively (e.g., heat waves or extreme cold):
- Latitude: ${gpsCoords.latitud}, Longitude: ${gpsCoords.longitud}
- Temperature: ${gpsCoords.temperatura}°C
- Relative Humidity: ${gpsCoords.humedad}% RH
- Season: ${gpsCoords.estacion} (Month of ${gpsCoords.mesNombre})`
            : `\n\n--- CONTEXTO GPS Y CLIMATOLOGÍA EN VIVO ---
El usuario se encuentra en las siguientes coordenadas y condiciones climáticas obtenidas por GPS en tiempo real. Utiliza esta información (temperatura, humedad, estación del año) para ajustar tus consejos y alertas preventivas de forma proactiva (ej. olas de calor o frío extremo):
- Latitud: ${gpsCoords.latitud}, Longitud: ${gpsCoords.longitud}
- Temperatura: ${gpsCoords.temperatura}°C
- Humedad Relativa: ${gpsCoords.humedad}% HR
- Estación: ${gpsCoords.estacion} (Mes de ${gpsCoords.mesNombre})`;
        }

        const navigationInstruction = locale === 'en'
          ? `\n\nCRITICAL - NAVIGATION AND FILE ACCESS: If the user asks you to open, go to, see, examine, or access the file/card of a specific pet or plant that is registered, or if they speak to you with a clear intention of wanting to visualize their details on screen (e.g. "I want to see Enzo's card", "go to the living room cactus"), you MUST identify which database element matches. In this case, include in the JSON a key called "abrirFicha" whose value is an object with the structure { "tipo": "mascota" | "planta", "id": "id-del-elemento" }. If the user is not asking to see or go to any card in particular, omit the "abrirFicha" key from the JSON response entirely (do not include it).`
          : `\n\nCRÍTICO - NAVEGACIÓN Y ACCESO A FICHAS: Si el usuario te pide abrir, ir, ver, examinar o acceder a la ficha/tarjeta de una mascota o planta específica que está registrado, o si te habla de él con clara intención de querer visualizar sus detalles en pantalla (ej. "quiero ver la ficha de Enzo", "ir al cactus de salon"), DEBES identificar cuál de los elementos de la base de datos coincide. En tal caso, incluye en el JSON una clave llamada "abrirFicha" cuyo valor sea un objeto con la estructura { "tipo": "mascota" | "planta", "id": "id-del-elemento" }. Si el usuario no está pidiendo ver o ir a ninguna ficha en particular, omite por completo la clave "abrirFicha" de la respuesta JSON (no la incluyas).`;

        let systemInstruction = '';
        if (imageBlob) {
          let baseSystemInstruction = '';
          if (locale === 'en') {
            baseSystemInstruction = tipoConsultor === 'veterinario'
              ? "Act as an expert clinical veterinarian specializing in comparative pathology and preventive medicine. Perform a thorough and rigorous evaluation of the image and the user's clinical data. Analyze the morphology of lesions, erythema, distension, secretions, parasites (e.g., ticks, fleas), or visual behavioral anomalies. Your diagnosis must be highly technical and precise in its medical terminology. Return your response strictly in a flat JSON format with exactly these text keys: 'diagnostico' (detailed description with clinical terminology, e.g., 'Suspicion of acute moist dermatitis with peripheral erythema' instead of 'wound'), 'tratamiento' (detailed step-by-step instructions for preventive first aid at home), 'advertencia' (critical clinical alerts, signs of worsening, or risks of vector-borne pathogens like ehrlichia/babesia), 'esUrgente' (a boolean true/false indicating whether it requires immediate referral to veterinary hospital emergencies), and optionally 'abrirFicha' (or object, omitting the key if not applicable)."

              : "Act as an expert agronomist, phytopathologist, and clinical botanist. Scrutinize the image, identifying patterns of leaf damage, chlorosis, apical necrosis, vascular wilt, presence of pests (mealybug, scale, spider mite, aphid), or leaf mycosis. Return your response strictly in a flat JSON format with exactly these text keys: 'diagnostico' (detailed and precise phytopathological diagnosis, e.g., 'Symmetric leaf apical necrosis compatible with osmotic stress due to soluble salt accumulation' instead of 'brown tips'), 'tratamiento' (detailed step-by-step covering cultural, physical, and biological or phytosanitary treatments like potassium soap/neem oil), 'advertencia' (risks of sooty mold, total defoliation, or horizontal spread to healthy crops), 'esUrgente' (a boolean true/false indicating whether it requires immediate isolation or shock intervention to save the plant), and optionally 'abrirFicha' (or object, omitting the key if not applicable).";
          } else {
            baseSystemInstruction = tipoConsultor === 'veterinario'
              ? "Actúa como un veterinario clínico experto con especialización en patología comparada y medicina preventiva. Realiza una evaluación exhaustiva y rigurosa de la imagen y los datos clínicos del usuario. Analiza la morfología de las lesiones, eritemas, distensión, secreciones, parásitos (ej. garrapatas, pulgas) o anomalías de comportamiento visual. Tu diagnóstico debe ser altamente técnico y preciso en su terminología médica. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'diagnostico' (descripción detallada con terminología clínica, ej. 'Sospecha de dermatitis húmeda aguda con eritema periférico' en lugar de 'herida'), 'tratamiento' (instrucciones paso a paso detalladas para primeros auxilios preventivos en el hogar), 'advertencia' (alertas clínicas críticas, signos de empeoramiento o riesgos de patógenos vectoriales como ehrlichia/babesia), 'esUrgente' (un booleano true/false que indica si requiere derivación inmediata a urgencias hospitalarias veterinarias), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica)."

              : "Actúa como un agrónomo, fitopatólogo y botánico clínico experto. Analiza la imagen minuciosamente identificando patrones de daño foliar, clorosis, necrosis apical, marchitez vascular, presencia de plagas (cochinilla, chips, araña roja, pulgón) o micosis foliares. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'diagnostico' (diagnóstico fitopatológico detallado y preciso, ej. 'Necrosis apical foliar simétrica compatible con estrés osmótico por acumulación de sales solubles' en lugar de 'puntas marrones'), 'tratamiento' (paso a paso detallado que abarque control cultural, físico y tratamientos biológicos o fitosanitarios como jabón potásico/aceite de neem), 'advertencia' (riesgos de negrilla, defoliación total o propagación horizontal a cultivos sanos), 'esUrgente' (un booleano true/false que indica si requiere aislamiento inmediato o intervención de choque para salvar la planta), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";
          }
          const aspectInstruction = locale === 'en'
            ? `\n\nCRITICAL - FULL ASPECT AND RESOLUTION: Analyze the complete image in its original resolution and aspect ratio. Do not assume the image has been cropped to a square; evaluate all visible elements in the entire frame sent.`
            : `\n\nCRÍTICO - ASPECTO Y RESOLUCIÓN COMPLETOS: Analiza la imagen completa en su resolución y relación de aspecto originales. No asumes que la imagen ha sido recortada a un cuadrado; evalúa todos los elementos visibles en todo el encuadre enviado.`;
          systemInstruction = `${baseSystemInstruction}${dbContext}${gpsContext}${navigationInstruction}${aspectInstruction}`;
        } else {
          let baseSystemInstruction = '';
          if (locale === 'en') {
            if (tipoConsultor === 'chef') {
              baseSystemInstruction = "Act as a chef and expert pet veterinary nutritionist. Design a detailed, healthy, and balanced homemade recipe or food plan for the pet based on their species, weight, and activity data. Return your response strictly in a flat JSON format with exactly these text keys: 'diagnostico' (the recipe and breakdown of ingredients detailed in grams with recommended calories, structured clearly and directly with short bullet points), 'tratamiento' (step-by-step preparation instructions), 'advertencia' (warnings of forbidden foods or critical supplementation like taurine in cats), 'esUrgente' (a boolean false), and optionally 'abrirFicha' (or object, omitting the key if not applicable).";

            } else if (tipoConsultor === 'veterinario') {
              baseSystemInstruction = "Act as an expert clinical veterinarian specializing in animal welfare and preventive medicine. You are in a fluid and natural chat conversation with the user, who has not attached any image. Respond to their inquiry or concern in a professional, detailed, and understanding manner, as an expert would in a real conversation. Return your response strictly in a flat JSON format with exactly these keys: 'diagnostico' (your complete and fluid response to the user, structured with paragraphs or lists if necessary, without asking for photos unless strictly necessary to diagnose an unseen physical injury), 'tratamiento' (must be an empty string ''), 'advertencia' (must be an empty string ''), 'esUrgente' (a boolean false, unless the user describes an explicit life-threatening emergency), and optionally 'abrirFicha' (or object, omitting the key if not applicable).";

            } else {
              baseSystemInstruction = "Act as an expert agronomist, botanist, and phytopathologist. You are in a fluid and natural chat conversation with the user, who has not attached any image. Respond to their questions about substrates, watering, light, fertilizer, or plant care in an expert, practical, and detailed manner. Return your response strictly in a flat JSON format with exactly these keys: 'diagnostico' (your complete and fluid response to the user, structured with paragraphs or lists if necessary, without asking for photos unless strictly necessary to diagnose an unseen physical pest), 'tratamiento' (must be an empty string ''), 'advertencia' (must be an empty string ''), 'esUrgente' (a boolean false, unless the user describes an explicit life-threatening emergency), and optionally 'abrirFicha' (or object, omitting the key if not applicable).";
            }
          } else {
            if (tipoConsultor === 'chef') {
              baseSystemInstruction = "Actúa como un chef y veterinario nutricionista de mascotas experto. Diseña una receta casera o plan alimentario detallado, saludable y equilibrado para la mascota en base a sus datos de especie, peso y actividad. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'diagnostico' (la receta y desglose de ingredientes detallado en gramos con sus calorías recomendadas, estructurada de forma clara y directa con puntos cortos), 'tratamiento' (instrucciones de preparación paso a paso), 'advertencia' (advertencias de alimentos prohibidos o suplementación como taurina en gatos), 'esUrgente' (un booleano false), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";

            } else if (tipoConsultor === 'veterinario') {
              baseSystemInstruction = "Actúa como un veterinario clínico experto con especialización en bienestar animal and medicina preventiva. Estás en una conversación de chat fluida y natural con el usuario, quien no ha adjuntado ninguna imagen. Responde a su consulta o duda de forma profesional, detallada y comprensiva, como lo haría un experto en una conversación real. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves: 'diagnostico' (tu respuesta completa y fluida al usuario, estructurada con párrafos o listas si es necesario, sin pedirle fotos a menos que sea estrictamente necesario para diagnosticar una lesión física oculta), 'tratamiento' (debe ser una cadena vacía ''), 'advertencia' (debe ser una cadena vacía ''), 'esUrgente' (un booleano false, a menos que el usuario describa una emergencia letal explícita), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";

            } else {
              baseSystemInstruction = "Actúa como un agrónomo, botánico y fitopatólogo experto. Estás en una conversación de chat fluida y natural con el usuario, quien no ha adjuntado ninguna imagen. Responde a sus dudas sobre sustratos, riego, luz, abono o cuidados de plantas de forma experta, práctica y detallada. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves: 'diagnostico' (tu respuesta completa y fluida al usuario, estructurada con párrafos o listas si es necesario, sin pedirle fotos a menos que sea estrictamente necesario para diagnosticar una plaga física oculta), 'tratamiento' (debe ser una cadena vacía ''), 'advertencia' (debe ser una cadena vacía ''), 'esUrgente' (un booleano false, a menos que el usuario describa una emergencia letal explícita), y opcionalmente 'abrirFicha' (u objeto, omitiendo la clave si no aplica).";
            }
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
              diagnostico: parsed.diagnostico || (locale === 'en' ? "Could not extract the detailed diagnosis." : "No se pudo extraer el diagnóstico detallado."),
              tratamiento: parsed.tratamiento || (locale === 'en' ? "No treatment was specified." : "No se especificó tratamiento."),
              advertencia: parsed.advertencia || (locale === 'en' ? "No additional alerts recorded." : "Sin alertas adicionales registradas."),
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
        if (err.message && (err.message.includes("Límite diario") || err.message.includes("Daily AI analysis limit"))) {
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

            const receta = locale === 'en'
              ? `[Offline Mode - Estimated Recipe for ${nombre}]\nEstimated energy requirement: ${kcal} Kcal/day.\n\nRecommended daily ingredients:\n${esGato ? '🍗 Lean chicken/turkey or salmon' : '🍗 Lean chicken, turkey or beef'}: ${proteina}g\n🥕 Steamed vegetables (Carrot, Pumpkin, Zucchini): ${verduras}g\n${esGato ? '🍚 Cooked rice (optional, very little)' : '🍚 Cooked rice or potato'}: ${carbohidratos}g\n🦴 Salmon oil / Calcium: 1 teaspoon.\n${esGato ? '💊 Taurine: Essential daily supplement.' : ''}`
              : `[Modo Offline - Receta Estimada para ${nombre}]\nRequerimiento energético estimado: ${kcal} Kcal/día.\n\nIngredientes recomendados diariamente:\n${esGato ? '🍗 Carne de pollo/pavo magra o salmón' : '🍗 Carne de pollo, pavo o ternera magra'}: ${proteina}g\n🥕 Verduras al vapor (Zanahoria, Calabaza, Calabacín): ${verduras}g\n${esGato ? '🍚 Arroz cocido (opcional, muy poco)' : '🍚 Arroz o patata cocida'}: ${carbohidratos}g\n🦴 Aceite de salmón / Calcio: 1 cucharadita.\n${esGato ? '💊 Taurina: Suplemento esencial diario.' : ''}`;

            const errWarning = GeminiAPIService._lastApiError
              ? `\n\n[${locale === 'en' ? 'API Error' : 'Error de API'}: ${GeminiAPIService._lastApiError}]`
              : "";

            resolve({
              diagnostico: receta,
              tratamiento: locale === 'en'
                ? "Cook proteins and vegetables steamed without salt, garlic, onion or seasonings. Mix well with oils/supplements once lukewarm."
                : "Cocinar las proteínas y verduras al vapor sin sal, ajo, cebolla ni condimentos. Mezclar bien con los aceites/suplementos una vez templado.",
              advertencia: locale === 'en'
                ? `This recipe is an approximate offline estimate. Enable internet or enter your API key in Settings ⚙️ for fully personalized and dynamic recipes.${errWarning}`
                : `Esta receta es una estimación aproximada sin conexión. Activa el internet o ingresa tu clave API en Ajustes ⚙️ para obtener recetas totalmente personalizadas y dinámicas.${errWarning}`,
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // 0. Interceptar preguntas sobre cómo enviar o mandar fotos
          if (text.includes('cómo mando') || text.includes('como mando') || text.includes('cómo enviar') || text.includes('como enviar') || text.includes('subir foto') || text.includes('adjuntar') || text.includes('how to send') || text.includes('send a photo') || text.includes('upload photo') || text.includes('attach')) {
            resolve({
              diagnostico: locale === 'en'
                ? "To send me a photo of your pet, plant or exotic animal, you can press the camera button 📷 (to take a real-time photo) or click the attachment clip 📎 (to select an image from your gallery or device) located in the bottom bar of the chat, right next to the text input field."
                : "Para enviarme una foto de tu mascota, planta o exótico, puedes presionar el botón de la cámara 📷 (para tomar una foto en tiempo real) o hacer clic en el clip de adjunto 📎 (para seleccionar una imagen de tu galería o dispositivo) que se encuentran en la barra inferior del chat, justo al lado del campo de entrada de texto.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // 0.1 Interceptar consultas sobre ácaros en los oídos / otitis (veterinario)
          if (tipoConsultor === 'veterinario' && (text.includes('ácaro') || text.includes('acaro') || text.includes('otitis') || text.includes('sarna') || text.includes('ear mite') || text.includes('mite') || text.includes('mange'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "Suspected infestation by Otodectes cynotis (ear mites) or infectious otitis of bacterial/fungal origin.\n\nIt is very common in felines to observe dark brown ear discharge, similar to coffee grounds, accompanied by intense pruritus (the animal obsessively scratches its ears or shakes its head repeatedly).\n\nFor safe initial management and relief for your cat, I recommend the following protocol:\n\n1. **Superficial cleaning**: Wrap your index finger in a sterile gauze dampened with saline solution and gently clean the inner ear surface, removing excess accumulated wax. **Never insert cotton swabs** into the ear canal, as you could compact the wax or cause an eardrum perforation.\n2. **Preventive isolation**: If it lives with other cats or dogs, separate it temporarily. Ear mites are highly contagious through direct contact between pets, although they are not transmitted to humans.\n3. **Avoid unprescribed ear drops**: Do not apply old treatments you have at home. If the eardrum is perforated due to infection, the use of certain ear drops can have serious ototoxic effects, causing deafness or loss of balance.\n\n**Clinical recommendation**: Visit the vet to confirm the presence of live mites through otoscopy or microscopic cytology. Treatment is very simple and effective, usually consisting of specific spot-on pipettes (such as selamectin or moxidectin) and anti-inflammatories if there is a painful secondary otitis."
                : "Sospecha de infestación por Otodectes cynotis (ácaros del oído) o bien otitis infecciosa de origen bacteriano/fúngico.\n\nEs sumamente común en felinos observar una secreción auricular de color marrón oscuro, similar a los posos del café, acompañada de prurito intenso (el animal se rasca obsesivamente las orejas o sacude la cabeza de forma repetitiva).\n\nPara el manejo y alivio inicial seguro de tu gato, te recomiendo seguir este protocolo:\n\n1. **Limpieza superficial**: Envuelve tu dedo índice en una gasa estéril humedecida en suero fisiológico y limpia suavemente la cara interna de la oreja, retirando el exceso de cera acumulado. **Nunca introduzcas bastoncillos de algodón** en el conducto auditivo, ya que podrías compactar el cerumen o causar una perforación de tímpano.\n2. **Aislamiento preventivo**: Si convive con otros gatos o perros, sepáralo temporalmente. Los ácaros del oído son sumamente contagiosos por contacto directo entre mascotas, aunque no se transmiten a los humanos.\n3. **Evita gotas óticas no prescritas**: No apliques tratamientos antiguos que tengas en casa. Si la membrana timpánica estuviera perforada debido a la infección, el uso de ciertas gotas óticas puede tener efectos ototóxicos graves, ocasionando sordera o pérdida de equilibrio.\n\n**Recomendación clínica**: Acude al veterinario para que confirme la presencia de ácaros vivos mediante otoscopia o citología microscópica. El tratamiento es muy sencillo y eficaz, consistiendo habitualmente en pipetas spot-on específicas (como selamectina o moxidectina) y antiinflamatorios si hay otitis secundaria dolorosa.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // 0.2 Interceptar consultas sobre gatas en celo y maullidos por celo (veterinario)
          if (tipoConsultor === 'veterinario' && (text.includes('celo') || text.includes('heat cycle') || text.includes('in heat') || ((text.includes('maulla') || text.includes('maúlla') || text.includes('maullido') || text.includes('meow') || text.includes('yowl')) && (text.includes('gata') || text.includes('celo') || text.includes('cat'))))) {
            resolve({
              diagnostico: locale === 'en'
                ? "Your cat is experiencing estrus (active heat phase), which is perfectly normal in intact (non-spayed) females.\n\nFemale cats are seasonally polyestrous and their heat cycle is heavily influenced by sunlight. During this period, they display very intense behaviors aimed at attracting males, including extremely loud and sharp meowing (which sounds like wailing or crying), constantly rubbing against the floor and objects, and adopting a characteristic posture with the chest down and tail raised (lordosis).\n\nYou can apply these guidelines at home to calm her and keep her safe during this cycle:\n\n1. **Absolute safety**: Keep all windows and doors securely closed. Cats in heat have an extremely powerful reproductive instinct and will do anything to escape to find a mate, risking falls, accidents, or unwanted pregnancies.\n2. **Enrichment and distraction**: Spend more time playing with her using toy wands or a laser to channel her energy. Gentle brushing sessions on her back and head can also relax her temporarily.\n3. **Pheromone diffusers**: Plugging in a feline facial pheromone diffuser (like Feliway) in the main room can help mitigate environmental stress and anxiety.\n4. **Warm areas**: Provide thermal blankets or lukewarm water bottles in her bed, as gentle heat tends to comfort cats in this phase.\n\n**Important clinical note**: The heat usually lasts 5 to 10 days and will repeat every 2 to 3 weeks if there is no fertilization. The definitive and healthiest solution is **spaying (ovariohysterectomy)**. It is advisable to schedule the surgery once the current heat cycle has completely ended, as operating during estrus carries a higher risk of bleeding due to congestion of the reproductive blood vessels."
                : "Tu gata está experimentando el estro (fase de celo activo), lo cual es perfectamente normal en hembras enteras (no esterilizadas).\n\nLas gatas son poliéstricas estacionales y su celo está muy influenciado por la luz solar. Durante este período, muestran conductas muy intensas destinadas a atraer machos, incluyendo maullidos extremadamente fuertes y agudos (que parecen lamentos o llantos), frotarse constantemente contra el suelo y objetos, y adoptar una postura característica con el pecho al suelo y la cola alzada (lordosis).\n\nPuedes aplicar estas pautas en casa para calmarla y mantenerla segura durante este ciclo:\n\n1. **Seguridad absoluta**: Mantén todas las ventanas y puertas bien cerradas. Las gatas en celo tienen un instinto reproductivo potentísimo y harán lo imposible por escapar para buscar un macho, arriesgándose a caídas, atropellos o embarazos no deseados.\n2. **Enriquecimiento y distracción**: Dedica más tiempo a jugar con ella usando cañas de juguete o láser para canalizar su energía. Las sesiones de cepillado suave en el lomo y la cabeza también pueden relajarla temporalmente.\n3. **Difusores de feromonas**: Conectar un difusor de feromonas faciales felinas (como Feliway) en la estancia principal puede ayudar a mitigar el estrés y la ansiedad ambiental.\n4. **Zonas cálidas**: Proporciónale mantas térmicas o bolsas de agua templada en su cama, ya que el calor suave suele reconfortar a las gatas en esta fase.\n\n**Nota clínica importante**: El celo suele durar entre 5 y 10 días y se repetirá cada 2 o 3 semanas si no hay fecundación. La solución definitiva y más saludable es la **esterilización (ovariohisterectomía)**. Se aconseja programar la cirugía una vez haya finalizado por completo el celo actual, ya que operar durante el estro conlleva un mayor riesgo de sangrado debido a la congestión de los vasos sanguíneos del aparato reproductor.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          // 1. Interceptar preguntas sobre viajes y vacaciones
          if (text.includes('viaje') || text.includes('vacacio') || text.includes('viajar') || text.includes('vacas') || text.includes('ausencia') || text.includes('ir fuera') || text.includes('solo en casa') || text.includes('irme') || text.includes('travel') || text.includes('vacation') || text.includes('holiday') || text.includes('trip') || text.includes('away') || text.includes('alone at home')) {
            if (tipoConsultor === 'veterinario') {
              resolve({
                diagnostico: locale === 'en'
                  ? "I completely understand your concern about traveling or being away. For vacations with your pet or if they stay home alone, here are my professional recommendations:\n\n1. If you leave your cat home alone: It is ideal to install electric moving water fountains and automatic feeders. The most advisable thing is to arrange supervision visits at least every 48 hours to clean the litter box and provide company.\n2. If they travel with you (dog/cat): Use an approved carrier or dual-anchor safety harness. Always carry their up-to-date veterinary booklet, microchip documentation, and fresh water to make rest stops every 2 hours.\n\nKeep in mind that environmental changes can cause severe stress, especially in cats. Leaving them in their home with trusted visitors is usually preferable to moving them, unless the absence is very prolonged."
                  : "Entiendo perfectamente tu duda sobre viajar o ausentarte. Para las vacaciones con tu mascota o si se queda sola, aquí tienes mis recomendaciones profesionales:\n\n1. Si dejas a tu gato solo en casa: Es ideal instalar fuentes de agua eléctrica en movimiento y comederos automáticos. Lo más recomendable es encargar visitas de supervisión al menos cada 48 horas para limpiar el arenero y hacerle compañía.\n2. Si viaja contigo (perro/gato): Utiliza un transportín homologado o arnés de seguridad de doble anclaje. Lleva siempre su cartilla veterinaria al día, microchip y agua fresca para realizar paradas de descanso cada 2 horas.\n\nTen en cuenta que los cambios de entorno pueden causar estrés severo, especialmente a los felinos. Dejarlos en su hogar con visitas de confianza suele ser preferible a trasladarlos, a menos que la ausencia sea muy prolongada.",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });

            } else {
              resolve({
                diagnostico: locale === 'en'
                  ? "So your plants don't suffer during your vacations or trips, you can implement these simple autonomous care systems:\n\n1. Autonomous watering: Use slow-release hydrogel in the substrate, or thick cotton wicks connected from an elevated water reservoir to the pot.\n2. Grouping and microclimate: Gather your plants in the coolest room that receives indirect light. Physical closeness increases local ambient humidity through shared transpiration.\n\nAvoid waterlogging the pots before leaving, as the accumulation of stagnant, unventilated water accelerates root rot."
                  : "Para que tus plantas no sufran durante tus vacaciones o viajes, puedes implementar estos sistemas sencillos de cuidado autónomo:\n\n1. Riego autónomo: Utiliza hidrogel de liberación lenta en el sustrato, o bien cordones de algodón grueso comunicados desde un depósito de agua elevado hacia la maceta.\n2. Agrupación y microclima: Reúne tus plantas en la habitación más fresca y que reciba luz indirecta. La cercanía física incrementa la humedad ambiental local por transpiración compartida.\n\nEvita encharcar las macetas antes de salir, ya que la acumulación de agua estancada y sin ventilación favorece la pudrición radicular acelerada.",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });
            }
            return;
          }

          // 2. Interceptar preguntas sobre comportamiento y conducta (incluyendo agresivo/pacífico)
          if (text.includes('comporta') || text.includes('conducta') || text.includes('maulla') || text.includes('ladra') || text.includes('agresiv') || text.includes('miedo') || text.includes('rasca') || text.includes('orina fuera') || text.includes('pacífic') || text.includes('pacific') || text.includes('behavior') || text.includes('behaviour') || text.includes('aggressive') || text.includes('scared') || text.includes('afraid') || text.includes('barking') || text.includes('meowing')) {
            if (tipoConsultor === 'veterinario') {
              resolve({
                diagnostico: locale === 'en'
                  ? "Your pet's behavior (such as being aggressive, calm, fearful, or changes in meowing/barking) can be influenced by physical pain, stress, or changes in their environment. For example, in cats, sudden aggression is often a sign of pain (such as cystitis or dental problems), while a sudden calm/apathetic state may indicate lethargy due to fever or illness.\n\nTo help you better, you can send me a photo of their body language (posture, ears, tail) or of the situation. How can you send me a photo? Very easily: press the camera button 📷 to take an instant photo, or the clip icon 📎 next to the chat text box to attach one from your device.\n\nAttaching a photo is not mandatory for this type of consultation, so we can continue chatting here. Has there been any recent change in their appetite, play, or routine?"
                  : "El comportamiento de tu mascota (como mostrarse agresivo, pacífico, con miedo o cambios en su maullido/ladrido) puede estar influenciado por el dolor físico, el estrés o cambios en su entorno. Por ejemplo, en gatos, la agresividad repentina suele ser signo de dolor (como cistitis o problemas dentales), mientras que un estado pacífico/apático repentino puede indicar letargo por fiebre o enfermedad.\n\nPara ayudarte mejor, puedes enviarme una foto de su lenguaje corporal (la postura, las orejas, la cola) o de la situación. ¿Cómo puedes mandarme una foto? Muy fácil: pulsa en el botón de la cámara 📷 para hacer una foto al instante o en el icono del clip 📎 al lado del cuadro de texto de chat para adjuntar una de tu dispositivo.\n\nNo es obligatorio que adjuntes una foto para este tipo de consultas, por lo que podemos seguir charlando por aquí. ¿Ha habido algún cambio reciente en su apetito, juego o rutina?",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });

            } else {
              resolve({
                diagnostico: locale === 'en'
                  ? "The movement and response of your plant's leaves (such as curling, closing, or wilting) are their behavioral defense mechanisms against environmental stress (lack of water, excessive heat, or air currents).\n\nTo resolve your doubts, uploading a photo is not mandatory — we can continue chatting here. If at any point you'd like to show me the state of the leaves, press the camera icon 📷 to take a live photo, or use the attachment clip 📎 to upload a file.\n\nTell me: how often are you watering it and what changes have you noticed in its leaves?"
                  : "El movimiento y la respuesta de las hojas de tus plantas (como curvarse, cerrarse o marchitarse) son sus mecanismos de defensa conductuales ante el estrés del entorno (falta de agua, exceso de calor o corrientes de aire).\n\nPara resolver tus dudas no es obligatorio subir una foto, podemos seguir charlando aquí. Si en algún momento deseas mostrarme el estado de sus hojas, puedes presionar el icono de la cámara 📷 para tomar una foto en vivo o usar el clip de adjunto 📎 para subir un archivo.\n\nCuéntame: ¿cada cuántos días la estás regando y qué cambios has notado en sus hojas?",
                tratamiento: "",
                advertencia: "",
                esUrgente: false,
                abrirFicha
              });
            }
            return;
          }

          // 3. Interceptar temas médicos y plagas específicos para dar respuesta fluida y detallada sin forzar fotos
          if (tipoConsultor === 'veterinario' && (text.includes('garrapata') || text.includes('bicho') || text.includes('parásito') || text.includes('tick') || text.includes('parasite') || text.includes('flea') || text.includes('lice') || text.includes('bug'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "If you suspect a tick or external parasite on your pet, it is important to act carefully to avoid complications. Here are the recommended steps:\n\n1. Safe removal: Do not pull the parasite off abruptly. Apply a cotton swab soaked in alcohol or mineral oil for 2 minutes to relax it.\n2. Use tweezers: Grasp the parasite with fine-tipped tweezers as close to the animal's skin as possible and pull straight up with steady, gentle force.\n3. Local disinfection: Thoroughly clean the affected area with diluted chlorhexidine or povidone-iodine.\n\nMonitor your pet for the next two weeks. If it presents fever, limping, or lethargy, visit the vet due to the risk of vector-borne diseases such as Ehrlichiosis."
                : "Si sospechas de una garrapata o algún parásito externo en tu mascota, es importante actuar con cuidado para evitar complicaciones. Aquí tienes las pautas recomendadas:\n\n1. Extracción segura: No tires del parásito bruscamente. Aplica un algodón impregnado en alcohol o aceite mineral durante 2 minutos para relajarlo.\n2. Uso de pinzas: Sujeta el parásito con unas pinzas de punta fina lo más cerca posible de la piel del animal y tira firmemente hacia arriba con una fuerza constante y suave.\n3. Desinfección local: Limpia bien la zona afectada con clorhexidina diluida o povidona yodada.\n\nVigila a tu mascota durante las próximas dos semanas. Si presenta fiebre, cojera o letargo, acude al veterinario por riesgo de enfermedades vectoriales como la Ehrlichiosis.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('herida') || text.includes('corte') || text.includes('sangre') || text.includes('laceración') || text.includes('wound') || text.includes('cut') || text.includes('bleed') || text.includes('scratch') || text.includes('laceration'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "To treat a superficial wound, scratch, or mild cut on your pet, follow these first aid guidelines:\n\n1. Initial cleaning: Carefully wash the area with sterile saline solution to remove debris.\n2. Disinfection: Apply a pet-safe antiseptic such as diluted 2% chlorhexidine.\n3. Protection: Place an Elizabethan collar or a temporary breathable bandage if the animal keeps trying to lick the area.\n\nIf the wound is deep, doesn't stop bleeding, has a bad smell, or greenish discharge, go urgently to the veterinary clinic to assess stitches and antibiotics."
                : "Para tratar una herida superficial, rasguño o corte leve en tu mascota, sigue estas pautas de primeros auxilios:\n\n1. Limpieza inicial: Lava cuidadosamente la zona con suero fisiológico estéril para arrastrar la suciedad.\n2. Desinfección: Aplica un antiséptico apto para mascotas como clorhexidina diluida al 2%.\n3. Protección: Coloca un collar isabelino o un vendaje transpirable temporal si el animal intenta lamerse continuamente.\n\nSi la herida es profunda, no para de sangrar, tiene mal olor o secreción verdosa, acude urgentemente a la clínica veterinaria para valorar puntos de sutura y antibióticos.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('vomit') || text.includes('diarrea') || text.includes('estómago') || text.includes('estomago') || text.includes('barriga') || text.includes('caca') || text.includes('heces') || text.includes('orina') || text.includes('pipi') || text.includes('diarrhea') || text.includes('stomach') || text.includes('stool') || text.includes('urine') || text.includes('poop') || text.includes('pee'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "If your pet has vomiting or diarrhea, it is important to assess their hydration and appetite:\n\n1. Controlled fasting: For adult dogs, a 12-hour solid food fast is advised (never water) followed by a bland diet (cooked white rice and boiled skinless chicken breast without salt) in small amounts.\n2. Cats: Never leave a cat fasting for extended periods (more than 12-24h) due to the risk of hepatic lipidosis. Offer them digestive wet food directly.\n3. Warning signs: If vomiting is continuous, there is blood in the vomit or stools, or you notice severe prostration, go to the vet urgently."
                : "Si tu mascota presenta vómitos o diarrea, es importante evaluar su estado de hidratación y apetito:\n\n1. Ayuno controlado: Para perros adultos, se aconseja un ayuno de alimentos sólidos de 12 horas (nunca de agua) seguido de una dieta blanda (arroz blanco cocido y pechuga de pollo hervida sin sal ni piel) en pequeñas cantidades.\n2. Felinos: Nunca dejes a un gato en ayuno prolongado (más de 12-24h) por riesgo de lipidosis hepática. Ofrécele directamente comida húmeda digestiva.\n3. Signos de alarma: Si los vómitos son continuados, hay sangre en el vómito o las heces, o notas una gran postración, acude urgentemente al veterinario.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('cojea') || text.includes('pata') || text.includes('cojo') || text.includes('cojera') || text.includes('dolor') || text.includes('hueso') || text.includes('articulación') || text.includes('articulacion') || text.includes('andar') || text.includes('caminar') || text.includes('limp') || text.includes('limping') || text.includes('paw') || text.includes('pain') || text.includes('bone') || text.includes('joint') || text.includes('walk'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "If you notice your pet limping or having pain when bearing weight on a limb:\n\n1. Visual and physical inspection: Carefully examine the pads and interdigital space. Look for thorns, cuts, pieces of glass, or broken nails.\n2. Complete rest: Prevent them from jumping off sofas, going up stairs, or running. Only take short walks for bathroom needs.\n3. Critical warning: Do not give them human pain relievers (such as ibuprofen or paracetamol) under any circumstances; they are extremely toxic to dogs and cats. If they don't bear weight on the limb at all or there is notable swelling, seek veterinary consultation."
                : "Si observas que tu mascota cojea o tiene dolor al apoyar una extremidad:\n\n1. Inspección visual y física: Revisa las almohadillas y el espacio interdigital con cuidado. Busca espinas, cortes, trozos de vidrio o uñas rotas.\n2. Reposo absoluto: Evita que salte de sofás, suba escaleras o corra. Realiza paseos cortos únicamente para que haga sus necesidades.\n3. Advertencia crítica: No le administres analgésicos humanos (como ibuprofeno o paracetamol) bajo ningún concepto; son extremadamente tóxicos para perros y gatos. Si no apoya la pata en absoluto o hay inflamación notable, acude a consulta.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('rasca') || text.includes('pica') || text.includes('picor') || text.includes('alergia') || text.includes('dermatitis') || text.includes('calva') || text.includes('pelo') || text.includes('piel') || text.includes('pulga') || text.includes('scratch') || text.includes('itch') || text.includes('allergy') || text.includes('hair loss') || text.includes('fur') || text.includes('skin') || text.includes('flea'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "Frequent scratching, itching, or localized hair loss is usually caused by dermatitis, fleas, allergies, or dermatological infections:\n\n1. Antiparasitic control: Verify that their external deworming treatment (spot-on or collar) is active and up to date.\n2. Soothing bath: For dogs, a bath with warm water and pet-specific colloidal oat shampoo can temporarily relieve itching.\n3. Prevent self-injury: If they scratch or lick a specific area obsessively, place a temporary Elizabethan collar to prevent a secondary infection. Consult a specialist for a skin scraping or cytology."
                : "El rascado frecuente, picor o pérdida de pelo local suele deberse a dermatitis, pulgas, alergias o infecciones dermatológicas:\n\n1. Control antiparasitario: Verifica que su desparasitación externa (pipeta o collar) esté activa y al día.\n2. Baño calmante: Para perros, un baño con agua tibia y champú de avena coloidal específico para mascotas puede aliviar el picor de forma temporal.\n3. Evitar autolesiones: Si se rasca o lame de forma obsesiva en una zona concreta, colócale un collar isabelino temporal para evitar que se produzca una infección secundaria. Consulta con el especialista para realizar un raspado de piel o citología.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('ojo') || text.includes('oreja') || text.includes('oído') || text.includes('oido') || text.includes('secreción') || text.includes('secrecion') || text.includes('legaña') || text.includes('lagrima') || text.includes('sacude') || text.includes('eye') || text.includes('ear') || text.includes('discharge') || text.includes('tear') || text.includes('shake head'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "When facing ocular discharge (constant blinking, eye gunk) or ear discomfort (scratches ear, shakes head, bad smell):\n\n1. Eye cleaning: Use a separate sterile gauze for each eye dampened in saline solution, wiping from inside outward.\n2. Ear cleaning: Clean only the outer ear flap with a clean dry gauze. Never insert cotton swabs into your pet's ear canal.\n3. Caution: Do not use leftover eye drops or ear drops containing corticosteroids or antibiotics without veterinary supervision, as they could worsen a corneal ulcer or eardrum perforation."
                : "Ante secreciones oculares (parpadeo constante, legañas) o molestias auriculares (se rasca la oreja, sacude la cabeza, mal olor):\n\n1. Limpieza de ojos: Usa una gasa estéril distinta para cada ojo humedecida en suero fisiológico, arrastrando de dentro hacia fuera.\n2. Limpieza de oídos: Limpia únicamente el pabellón externo con una gasa limpia seca. Nunca introduzcas bastoncillos en el conducto auditivo de tu mascota.\n3. Precaución: No uses colirios ni gotas óticas sobrantes que contengan corticoides o antibióticos sin supervisión veterinaria, ya que podrían empeorar una úlcera corneal o una perforación timpánica.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'veterinario' && (text.includes('triste') || text.includes('decaido') || text.includes('decai') || text.includes('apático') || text.includes('apatico') || text.includes('fiebre') || text.includes('temblor') || text.includes('tiembla') || text.includes('calentura') || text.includes('sad') || text.includes('letharg') || text.includes('apathetic') || text.includes('fever') || text.includes('shiver') || text.includes('trembling'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "If you notice your pet is lethargic, sad, shivering, or has a fever:\n\n1. Temperature: The normal rectal temperature of a dog or cat is 38.0°C to 39.2°C. If it exceeds 39.5°C it is considered a fever.\n2. Comfort: Make sure to place them in a cool, quiet environment and offer them fresh water constantly.\n3. Clinical assessment: Lethargy is a non-specific alarm symptom. If more than 24 hours pass with apathy, refusal to eat, or disorientation, take them to the vet."
                : "Si observas que tu mascota está decaída, triste, tiembla o tiene fiebre:\n\n1. Temperatura: La temperatura rectal normal de un perro o gato es de 38.0°C a 39.2°C. Si supera los 39.5°C se considera fiebre.\n2. Confort: Asegúrate de colocarlo en un ambiente fresco, tranquilo y ofrécele agua fresca de forma constante.\n3. Valoración clínica: El decaimiento es un síntoma de alarma inespecífico. Si transcurren más de 24 horas apático, rehúsa la comida o se muestra desorientado, llévalo al veterinario.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }





          if (tipoConsultor === 'agronomo' && (text.includes('marrón') || text.includes('punta') || text.includes('seca') || text.includes('brown') || text.includes('tip') || text.includes('dry leaf') || text.includes('crispy'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "Dry leaves or leaves with brown edges and tips on plants are usually caused by low ambient humidity or excess salts in the substrate:\n\n1. Cosmetic pruning: Trim brown tips with disinfected scissors, leaving a thin dry border to avoid opening new wounds on live leaf tissue.\n2. Improved watering: Use filtered or distilled water, or let tap water rest for 24 hours to allow chlorine to evaporate.\n3. Local humidity: Group your plants or place the pot on a tray with wet pebbles without the base touching the water.\n\nAvoid spraying leaves in cold weather to prevent the proliferation of fungal spores."
                : "Las hojas secas o con bordes y puntas marrones en plantas suelen ser causadas por baja humedad ambiental o exceso de sales en el sustrato:\n\n1. Poda cosmética: Recorta las puntas marrones con tijeras desinfectadas, dejando una línea seca fina para evitar abrir nuevas heridas al tejido foliar vivo.\n2. Riego mejorado: Utiliza agua filtrada, destilada o deja reposar el agua del grifo 24 horas para que se evapore el cloro.\n3. Humedad local: Agrupa tus plantas o sitúa la maceta sobre una bandeja con piedras húmedas sin que la base toque el agua.\n\nEvita rociar las hojas si hace frío para no propiciar la proliferación de esporas fúngicas.",
              tratamiento: "",
              advertencia: "",
              esUrgente: false,
              abrirFicha
            });
            return;
          }

          if (tipoConsultor === 'agronomo' && (text.includes('bicho') || text.includes('plaga') || text.includes('parásito') || text.includes('cochinilla') || text.includes('pest') || text.includes('bug') || text.includes('insect') || text.includes('mealybug') || text.includes('aphid') || text.includes('spider mite'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "To combat common pests such as mealybugs, aphids, or spider mites on your plant:\n\n1. Immediate quarantine: Separate the plant from the others to avoid spreading.\n2. Manual cleaning: Use a cotton swab soaked in 70% isopropyl alcohol to remove visible mealybugs one by one.\n3. Ecological treatment: Apply a sprayed mixture of Potassium Soap and Neem Oil every 5 days to break the insects' biological cycle.\n\nAlso clean the honeydew they leave behind to prevent the appearance of sooty mold fungus, which covers leaves and blocks photosynthesis."
                : "Para combatir plagas comunes como la cochinilla algodonosa, pulgones o araña roja en tu planta:\n\n1. Cuarentena inmediata: Separa la planta de las demás para evitar contagios.\n2. Limpieza manual: Usa un bastoncillo de algodón empapado en alcohol isopropílico al 70% para retirar las cochinillas visibles una a una.\n3. Tratamiento ecológico: Aplica una mezcla pulverizada de Jabón Potásico y Aceite de Neem cada 5 días para romper el ciclo biológico de los insectos.\n\nLimpia también la melaza que dejan para prevenir la aparición del hongo Negrilla, el cual cubre las hojas impidiendo la fotosíntesis.",
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
              saludoMsg = locale === 'en'
                ? "Hello! As a veterinary wellness and preventive medicine consultant, I'm here to answer your questions in a friendly and professional way. Feel free to ask me about your pet's diet, behavior, environmental enrichment, home care, or general preventive guidelines. How can I help you today?"
                : "Hola. Como consultor de bienestar y medicina preventiva veterinaria, estoy aquí para resolver tus dudas de forma cercana y profesional. Puedes preguntarme sobre la dieta de tu mascota, su comportamiento, enriquecimiento ambiental, cuidados en casa o pautas preventivas generales. ¡Dime en qué te puedo ayudar hoy!";

            } else {
              saludoMsg = locale === 'en'
                ? "Hello! As an agronomist and botanical consultant, welcome. I'm here to answer all your questions about caring for your indoor or garden plants, substrates, watering frequency, proper fertilization, or domestic microclimates. Which plant would you like to talk about?"
                : "Hola. Como consultor agrónomo y botánico, te doy la bienvenida. Estoy aquí para resolver todas tus dudas sobre el cuidado de tus plantas de interior o jardín, sustratos, frecuencias de riego, fertilización adecuada o microclimas domésticos. ¿De qué planta te gustaría hablar?";
            }
            resolve({ diagnostico: saludoMsg, tratamiento: "", advertencia: "", esUrgente: false, abrirFicha });
            return;
          }

          // 5. Dieta y alimentación
          if (text.includes('dieta') || text.includes('comer') || text.includes('comida') || text.includes('alimentar') || text.includes('alimento') || text.includes('pienso') || text.includes('ración') || text.includes('comid') || text.includes('hambre') || text.includes('apetito') || text.includes('come poco') || text.includes('no come') || text.includes('diet') || text.includes('food') || text.includes('eat') || text.includes('feed') || text.includes('hungry') || text.includes('appetite') || text.includes('kibble')) {
            if (tipoConsultor === 'veterinario') {
              resolve({
                diagnostico: locale === 'en'
                  ? "Nutrition is one of the fundamental pillars of your pet's health. Here are the most important general guidelines:\n\n🐱 **For cats**: Felines are strict carnivores. Prioritize kibble with high animal protein content (>35%) and low in carbohydrates. Mixed feeding (dry food + wet food) improves hydration and reduces the risk of kidney problems. Avoid canned tuna as a base diet (excess mercury and taurine deficiency).\n\n🐶 **For dogs**: The optimal diet depends on breed, weight, age, and activity level. A healthy adult needs between 25-30g of premium kibble per kg of body weight per day, divided into 2 meals. Large breed dogs benefit from specific food with glucosamine and chondroitin for joints.\n\n**What species do you have and what specific question do you have about their nutrition?** I can give you much more precise recommendations if you give me more details."
                  : "La alimentación es uno de los pilares fundamentales de la salud de tu mascota. Aquí te doy las pautas generales más importantes:\n\n🐱 **Para gatos**: Los felinos son carnívoros estrictos. Prioriza piensos con alto contenido en proteína animal (>35%) y bajo en carbohidratos. La alimentación mixta (pienso seco + comida húmeda) mejora la hidratación y reduce el riesgo de problemas renales. Evita el atún de lata en conserva como dieta base (exceso de mercurio y déficit de taurina).\n\n🐶 **Para perros**: La dieta óptima depende de la raza, el peso, la edad y el nivel de actividad. Un adulto sano necesita entre 25-30g de pienso premium por kg de peso al día, dividido en 2 tomas. Los perros de razas grandes se benefician de piensos específicos con glucosamina y condroitina para las articulaciones.\n\n**¿Qué especie tienes y qué duda específica tienes sobre su alimentación?** Puedo darte recomendaciones mucho más precisas si me das más detalles.",
                tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
              });

            } else {
              resolve({
                diagnostico: locale === 'en'
                  ? "Fertilization and substrate are the 'diet' of your plants. Here are the key principles:\n\n🌿 **Essential macronutrients**: Nitrogen (N) for leaf growth and deep green color, Phosphorus (P) for strong roots and flowering, Potassium (K) for overall resistance and water regulation.\n\n📅 **Fertilization frequency**: During the growing season (spring/summer) every 2-3 weeks with balanced liquid fertilizer. In autumn/winter, reduce or eliminate fertilization, as the plant is resting and excess salts burn the roots.\n\n⚠️ **Excess fertilizer is more damaging than deficiency**: It causes root burn from salt accumulation, which manifests as brown tips and yellow leaves with burned edges.\n\nWhat type of plant do you have and what growth phase is it in? I'll guide you with the most appropriate approach."
                  : "La fertilización y el sustrato son la 'dieta' de tus plantas. Estos son los principios clave:\n\n🌿 **Macronutrientes esenciales**: Nitrógeno (N) para el crecimiento foliar y el verde intenso, Fósforo (P) para raíces fuertes y floración, Potasio (K) para la resistencia general y la regulación hídrica.\n\n📅 **Frecuencia de abono**: En temporada de crecimiento (primavera/verano) cada 2-3 semanas con abono líquido equilibrado. En otoño/invierno, reduce o elimina la fertilización, ya que la planta está en reposo y el exceso de sales quema las raíces.\n\n⚠️ **El exceso de fertilizante es más dañino que la falta**: Provoca quemaduras radiculares por acumulación de sales, que se manifiesta como puntas marrones y hojas amarillas con bordes quemados.\n\n¿Qué tipo de planta tienes y en qué fase de crecimiento está? Te oriento con la pauta más adecuada.",
                tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
              });
            }
            return;
          }

          // 6. Vacunas y revisiones veterinarias
          if (tipoConsultor === 'veterinario' && (text.includes('vacuna') || text.includes('vacunaci') || text.includes('cartilla') || text.includes('revisión') || text.includes('revision') || text.includes('veterinario') || text.includes('consulta') || text.includes('vaccine') || text.includes('vaccination') || text.includes('checkup') || text.includes('check-up') || text.includes('vet visit'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "The vaccination schedule and periodic check-ups are essential for your pet's preventive health. Here are the key guidelines:\n\n🐶 **Dogs**:\n- Puppy: First dose of combined vaccine (distemper, parvovirus, adenovirus, parainfluenza) at 6-8 weeks, with two boosters.\n- Rabies: Mandatory from 3 months of age (legally required in most regions).\n- Adult: Annual check-up with vaccine boosters and complete blood work starting at 7 years.\n\n🐱 **Cats**:\n- Feline trivalent (rhinotracheitis, calicivirus, panleukopenia) from 8 weeks, with a booster the following month.\n- Feline leukemia (FeLV) recommended if they have outdoor access or contact with other cats.\n- Adult: Annual check-up and weight, dental, and internal/external parasite control.\n\nIs your pet's vaccination booklet up to date or do you need guidance on which vaccines are a priority?"
                : "El calendario de vacunación y las revisiones periódicas son esenciales para la salud preventiva de tu mascota. Aquí tienes las pautas clave:\n\n🐶 **Perros**:\n- Cachorro: Primera dosis de polivalente (moquillo, parvovirus, adenovirus, parainfluenza) a las 6-8 semanas, con dos refuerzos.\n- Rabia: Obligatoria a partir de los 3 meses (legal en la mayoría de comunidades autónomas).\n- Adulto: Revisión anual con refuerzo de vacunas y análisis de sangre completo a partir de los 7 años.\n\n🐱 **Gatos**:\n- Trivalente felina (rinotraqueítis, calicivirus, panleucopenia) desde las 8 semanas, con refuerzo al mes.\n- Leucemia felina (FeLV) recomendada si tiene acceso al exterior o contacto con otros gatos.\n- Adulto: Revisión anual y control de peso, dientes y parásitos internos/externos.\n\n¿Tienes la cartilla al día o necesitas orientación sobre qué vacunas son prioritarias?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 7. Castración y esterilización
          if (tipoConsultor === 'veterinario' && (text.includes('castr') || text.includes('esteriliz') || text.includes('operar') || text.includes('operaci') || text.includes('celo') || text.includes('reproduc') || text.includes('neuter') || text.includes('spay') || text.includes('castrat') || text.includes('steriliz') || text.includes('surgery') || text.includes('reproduc'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "Spaying/neutering is one of the most important decisions for your pet's long-term health and well-being. Here are the key clinical facts:\n\n**Proven medical benefits**:\n✅ Completely eliminates the risk of testicular or uterine cancer.\n✅ Reduces the risk of benign prostatic hyperplasia in male dogs by 85%.\n✅ Prevents pyometra (potentially fatal uterine infection) in females.\n✅ Significantly reduces territorial behaviors and urine marking.\n\n**Recommended age**:\n- Cats: Between 4 and 6 months, before the first heat.\n- Small and medium dogs: 6-8 months.\n- Large breed dogs: It is recommended to wait until 12-18 months to avoid interfering with the closure of bone growth plates.\n\n**Post-operative care**: Rest period of 10-14 days. Elizabethan collar to prevent licking the wound. Suture check at 10 days.\n\nWould you like me to explain anything else about the procedure or the post-operative period?"
                : "La esterilización/castración es una de las decisiones más importantes para la salud y bienestar de tu mascota a largo plazo. Aquí tienes los datos clínicos clave:\n\n**Beneficios médicos probados**:\n✅ Elimina completamente el riesgo de cáncer de testículos o útero.\n✅ Reduce en un 85% el riesgo de hiperplasia prostática benigna en perros machos.\n✅ Previene la piómetra (infección uterina potencialmente mortal) en hembras.\n✅ Reduce notablemente las conductas territoriales y el marcaje con orina.\n\n**Edad recomendada**:\n- Gatos: Entre 4 y 6 meses, antes del primer celo.\n- Perros pequeños y medianos: 6-8 meses.\n- Perros de razas grandes: Se recomienda esperar hasta los 12-18 meses para no interferir con el cierre de las placas de crecimiento óseo.\n\n**Post-operatorio**: Período de reposo de 10-14 días. Collar isabelino para evitar que lama la herida. Revisión de sutura a los 10 días.\n\n¿Quieres que te explique algo más sobre el procedimiento o el postoperatorio?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 8. Higiene, baño y cuidado externo
          if (tipoConsultor === 'veterinario' && (text.includes('baño') || text.includes('limpiar') || text.includes('higiene') || text.includes('cepillar') || text.includes('diente') || text.includes('oído') || text.includes('peinar') || text.includes('pelo') || text.includes('uñas') || text.includes('grooming') || text.includes('bath') || text.includes('clean') || text.includes('hygiene') || text.includes('brush') || text.includes('teeth') || text.includes('nail') || text.includes('groom'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "External care and routine hygiene are essential to prevent infections and maintain your pet's well-being:\n\n🛁 **Baths**:\n- Dogs: Every 4-6 weeks with pet-specific shampoo (neutral pH). Complete drying to avoid moist otitis.\n- Cats: Generally do not need baths. They self-groom. Only in cases of extreme dirtiness or medical condition.\n\n🦷 **Dental hygiene**: Tartar affects 80% of dogs over 3 years old. Dental brushing 2-3 times a week with veterinary toothpaste (never human toothpaste, fluoride is toxic). Dental treats as a complement.\n\n👂 **Ear cleaning**: With veterinary cleaning solution, once a month or if the animal frequently shakes its head. Never use cotton swabs inside the ear canal.\n\n✂️ **Nails**: Trimming every 3-4 weeks. Avoid cutting the pink area (vascular pulp) to prevent bleeding.\n\nIs there any specific aspect of care where you need more detailed guidance?"
                : "El cuidado externo y la higiene rutinaria son fundamentales para prevenir infecciones y mantener el bienestar de tu mascota:\n\n🛁 **Baños**:\n- Perros: Cada 4-6 semanas con champú específico para mascotas (pH neutro). Secado completo para evitar otitis húmeda.\n- Gatos: Generalmente no necesitan baños. Se asean solos. Solo en casos de suciedad extrema o condición médica.\n\n🦷 **Higiene dental**: El sarro afecta al 80% de los perros mayores de 3 años. Cepillado dental 2-3 veces a semana con pasta veterinaria (nunca pasta humana, el flúor es tóxico). Snacks dentales como complemento.\n\n👂 **Limpieza de oídos**: Con solución limpiadora veterinaria, una vez al mes o si el animal sacude la cabeza frecuentemente. Nunca uses bastoncillos de algodón dentro del canal auditivo.\n\n✂️ **Uñas**: Recorte cada 3-4 semanas. Evita cortar la zona rosada (pulpa vascular) para no producir sangrado.\n\n¿Hay algún aspecto específico del cuidado en el que necesites orientación más detallada?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 9. Riego y agua para plantas (agrónomo)
          if (tipoConsultor === 'agronomo' && (text.includes('riego') || text.includes('regar') || text.includes('agua') || text.includes('humedad') || text.includes('encharch') || text.includes('seco') || text.includes('sustrato') || text.includes('water') || text.includes('watering') || text.includes('humidity') || text.includes('overwater') || text.includes('substrate') || text.includes('soil'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "Watering is the factor that kills the most houseplants, usually by excess, not by deficiency. Here are the key points:\n\n💧 **Golden rule**: Insert your finger 2-3 cm into the substrate. If it's moist, wait. If it's dry, water thoroughly until water drains from the bottom holes.\n\n📏 **Signs of overwatering**: Yellow and soft leaves, dark and mushy stem base (rot), permanent smell of damp soil. Root rot is the leading cause of death in indoor plants.\n\n📏 **Signs of underwatering**: Wrinkled or drooping but firm leaves, completely dry substrate separated from the pot walls, very light-colored substrate.\n\n🚿 **Water quality**: Use room-temperature water. If tap water in your area is very hard (leaves white marks), let it rest for 24h or use filtered water to avoid salt buildup in the substrate.\n\nWhat plant do you have and what is your current watering pattern? That way I can guide you better."
                : "El riego es el factor que más plantas mata en el hogar, normalmente por exceso, no por defecto. Aquí están las claves:\n\n💧 **Regla de oro**: Introduce el dedo 2-3 cm en el sustrato. Si está húmedo, espera. Si está seco, riega abundantemente hasta que el agua salga por los agujeros de drenaje del fondo.\n\n📏 **Señales de exceso de riego**: Hojas amarillas y blandas, base del tallo oscura y blanda (pudrición), olor a tierra húmeda permanente. La pudrición de raíces es la principal causa de muerte de plantas de interior.\n\n📏 **Señales de falta de riego**: Hojas arrugadas o caídas pero firmes, sustrato completamente seco y separado de las paredes de la maceta, color del sustrato muy claro.\n\n🚿 **Calidad del agua**: Usa agua a temperatura ambiente. Si el agua de tu zona es muy calcárea (deja manchas blancas), deja reposar el agua 24h o usa agua filtrada para evitar la acumulación de sales en el sustrato.\n\n¿Qué planta tienes y cuál es tu patrón de riego actual? Así puedo orientarte mejor.",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 10. Luz y ubicación de plantas (agrónomo)
          if (tipoConsultor === 'agronomo' && (text.includes('luz') || text.includes('sol') || text.includes('sombra') || text.includes('ubicac') || text.includes('ventana') || text.includes('interior') || text.includes('exterior') || text.includes('amarilla') || text.includes('amarillo') || text.includes('light') || text.includes('sun') || text.includes('shadow') || text.includes('window') || text.includes('indoor') || text.includes('outdoor') || text.includes('yellow leaf'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "Light is the engine of photosynthesis and completely determines the growth potential of your plants. Here are the key points:\n\n☀️ **Intense direct light**: Succulents, cacti, hibiscus, geraniums. Located less than 30cm from a south or southwest-facing window.\n\n🌤️ **Bright indirect light**: Most tropical indoor plants (ficus, monsteras, pothos, ferns). Near a window with diffuse light, without direct sun that could burn the leaves.\n\n🌑 **Low light**: Sansevieria (snake plant), zamioculcas, aglaonema. They tolerate corners away from windows.\n\n⚠️ **Yellow leaves**: Although it can have multiple causes (overwatering, nutrient deficiency), in indoor plants it is usually a sign of insufficient light or overwatering. If yellow leaves fall from the base, it is lack of light. If they are soft and uniform, it is excess water.\n\nWhat plant do you have and where is it currently located? With that information I can tell you if its placement is adequate."
                : "La luz es el motor de la fotosíntesis y determina completamente el potencial de crecimiento de tus plantas. Aquí los puntos clave:\n\n☀️ **Luz directa intensa**: Suculentas, cactus, hibiscos, geranios. Ubicadas a menos de 30cm de una ventana sur o suroeste.\n\n🌤️ **Luz indirecta brillante**: La mayoría de plantas tropicales de interior (ficus, monsteras, pothos, helechos). Cerca de una ventana con luz difusa, sin sol directo que queme las hojas.\n\n🌑 **Poca luz**: Sansevieria (lengua de tigre), zamioculcas, aglaonema. Toleran rincones alejados de ventanas.\n\n⚠️ **Hojas amarillas**: Aunque puede tener múltiples causas (exceso de riego, falta de nutrientes), en plantas de interior suele ser señal de luz insuficiente o exceso de riego. Si las hojas amarillas caen por la base, es falta de luz. Si son blandas y uniformes, es exceso de agua.\n\n¿Qué planta tienes y dónde está ubicada actualmente? Con esa información puedo decirte si su emplazamiento es el adecuado.",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 11. Temperatura y terrario (exóticos)


          // 12. Edad, longevidad y esperanza de vida
          if (tipoConsultor === 'veterinario' && (text.includes('edad') || text.includes('viejo') || text.includes('anciano') || text.includes('años') || text.includes('cuánto vive') || text.includes('cuanto vive') || text.includes('longev') || text.includes('esperanza') || text.includes('age') || text.includes('old') || text.includes('senior') || text.includes('years old') || text.includes('lifespan') || text.includes('life expectancy') || text.includes('how long'))) {
            resolve({
              diagnostico: locale === 'en'
                ? "Life expectancy and senior animal care are very important topics. Here are the most relevant facts:\n\n🐱 **Cats**: Average 13-17 years. Well-cared-for indoor cats can reach 20 years. From 10 years on, they are considered 'senior' and need biannual check-ups, a kidney-specific diet, and thyroid analysis.\n\n🐶 **Dogs**: Varies enormously by breed. Small breeds (Chihuahua, Yorkshire) live 13-18 years. Giant breeds (Great Dane, Mastiff) have a life expectancy of only 7-10 years. From 7 years in large breeds (10 in small breeds), they are considered 'senior'.\n\n🏥 **Geriatric care**: Senior dogs/cats need check-ups every 6 months (not annually), blood and urine analysis, arthritis management with omega-3 and chondroitin/glucosamine supplements, and a maintenance diet with fewer calories and more quality protein.\n\nWould you like to know more about the specific care for your pet's age?"
                : "La esperanza de vida y el cuidado del animal mayor son temas muy importantes. Aquí los datos más relevantes:\n\n🐱 **Gatos**: Promedio 13-17 años. Los gatos de interior bien cuidados pueden llegar a los 20 años. A partir de los 10 años, se consideran 'senior' y necesitan controles bianuales, dieta específica para riñones y análisis de tiroides.\n\n🐶 **Perros**: Varía enormemente con la raza. Las razas pequeñas (Chihuahua, Yorkshire) viven 13-18 años. Las razas gigantes (Gran Danés, Mastín) tienen una esperanza de vida de solo 7-10 años. A partir de los 7 años en razas grandes (10 en pequeñas), se consideran 'senior'.\n\n🏥 **Cuidados geriátricos**: El perro/gato senior necesita revisiones cada 6 meses (no anuales), análisis de sangre y orina, control de artritis con suplementos de omega-3 y condroitina/glucosamina, y dieta de mantenimiento con menos calorías y más proteína de calidad.\n\n¿Quieres saber más sobre los cuidados específicos para la edad de tu mascota?",
              tratamiento: "", advertencia: "", esUrgente: false, abrirFicha
            });
            return;
          }

          // 13. Pregunta genérica conversacional: respuesta contextual en lugar del saludo
          let respuestaGenerica: string;
          const esConversacionIniciada = historial && historial.length > 1;

          if (tipoConsultor === 'veterinario') {
            if (esConversacionIniciada) {
              respuestaGenerica = locale === 'en'
                ? "Understood. To give you a more precise guideline, could you give me some additional detail (such as your pet's age, weight, or if they show other symptoms like lethargy)? If you have a photo of the area or the problem, you can also attach it using the camera button 📷."
                : "Entendido. Para darte una pauta más precisa, ¿me podrías dar algún detalle adicional (como la edad de tu mascota, su peso o si muestra otros síntomas como decaimiento)? Si tienes una foto de la zona o del problema, también puedes adjuntarla usando el botón de la cámara 📷.";
            } else {
              respuestaGenerica = locale === 'en'
                ? `I understand your query. As a specialist in animal medicine and welfare, I will try to guide you in the best possible way.\n\nTo give you a more precise and useful answer, I would need a little more context about what you are observing in your pet. I can help you with topics such as:\n\n• 🍽️ Species- and age-specific diet and nutrition\n• 💊 Medications, deworming, and vaccination schedule\n• 🏠 Environmental enrichment and home welfare\n• 🩺 Symptom interpretation and when to go to the emergency room\n• ✂️ Spaying/neutering, surgeries, and post-operative care\n• 👵 Senior pet care\n\nCan you tell me in more detail what is happening or what concerns you? If you have a photo of the problem (wound, injury, parasite), you can also send it to me using the 📷 button in the bottom bar.`
                : `Entiendo tu consulta. Como especialista en medicina y bienestar animal, intentaré orientarte de la mejor manera posible.\n\nPara darte una respuesta más precisa y útil, necesitaría un poco más de contexto sobre lo que estás observando en tu mascota. Puedo ayudarte con temas como:\n\n• 🍽️ Dieta y alimentación específica por especie y edad\n• 💊 Medicamentos, desparasitación y calendario de vacunas\n• 🏠 Enriquecimiento ambiental y bienestar en el hogar\n• 🩺 Interpretación de síntomas y cuándo acudir a urgencias\n• ✂️ Castración, cirugías y postoperatorios\n• 👵 Cuidados de mascotas senior\n\n¿Me puedes contar con más detalle qué está pasando o qué te preocupa? Si tienes una foto del problema (herida, lesión, parásito), también puedes enviármela usando el botón 📷 de la barra inferior.`;
            }

          } else {
            if (esConversacionIniciada) {
              respuestaGenerica = locale === 'en'
                ? "Understood. To give you the best botanical recommendation, could you tell me what plant species it is, how often you water it, or how much light it receives in its current location?"
                : "Entendido. Para darte la mejor recomendación botánica, ¿podrías indicarme qué especie de planta es, con qué frecuencia la riegas o cuánta luz recibe en su ubicación actual?";
            } else {
              respuestaGenerica = locale === 'en'
                ? `Understood. As an agronomist and phytopathologist, I can guide you on the care of your plants.\n\nTo give you the most precise recommendation, tell me:\n\n• 🌿 What type of plant do you have? (name if you know it)\n• 📍 Where is it located? (by a window, dark corner, outdoors)\n• 💧 How often do you water it?\n• 🌡️ What specific symptoms do you observe? (yellow, brown, drooping leaves, spots...)\n\nIf you have a photo of your plant's current state, you can send it with the 📷 button for a direct and precise visual diagnosis.`
                : `Entendido. Como agrónomo y fitopatólogo, puedo orientarte sobre el cuidado de tus plantas.\n\nPara darte la recomendación más precisa, cuéntame:\n\n• 🌿 ¿Qué tipo de planta tienes? (nombre si lo conoces)\n• 📍 ¿Dónde está ubicada? (junto a ventana, rincón oscuro, exterior)\n• 💧 ¿Con qué frecuencia la riegas?\n• 🌡️ ¿Qué síntomas concretos observas? (hojas amarillas, marrones, caídas, manchas...)\n\nSi tienes una foto del estado actual de tu planta, puedes enviar la con el botón 📷 para un diagnóstico visual directo y preciso.`;
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
            key = (text.includes('garrapata') || text.includes('bicho') || text.includes('parásito') || text.includes('tick') || text.includes('bug') || text.includes('parasite') || text.includes('flea') || text.includes('pulga')) ? 'vet_garrapata' : 'vet_herida';

          } else {
            key = (text.includes('marrón') || text.includes('punta') || text.includes('seca') || text.includes('brown') || text.includes('tip') || text.includes('dry')) ? 'plant_marron' : 'plant_parasito';
          }
        }

        const kb = locale === 'en' ? CLINICAL_KNOWLEDGE_BASE_EN : CLINICAL_KNOWLEDGE_BASE;
        const baseResult = kb[key as keyof typeof CLINICAL_KNOWLEDGE_BASE_EN] || kb['vet_herida'];

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
    mode: 'registrar_mascota' | 'salud_mascota' | 'registrar_planta' | 'enfermedad_planta',
    promptTexto?: string
  ): Promise<any> {
    const cuota = IAQuotaManager.obtenerEstadoCuota();
    const scannerLocale = (typeof window !== 'undefined' ? localStorage.getItem('petplant_locale') : null) || 'es';
    if (!cuota.esIlimitado && cuota.restantes <= 0) {
      throw new Error(scannerLocale === 'en'
        ? `Daily AI analysis limit reached. It will be available again in ${IAQuotaManager.obtenerMensajeTiempoRestante()}. Please enter your own API Key in Settings ⚙️.`
        : `Límite diario de análisis de IA alcanzado. Estará disponible de nuevo en ${IAQuotaManager.obtenerMensajeTiempoRestante()}. Por favor, introduce tu propia API Key en Ajustes ⚙️.`);
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

        const locale = (typeof window !== 'undefined' ? localStorage.getItem('petplant_locale') : null) || 'es';
        let systemInstruction = "";
        if (mode === 'registrar_mascota') {
          systemInstruction = locale === 'en'
            ? "Act as an expert veterinary geneticist and phenotypic breed classifier of the FCI/AKC at a professional level. Analyze in detail the cranial morphology, ear insertion and shape, body structure, coat texture, coloration, and patterns (for example, strictly differentiating common domestic cats with tabby patterns from breeds with color points like Siamese, or identifying complex mixes). Suggest 3 creative and aesthetic names based on their physical traits or expression. Estimate their average target adult weight in kg based on breed standards and determine their typical metabolic activity level (Baja, Moderada, or Alta). Return your response strictly in a flat JSON format with exactly these text keys: 'especie' (must be 'Felino' or 'Canino'), 'raza', 'nombreSugerido' (recommended main name), 'pesoEstimadoKg' (an exact numeric value), and 'actividadSugerida' ('Baja', 'Moderada', or 'Alta')."
            : "Actúa como un experto veterinario genetista y clasificador fenotípico de razas de la FCI/AKC a nivel profesional. Analiza detalladamente la morfología craneal, inserción y forma de orejas, estructura corporal, textura, coloración y patrones del pelaje (por ejemplo, diferenciando rigurosamente gatos de raza común europeo con patrón atigrado/tabby de razas con puntos de color como el Siamés, o identificando mezclas complejas). Sugiere 3 nombres creativos y estéticos basados en sus rasgos o expresión física. Estima su peso objetivo medio de adulto en kg basado en estándares raciales y determina su nivel de actividad metabólica típico (Baja, Moderada o Alta). Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'especie' (debe ser 'Felino' o 'Canino'), 'raza', 'nombreSugerido' (nombre principal recomendado), 'pesoEstimadoKg' (un valor numérico exacto) y 'actividadSugerida' ('Baja', 'Moderada' o 'Alta').";
        } else if (mode === 'salud_mascota') {
          systemInstruction = locale === 'en'
            ? "Act as an expert clinical veterinarian specializing in comparative pathology and medicine prevention. Perform a thorough and rigorous evaluation of the image and the user's clinical data. Analyze the morphology of lesions, erythema, distension, secretions, parasites, or visual behavioral anomalies. Your diagnosis must be highly technical and precise in its medical terminology. Return your response strictly in a flat JSON format with exactly these four text keys: 'diagnostico' (detailed description with clinical terminology, e.g., 'Suspicion of acute moist dermatitis with peripheral erythema' instead of 'wound'), 'tratamiento' (detailed step-by-step instructions for preventive first aid at home), 'advertencia' (critical clinical alerts, signs of worsening, or risks of vector-borne pathogens like ehrlichia/babesia), and 'esUrgente' (a boolean true/false indicating whether it requires immediate referral to veterinary hospital emergencies)."
            : "Actúa como un veterinario clínico experto con especialización en patología comparada y medicina preventiva. Realiza una evaluación exhaustiva y rigurosa de la imagen y los datos clínicos del usuario. Analiza la morfología de las lesiones, eritemas, distensión, secreciones, parásitos o anomalías de comportamiento visual. Tu diagnóstico debe ser altamente técnico y preciso en su terminología médica. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas cuatro claves de texto: 'diagnostico' (descripción detallada con terminología clínica, ej. 'Sospecha de dermatitis húmeda aguda con eritema periférico' en lugar de 'herida'), 'tratamiento' (instrucciones paso a paso detalladas para primeros auxilios preventivos en el hogar), 'advertencia' (alertas clínicas críticas, signos de empeoramiento o riesgos de patógenos vectoriales como ehrlichia/babesia), y 'esUrgente' (un booleano true/false que indica si requiere derivación inmediata a urgencias hospitalarias veterinarias).";
        } else if (mode === 'registrar_planta') {
          systemInstruction = locale === 'en'
            ? "Act as a professional plant taxonomist and systematic botanist. Comprehensively analyze leaf morphology (structure, arrangement, and margins of pinnae/leaves), branching patterns, petiole color and texture, and general stem arrangement in the pot to distinguish with absolute precision similar-looking species (for example, strictly differentiating an Areca [Dypsis lutescens], characterized by clustered yellowish stems resembling bamboo canes with more erect leaflets, from a Parlour Palm [Chamaedorea elegans], which has thinner, solitary green stems with arching soft leaves, or from a Kentia). Determine its common name, exact scientific name, and its feline and canine toxicity based on the plant's active principles (must be one of these strings: 'Segura', 'Tóxica leve (irritante)' or 'Altamente tóxica (urgencia)'). Identify the underlying toxic chemical compounds (e.g., calcium oxalate crystals, saponins, lycorine alkaloids) and the ideal watering interval in days. Return your response strictly in a flat JSON format with exactly these text keys: 'nombreComun', 'nombreCientifico', 'toxicidadFelina', 'toxicidadCanina', 'compuestosToxicos', and 'intervaloRiegoSugeridoDias' (numeric)."
            : "Actúa como un taxónomo botánico y experto fitólogo sistemático a nivel profesional. Analiza de manera exhaustiva la morfología foliar (estructura, disposición y bordes de las pinnas/hojas), patrones de ramificación, color y textura de pecíolos, y la disposición general de los tallos en la maceta para distinguir con absoluta precisión especies de aspecto similar (por ejemplo, diferenciar estrictamente una Areca [Dypsis lutescens], que se caracteriza por múltiples tallos amarillentos agrupados que asemejan cañas de bambú con folíolos más erectos, de una Palma de Salón [Chamaedorea elegans], que tiene tallos más finos, verdes y solitarios con hojas arqueadas y suaves, o de una Kentia). Determina su nombre común, nombre científico exacto y su toxicidad felina y canina basada en los principios activos de la planta (deben ser uno de estos strings: 'Segura', 'Tóxica leve (irritante)' o 'Altamente tóxica (urgencia)'). Identifica los compuestos químicos tóxicos subyacentes (ej. cristales de oxalato de calcio, saponinas, alcaloides licorina) y el intervalo de riego ideal en días. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas claves de texto: 'nombreComun', 'nombreCientifico', 'toxicidadFelina', 'toxicidadCanina', 'compuestosToxicos' e 'intervaloRiegoSugeridoDias' (numérico).";
        } else if (mode === 'enfermedad_planta') {
          systemInstruction = locale === 'en'
            ? "Act as an expert agronomist, phytopathologist, and clinical botanist. Scrutinize the image, identifying patterns of leaf damage, chlorosis, apical necrosis, vascular wilt, presence of pests, or leaf mycosis. Return your response strictly in a flat JSON format with exactly these four text keys: 'diagnostico' (detailed and precise phytopathological diagnosis, e.g., 'Symmetric leaf apical necrosis compatible with osmotic stress due to soluble salt accumulation' instead of 'brown tips'), 'tratamiento' (detailed step-by-step instructions covering cultural, physical, and biological or phytosanitary treatments like potassium soap/neem oil), 'advertencia' (risks of sooty mold, total defoliation, or horizontal spread to healthy crops), and 'esUrgente' (a boolean true/false indicating whether it requires immediate isolation or shock intervention to save the plant)."
            : "Actúa como un agrónomo, fitopatólogo y botánico clínico experto. Analiza la imagen minuciosamente identificando patrones de daño foliar, clorosis, necrosis apical, marchitez vascular, presencia de plagas o micosis foliares. Devuelve tu respuesta estrictamente en un formato JSON plano con exactamente estas cuatro claves de texto: 'diagnostico' (diagnóstico fitopatológico detallado y preciso, ej. 'Necrosis apical foliar simétrica compatible con estrés osmótico por acumulación de sales solubles' en lugar de 'puntas marrones'), 'tratamiento' (paso a paso detallado que abarque control cultural, físico y tratamientos biológicos o fitosanitarios como jabón potásico/aceite de neem), 'advertencia' (riesgos de negrilla, defoliación total o propagación horizontal a cultivos sanos), y 'esUrgente' (un booleano true/false que indica si requiere aislamiento inmediato o intervención de choque para salvar la planta).";

        }
        
        const aspectInstruction = locale === 'en'
          ? `\n\nCRITICAL - FULL ASPECT AND RESOLUTION: Analyze the complete image in its original resolution and aspect ratio. Do not assume the image has been cropped to a square; evaluate all visible elements in the entire frame sent.`
          : `\n\nCRÍTICO - ASPECTO Y RESOLUCIÓN COMPLETOS: Analiza la imagen completa en su resolución y relación de aspecto originales. No asumes que la imagen ha sido recortada a un cuadrado; evalúa todos los elementos visibles en todo el encuadre enviado.`;
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
        if (err.message && (err.message.includes("Límite diario") || err.message.includes("Daily AI analysis limit"))) {
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


    } else if (mode === 'salud_mascota') {
      const locale = (typeof window !== 'undefined' ? localStorage.getItem('petplant_locale') : null) || 'es';
      const kb = locale === 'en' ? CLINICAL_KNOWLEDGE_BASE_EN : CLINICAL_KNOWLEDGE_BASE;
      const text = (promptTexto || '').toLowerCase();
      const key = (text.includes('garrapata') || text.includes('bicho') || text.includes('parásito') || text.includes('tick') || text.includes('bug') || text.includes('parasite') || text.includes('flea')) ? 'vet_garrapata' : 'vet_herida';
      return kb[key as keyof typeof CLINICAL_KNOWLEDGE_BASE_EN];
    } else {
      const locale = (typeof window !== 'undefined' ? localStorage.getItem('petplant_locale') : null) || 'es';
      const kb = locale === 'en' ? CLINICAL_KNOWLEDGE_BASE_EN : CLINICAL_KNOWLEDGE_BASE;
      const text = (promptTexto || '').toLowerCase();
      const key = (text.includes('marrón') || text.includes('punta') || text.includes('seca') || text.includes('brown') || text.includes('tip') || text.includes('dry')) ? 'plant_marron' : 'plant_parasito';
      return kb[key as keyof typeof CLINICAL_KNOWLEDGE_BASE_EN];
    }
  }
}
