import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "esteban-learning-app",
  appId: "1:972689815220:web:0992d9ecf2e086967209e1",
  storageBucket: "esteban-learning-app.firebasestorage.app",
  apiKey: "AIzaSyCFw08rDKqRTBvKI5jcNBJVsX688bxnSOg",
  authDomain: "esteban-learning-app.firebaseapp.com",
  messagingSenderId: "972689815220",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
