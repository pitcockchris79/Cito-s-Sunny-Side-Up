import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration injected from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyB_LqWARDNhfaSEr-Jonuw1lsXjrbhgCoo",
  authDomain: "gen-lang-client-0278710933.firebaseapp.com",
  projectId: "gen-lang-client-0278710933",
  storageBucket: "gen-lang-client-0278710933.firebasestorage.app",
  messagingSenderId: "23000042488",
  appId: "1:23000042488:web:7150380ab6863b5cdfa40d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with the dedicated database ID
export const db = getFirestore(app, "ai-studio-d70e38d4-0e5a-4a5f-b263-3badae5b6cde");

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Validate Connection to Firestore on startup
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    } else {
      console.log("Firestore connection initialized (non-blocking validation).", error);
    }
  }
}
testConnection();
