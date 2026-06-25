/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { LocalDatabase } from '../database/db';
import type { Mascota, Planta, AnimalExotico, EventoCalendario } from '../database/types';
import { NotificationManager } from '../utils/notificationManager';

interface RefreshedData {
  mascotas: Mascota[];
  plantas: Planta[];
  exoticos: AnimalExotico[];
  climaActual: any;
}

// In-Memory Cache Layer for DB Reads
let ramCacheMascotas: Mascota[] | null = null;
let ramCachePlantas: Planta[] | null = null;
let ramCacheExoticos: AnimalExotico[] | null = null;
let ramCacheLastUpdated = 0;

export const useAppData = (
  onDataRefreshed?: (data: RefreshedData, isLocalEdit: boolean) => void
) => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [exoticos, setExoticos] = useState<AnimalExotico[]>([]);
  const [climaActual, setClimaActual] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('petplant_last_gps_weather');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persistir IDs ya notificados en localStorage para evitar re-disparos al recargar la página.
  // La clave incluye la fecha del día para limpiar automáticamente al día siguiente.
  const notificadosRef = useRef<Set<string>>(
    (() => {
      const today = new Date().toISOString().slice(0, 10);
      const key = `petplant_notificados_${today}`;
      try {
        const saved = localStorage.getItem(key);
        return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
      } catch {
        return new Set<string>();
      }
    })()
  );

  // Helper para añadir un ID al set y persistirlo
  const markNotificado = (id: string) => {
    notificadosRef.current.add(id);
    const today = new Date().toISOString().slice(0, 10);
    const key = `petplant_notificados_${today}`;
    try {
      localStorage.setItem(key, JSON.stringify([...notificadosRef.current]));
    } catch { /* cuota de localStorage llena, continuar sin persistir */ }
    // Limpiar entradas de días anteriores
    Object.keys(localStorage)
      .filter(k => k.startsWith('petplant_notificados_') && k !== key)
      .forEach(k => localStorage.removeItem(k));
  };

  const evaluarRecordatoriosYPendientes = async (
    prefetchedPlantas?: Planta[],
    prefetchedExoticos?: AnimalExotico[]
  ) => {
    try {
      const listEventos: EventoCalendario[] = await LocalDatabase.getEventosCalendario();
      
      const mañana = new Date();
      mañana.setDate(mañana.getDate() + 1);
      const añoM = mañana.getFullYear();
      const mesM = String(mañana.getMonth() + 1).padStart(2, '0');
      const diaM = String(mañana.getDate()).padStart(2, '0');
      const mañanaStr = `${añoM}-${mesM}-${diaM}`;

      const eventosMañana = listEventos.filter(ev => 
        ev.fecha === mañanaStr && 
        !ev.completado && 
        !notificadosRef.current.has(ev.id)
      );

      const hoy = new Date();
      const añoH = hoy.getFullYear();
      const mesH = String(hoy.getMonth() + 1).padStart(2, '0');
      const diaH = String(hoy.getDate()).padStart(2, '0');
      const hoyStr = `${añoH}-${mesH}-${diaH}`;

      const eventosHoy = listEventos.filter(ev => 
        ev.fecha === hoyStr && 
        !ev.completado && 
        !notificadosRef.current.has(ev.id)
      );

      const listPlantas = prefetchedPlantas || await LocalDatabase.getPlantas();
      const listExoticos = prefetchedExoticos || await LocalDatabase.getExoticos();

      const hoyInicioDia = new Date();
      hoyInicioDia.setHours(0, 0, 0, 0);

      const plantasPendientes = listPlantas.filter(p => {
        if (!p.proximaFechaRiego) return false;
        const prox = new Date(p.proximaFechaRiego);
        prox.setHours(0, 0, 0, 0);
        return prox <= hoyInicioDia && !notificadosRef.current.has(`riego-${p.id}`);
      });

      const exoticosPendientes = listExoticos.filter(ex => {
        if (!ex.ultimaAlimentacion || !ex.intervaloAlimentacionDias) return false;
        const ult = new Date(ex.ultimaAlimentacion);
        ult.setHours(0, 0, 0, 0);
        const proxAlimentacion = new Date(ult.getTime() + ex.intervaloAlimentacionDias * 24 * 3600 * 1000);
        proxAlimentacion.setHours(0, 0, 0, 0);
        return proxAlimentacion <= hoyInicioDia && !notificadosRef.current.has(`alimentacion-${ex.id}`);
      });

      const totalAlertas = eventosMañana.length + eventosHoy.length + plantasPendientes.length + exoticosPendientes.length;
      if (totalAlertas === 0) return;

      const permisoConcedido = await NotificationManager.requestPermission();
      if (!permisoConcedido) return;

      for (const ev of eventosHoy) {
        markNotificado(ev.id);
        let prefijo = '📅 Recordatorio Hoy';
        if (ev.categoria === 'veterinario') prefijo = '🐾 Veterinaria Hoy';
        else if (ev.categoria === 'riego') prefijo = '💧 Riego Hoy';
        else if (ev.categoria === 'medicacion') prefijo = '💊 Medicación Hoy';
        else if (ev.categoria === 'abono') prefijo = '🌿 Abono Hoy';

        await NotificationManager.sendNotification(
          prefijo,
          ev.texto
        );
      }

      for (const ev of eventosMañana) {
        markNotificado(ev.id);
        let prefijo = '📅 Recordatorio Mañana';
        if (ev.categoria === 'veterinario') prefijo = '🐾 Veterinaria Mañana';
        else if (ev.categoria === 'riego') prefijo = '💧 Riego Mañana';
        else if (ev.categoria === 'medicacion') prefijo = '💊 Medicación Mañana';
        else if (ev.categoria === 'abono') prefijo = '🌿 Abono Mañana';

        await NotificationManager.sendNotification(
          prefijo,
          ev.texto
        );
      }

      for (const p of plantasPendientes) {
        markNotificado(`riego-${p.id}`);
        await NotificationManager.sendNotification(
          `💧 Riego Pendiente`,
          `¡Es hora de regar tu ${p.nombreComun}! (${p.ubicacionHabitacion})`
        );
      }

      for (const ex of exoticosPendientes) {
        markNotificado(`alimentacion-${ex.id}`);
        await NotificationManager.sendNotification(
          `🦎 Alimentación Pendiente`,
          `¡Es hora de alimentar a ${ex.nombre} (${ex.tipoEspecifico})!`
        );
      }
    } catch (err) {
      console.warn("Error al evaluar recordatorios y tareas pendientes:", err);
    }
  };

  const refreshData = async (isLocalEdit = true) => {
    try {
      if (isLocalEdit) {
        localStorage.setItem('petplant_db_last_updated', Date.now().toString());
      }

      let listMascotas: Mascota[];
      let listPlantas: Planta[];
      let listExoticos: AnimalExotico[];

      const now = Date.now();
      // Cache hits for non-local edits (TTL = 2 seconds)
      if (!isLocalEdit && ramCacheMascotas && ramCachePlantas && ramCacheExoticos && (now - ramCacheLastUpdated < 2000)) {
        listMascotas = ramCacheMascotas;
        listPlantas = ramCachePlantas;
        listExoticos = ramCacheExoticos;
      } else {
        listMascotas = await LocalDatabase.getMascotas();
        listPlantas = await LocalDatabase.getPlantas();
        listExoticos = await LocalDatabase.getExoticos();
        
        ramCacheMascotas = listMascotas;
        ramCachePlantas = listPlantas;
        ramCacheExoticos = listExoticos;
        ramCacheLastUpdated = now;
      }

      setMascotas(listMascotas);
      setPlantas(listPlantas);
      setExoticos(listExoticos);

      const savedClima = localStorage.getItem('petplant_last_gps_weather');
      let parsedClima = null;
      if (savedClima) {
        try {
          parsedClima = JSON.parse(savedClima);
          setClimaActual(parsedClima);
        } catch (e) {
          console.error(e);
        }
      }

      if (onDataRefreshed) {
        onDataRefreshed({
          mascotas: listMascotas,
          plantas: listPlantas,
          exoticos: listExoticos,
          climaActual: parsedClima
        }, isLocalEdit);
      }

      // Defer the notifications evaluation asynchronously to keep the UI snappy
      setTimeout(() => {
        evaluarRecordatoriosYPendientes(listPlantas, listExoticos).catch(err => console.warn(err));
      }, 100);
    } catch (err) {
      console.error("Fallo al refrescar IndexedDB:", err);
    }
  };

  const exportarCopiaSeguridad = async () => {
    try {
      const listMascotas = await LocalDatabase.getMascotas();
      const listPlantas = await LocalDatabase.getPlantas();
      const listExoticos = await LocalDatabase.getExoticos();
      const listEventos = await LocalDatabase.getEventosCalendario();
      
      const chats = [];
      const consultantIds = ['veterinario', 'agronomo', 'exotico'];
      for (const id of consultantIds) {
        const chat = await LocalDatabase.getChatHistorial(id);
        if (chat) chats.push(chat);
      }

      const backupData = {
        mascotas: listMascotas,
        plantas: listPlantas,
        exoticos: listExoticos,
        eventos: listEventos,
        chats: chats,
        exportadoEn: new Date().toISOString(),
        version: 2
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fechaStr = new Date().toISOString().slice(0, 10);
      a.download = `copia-seguridad-ecosistema-${fechaStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("Copia de seguridad exportada con éxito. Revisa tus descargas.");
    } catch (err) {
      console.error("Fallo al exportar copia de seguridad:", err);
      alert("Error al exportar la copia de seguridad. Revisa la consola para más detalles.");
    }
  };

  const importarCopiaSeguridad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmacion = window.confirm(
      "ATENCIÓN: Importar esta copia de seguridad sobrescribirá todos tus datos locales de mascotas, plantas, exóticos, eventos de calendario y chats. ¿Seguro que deseas continuar?"
    );
    if (!confirmacion) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = JSON.parse(content);

        if (!data || (!Array.isArray(data.mascotas) && !Array.isArray(data.plantas) && !Array.isArray(data.exoticos))) {
          throw new Error("El archivo JSON no tiene un formato de copia de seguridad válido.");
        }

        const importMascotas = Array.isArray(data.mascotas) ? data.mascotas : [];
        const importPlantas = Array.isArray(data.plantas) ? data.plantas : [];
        const importExoticos = Array.isArray(data.exoticos) ? data.exoticos : [];
        const importEventos = Array.isArray(data.eventos) ? data.eventos : [];
        const importChats = Array.isArray(data.chats) ? data.chats : [];

        await LocalDatabase.overwriteFullDatabase(
          importMascotas,
          importPlantas,
          importExoticos,
          importEventos,
          importChats
        );

        await refreshData(true);
        alert("¡Copia de seguridad importada correctamente!");
      } catch (err: any) {
        console.error("Error al importar copia de seguridad:", err);
        alert(`Fallo al importar: ${err.message || 'Formato de archivo inválido'}`);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    refreshData(false);
  }, []);

  return {
    mascotas,
    plantas,
    exoticos,
    climaActual,
    setMascotas,
    setPlantas,
    setExoticos,
    setClimaActual,
    refreshData,
    exportarCopiaSeguridad,
    importarCopiaSeguridad,
    evaluarRecordatoriosYPendientes
  };
};
