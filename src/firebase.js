// ╔══════════════════════════════════════════════════════════════╗
// ║  🔥 FIREBASE CONFIG — REMPLACE LES VALEURS CI-DESSOUS     ║
// ║  avec celles de TON projet Firebase (voir le guide README) ║
// ╚══════════════════════════════════════════════════════════════╝

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQsWRFiHDxgHUXf2JDqsabpsH2D_0dkUc",
  authDomain: "financeflow-58387.firebaseapp.com",
  projectId: "financeflow-58387",
  storageBucket: "financeflow-58387.firebasestorage.app",
  messagingSenderId: "423845714513",
  appId: "1:423845714513:web:928fb86e64a546ad57b670",
  measurementId: "G-ZJW4YRHK62"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
