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

  let notifEnviada = false;

  if (temp > 32) {
    NotificationManager.sendNotification(
      "🔥 Alerta de Calor Extremo",
      `La temperatura actual es de ${Math.round(temp)}°C. Mantén a tus mascotas hidratadas y protege tus plantas del sol directo.`
    );
    notifEnviada = true;
  } else if (temp < 10) {
    NotificationManager.sendNotification(
      "❄️ Alerta de Frío Extremo",
      `La temperatura actual es de ${Math.round(temp)}°C. Resguarda tus plantas sensibles y cobija a tus mascotas en el interior.`
    );
    notifEnviada = true;
  } else if (hum < 30) {
    NotificationManager.sendNotification(
      "🏜️ Alerta de Sequedad Ambiental",
      `La humedad relativa es muy baja (${Math.round(hum)}%). Comprueba el sustrato de tus plantas por si requiere riego extra.`
    );
    notifEnviada = true;
  } else if (hum > 85) {
    NotificationManager.sendNotification(
      "🌧️ Alerta de Humedad Saturada",
      `Humedad ambiental del ${Math.round(hum)}%. Alto riesgo de hongos. Evita regar plantas crasas/suculentas hoy.`
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

      const listPlantas = await LocalDatabase.getPlantas();
      for (const p of listPlantas) {
        const baseIntervalo = p.intervaloRiegoDias || 7;
        const nuevoIntervalo = WeatherService.calcularIntervaloRiegoClimatico(
          baseIntervalo,
          p.grosorHoja || 'Normal',
          clima
        );
        const proximaFecha = new Date(Date.now() + nuevoIntervalo * 24 * 3600 * 1000).toISOString();
        const plantaActualizada = {
          ...p,
          intervaloRiegoDias: nuevoIntervalo,
          proximaFechaRiego: proximaFecha,
          temperaturaZona: Math.round(clima.temperatura),
        };
        await LocalDatabase.savePlanta(plantaActualizada);
      }

      await refreshData(true);
      setGpsSyncSuccess(
        `¡Sincronizado con éxito! Clima: ${Math.round(clima.temperatura)}°C, HR: ${clima.humedad}%`
      );
    } catch (err: any) {
      console.warn('Fallo GPS en hook useGPSWeather, usando simulación de Madrid:', err);
      try {
        const climaSimulado = await WeatherService.obtenerClimaEnVivo(40.4167, -3.7037);

        // Guardar clima simulado obtenido en caché local con timestamp
        localStorage.setItem('petplant_last_gps_weather', JSON.stringify(climaSimulado));
        localStorage.setItem('petplant_last_gps_time', Date.now().toString());

        // Evaluar y notificar clima extremo (simulado)
        evaluarYNotificarClimaExtremo(climaSimulado);

        const listPlantas = await LocalDatabase.getPlantas();
        for (const p of listPlantas) {
          const baseIntervalo = p.intervaloRiegoDias || 7;
          const nuevoIntervalo = WeatherService.calcularIntervaloRiegoClimatico(
            baseIntervalo,
            p.grosorHoja || 'Normal',
            climaSimulado
          );
          const proximaFecha = new Date(Date.now() + nuevoIntervalo * 24 * 3600 * 1000).toISOString();
          const plantaActualizada = {
            ...p,
            intervaloRiegoDias: nuevoIntervalo,
            proximaFechaRiego: proximaFecha,
            temperaturaZona: Math.round(climaSimulado.temperatura),
          };
          await LocalDatabase.savePlanta(plantaActualizada);
        }
        await refreshData(true);
        setGpsSyncSuccess(
          `¡Sincronizado con éxito! (Clima simulado): ${Math.round(
            climaSimulado.temperatura
          )}°C, HR: ${climaSimulado.humedad}%`
        );
      } catch (innerErr) {
        console.warn('No se pudo realizar la sincronización climática GPS:', innerErr);
        alert('No se pudo realizar la sincronización climática GPS.');
      }
    } finally {
      setLoadingGPS(false);
    }
  };

  const handleGPSToggle = async () => {
    if (gpsSyncEnabled === 'undecided') {
      const activar = window.confirm(
        '¿Quieres activar la sincronización GPS automática? Esto adaptará el intervalo de riego de tus plantas al clima en tiempo real.'
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
