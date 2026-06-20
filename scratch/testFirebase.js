import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDGQWW8tVP8kk6Nss-GCutohfD6IouLzp0",
  authDomain: "plants-and-pets-app.firebaseapp.com",
  projectId: "plants-and-pets-app",
  storageBucket: "plants-and-pets-app.firebasestorage.app",
  messagingSenderId: "1044210464501",
  appId: "1:1044210464501:web:c9bf8245db3c596977f7bc"
};

console.log("Initializing Firebase with project:", firebaseConfig.projectId);

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log("Firestore initialized. Trying to write to 'hogares/test'...");
  
  const docRef = doc(db, 'hogares', 'test');
  
  const setDocPromise = setDoc(docRef, {
    test: true,
    updatedAt: Date.now()
  }, { merge: true });
  
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout after 10s")), 10000));
  
  await Promise.race([setDocPromise, timeoutPromise]);
  console.log("Success! Write completed.");
} catch (err) {
  console.error("Test failed with error:", err);
}

process.exit(0);
