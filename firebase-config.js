// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// TODO: Replace the following with your app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6aI7NwktExiqgA1WsvagKurdAu0lyPww",
  authDomain: "juego-apiv1.firebaseapp.com",
  projectId: "juego-apiv1",
  storageBucket: "juego-apiv1.firebasestorage.app",
  messagingSenderId: "331099238912",
  appId: "1:331099238912:web:93a123b4c567de89f01234"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Clave única de seguridad global de la plataforma (API Key)
export const SYSTEM_API_KEY = "AIzaSyC6aI7NwktExiqgA1WsvagKurdAu0lyPww";

/**
 * Valida el acceso a los juegos mediante la sesión activa del navegador o vía API Key por URL.
 * Si no hay sesión válida, redirige automáticamente al index.html principal.
 */
export function verificarAccesoAPI() {
  const urlParams = new URLSearchParams(window.location.search);
  const apiKeyParam = urlParams.get('apikey');
  
  let currentUser = sessionStorage.getItem('current_user') || localStorage.getItem('current_user');

  // Si se pasa la API Key autorizada por URL desde el index.html
  if (apiKeyParam === SYSTEM_API_KEY) {
    if (!currentUser) {
      // Intentar rescatar la sesión si existe de antes
      currentUser = sessionStorage.getItem('current_user');
    }
  }

  // Si no hay ningún usuario logueado en la sesión, bloquear y retornar al index.html
  if (!currentUser) {
    alert('Acceso no autorizado o sesión expirada. Por favor, inicia sesión en el menú.');
    window.location.href = 'index.html';
    return null;
  }

  return currentUser.trim().toLowerCase();
}

/**
 * Consulta y obtiene los datos más recientes del usuario desde Firestore.
 */
export async function obtenerUsuarioDB(username) {
  if (!username) return null;
  try {
    const userRef = doc(db, "usuarios", username.toLowerCase().trim());
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error al obtener usuario de Firestore:", error);
    return null;
  }
}

/**
 * Registra una jugada en la nube: descuenta 1 cartón, actualiza el saldo de ganancias 
 * si resulta ganador, y añade el registro al historial del usuario en Firestore.
 */
export async function registrarJugadaCloud(username, gameName, cardCode, isWin, prizeAmount) {
  if (!username) return false;
  try {
    const cleanUser = username.toLowerCase().trim();
    const userRef = doc(db, "usuarios", cleanUser);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return false;
    const userData = userSnap.data();

    const currentTickets = userData.tickets || 0;
    const currentBalance = userData.balance || 0;

    // Verificar que posea al menos 1 cartón
    if (currentTickets <= 0) {
      console.warn("Intento de jugar sin cartones disponibles.");
      return false;
    }

    const nuevoTickets = currentTickets - 1;
    const nuevoBalance = isWin ? currentBalance + prizeAmount : currentBalance;

    const registroJugada = {
      game: gameName,
      code: cardCode,
      win: isWin,
      prize: prizeAmount,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Actualizar documento del usuario en Firestore
    await updateDoc(userRef, {
      tickets: nuevoTickets,
      balance: nuevoBalance,
      history: arrayUnion(registroJugada)
    });

    console.log(`Jugada guardada en Cloud para @${cleanUser} | Cartón restante: ${nuevoTickets} | Saldo: ${nuevoBalance} GS`);
    return true;
  } catch (error) {
    console.error("Error al registrar jugada en Cloud:", error);
    return false;
  }
}
