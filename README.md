# Pet & Plant Pro

**Secure Intelligent Center for Clinical and Botanical Care**

A modern, offline-first Progressive Web Application (PWA) built to manage pet healthcare, agronomic botanical tracking, and environmental optimization. It utilizes client-side database storage, satellite GPS weather integration, real-time cloud synchronization, and advanced AI-driven diagnostics using Google Gemini.

---

## 🚀 Key Features

### 🐾 Animal Well-being Ecosystem
- **Digital Medical Records:** Complete clinical history, biometric graphs, and vaccine calendars.
- **Chronic Medication Tracking:** Manage active treatments, schedule doses, and record compliance with automated notifications.
- **AI Veterinary Advisor:** Advanced diagnostics of wounds, skin anomalies, or parasites through photo scans using Google Gemini AI.

### 🌿 Botanical Cultivation Ecosystem
- **Agronomic Monitoring:** Automated watering schedules dynamically adapted to climate data.
- **ASPCA Safety Integration:** Real-time cross-toxicity analysis to check if plants are safe for cats and dogs.
- **AI Phytosanitary Diagnostics:** Scan leaves to identify fungal pathogens, chlorosis, and pests with instant suggested treatments.
- **Home Light Meter:** Simulates or utilizes device sensors (Lux) to guide optimal plant placement in the house.

### ☁️ Cloud Sync & Collaboration
- **Offline-First Architecture:** Local database management via IndexedDB ensures zero dependencies on active internet connectivity.
- **Multi-Device Live Sync:** Connect to Firebase Firestore or Microsoft Graph.
- **Household Sharing:** QR-code based household invitation codes to share clinical records and reminders with family members.

### 🔒 Privacy & OWASP Security
- **OWASP ASVS Standard Compliance:** Rigorous client-side input sanitization against XSS injections.
- **Local Data Isolation:** Biometric and clinical logs stay in the browser unless synced explicitly to the user's private cloud.

---

## 🛠️ Technology Stack

- **Frontend:** React 19 (TypeScript), Vite 8, Vanilla CSS (Dynamic themes: nature, kawaii, gaming, midnight ocean, zen matcha)
- **Database:** IndexedDB (Raw transactions with connection caching)
- **APIs & Services:**
  - Google Gemini API (AI Advisor & Scanner)
  - Open-Meteo Satellite API (GPS Weather Adaptation)
  - Firebase Firestore & Auth (Live cloud backup and collaboration)
  - Microsoft MSAL (Office 365 cloud backup)
- **Testing:** Playwright (E2E Integration tests)

---

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lorenzosanguino/pets-and-plants.git
   cd pet-plant-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

4. **Run local dev server:**
   ```bash
   npm run dev
   ```

5. **Run Linting:**
   ```bash
   npm run lint
   ```

6. **Run E2E Tests:**
   ```bash
   npm run test:e2e
   ```

7. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 📡 Deployment

The application is configured to deploy instantly to Vercel. 
To deploy manually:
```bash
npx vercel --prod
```
Current production URL: **[pet-plant-app.vercel.app](https://pet-plant-app.vercel.app)**
