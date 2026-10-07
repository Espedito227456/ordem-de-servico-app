// ============================================================================
// js/firebase.js
// ----------------------------------------------------------------------------
// Inicialização ÚNICA e COMPARTILHADA do Firebase.
//
// Antes, cada página (.html) tinha sua própria cópia colada do
// `firebaseConfig` + `initializeApp` + `getAuth` + `getFirestore`. Isso foi
// centralizado aqui para facilitar a manutenção: se um dia for preciso
// trocar de projeto Firebase, atualizar alguma chave, etc., só precisa
// mexer neste arquivo.
//
// Como usar em qualquer página nova:
//
//   import { auth, db } from "./js/firebase.js";
//
// Observação de segurança: os valores abaixo (apiKey, projectId, etc.) NÃO
// são segredos — são identificadores públicos do app Firebase, protegidos
// de verdade pelas regras em `firestore.rules`. Nunca coloque aqui chaves
// privadas (ex: chaves de servidor/Admin SDK, chaves de gateway de
// pagamento). Essas devem ficar só no backend (Cloud Functions).
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAbWh3GANf73czwQiWny94LJYPqlodZjAg",
  authDomain: "ordem-servico-app-bb6a8.firebaseapp.com",
  projectId: "ordem-servico-app-bb6a8",
  storageBucket: "ordem-servico-app-bb6a8.firebasestorage.app",
  messagingSenderId: "652244504112",
  appId: "1:652244504112:web:d68e0de5cc78245f0be7f5"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
