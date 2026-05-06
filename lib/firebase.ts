// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⚠️ เดี๋ยวเราจะเอาค่า Config จากเว็บ Firebase มาใส่ตรงนี้
const firebaseConfig = {
  apiKey: "AIzaSyCstwfhG_nMbPm46seNspW9K-2oeV-CcXM",
  authDomain: "xauusd-signal-864cd.firebaseapp.com",
  projectId: "xauusd-signal-864cd",
  storageBucket: "xauusd-signal-864cd.firebasestorage.app",
  messagingSenderId: "570857269675",
  appId: "1:570857269675:web:229e2e9599e546d261caee",
  measurementId: "G-5VKPR5X661"
};

// เริ่มต้นเปิดระบบ Firebase
const app = initializeApp(firebaseConfig);

// เรียกใช้งานฐานข้อมูล Cloud Firestore
export const db = getFirestore(app);