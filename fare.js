// shared/fare.js
// Fare rule (aapne diya): pehle 2km ka ₹20 flat, uske baad har km pe ₹5 extra.
// Partial km bhi proportionally count hoti hai (e.g. 2.4km extra = ₹12 extra, round hoke).

export const BASE_FARE = 20;   // ₹20 for first 2km
export const BASE_KM = 2;      // included km
export const PER_KM_RATE = 5;  // ₹5 per additional km

export function calculateFare(distanceKm) {
  if (!distanceKm || distanceKm <= 0) return BASE_FARE;
  if (distanceKm <= BASE_KM) return BASE_FARE;
  const extraKm = distanceKm - BASE_KM;
  return Math.round(BASE_FARE + extraKm * PER_KM_RATE);
}

// Straight-line (Haversine) distance in km between two lat/lng points
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Straight-line distance ko rough "road distance" mein convert karta hai.
// Bina Google Directions API (paid) ke exact road distance nahi milti — 1.3x factor
// ek common approximation hai (roads seedhi line nahi hoti). Chaho to baad mein
// OSRM (free, self-hostable) ya Google Directions API se replace kar sakte ho.
export function estimateRoadKm(straightKm) {
  return straightKm * 1.3;
}
