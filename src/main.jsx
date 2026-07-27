import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// ── ตรวจว่ามีโค้ดใหม่บนเซิร์ฟเวอร์หรือยัง แล้วโหลดใหม่อัตโนมัติ ──
// ปัญหา: เครื่องที่สาขาเปิดหน้าจอคิวค้างไว้ทั้งวัน จะรันโค้ดเก่าในหน่วยความจำตลอด
//        deploy ไปแล้วก็ไม่มีผลจนกว่าจะมีคนปิด-เปิดเอง
// วิธี: Vite ใส่ hash ไว้ในชื่อไฟล์ JS ทุกครั้งที่ build (เช่น index-a1b2c3.js)
//       จึงดึง index.html จากเซิร์ฟเวอร์มาเทียบชื่อไฟล์ ถ้าไม่ตรง = มีบิลด์ใหม่ → reload
const RELOAD_FLAG = "cpro_ver_reloads";

async function checkForNewBuild() {
  try {
    let tries = 0;
    try { tries = parseInt(sessionStorage.getItem(RELOAD_FLAG) || "0") || 0; } catch {}
    if (tries >= 2) return;               // กันลูป: ลองแล้ว 2 ครั้งพอ

    const current = document.querySelector('script[type="module"]')?.getAttribute("src");
    if (!current) return;

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3000);   // เน็ตช้าต้องไม่ค้าง
    const res = await fetch("/index.html?_cb=" + Date.now(), { cache: "no-store", signal: ctrl.signal });
    clearTimeout(to);
    const html = await res.text();
    const m = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
    if (m && m[1] !== current) {
      try { sessionStorage.setItem(RELOAD_FLAG, String(tries + 1)); } catch {}
      try {
        if (window.caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch {}
      location.reload();
      return;
    }
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch {}
  } catch {
    // ออฟไลน์/เช็คไม่ได้ — ข้ามไป ใช้ของเดิมต่อได้ปกติ
  }
}

// เช็คตอนเปิด, ตอนสลับกลับมาที่หน้าจอ และทุก 10 นาทีระหว่างเปิดค้าง
checkForNewBuild();
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForNewBuild(); });
setInterval(checkForNewBuild, 600000);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
