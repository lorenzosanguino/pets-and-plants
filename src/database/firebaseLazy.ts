/**
 * firebaseLazy.ts
 *
 * Módulo proxy que inicializa Firebase de forma lazy (solo cuando se necesita).
 * Evita que el SDK de Firebase (414KB) se incluya en el bundle inicial.
 *
 * Uso:
 *   const { auth, FirebaseSyncService } = await initFirebase();
 */

export interface LazyFirebase {
  auth: import('firebase/auth').Auth | null;
  FirebaseSyncService: typeof import('./firebaseSync').FirebaseSyncService;
  GoogleAuthProvider: typeof import('firebase/auth').GoogleAuthProvider;
  signInWithPopup: typeof import('firebase/auth').signInWithPopup;
  signInWithCredential: typeof import('firebase/auth').signInWithCredential;
  signInAnonymously: typeof import('firebase/auth').signInAnonymously;
  signOut: typeof import('firebase/auth').signOut;
  onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged;
}

let _initPromise: Promise<LazyFirebase> | null = null;
let _cachedResult: LazyFirebase | null = null;

async function _doInit(): Promise<LazyFirebase> {
  // Cargar módulos en paralelo
  const [authModule, syncModule] = await Promise.all([
    import('firebase/auth'),
    import('./firebaseSync')
  ]);

  _cachedResult = {
    auth: syncModule.auth,
    FirebaseSyncService: syncModule.FirebaseSyncService,
    GoogleAuthProvider: authModule.GoogleAuthProvider,
    signInWithPopup: authModule.signInWithPopup,
    signInWithCredential: authModule.signInWithCredential,
    signInAnonymously: authModule.signInAnonymously,
    signOut: authModule.signOut,
    onAuthStateChanged: authModule.onAuthStateChanged,
  };

  return _cachedResult;
}

export function initFirebase(): Promise<LazyFirebase> {
  return _initPromise ?? (_initPromise = _doInit());
}

/** Versión síncrona — solo usar si ya se llamó a initFirebase() antes */
export function getFirebaseCached(): LazyFirebase | null {
  return _cachedResult;
}
