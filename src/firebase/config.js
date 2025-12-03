import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDXck3mqVBct4d2tf22pcL9KYoSmS_52DM",
  authDomain: "bakerydelivery-40547.firebaseapp.com",
  projectId: "bakerydelivery-40547",
  storageBucket: "bakerydelivery-40547.firebasestorage.app",
  messagingSenderId: "277557051462",
  appId: "1:277557051462:web:5911b8ca81bcc079968a47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with offline persistence
// Data is cached locally and syncs automatically when back online
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export default app;

