// sw.js — ROOT mein hona zaroori hai (InfinityFree pe seedha public_html/sw.js),
// warna scope sirf uss subfolder tak limited ho jaayega jahan ye rakha hai.
//
// Ye service worker "real" push notifications handle karta hai — jo server (Render)
// se bheji jaati hain aur tab/app band hone par bhi aati hain. shared/notify.js
// wali local notification isse alag hai (wo sirf tab open hone par kaam karti hai,
// bina kisi server ke).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Chalo", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Chalo";
  const options = {
    body: data.body || "",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || "/" },
    // icon/badge chaho to yahan apna logo path daal sakte ho, e.g. "/icon-192.png"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification tap karne par sahi app (rider/driver) khol do ya focus kar do
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(targetUrl) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
