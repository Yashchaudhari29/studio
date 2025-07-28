// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// Import getAnalytics if you need it
// import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration from environment variables
// Ensure these variables are set in your .env.local or .env file
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional but recommended
};

// Validate that essential config values are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase API Key or Project ID is missing. Check your environment variables.");
  // Optionally throw an error or handle this case appropriately
  // throw new Error("Missing Firebase configuration. Check environment variables.");
}


// Initialize Firebase
// Ensure initialization happens only once
let app;
if (!getApps().length) {
    console.log("Initializing Firebase app...");
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully.");
} else {
    app = getApp();
    console.log("Using existing Firebase app instance.");
}

const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Analytics only on the client-side if needed and configured
let analytics = null;
// Check if running in browser and if measurementId is provided
// if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
//     isSupported().then((supported) => {
//         if (supported) {
//             analytics = getAnalytics(app);
//             console.log("Firebase Analytics initialized.");
//         } else {
//             console.log("Firebase Analytics is not supported in this environment.");
//         }
//     });
// } else if (typeof window !== 'undefined') {
//      console.log("Firebase Analytics not initialized (Measurement ID missing or not in browser).");
// }


// Export initialized services
export { app, db, auth };
// Export analytics if you plan to use it elsewhere
// export { analytics };
