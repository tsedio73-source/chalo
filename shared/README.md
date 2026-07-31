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

## Notifications — 2 layers
Ab notifications 2 tareeke se kaam karti hain, taaki dono cases cover ho jaayein:

**1. In-tab (`shared/notify.js`)** — koi server nahi chahiye, browser ki apni Notification API. Sirf tab open/background hone par kaam karti hai. Permission user-gesture ke turant baad maangi jaati hai.

**2. Real push (`shared/push.js` + `sw.js` + `server/`)** — **tab ya poora app band hone par bhi** notification aati hai (jaise WhatsApp/Uber). Isके liye ek chhota Node server chahiye jo InfinityFree (PHP-only) par nahi chal sakta — isliye ye alag se **Render.com** (free tier) par deploy hota hai.
- `sw.js` (service worker, site ke ROOT mein hona zaroori hai) push event receive karke OS notification dikhata hai.
- `shared/push.js` browser se push-subscription banata hai aur Firebase mein save karta hai (`drivers/{uid}/pushSub`, `riders/{uid}/pushSub`).
- Jab rider ride book karta hai → `triggerPush({ type: 'new-ride-request', ... })` call hota hai → Render server sab **online + subscribed** drivers ko push bhejta hai.
- Jab driver accept/arrive/start/complete karta hai → Render server usi ride ke rider ko push bhejta hai.
- Dono layers same `tag` use karti hain, isliye agar tab open hai to duplicate notification nahi banti (dusri wali purani ko replace kar deti hai).
- Render free tier "cold start" leta hai (pehli request thodi slow) aur agar server sula hua ho to push chup-chaap fail ho jaati hai — app kabhi iski wajah se atakti nahi, sirf in-tab notification pe fallback rehta hai.

## Directions (driver → rider)
- Ride **accept** karne ke baad driver ke active-ride panel mein ek 🧭 **Directions** button aata hai.
- Pickup tak (`accepted`/`arrived` stage) Google Maps ko pickup coordinates bhejta hai; ride shuru hote hi (`ongoing`) automatically drop coordinates pe switch ho jaata hai.
- Coordinates encrypted Firebase se decrypt karke (`shared/crypto.js`) Google Maps deep-link banaya jaata hai: `https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=driving` — naya tab/app mein khulta hai (phone pe Google Maps app installed ho to seedha wahi khulega).

## Setup (Firebase — 5 steps)
1. [console.firebase.google.com](https://console.firebase.google.com) par naya project banao.
2. **Build > Authentication > Sign-in method** mein "Anonymous" enable karo.
3. **Build > Realtime Database** banao (test mode se shuru karo), phir Rules tab mein `shared/firebase-config.js` ke bottom comment mein diye gaye rules paste karo.
4. Project Settings > General > "Your apps" > Web app add karo, jo config milega usse `shared/firebase-config.js` ke `firebaseConfig` object mein paste karo.
5. `admin.html` mein `ADMIN_PIN` apna khud ka rakh lo (abhi `2580` hai — demo ke liye, change zaroor karna).

## Hosting — InfinityFree (site) + Render (push server)

### Part A — Static site InfinityFree par
1. [infinityfree.net](https://infinityfree.net) par free account + hosting banao (koi bhi subdomain, e.g. `chalo.rf.gd` type).
2. Control panel > **File Manager** (ya FTP client — FileZilla — se) kholo, `htdocs`/`public_html` folder ke andar jao.
3. Poora `chalo/` folder ka content wahan upload karo — **`sw.js` zaroor root mein hi rahe** (`public_html/sw.js`, kisi subfolder mein nahi), warna push scope poore site ko cover nahi karega.
4. Bas — `rider.html`, `driver.html`, `admin.html` seedhe static files ki tarah serve ho jaayengi (ES modules ke liye koi special server config nahi chahiye, sirf HTTPS chahiye jo InfinityFree free plan pe already milta hai).
5. `shared/firebase-config.js` mein apna Firebase config already daal chuke ho (upar wala Setup) — waisa hi rahega, `server/` folder upload karne ki zaroorat nahi (wo Render par jaayega).

### Part B — Push server Render.com par
1. Is poore project (khaas kar `server/` folder) ko GitHub repo mein rakho — Render GitHub se hi deploy karta hai.
2. `npx web-push generate-vapid-keys` apne computer/Termux mein chalao (Node hona chahiye) — do keys milengi: `Public Key` aur `Private Key`. Inhe safe rakho.
3. Firebase Console > Project Settings > **Service Accounts** > "Generate new private key" — ek JSON file download hogi.
4. [render.com](https://render.com) par free account banao > **New > Web Service** > apna GitHub repo connect karo.
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Render ke **Environment** tab mein ye variables add karo (`server/.env.example` mein poori list hai):
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — step 2 se
   - `FIREBASE_DATABASE_URL` — Firebase config ka `databaseURL`
   - `FIREBASE_SERVICE_ACCOUNT` — step 3 wali JSON file ka **poora content** ek single-line string bana ke paste karo
6. Deploy hone ke baad Render ek URL dega (e.g. `https://chalo-push.onrender.com`) — usse browser mein khol ke check karo "Chalo push server chal raha hai ✓" dikhna chahiye.
7. `shared/config.js` mein wapas jaake `VAPID_PUBLIC_KEY` (step 2 ki public key) aur `PUSH_SERVER_URL` (step 6 ka URL, end mein `/` nahi) daal do, phir InfinityFree pe re-upload kar do.

Is step ke baad rider/driver dono ko real push notifications aani shuru ho jaayengi, chahe unka tab/app band hi kyun na ho. Jab tak `shared/config.js` mein placeholder values hain, sirf in-tab notifications (`shared/notify.js`) chalti rahengi — koi crash nahi hoga.

## Ride Flow
`requested` → (driver accept karta hai, transaction se double-accept blocked) → `accepted` → `arrived` → `ongoing` → `completed` (ya kisi bhi stage pe `cancelled`).

## Known Simplifications (aage badha sakte ho)
- Distance = seedhi line (Haversine) × 1.3 factor, actual road-routing nahi (OSRM/Google Directions API se replace ho sakta hai).
- Ride matching sabhi online drivers ko sab requests dikhata hai — asal Uber jaisa "nearest driver" radius-filtering add nahi hai abhi.
- Payment integration nahi hai — sirf fare calculate/display hoti hai.
- Rating/review system nahi hai.
- Render free tier idle hone par "sleep" ho jaata hai — pehli push request 30-50 sec slow ho sakti hai (cold start). Paid tier ya cron-job "ping" se isse avoid kar sakte ho.
