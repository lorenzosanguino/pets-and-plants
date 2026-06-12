export interface DatosClimaticos {
  latitud: number;
  longitud: number;
  temperatura: number; // °C
  humedad: number;     // % HR
  estacion: 'Verano' | 'Invierno' | 'Primavera/Otoño';
  mesNombre: string;
}

export class WeatherService {
  /**
   * Obtiene la ubicación GPS del usuario mediante la API del navegador.
   */
  static getCoordenadasGPS(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("La geolocalización no está soportada por este navegador."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error(`Acceso GPS denegado o error: ${error.message}`));
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  /**
   * Obtiene la temperatura y humedad en vivo de Open-Meteo API basándose en coordenadas.
   * Si falla o está fuera de línea, realiza una simulación climática según el mes y latitud.
   */
  static async obtenerClimaEnVivo(lat: number, lon: number): Promise<DatosClimaticos> {
    const ahora = new Date();
    const mes = ahora.getMonth(); // 0 = Enero, 5 = Junio, 10 = Noviembre
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    // Determinar estación según latitud (Hemisferio Norte)
    let estacion: 'Verano' | 'Invierno' | 'Primavera/Otoño' = 'Primavera/Otoño';
    const esHemisferioNorte = lat >= 0;
    
    if (esHemisferioNorte) {
      if (mes >= 5 && mes <= 8) estacion = 'Verano'; // Junio a Septiembre
      else if (mes >= 10 || mes <= 1) estacion = 'Invierno'; // Noviembre a Febrero
    } else {
      if (mes >= 5 && mes <= 8) estacion = 'Invierno';
      else if (mes >= 10 || mes <= 1) estacion = 'Verano';
    }

    try {
      // API de Open-Meteo, gratuita y libre de claves de desarrollo
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error("Fallo al consultar Open-Meteo");
      
      const data = await response.json();
      
      return {
        latitud: lat,
        longitud: lon,
        temperatura: data.current?.temperature_2m ?? 20,
        humedad: data.current?.relative_humidity_2m ?? 50,
        estacion,
        mesNombre: nombresMeses[mes]
      };
    } catch (err) {
      console.warn("Fallo de red en Open-Meteo, usando fallback estimado por mes y latitud:", err);
      
      // Fallback climático realista
      let tempEstimada = 20;
      let humEstimada = 50;

      if (estacion === 'Verano') {
        tempEstimada = 30; // Calor en Junio/Julio
        humEstimada = 35;  // Clima más seco
      } else if (estacion === 'Invierno') {
        tempEstimada = 10; // Frío en Noviembre/Diciembre
        humEstimada = 75;  // Clima húmedo
      }

      return {
        latitud: lat,
        longitud: lon,
        temperatura: tempEstimada,
        humedad: humEstimada,
        estacion,
        mesNombre: nombresMeses[mes]
      };
    }
  }

  /**
   * Calcula de forma biofísica el intervalo de riego en base al clima y la planta.
   * @param intervaloBase Frecuencia nominal (ej. 7 días)
   * @param grosorHoja Grosor biofísico de la hoja (Crasa, Normal, Delgada)
   * @param clima Datos de temperatura, humedad y estación
   */
  static calcularIntervaloRiegoClimatico(
    intervaloBase: number,
    grosorHoja: 'Crasa' | 'Normal' | 'Delgada',
    clima: DatosClimaticos
  ): number {
    let intervalo = intervaloBase;

    // 1. Ajuste por retención biofísica de agua foliar (grosor)
    if (grosorHoja === 'Crasa') intervalo += 4;      // Suculentas retienen humedad
    else if (grosorHoja === 'Delgada') intervalo -= 2; // Hojas finas transpiran muy rápido

    // 2. Coeficiente estacional directo (Junio vs Noviembre)
    if (clima.estacion === 'Verano') {
      intervalo = Math.round(intervalo * 0.65); // Reducir un 35% los días (regar más a menudo)
    } else if (clima.estacion === 'Invierno') {
      intervalo = Math.round(intervalo * 1.5);  // Aumentar un 50% los días (regar menos)
    }

    // 3. Ajuste fino por temperatura ambiente real medida por GPS
    if (clima.temperatura > 32) {
      intervalo -= 2; // Ola de calor extremo exige hidratación inmediata
    } else if (clima.temperatura < 12) {
      intervalo += 3; // El frío bloquea la absorción radicular y mantiene húmedo el sustrato
    }

    // 4. Ajuste fino por Humedad Relativa
    if (clima.humedad > 80) {
      intervalo += 1; // Alta humedad reduce la evapotranspiración de los estomas
    } else if (clima.humedad < 30) {
      intervalo -= 1; // Clima extremadamente seco seca el compost
    }

    // Limitar cota inferior física (mínimo regar cada 2 días para evitar ahogo)
    return Math.max(2, intervalo);
  }
}
