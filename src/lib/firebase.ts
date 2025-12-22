import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKhsv9ZrdvD9OK6O24XYy_wwL5x5WIlzM",
  authDomain: "bphc-dashboard.firebaseapp.com",
  projectId: "bphc-dashboard",
  storageBucket: "bphc-dashboard.firebasestorage.app",
  messagingSenderId: "489552455514",
  appId: "1:489552455514:web:b93bf9a2b6647952dbb563"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
