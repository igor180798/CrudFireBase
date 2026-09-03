import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0EasgIoiKJW59jcxPi1z1I3RIZTR8X58",
  authDomain: "igor-1fb49.firebaseapp.com",
  projectId: "igor-1fb49",
  storageBucket: "igor-1fb49.firebasestorage.app",
  messagingSenderId: "1000432557017",
  appId: "1:1000432557017:web:6885069620f9f3c41297c8"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, "igor");
export const auth = getAuth(app);
