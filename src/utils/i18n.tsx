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
    appTitleExotics: "Ecosistema de Animales Exóticos",
    appSubtitlePets: "Gestión preventiva de expedientes y nutrición",
    appSubtitlePlants: "Control agronómico y catálogo biocomparativo",
    appSubtitleExotics: "Terrarios, mudas, humedad y control preventivo",
    advisorPets: "Consultor de Mascotas",
    advisorPlants: "Consultor de Plantas",
    advisorExotics: "Consultor de Exóticos",
    tabDashboard: "📊 Mi Dashboard",
    tabConsultants: "💬 Consultor IA",
    tabSettings: "⚙️ Ajustes",
    btnPets: "Mascotas 🐾",
    btnPlants: "Plantas 🌿",
    btnExotics: "Exóticos 🦎",
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
    syncErrorStatus: "Error de Sincronización"
  },
  en: {
    // Header & Navigation
    appTitlePets: "Animal Well-being Ecosystem",
    appTitlePlants: "Botanical Cultivation Ecosystem",
    appTitleExotics: "Exotic Animal Ecosystem",
    appSubtitlePets: "Preventive records and nutrition management",
    appSubtitlePlants: "Agronomic control and comparative catalog",
    appSubtitleExotics: "Terrariums, shedding, humidity, and preventive control",
    advisorPets: "Pet Advisor",
    advisorPlants: "Plant Advisor",
    advisorExotics: "Exotics Advisor",
    tabDashboard: "📊 My Dashboard",
    tabConsultants: "💬 AI Consultant",
    tabSettings: "⚙️ Settings",
    btnPets: "Pets 🐾",
    btnPlants: "Plants 🌿",
    btnExotics: "Exotics 🦎",
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
    syncErrorStatus: "Sync Error"
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
