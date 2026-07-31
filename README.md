# Chalo — Uber-jaisa Platform

3 apps: `rider.html`, `driver.html`, `admin.html` — sab ek hi Firebase Realtime DB use karte hain.

## Fare Rule
Pehle 2 km = ₹20 flat. Uske baad har km pe +₹5 (partial km proportional). Logic `shared/fare.js` mein hai — yahi ek jagah badalne se teeno apps mein reflect hoga.

## Live Tracking + Encryption
- Driver ka GPS `navigator.geolocation.watchPosition` se live pick hota hai.
- Firebase mein likhne se pehle lat/lng ko **AES-GCM (Web Crypto API)** se encrypt kiya jaata hai (`shared/crypto.js`), phir base64 string ban ke DB mein jaata hai.
- Rider aur Admin dono read karte waqt decrypt karke hi map par dikhate hain.
- Ye ek app-level encryption layer hai (Firebase ka transport already HTTPS hai) — DB console mein bhi raw coordinates nahi dikhenge, sirf encrypted blob dikhega.
- `shared/crypto.js` mein `PASSPHRASE` change kar lena apna — ek hi jagah badalne se teeno apps sync rahenge.
- Note: production-grade security ke liye key ko server-side (Cloud Functions) manage karna better hota hai; ye client-side approach accidental leaks (DB console, screen-share) se bachata hai, par determined attacker se nahi.

## Notifications
- `shared/notify.js` browser ke native **Notification API** ko wrap karta hai — koi extra backend/push-server nahi chahiye.
- Permission user-gesture ke turant baad maangi jaati hai (rider: naam submit karte waqt; driver: online toggle karte waqt) — isse browser silently deny nahi karta.
- **Driver** ko notify hota hai jab koi nayi ride request aati hai (naam, km, fare ke saath).
- **Rider** ko notify hota hai jab driver accept/arrive/start/complete karta hai.
- Same ride ke liye ek hi status pe dobara notification nahi jaata (dedup via `tag` + last-status tracking).
- iOS Safari mein ye sirf installed PWA ke andar kaam karta hai; browser tab mein silently skip ho jaata hai, koi crash nahi.

## Directions (driver → rider)
- Ride **accept** karne ke baad driver ke active-ride panel mein ek 🧭 **Directions** button aata hai.
- Pickup tak (`accepted`/`arrived` stage) Google Maps ko pickup coordinates bhejta hai; ride shuru hote hi (`ongoing`) automatically drop coordinates pe switch ho jaata hai.
- Coordinates encrypted Firebase se decrypt karke (`shared/crypto.js`) Google Maps deep-link banaya jaata hai: `https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=driving` — naya tab/app mein khulta hai (phone pe Google Maps app installed ho to seedha wahi khulega).

## Setup (5 steps)
1. [console.firebase.google.com](https://console.firebase.google.com) par naya project banao.
2. **Build > Authentication > Sign-in method** mein "Anonymous" enable karo.
3. **Build > Realtime Database** banao (test mode se shuru karo), phir Rules tab mein `shared/firebase-config.js` ke bottom comment mein diye gaye rules paste karo.
4. Project Settings > General > "Your apps" > Web app add karo, jo config milega usse `shared/firebase-config.js` ke `firebaseConfig` object mein paste karo.
5. `admin.html` mein `ADMIN_PIN` apna khud ka rakh lo (abhi `2580` hai — demo ke liye, change zaroor karna).

## Hosting (phone se, bina PC/CLI ke)
Ye files ES Modules use karti hain, isliye seedha file:// se nahi khulengi — kisi web server se serve karna hoga:
- **GitHub Pages** (sabse aasan, phone se bhi): naya GitHub repo banao, ye poora folder upload karo (github.com par "Add file > Upload files" se, drag-drop bhi chalta hai), Settings > Pages mein enable karo. 2-3 min mein live URL milega.
- **Firebase Hosting**: agar kabhi PC/Termux mil jaaye to `firebase deploy` se bhi kar sakte ho — but GitHub Pages phone-only ke liye simpler hai.

## Ride Flow
`requested` → (driver accept karta hai, transaction se double-accept blocked) → `accepted` → `arrived` → `ongoing` → `completed` (ya kisi bhi stage pe `cancelled`).

## Known Simplifications (aage badha sakte ho)
- Distance = seedhi line (Haversine) × 1.3 factor, actual road-routing nahi (OSRM/Google Directions API se replace ho sakta hai).
- Ride matching sabhi online drivers ko sab requests dikhata hai — asal Uber jaisa "nearest driver" radius-filtering add nahi hai abhi.
- Payment integration nahi hai — sirf fare calculate/display hoti hai.
- Rating/review system nahi hai.
