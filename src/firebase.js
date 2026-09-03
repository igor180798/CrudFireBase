import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC5k5QO0u__sk6ch8rgFhEmSe_9U91nEhg",
  authDomain: "cadastro-produtos-5304d.firebaseapp.com",
  projectId: "cadastro-produtos-5304d",
  storageBucket: "cadastro-produtos-5304d.firebasestorage.app",
  messagingSenderId: "500175555095",
  appId: "1:500175555095:web:086c8ea6555a3700f72a52",
  measurementId: "G-NM9KK84YCF",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
