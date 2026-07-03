/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { LocalDatabase } from '../database/db';
import type { Mascota, Planta, EventoCalendario } from '../database/types';
import { NotificationManager } from '../utils/notificationManager';

interface RefreshedData {
  mascotas: Mascota[];
  plantas: Planta[];
  climaActual: any;
}

// In-Memory Cache Layer for DB Reads
let ramCacheMascotas: Mascota[] | null = null;
let ramCachePlantas: Planta[] | null = null;
let ramCacheLastUpdated = 0;

export const useAppData = (
  onDataRefreshed?: (data: RefreshedData, isLocalEdit: boolean) => void
) => {
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [plantas, setPlantas] = useState<Planta[]>([]);
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
    prefetchedPlantas?: Planta[]
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

      const hoyInicioDia = new Date();
      hoyInicioDia.setHours(0, 0, 0, 0);

      const plantasPendientes = listPlantas.filter(p => {
        if (!p.proximaFechaRiego) return false;
        const prox = new Date(p.proximaFechaRiego);
        prox.setHours(0, 0, 0, 0);
        return prox <= hoyInicioDia && !notificadosRef.current.has(`riego-${p.id}`);
      });


      const totalAlertas = eventosMañana.length + eventosHoy.length + plantasPendientes.length;
      if (totalAlertas === 0) return;

      const permisoConcedido = await NotificationManager.requestPermission();
      if (!permisoConcedido) return;

      for (const ev of eventosHoy) {
        markNotificado(ev.id);
        let prefijo = '📅 Reminder Today';
        if (ev.categoria === 'veterinario') prefijo = '🐾 Vet Today';
        else if (ev.categoria === 'riego') prefijo = '💧 Watering Today';
        else if (ev.categoria === 'medicacion') prefijo = '💊 Medication Today';
        else if (ev.categoria === 'abono') prefijo = '🌿 Fertilizer Today';

        await NotificationManager.sendNotification(
          prefijo,
          ev.texto
        );
      }

      for (const ev of eventosMañana) {
        markNotificado(ev.id);
        let prefijo = '📅 Reminder Tomorrow';
        if (ev.categoria === 'veterinario') prefijo = '🐾 Vet Tomorrow';
        else if (ev.categoria === 'riego') prefijo = '💧 Watering Tomorrow';
        else if (ev.categoria === 'medicacion') prefijo = '💊 Medication Tomorrow';
        else if (ev.categoria === 'abono') prefijo = '🌿 Fertilizer Tomorrow';

        await NotificationManager.sendNotification(
          prefijo,
          ev.texto
        );
      }

      for (const p of plantasPendientes) {
        markNotificado(`riego-${p.id}`);
        await NotificationManager.sendNotification(
          `💧 Watering Pending`,
          `Time to water your ${p.nombreComun}! (${p.ubicacionHabitacion})`
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

      const now = Date.now();
      // Cache hits for non-local edits (TTL = 2 seconds)
      if (!isLocalEdit && ramCacheMascotas && ramCachePlantas && (now - ramCacheLastUpdated < 2000)) {
        listMascotas = ramCacheMascotas;
        listPlantas = ramCachePlantas;
      } else {
        listMascotas = await LocalDatabase.getMascotas();
        listPlantas = await LocalDatabase.getPlantas();
        
        ramCacheMascotas = listMascotas;
        ramCachePlantas = listPlantas;
        ramCacheLastUpdated = now;
      }

      setMascotas(listMascotas);
      setPlantas(listPlantas);

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
          climaActual: parsedClima
        }, isLocalEdit);
      }

      // Defer the notifications evaluation asynchronously to keep the UI snappy
      setTimeout(() => {
        evaluarRecordatoriosYPendientes(listPlantas).catch(err => console.warn(err));
      }, 100);
    } catch (err) {
      console.error("Fallo al refrescar IndexedDB:", err);
    }
  };

  const exportarCopiaSeguridad = async () => {
    try {
      const listMascotas = await LocalDatabase.getMascotas();
      const listPlantas = await LocalDatabase.getPlantas();
      const listEventos = await LocalDatabase.getEventosCalendario();
      
      const chats = [];
      const consultantIds = ['veterinario', 'agronomo'];
      for (const id of consultantIds) {
        const chat = await LocalDatabase.getChatHistorial(id);
        if (chat) chats.push(chat);
      }

      const backupData = {
        mascotas: listMascotas,
        plantas: listPlantas,
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
      
      alert("Backup exported successfully. Check your downloads.");
    } catch (err) {
      console.error("Fallo al exportar copia de seguridad:", err);
      alert("Error exporting backup. Check the console for more details.");
    }
  };

  const importarCopiaSeguridad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmacion = window.confirm(
      "WARNING: Importing this backup will overwrite all your local data for pets, plants, exotics, calendar events and chats. Are you sure you want to continue?"
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

        if (!data || (!Array.isArray(data.mascotas) && !Array.isArray(data.plantas))) {
          throw new Error("The JSON file does not have a valid backup format.");
        }

        const importMascotas = Array.isArray(data.mascotas) ? data.mascotas : [];
        const importPlantas = Array.isArray(data.plantas) ? data.plantas : [];
        const importEventos = Array.isArray(data.eventos) ? data.eventos : [];
        const importChats = Array.isArray(data.chats) ? data.chats : [];

        await LocalDatabase.overwriteFullDatabase(
          importMascotas,
          importPlantas,
          importEventos,
          importChats
        );

        await refreshData(true);
        alert("Backup imported successfully!");
      } catch (err: any) {
        console.error("Error al importar copia de seguridad:", err);
        alert(`Import failed: ${err.message || 'Invalid file format'}`);
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
    climaActual,
    setMascotas,
    setPlantas,
    setClimaActual,
    refreshData,
    exportarCopiaSeguridad,
    importarCopiaSeguridad,
    evaluarRecordatoriosYPendientes
  };
};
