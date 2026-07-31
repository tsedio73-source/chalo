// shared/notify.js
// Browser Notification API ka thin wrapper — rider.html aur driver.html dono isko
// use karte hain taaki ride status change hone par ek native OS-level notification
// aaye, chahe user tab kisi aur jagah ho ya app minimized ho (background tab).
//
// Kaam kaise karta hai:
// 1. requestNotifyPermission() — user se ek baar permission maangta hai (button click
//    jaisa "real" user-gesture ke baad call karna best hai, warna browser silently deny
//    kar sakta hai).
// 2. notify(title, body, opts) — agar permission mil chuki hai to native Notification
//    dikhata hai; agar nahi mili ya browser support nahi karta to silently no-op karta
//    hai (app kabhi crash nahi karega isme).
//
// Note: iOS Safari mein Notification API installed PWA ke bina kaam nahi karta —
// wahan ye function chup-chaap skip ho jaayega, koi error nahi aayega.

export function isNotifySupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotifyPermission() {
  if (!isNotifySupported()) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch (e) {
    return "denied";
  }
}

// title: string, body: string, opts: { tag, icon, onClick } (sab optional)
export function notify(title, body, opts = {}) {
  if (!isNotifySupported() || Notification.permission !== "granted") return null;
  try {
    const n = new Notification(title, {
      body,
      tag: opts.tag,          // same tag = purani notification replace ho jaati hai, spam nahi hota
      renotify: !!opts.tag,
      icon: opts.icon,
      silent: false
    });
    if (opts.onClick) {
      n.onclick = () => {
        window.focus();
        opts.onClick();
        n.close();
      };
    }
    // Auto-close so old notifications don't pile up in the tray
    setTimeout(() => n.close(), opts.autoCloseMs ?? 12000);
    return n;
  } catch (e) {
    console.error("Notification failed:", e);
    return null;
  }
}
