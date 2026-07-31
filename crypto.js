// shared/crypto.js
// Live location ko Firebase mein likhne se PEHLE encrypt karta hai (AES-GCM, Web Crypto API).
// Ye ek app-level encryption layer hai — Firebase ka transport (HTTPS) already encrypted hota hai,
// ye us par ek extra layer daalta hai taaki raw lat/lng Realtime Database console ya kisi
// unauthorized read mein bhi seedha na dikhe.
//
// IMPORTANT: PASSPHRASE change kar lena apne teeno files (rider/driver/admin) mein consistent rakhne
// ke liye — ye teeno isi file ko import karte hain, isliye ek jagah badalne se sab sync rahega.
// Real production mein ye key server-side (Cloud Functions) se manage karna better hota hai,
// kyunki client-side key technically page source mein visible rehti hai. Ye phir bhi
// accidental exposure (DB console leak, screen-share, logs) se bachata hai.

const PASSPHRASE = "chalo-ride-change-this-secret-2026"; // <-- ise apna unique secret bana lo

let cachedKey = null;

async function getKey() {
  if (cachedKey) return cachedKey;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(PASSPHRASE), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  cachedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("chalo-ride-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

// { lat, lng } -> { iv: "...", data: "..." } (dono base64 strings, Firebase-safe)
export async function encryptLocation(lat, lng) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ lat, lng, t: Date.now() }));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: bufToB64(iv), data: bufToB64(cipher) };
}

// { iv, data } -> { lat, lng, t } ya null (agar corrupt/missing)
export async function decryptLocation(enc) {
  if (!enc || !enc.iv || !enc.data) return null;
  try {
    const key = await getKey();
    const iv = new Uint8Array(b64ToBuf(enc.iv));
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, b64ToBuf(enc.data));
    return JSON.parse(new TextDecoder().decode(plainBuf));
  } catch (e) {
    console.error("Decrypt failed:", e);
    return null;
  }
}
