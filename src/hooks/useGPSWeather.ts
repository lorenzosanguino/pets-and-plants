import { useState } from 'react';
import { LocalDatabase } from '../database/db';
import { WeatherService } from '../services/weatherService';
import { NotificationManager } from '../utils/notificationManager';

const NOTIF_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 horas

const evaluarYNotificarClimaExtremo = (c: any) => {
  if (!c) return;

  const lastNotif = Number(localStorage.getItem('petplant_last_clima_notif') || 0);
  if (Date.now() - lastNotif < NOTIF_COOLDOWN_MS) return; // Ya notificó en las últimas 12h

  const temp = c.temperatura;
  const hum = c.humedad;
  const locale = localStorage.getItem('petplant_locale') || 'es';
  const isEn = locale === 'en';

  let notifEnviada = false;

  if (temp > 32) {
    NotificationManager.sendNotification(
      isEn ? "🔥 Extreme Heat Alert" : "🔥 Alerta de Calor Extremo",
      isEn
        ? `The current temperature is ${Math.round(temp)}°C. Keep your pets hydrated and protect your plants from direct sunlight.`
        : `La temperatura actual es ${Math.round(temp)}°C. Mantén a tus mascotas hidratadas y protege tus plantas del sol directo.`
    );
    notifEnviada = true;
  } else if (temp < 10) {
    NotificationManager.sendNotification(
      isEn ? "❄️ Extreme Cold Alert" : "❄️ Alerta de Frío Extremo",
      isEn
        ? `The current temperature is ${Math.round(temp)}°C. Shelter your sensitive plants and keep your pets warm indoors.`
        : `La temperatura actual es ${Math.round(temp)}°C. Protege tus plantas sensibles y mantén a tus mascotas calientes en casa.`
    );
    notifEnviada = true;
  } else if (hum < 30) {
    NotificationManager.sendNotification(
      isEn ? "🏜️ Low Humidity Alert" : "🏜️ Alerta de Humedad Baja",
      isEn
        ? `Relative humidity is very low (${Math.round(hum)}%). Check your plants' soil in case they need extra watering.`
        : `La humedad relativa es muy baja (${Math.round(hum)}%). Revisa el sustrato de tus plantas por si necesitan riego extra.`
    );
    notifEnviada = true;
  } else if (hum > 85) {
    NotificationManager.sendNotification(
      isEn ? "🌧️ High Humidity Alert" : "🌧️ Alerta de Humedad Alta",
      isEn
        ? `Ambient humidity at ${Math.round(hum)}%. High risk of fungus. Avoid watering succulents/cacti today.`
        : `Humedad ambiental al ${Math.round(hum)}%. Alto riesgo de hongos. Evita regar suculentas/cactus hoy.`
    );
    notifEnviada = true;
  }

  if (notifEnviada) {
    localStorage.setItem('petplant_last_clima_notif', Date.now().toString());
  }
};

export const useGPSWeather = (refreshData: (force?: boolean) => Promise<void>) => {
  const [loadingGPS, setLoadingGPS] = useState<boolean>(false);
  const [gpsSyncSuccess, setGpsSyncSuccess] = useState<string | null>(null);
  const [gpsSyncEnabled, setGpsSyncEnabled] = useState<'undecided' | 'active' | 'inactive'>(() => {
    const saved = localStorage.getItem('petplant_gps_sync_enabled');
    if (saved === 'true') return 'active';
    if (saved === 'false') return 'inactive';
    return 'undecided';
  });

  const actualizarPlantasConClima = async (clima: any) => {
    const listPlantas = await LocalDatabase.getPlantas();
    for (const p of listPlantas) {
      const baseIntervalo = p.intervaloRiegoBase || p.intervaloRiegoDias || 7;
      const nuevoIntervalo = WeatherService.calcularIntervaloRiegoClimatico(
        baseIntervalo,
        p.grosorHoja || 'Normal',
        clima
      );
      const proximaFecha = new Date(Date.now() + nuevoIntervalo * 24 * 3600 * 1000).toISOString();
      const plantaActualizada = {
        ...p,
        intervaloRiegoDias: nuevoIntervalo,
        intervaloRiegoBase: baseIntervalo,
        proximaFechaRiego: proximaFecha,
        temperaturaZona: Math.round(clima.temperatura),
      };
      await LocalDatabase.savePlanta(plantaActualizada);
    }
  };

  const sincronizarTodasLasPlantasPorGPS = async () => {
    setLoadingGPS(true);
    setGpsSyncSuccess(null);
    try {
      // Comprobar caché climática con TTL de 15 minutos (900.000 ms)
      const cachedWeather = localStorage.getItem('petplant_last_gps_weather');
      const cachedTime = Number(localStorage.getItem('petplant_last_gps_time') || 0);

      let clima;
      if (cachedWeather && Date.now() - cachedTime < 15 * 60 * 1000) {
        console.log('Reutilizando datos climáticos en caché (TTL activo).');
        clima = JSON.parse(cachedWeather);
      } else {
        const coords = await WeatherService.getCoordenadasGPS();
        clima = await WeatherService.obtenerClimaEnVivo(coords.latitude, coords.longitude);

        // Guardar clima obtenido en caché local con timestamp
        localStorage.setItem('petplant_last_gps_weather', JSON.stringify(clima));
        localStorage.setItem('petplant_last_gps_time', Date.now().toString());
      }

      // Evaluar y notificar clima extremo
      evaluarYNotificarClimaExtremo(clima);

      await actualizarPlantasConClima(clima);

      await refreshData(true);
      setGpsSyncSuccess(
        `Synced successfully! Weather: ${Math.round(clima.temperatura)}°C, RH: ${clima.humedad}%`
      );
    } catch (err: any) {
      console.warn('Fallo GPS en hook useGPSWeather:', err);
      try {
        // Prioridad 1: reusar el último clima en caché si es menor de 24h
        const cachedWeather = localStorage.getItem('petplant_last_gps_weather');
        const cachedTime = Number(localStorage.getItem('petplant_last_gps_time') || 0);
        let climaSimulado;

        if (cachedWeather && Date.now() - cachedTime < 24 * 60 * 60 * 1000) {
          console.log('GPS sin acceso, usando último clima guardado en caché.');
          climaSimulado = JSON.parse(cachedWeather);
        } else {
          // Prioridad 2: estimar clima genérico basado únicamente en el mes (sin coords fijas)
          console.log('GPS sin acceso y sin caché válida. Usando estimación climática por mes.');
          climaSimulado = await WeatherService.obtenerClimaEnVivo(40, 0).catch(() =>
            // Última opción: objeto climático mínimo seguro
            ({ latitud: 0, longitud: 0, temperatura: 20, humedad: 55, estacion: 'Primavera/Otoño' as const, mesNombre: 'Unknown' })
          );
          // Guardar en caché para próximas sesiones
          localStorage.setItem('petplant_last_gps_weather', JSON.stringify(climaSimulado));
          localStorage.setItem('petplant_last_gps_time', Date.now().toString());
        }

        // Evaluar y notificar clima extremo
        evaluarYNotificarClimaExtremo(climaSimulado);

        await actualizarPlantasConClima(climaSimulado);
        
        await refreshData(true);
        setGpsSyncSuccess(
          `Synced! (Estimated weather): ${Math.round(climaSimulado.temperatura)}°C, RH: ${climaSimulado.humedad}%`
        );
      } catch (innerErr) {
        console.warn('No se pudo realizar la sincronización climática GPS:', innerErr);
        console.error('GPS weather sync could not be completed.');
      }
    } finally {
      setLoadingGPS(false);
    }
  };

  const handleGPSToggle = async () => {
    if (gpsSyncEnabled === 'undecided') {
      const activar = window.confirm(
        'Do you want to activate automatic GPS synchronization? This will adapt the watering interval of your plants to the real-time weather.'
      );
      if (activar) {
        localStorage.setItem('petplant_gps_sync_enabled', 'true');
        setGpsSyncEnabled('active');
        await sincronizarTodasLasPlantasPorGPS();
      } else {
        localStorage.setItem('petplant_gps_sync_enabled', 'false');
        setGpsSyncEnabled('inactive');
      }
    } else {
      const nuevoEstado = gpsSyncEnabled === 'active' ? 'inactive' : 'active';
      localStorage.setItem('petplant_gps_sync_enabled', nuevoEstado === 'active' ? 'true' : 'false');
      setGpsSyncEnabled(nuevoEstado);
      if (nuevoEstado === 'active') {
        await sincronizarTodasLasPlantasPorGPS();
      }
    }
  };

  return {
    loadingGPS,
    gpsSyncSuccess,
    gpsSyncEnabled,
    handleGPSToggle,
    sincronizarTodasLasPlantasPorGPS,
  };
};
