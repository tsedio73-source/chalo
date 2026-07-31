// shared/firebase-config.js
// Naya Firebase project banao (console.firebase.google.com) aur neeche apni config daalo.
// Realtime Database enable karna mat bhoolna (test mode se shuru kar sakte ho, phir rules tighten karna).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, push, get, remove, runTransaction, serverTimestamp, off } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAXAh0QEFvBMhNdah-8kXy2L0IeQLrSK0",
  authDomain: "chalo-981c9.firebaseapp.com",
  databaseURL: "https://chalo-981c9-default-rtdb.firebaseio.com",
  projectId: "chalo-981c9",
  storageBucket: "chalo-981c9.firebasestorage.app",
  messagingSenderId: "1002493879443",
  appId: "1:1002493879443:web:d1db3775229f4506b29966",
  measurementId: "G-J700EMG0DX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export {
  app, auth, db,
  signInAnonymously, onAuthStateChanged,
  ref, set, update, onValue, push, get, remove, runTransaction, serverTimestamp, off
};

/*
  SUGGESTED REALTIME DATABASE RULES (console > Realtime Database > Rules)
  Ye baseline hai — production mein aur tighten karna, khaaskar admins node ko.

  {
    "rules": {
      "riders":  { "$uid": { ".read": "auth.uid === $uid || root.child('admins').child(auth.uid).exists()", ".write": "auth.uid === $uid" } },
      "drivers": { ".read": "auth != null", "$uid": { ".write": "auth.uid === $uid || root.child('admins').child(auth.uid).exists()" } },
      "rides":   { ".read": "auth != null", ".write": "auth != null" },
      "admins":  { ".read": "auth != null", ".write": false }
    }
  }
*/
