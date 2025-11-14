// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// GitHub Secrets (環境変数) から設定を読み込む安全な形式
// このファイル自体には秘密鍵は含まれていません。
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);

// Firestoreインスタンスを取得してエクスポート
export const db = getFirestore(app);