/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

export type Language = 'es' | 'en';

export interface TranslationDictionary {
  [key: string]: string;
}

const translations: Record<Language, TranslationDictionary> = {
  es: {
    // Header & Navigation
    appTitlePets: "Ecosistema de Bienestar Animal",
    appTitlePlants: "Ecosistema de Cultivo Botánico",
    appSubtitlePets: "Gestión preventiva de expedientes y nutrición",
    appSubtitlePlants: "Control agronómico y catálogo biocomparativo",
    advisorPets: "Consultor de Mascotas",
    advisorPlants: "Consultor de Plantas",
    tabDashboard: "📊 Mi Dashboard",
    tabStats: "📈 Estadísticas",
    tabConsultants: "💬 Consultor IA",
    tabSettings: "⚙️ Ajustes",
    btnPets: "Mascotas 🐾",
    btnPlants: "Plantas 🌿",
    btnTravels: "Guía de Viajes ✈️",
    btnConsultants: "Consultor IA 💬",

    // General Actions
    close: "Cerrar",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    loading: "Cargando...",

    // Settings
    settingsTitle: "⚙️ Ajustes del Sistema",
    settingsSubtitle: "Configura y personaliza la interfaz visual y la sincronización de tu ecosistema.",
    systemThemes: "Temas del Sistema",
    themeNature: "Naturaleza",
    themeKawaii: "Kawaii",
    themeGaming: "Gaming",
    themeMidnight: "Azul Profundo",
    themeMatcha: "Té Zen Matcha",
    systemLanguage: "Idioma / Language",
    gpsSyncTitle: "🛰️ Sincronización GPS Satélite Global",
    gpsSyncDesc: "Conecta tu ubicación en tiempo real con Open-Meteo. La inteligencia ajusta los riegos de tus plantas dinámicamente según la temperatura y humedad locales.",
    gpsSyncBtnActive: "GPS Automatizado Activo (Adaptativo)",
    gpsSyncBtnInactive: "Activar Sincronización GPS",
    gpsSyncSuccess: "GPS Sincronizado",
    cloudBackupTitle: "☁️ Copia de Seguridad en la Nube (Firebase / OneDrive)",
    cloudBackupDesc: "Sincroniza y resguarda los registros de tus mascotas y plantas de forma segura en la nube.",
    cloudUploadBtn: "Subir a la Nube",
    cloudDownloadBtn: "Descargar de la Nube",
    securityBackupTitle: "💾 Copia de Seguridad Local y Exportación",
    securityBackupDesc: "Exporta todos tus datos IndexedDB locales en un archivo JSON o importa un respaldo anterior.",
    exportBackupBtn: "Exportar Copia de Seguridad",
    importBackupBtn: "Importar Copia de Seguridad",
    apiKeyTitle: "🔑 Llave API de Gemini Personalizada (Opcional)",
    apiKeyDesc: "Si superas tu cuota o deseas usar tu propia llave para los diagnósticos avanzados de IA.",
    apiKeyPlaceholder: "Ingresa tu clave de Gemini API aquí...",
    showKey: "Mostrar Llave",
    hideKey: "Ocultar Llave",
    installPwaBtn: "📥 Instalar Aplicación PWA",
    installPwaDesc: "Disfruta de la experiencia completa sin conexión e instálala en tu pantalla de inicio.",
    connectedStatus: "Conectado",
    offlineStatus: "Modo Offline Activo",
    syncedStatus: "Sincronizado",
    syncingStatus: "Sincronizando...",
    syncErrorStatus: "Error de Sincronización",
    gpsSyncingBtn: "Sincronizando todo...",
    gpsSyncBtn: "Sincronizar todo el Ecosistema por Satélite 🛰️",
    hogarGroupTitle: "🏠 Grupo Hogar (Sincronización en la Nube)",
    hogarGroupDesc: "Comparte el estado de tus mascotas, riegos y clínica veterinaria en tiempo real con tu familia y cuidadores.",
    hogarLiveSyncAvail: "⚡ Modo Sincronización en vivo disponible a través de Firestore.",
    hogarSwitchTitle: "🏠 Cambiar entre Hogares Vinculados",
    hogarConnect: "Conectar 🔌",
    hogarActive: "Activo ✓",
    hogarRemove: "Quitar 🗑️",
    hogarLocalMode: "Volver a Modo Local (Desconectar)",
    hogarActiveLabel: "Hogar Activo",
    hogarSynced: "Sincronizado",
    hogarSyncing: "Sincronizando...",
    hogarSyncError: "Error de Sincro",
    hogarInviteCode: "Código de invitación para tu familia:",
    hogarCopyCode: "Copiar Código",
    hogarHideQR: "🙈 Ocultar QR",
    hogarShowQR: "📱 Ver QR",
    hogarScanQR: "Escanea este QR para unirte al hogar",
    hogarUnlink: "Desvincular Grupo Hogar 🚪",
    hogarCreateTitle: "Crear Nuevo Grupo Hogar",
    hogarCreateDesc: "Sube tu base de datos actual y genera un código de invitación único.",
    hogarCreatePlaceholder: "Nombre del Hogar (Ej. Casa Lorenzo)",
    hogarCreating: "Creando...",
    hogarCreateBtn: "Crear y Subir Base de Datos 🏠",
    hogarJoinTitle: "Unirse a un Grupo Hogar Existente",
    hogarJoinDesc: "Introduce el código compartido para descargar la base de datos y unirte al grupo.",
    hogarJoinPlaceholder: "Código: HOGAR-XXXX-XXXX",
    hogarJoining: "Vinculando...",
    hogarJoinBtn: "Unirse y Descargar Datos 🔌",
    hogarSyncProblems: "🔧 ¿Problemas de sincronización?",
    hogarDiagRunning: "Ejecutando...",
    hogarDiagBtn: "Ejecutar Diagnóstico 🔍",
    cloudSessionTitle: "☁️ Sesión en la Nube",
    cloudSessionNoLogin: "No has iniciado sesión. Tus datos se guardan de forma local en tu navegador. Inicia sesión para guardar tus datos de forma segura en la nube."
  },
  en: {
    // Header & Navigation
    appTitlePets: "Animal Well-being Ecosystem",
    appTitlePlants: "Botanical Cultivation Ecosystem",
    appSubtitlePets: "Preventive records and nutrition management",
    appSubtitlePlants: "Agronomic control and comparative catalog",
    advisorPets: "Pet Advisor",
    advisorPlants: "Plant Advisor",
    tabDashboard: "📊 My Dashboard",
    tabStats: "📈 Stats",
    tabConsultants: "💬 AI Consultant",
    tabSettings: "⚙️ Settings",
    btnPets: "Pets 🐾",
    btnPlants: "Plants 🌿",
    btnTravels: "Travel Guide ✈️",
    btnConsultants: "AI Consultant 💬",

    // General Actions
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    loading: "Loading...",

    // Settings
    settingsTitle: "⚙️ System Settings",
    settingsSubtitle: "Configure and personalize the visual interface and synchronization of your ecosystem.",
    systemThemes: "System Themes",
    themeNature: "Nature",
    themeKawaii: "Kawaii",
    themeGaming: "Gaming",
    themeMidnight: "Midnight Ocean",
    themeMatcha: "Zen Matcha",
    systemLanguage: "Language / Idioma",
    gpsSyncTitle: "🛰️ Global Satellite GPS Synchronization",
    gpsSyncDesc: "Connect your real-time location with Open-Meteo. The intelligence adjusts your plants' watering schedules dynamically based on local temperature and humidity.",
    gpsSyncBtnActive: "Automated GPS Active (Adaptive)",
    gpsSyncBtnInactive: "Activate GPS Synchronization",
    gpsSyncSuccess: "GPS Synced",
    cloudBackupTitle: "☁️ Cloud Backup & Sync (Firebase / OneDrive)",
    cloudBackupDesc: "Synchronize and safeguard your pet and plant records securely in the cloud.",
    cloudUploadBtn: "Upload to Cloud",
    cloudDownloadBtn: "Download from Cloud",
    securityBackupTitle: "💾 Local Backup and Export",
    securityBackupDesc: "Export all your local IndexedDB data into a JSON file or import a previous backup.",
    exportBackupBtn: "Export Backup",
    importBackupBtn: "Import Backup",
    apiKeyTitle: "🔑 Custom Gemini API Key (Optional)",
    apiKeyDesc: "If you exceed your quota or want to use your own key for advanced AI diagnostics.",
    apiKeyPlaceholder: "Enter your Gemini API key here...",
    showKey: "Show Key",
    hideKey: "Hide Key",
    installPwaBtn: "📥 Install PWA Application",
    installPwaDesc: "Enjoy the full offline experience and install it on your home screen.",
    connectedStatus: "Connected",
    offlineStatus: "Offline Mode Active",
    syncedStatus: "Synced",
    syncingStatus: "Syncing...",
    syncErrorStatus: "Sync Error",
    gpsSyncingBtn: "Syncing everything...",
    gpsSyncBtn: "Sync Entire Ecosystem via Satellite 🛰️",
    hogarGroupTitle: "🏠 Home Group (Cloud Sync)",
    hogarGroupDesc: "Share your pets, watering schedules, and veterinary records in real time with your family and caregivers.",
    hogarLiveSyncAvail: "⚡ Live Sync mode available via Firestore.",
    hogarSwitchTitle: "🏠 Switch between Linked Homes",
    hogarConnect: "Connect 🔌",
    hogarActive: "Active ✓",
    hogarRemove: "Remove 🗑️",
    hogarLocalMode: "Return to Local Mode (Disconnect)",
    hogarActiveLabel: "Active Home",
    hogarSynced: "Synced",
    hogarSyncing: "Syncing...",
    hogarSyncError: "Sync Error",
    hogarInviteCode: "Invitation code for your family:",
    hogarCopyCode: "Copy Code",
    hogarHideQR: "🙈 Hide QR",
    hogarShowQR: "📱 View QR",
    hogarScanQR: "Scan this QR to join the home",
    hogarUnlink: "Unlink Home Group 🚪",
    hogarCreateTitle: "Create New Home Group",
    hogarCreateDesc: "Upload your current database and generate a unique invitation code.",
    hogarCreatePlaceholder: "Home Name (e.g. Lorenzo's House)",
    hogarCreating: "Creating...",
    hogarCreateBtn: "Create and Upload Database 🏠",
    hogarJoinTitle: "Join an Existing Home Group",
    hogarJoinDesc: "Enter the shared code to download the database and join the group.",
    hogarJoinPlaceholder: "Code: HOGAR-XXXX-XXXX",
    hogarJoining: "Linking...",
    hogarJoinBtn: "Join and Download Data 🔌",
    hogarSyncProblems: "🔧 Sync problems?",
    hogarDiagRunning: "Running...",
    hogarDiagBtn: "Run Diagnostics 🔍",
    cloudSessionTitle: "☁️ Cloud Session",
    cloudSessionNoLogin: "You are not logged in. Your data is saved locally in your browser. Sign in to securely save your data in the cloud."
  }
};

interface I18nContextType {
  locale: Language;
  setLocale: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Language>(() => {
    const saved = localStorage.getItem('petplant_locale');
    if (saved === 'en' || saved === 'es') return saved;
    // Default to browser language or 'es'
    if (typeof navigator !== 'undefined') {
      const lang = navigator.language.split('-')[0];
      if (lang === 'en') return 'en';
    }
    return 'es';
  });

  const setLocale = (lang: Language) => {
    setLocaleState(lang);
    localStorage.setItem('petplant_locale', lang);
  };

  const t = (key: string): string => {
    const dict = translations[locale];
    if (dict && dict[key]) {
      return dict[key];
    }
    // Fallback to Spanish dictionary
    const fallbackDict = translations['es'];
    if (fallbackDict && fallbackDict[key]) {
      return fallbackDict[key];
    }
    return key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslations = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslations must be used within an I18nProvider');
  }
  return context;
};
