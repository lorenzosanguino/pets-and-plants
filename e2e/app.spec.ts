import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


test.describe('Pet & Plant Pro E2E Flow', () => {
  // Set window size for standard desktop use
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    // Seed localStorage on the correct domain before test runs
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('petplant_mock_auth', 'true');
      localStorage.setItem('petplant_user_session', JSON.stringify({
        name: 'Lorenzo Sanguino (E2E Test)',
        email: 'lorenzo@sanguino.com'
      }));
      localStorage.setItem('petplant_login_provider', 'google');
      localStorage.setItem('petplant_hogar_id', 'HOGAR-TEST-E2E');
    });
  });

  test('should execute full ecosystem flow: landing, register pet, add & take medication, register plant & water', async ({ page }) => {
    // 1. Visit App
    await page.goto('/');

    // Handle any browser dialogs (confirm prompts) automatically
    page.on('dialog', async dialog => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept();
    });

    // Verify Title on Landing View
    await expect(page).toHaveTitle(/Pet & Plant Pro/i);

    // Dismiss the welcome splash screen overlay
    await page.locator('text=Continuar al Dashboard 🚀').first().click({ force: true });

    // Wait for initial loading overlay to detach
    await page.waitForSelector('.loading-overlay-root', { state: 'detached', timeout: 15000 });

    // 2. Navigate to Pets Ecosystem
    const petsLandingButton = page.locator('text=Acceder a Mascotas 🐾').first();
    await petsLandingButton.click();

    // Verify we reached the pets ecosystem dashboard
    await expect(page.locator('text=Ecosistema de Bienestar Animal').first()).toBeVisible();

    // 3. Register a Pet Manually
    const manualRegisterBtn = page.locator('text=Registro Manual').first();
    await manualRegisterBtn.click();

    // Fill manual register modal fields
    await page.locator('input[placeholder="Nombre del animal"]').fill('Fido');
    
    // Select Canino
    await page.locator('label:has-text("Especie:") + select').selectOption('Canino');

    // Fill Weight
    await page.locator('label:has-text("Peso (kg):") + input').fill('12');

    // Upload mock avatar image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'test-avatar.png'));

    // Wait for optimization to finish
    await page.waitForTimeout(1000);

    // Click Save
    await page.locator('button:has-text("Guardar 💾")').click();

    // Verify Fido is on the dashboard
    await expect(page.locator('text=Fido').first()).toBeVisible();

    // 4. Register Medication for Fido
    // Fido card should be expanded or we click it to expand
    // Let's click Fido card header to expand details
    await page.locator('text=Fido').first().click();

    // Locate Medication Form
    await expect(page.locator('text=Medicación Crónica y Tratamientos').first()).toBeVisible();
    
    // Fill medication fields
    await page.locator('input[placeholder="Ej: Insulina, Metacam..."]').fill('Metacam');
    await page.locator('input[placeholder="Ej: 2 UI, 1 pastilla, 0.5ml..."]').fill('0.5ml');
    
    // Select Frecuencia
    await page.locator('label:has-text("Frecuencia:") + select').selectOption('Diario');
    
    // Click + Añadir Medicación
    await page.locator('text=+ Añadir Medicación').first().click();

    // Verify medication is listed
    await expect(page.locator('text=Metacam (0.5ml)').first()).toBeVisible();

    // 5. Register Medication Dose
    // Click "Registrar Toma" (dialog confirm will be auto-accepted by the listener)
    await page.locator('text=💊 Registrar Toma').first().click();

    // Verify total registered count is 1
    await expect(page.locator('text=Tomas registradas: 1').first()).toBeVisible();

    // 6. Switch to Plants Ecosystem
    const plantsTab = page.locator('text=Plantas 🌿').first();
    await plantsTab.click();

    // Verify we reached the plants ecosystem dashboard
    await expect(page.locator('text=Ecosistema de Cultivo Botánico').first()).toBeVisible();

    // 7. Register a Plant Manually
    await page.locator('text=Registro Manual').first().click();

    // Fill common name
    await page.locator('input[placeholder="Ej: Helecho de Boston"]').fill('Ficus E2E');

    // Upload mock image
    const fileChooserPromise2 = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser2 = await fileChooserPromise2;
    await fileChooser2.setFiles(path.join(__dirname, 'test-avatar.png'));

    await page.waitForTimeout(1000);

    // Save
    await page.locator('button:has-text("Guardar 💾")').click();

    // Verify Ficus E2E is listed
    await expect(page.locator('text=Ficus E2E').first()).toBeVisible();

    // 8. Water the Plant
    // Expand or click on the plant card to find the "Regar Planta 💧" button
    await page.locator('text=Ficus E2E').first().click();
    
    const waterButton = page.locator('text=Regar Planta 💧').first();
    await expect(waterButton).toBeVisible();
    await waterButton.click();

    // Verify next watering date or change is reflected
    await expect(page.locator('text=Riego: regada hoy 💧').first()).toBeVisible();
  });
});
