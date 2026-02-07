import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue, child } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyD7Tj0VTe6KrtfL2GiiyPvJNm8VyvE5Vx8",
  authDomain: "casa-de-campo-vote.firebaseapp.com",
  databaseURL: "https://casa-de-campo-vote-default-rtdb.firebaseio.com",
  projectId: "casa-de-campo-vote",
  storageBucket: "casa-de-campo-vote.firebasestorage.app",
  messagingSenderId: "658762403620",
  appId: "1:658762403620:web:844995a491d4805306edb1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Sign in anonymously
const authReady = signInAnonymously(auth).catch(err => {
  console.error('Anonymous auth failed:', err);
});

export { db, auth, authReady, ref, set, get, onValue, child };
