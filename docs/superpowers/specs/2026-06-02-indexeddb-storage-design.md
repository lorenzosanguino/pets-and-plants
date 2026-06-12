# Especificación de Diseño: Persistencia y Almacenamiento con IndexedDB

Este documento detalla la migración de almacenamiento local de **Pet & Plant App** desde un sistema síncrono limitado en `localStorage` a una base de datos asíncrona de alto volumen en **IndexedDB**. Esto permite almacenar megabytes de imágenes (mascotas, avatares y plantas) de forma local y persistente en el dispositivo del usuario sin requerir bases de datos en la nube externas.

---

## 1. Actualización del Esquema de Datos (`pet-plant-app/src/database/types.ts`)

Para permitir la visualización de fotos personalizadas de mascotas y plantas, se agregan campos específicos a las interfaces:

```typescript
export interface Mascota {
  id: string; // UUID
  nombre: string;
  especie: EspecieMascota;
  fechaNacimiento: string; // ISO Date
  numeroChip?: string;
  registroPeso: RegistroPeso[];
  historialVacunas: RegistroVacuna[];
  actividad: NivelActividad;
  porcionDiariaGramos?: number;
  diarioClinico: EntradaDiarioClinico[];
  avatarUrl?: string; // NUEVO: URL de avatar (Base64 optimizado)
}

export interface Planta {
  id: string; // UUID
  nombreComun: string;
  nombreCientifico?: string;
  ubicacionHabitacion: string;
  tipoRiegoEspecifico: TipoRiego;
  intervaloRiegoDias: number;
  ultimaFechaRiego: string; // ISO Date
  proximaFechaRiego: string; // ISO Date
  toxicidadFelina: NivelToxicidadFelina;
  compuestosToxicos?: string;
  grosorHoja: 'Crasa' | 'Normal' | 'Delgada';
  temperaturaZona: number;
  diarioFoliar: EntradaDiarioFoliar[];
  fotoUrl?: string; // NUEVO: Foto de la planta (Base64 optimizado)
}
```

---

## 2. Motor de Base de Datos IndexedDB (`pet-plant-app/src/database/db.ts`)

La clase `LocalDatabase` se reescribe para interactuar con IndexedDB en el navegador mediante promesas nativas de TypeScript:

- **Nombre de Base de Datos**: `PetPlantDB`
- **Versión**: `1`
- **Object Stores**:
  - `mascotas` (keyPath: `id`)
  - `plantas` (keyPath: `id`)

### Interfaz del Servicio:
```typescript
export class LocalDatabase {
  static getMascotas(): Promise<Mascota[]>;
  static saveMascota(mascota: Mascota): Promise<void>;
  static getPlantas(): Promise<Planta[]>;
  static savePlanta(planta: Planta): Promise<void>;
  static seedInitialData(): Promise<void>;
  static clear(): Promise<void>;
}
```

---

## 3. Integración Asíncrona en Componentes React

Al pasar a una base de datos asíncrona, todos los componentes que interactúan con `LocalDatabase` se adaptarán para manejar promesas.

### 3.1 Orquestación Principal (`PetPlantDashboard.tsx`)
- Modificar `refreshData()` a una función asíncrona `async refreshData()`.
- Usar `await LocalDatabase.getMascotas()` y `await LocalDatabase.getPlantas()` en `useEffect` y en los disparadores de actualización.
- En la función de adición de mascotas (`addMascotaFromScan`), guardar la mascota con `await LocalDatabase.saveMascota()` inyectando el `avatarUrl` devuelto por el servicio de avatares.
- Al añadir plantas en `addPlantaFromScan`, inyectar la foto optimizada del escáner en `fotoUrl` y guardarla asíncronamente.

### 3.2 Tarjetas de Visualización (`PetCard.tsx` y `PlantCard.tsx`)
- Modificar el renderizado para usar `mascota.avatarUrl` y `planta.fotoUrl` respectivamente.
- Si las propiedades de imagen son nulas o inexistentes, se aplican fallbacks estéticos o avatares por defecto acordes al tema activo.

### 3.3 Formularios y Actualizaciones Clínicas / Agrónomas
- En `PetClinicView.tsx` y `PlantAgroView.tsx`, las acciones de guardar notas de diario, pesos, vacunas o habitaciones se ejecutan de manera asíncrona usando `await LocalDatabase.saveMascota()` o `await LocalDatabase.savePlanta()`.

---

## 4. Despliegue en Vercel (`vercel.json`)

Para garantizar que el enrutamiento del lado del cliente funcione sin problemas si la app escala, agregamos un archivo `vercel.json` básico en la raíz del proyecto `/pet-plant-app`:

```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

El despliegue se realizará utilizando el comando no interactivo de Vercel CLI.
