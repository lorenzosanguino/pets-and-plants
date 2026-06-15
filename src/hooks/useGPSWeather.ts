import { useState } from 'react';
import { LocalDatabase } from '../database/db';
import { WeatherService } from '../services/weatherService';

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
