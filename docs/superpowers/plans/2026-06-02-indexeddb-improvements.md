# IndexedDB Connection and Transaction Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix IndexedDB database connection and transaction handling issues in `pet-plant-app/src/database/db.ts` to implement connection caching, wait for transaction `oncomplete` on writes, handle transaction aborts on reads, and verify syntactical correctness.

**Architecture:** Use a module-scoped connection Promise cache `dbPromise` in `db.ts` to avoid redundant connections. Modify db write operations (`saveMascota`, `savePlanta`, `clear`) to wait for transaction `oncomplete` before resolving, rejecting on `tx.onerror` and `tx.onabort`. Modify read operations (`getMascotas`, `getPlantas`) to reject on `tx.onerror` and `tx.onabort` to avoid hung promises.

**Tech Stack:** TypeScript, IndexedDB, ESLint

---

### Task 1: Implement Connection Cache / Singleton

**Files:**
- Modify: `pet-plant-app/src/database/db.ts`

- [ ] **Step 1: Replace openDB with connection-cached openDB**
  Update `openDB` in [db.ts](file:///c:/Users/Loren/Desktop/nueva%20app%20fotos/pet-plant-app/src/database/db.ts) to check and cache `dbPromise`, setting up event listeners for `onversionchange` and block/error states.

  ```typescript
  let dbPromise: Promise<IDBDatabase> | null = null;
  function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error("No window context available"));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('mascotas')) {
          db.createObjectStore('mascotas', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('plantas')) {
          db.createObjectStore('plantas', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
      request.onblocked = () => {
        console.warn("Database connection blocked by another version.");
      };
    });
    return dbPromise;
  }
  ```

### Task 2: Update Write Operations (`saveMascota`, `savePlanta`, `clear`)

**Files:**
- Modify: `pet-plant-app/src/database/db.ts`

- [ ] **Step 1: Wait for transaction oncomplete on saveMascota**
  Update `saveMascota` to resolve only when the transaction's `oncomplete` fires, and reject if `tx.onerror` or `tx.onabort` occurs.

  ```typescript
  static async saveMascota(mascota: Mascota): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mascotas', 'readwrite');
      const store = tx.objectStore('mascotas');
      store.put(mascota);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }
  ```

- [ ] **Step 2: Wait for transaction oncomplete on savePlanta**
  Update `savePlanta` to resolve only when the transaction's `oncomplete` fires, and reject if `tx.onerror` or `tx.onabort` occurs.

  ```typescript
  static async savePlanta(planta: Planta): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('plantas', 'readwrite');
      const store = tx.objectStore('plantas');
      store.put(planta);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }
  ```

- [ ] **Step 3: Handle clear transaction safety**
  Ensure the existing `clear` method rejects properly on `tx.onabort`.

  ```typescript
  static async clear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['mascotas', 'plantas'], 'readwrite');
      tx.objectStore('mascotas').clear();
      tx.objectStore('plantas').clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }
  ```

### Task 3: Update Read Operations (`getMascotas`, `getPlantas`)

**Files:**
- Modify: `pet-plant-app/src/database/db.ts`

- [ ] **Step 1: Add abort and error handlers to getMascotas**
  Ensure `getMascotas` rejects on `tx.onerror` or `tx.onabort` to avoid hung promises.

  ```typescript
  static async getMascotas(): Promise<Mascota[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mascotas', 'readonly');
      const store = tx.objectStore('mascotas');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }
  ```

- [ ] **Step 2: Add abort and error handlers to getPlantas**
  Ensure `getPlantas` rejects on `tx.onerror` or `tx.onabort` to avoid hung promises.

  ```typescript
  static async getPlantas(): Promise<Planta[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('plantas', 'readonly');
      const store = tx.objectStore('plantas');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  }
  ```

### Task 4: Linting Verification

- [ ] **Step 1: Run ESLint**
  Verify syntactical correctness by running `npx eslint src/database/db.ts` inside the `pet-plant-app` directory.

### Task 5: Git Commit

- [ ] **Step 1: Commit Changes**
  Run git commit: `git commit -am "fix: db: implement connection caching and transactional safety in IndexedDB"`
