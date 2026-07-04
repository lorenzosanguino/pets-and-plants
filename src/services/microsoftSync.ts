import { PublicClientApplication } from '@azure/msal-browser';
import type { Mascota, Planta, EventoCalendario, ChatHistorial } from '../database/types';

const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || "";

const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  }
};

let msalInstance: PublicClientApplication | null = null;
let isInitialized = false;

// Check if we should use mock/simulated mode
const isMockMode = !import.meta.env.VITE_MICROSOFT_CLIENT_ID || 
                   import.meta.env.VITE_MICROSOFT_CLIENT_ID === 'dummy' ||
                   (typeof window !== 'undefined' && window.localStorage.getItem('petplant_mock_msal') === 'true');

export interface MicrosoftUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface BackupData {
  mascotas: Mascota[];
  plantas: Planta[];
  eventos: EventoCalendario[];
  chats?: ChatHistorial[];
  updatedAt: number;
}

export class MicrosoftSyncService {
  static async init(): Promise<void> {
    if (isMockMode) {
      console.log("Microsoft Sync: Initializing in simulated mode");
      isInitialized = true;
      return;
    }
    if (isInitialized) return;
    try {
      msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      isInitialized = true;
    } catch (e) {
      console.error("Microsoft Sync: Failed to initialize MSAL, falling back to simulated mode:", e);
      // Fallback to mock mode dynamically
      window.localStorage.setItem('petplant_mock_msal', 'true');
      isInitialized = true;
    }
  }

  static isSimulated(): boolean {
    return isMockMode || !msalInstance;
  }

  static async login(): Promise<MicrosoftUser> {
    await this.init();

    if (this.isSimulated()) {
      // Return a simulated user
      const simulatedUser: MicrosoftUser = {
        name: "Lorenzo Sanguino (Hotmail Simulado)",
        email: "lorenzo_live@hotmail.com"
      };
      localStorage.setItem('petplant_ms_session', JSON.stringify(simulatedUser));
      return simulatedUser;
    }

    if (!msalInstance) throw new Error("MSAL not initialized");

    try {
      const loginRequest = {
        scopes: ["User.Read", "Files.ReadWrite"]
      };
      const response = await msalInstance.loginPopup(loginRequest);
      
      const user: MicrosoftUser = {
        name: response.account.name || "Usuario de Microsoft",
        email: response.account.username || response.account.localAccountId
      };

      // Try fetching actual profile photo or details if possible
      try {
        const token = response.accessToken;
        const profilePhoto = await this.fetchProfilePhoto(token);
        if (profilePhoto) {
          user.avatarUrl = profilePhoto;
        }
      } catch (photoErr) {
        console.warn("Could not fetch Microsoft profile photo:", photoErr);
      }

      localStorage.setItem('petplant_ms_session', JSON.stringify(user));
      return user;
    } catch (err) {
      console.error("Error signing in with Microsoft:", err);
      throw err;
    }
  }

  static async logout(): Promise<void> {
    await this.init();
    localStorage.removeItem('petplant_ms_session');
    
    if (this.isSimulated()) {
      return;
    }

    if (!msalInstance) return;
    
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      try {
        await msalInstance.logoutPopup({
          account: accounts[0],
          postLogoutRedirectUri: window.location.origin
        });
      } catch (err) {
        console.error("Microsoft logout error:", err);
      }
    }
  }

  static async getActiveUser(): Promise<MicrosoftUser | null> {
    await this.init();
    const session = localStorage.getItem('petplant_ms_session');
    if (session) {
      try {
        return JSON.parse(session) as MicrosoftUser;
      } catch {
        return null;
      }
    }
    
    if (!this.isSimulated() && msalInstance) {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const account = accounts[0];
        return {
          name: account.name || "Usuario de Microsoft",
          email: account.username
        };
      }
    }
    return null;
  }

  static async getAccessToken(): Promise<string | null> {
    await this.init();
    if (this.isSimulated()) return "mock-token";
    if (!msalInstance) return null;

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;

    try {
      const silentRequest = {
        scopes: ["User.Read", "Files.ReadWrite"],
        account: accounts[0]
      };
      const response = await msalInstance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      console.warn("Silent token acquisition failed, attempting popup:", error);
      try {
        const popupRequest = {
          scopes: ["User.Read", "Files.ReadWrite"]
        };
        const response = await msalInstance.acquireTokenPopup(popupRequest);
        return response.accessToken;
      } catch (popupError) {
        console.error("Popup token acquisition failed:", popupError);
        return null;
      }
    }
  }

  private static async fetchProfilePhoto(token: string): Promise<string | null> {
    try {
      const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error("Error loading Microsoft avatar:", e);
    }
    return null;
  }

  /**
   * Downloads backup file from OneDrive
   */
  static async downloadBackup(): Promise<BackupData | null> {
    await this.init();
    const user = await this.getActiveUser();
    if (!user) return null;

    if (this.isSimulated()) {
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockBackup = localStorage.getItem(`mock_onedrive_${user.email}`);
      return mockBackup ? JSON.parse(mockBackup) : null;
    }

    const token = await this.getAccessToken();
    if (!token) throw new Error("No access token available for Microsoft Graph");

    try {
      const url = "https://graph.microsoft.com/v1.0/me/drive/root:/Apps/PetPlantApp/backup.json:/content";
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        // File does not exist yet
        return null;
      }

      if (!response.ok) {
        throw new Error(`OneDrive download returned status ${response.status}`);
      }

      const data = await response.json();
      return data as BackupData;
    } catch (err) {
      console.error("Failed to download data from OneDrive:", err);
      throw err;
    }
  }

  /**
   * Uploads backup file to OneDrive
   */
  static async uploadBackup(data: BackupData): Promise<void> {
    await this.init();
    const user = await this.getActiveUser();
    if (!user) return;

    if (this.isSimulated()) {
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem(`mock_onedrive_${user.email}`, JSON.stringify(data));
      return;
    }

    const token = await this.getAccessToken();
    if (!token) throw new Error("No access token available for Microsoft Graph");

    try {
      const url = "https://graph.microsoft.com/v1.0/me/drive/root:/Apps/PetPlantApp/backup.json:/content";
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`OneDrive upload returned status ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to upload data to OneDrive:", err);
      throw err;
    }
  }
}
