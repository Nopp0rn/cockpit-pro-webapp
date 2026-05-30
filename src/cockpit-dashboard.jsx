import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────
const BACKEND = "https://cockpit-pro-backend-staging.onrender.com";

const THAI_PROVINCES = [
  "กระบี่","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา",
  "ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก",
  "นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี",
  "นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี",
  "ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก",
  "เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน",
  "ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน",
  "เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม",
  "สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี",
  "สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี",
  "อุตรดิตถ์","อุทัยธานี","อุบลราชธานี","กรุงเทพมหานคร"
];

const JOB_TYPES = [
  { label: "เปลี่ยนยาง 4 เส้น", minutes: 52 },
  { label: "สลับยาง", minutes: 12 },
  { label: "ยาง 1,2,3 เส้น", minutes: 20 },
  { label: "ถ่วงล้อ", minutes: 35 },
  { label: "ตั้งศูนย์ล้อ", minutes: 52 },
  { label: "เปลี่ยนถ่ายน้ำมันเครื่อง", minutes: 35 },
  { label: "เปลี่ยนแบตเตอรี่", minutes: 25 },
  { label: "เปลี่ยนเบรก", minutes: 52 },
  { label: "CockpitSure", minutes: 17 },
  { label: "เปลี่ยนโช้คอัพ", minutes: 52 },
  { label: "งานซ่อมช่วงล่าง", minutes: 135 },
  { label: "เบิกอะไหล่", minutes: 85 },
  { label: "งานซ่อมอื่น", minutes: 75 },
];

const STATUS_COLOR = {
  "waiting_entry": "#f59e0b",
  "in_service": "#3b82f6",
  "done": "#10b981",
};

const STATUS_LABEL = {
  "waiting_entry": "รอ",
  "in_service": "กำลังทำ",
  "done": "เสร็จ",
};

// ─── Helpers ──────────────────────────────────────────────────
function getActiveBranch() {
  return localStorage.getItem("activeBranch") || "";
}

function fmtTime(isoStr) {
  if (!isoStr) return "-";
  return new Date(isoStr).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(isoStr) {
  if (!isoStr) return "-";
  return new Date(isoStr).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtDateTime(isoStr) {
  if (!isoStr) return "-";
  return fmtDate(isoStr) + " " + fmtTime(isoStr);
}

function minutesSince(isoStr) {
  if (!isoStr) return 0;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
}

function getDuration(name) {
  const found = JOB_TYPES.find(function(j) { return j.label === name; });
  return found ? found.minutes : 30;
}

async function apiFetch(path, opts) {
  const res = await fetch(BACKEND + path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {}));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// ─── CockpitLogo ─────────────────────────────────────────────
function CockpitLogo(props) {
  const size = props.size || 32;
  return (
    <svg width={size * 4} height={size} viewBox="0 0 160 40" fill="none">
      <rect width="160" height="40" rx="4" fill="#1a1a1a"/>
      <text x="10" y="28" fontFamily="Arial Black, sans-serif" fontSize="22" fontWeight="900" fill="#FFD700" letterSpacing="2">cockpit</text>
      <rect x="138" y="0" width="22" height="40" fill="#FFD700"/>
      <text x="141" y="28" fontFamily="Arial Black, sans-serif" fontSize="14" fontWeight="900" fill="#1a1a1a">PRO</text>
    </svg>
  );
}

// ─── Toast ────────────────────────────────────────────────────
function CompletionToast(props) {
  const msg = props.message;
  const onClose = props.onClose;
  useEffect(function() {
    if (!msg) return;
    const t = setTimeout(onClose, 3500);
    return function() { clearTimeout(t); };
  }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: "#10b981", color: "#fff", padding: "12px 24px", borderRadius: 12,
      fontWeight: 700, fontSize: 15, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      whiteSpace: "nowrap"
    }}>
      ✅ {msg}
    </div>
  );
}

// ─── ProvincePicker ──────────────────────────────────────────
function ProvincePicker(props) {
  return (
    <select value={props.value} onChange={function(e) { props.onChange(e.target.value); }}
      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #374151", background: "#1f2937", color: "#f9fafb", fontSize: 15 }}>
      <option value="">-- เลือกจังหวัด --</option>
      {THAI_PROVINCES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}
    </select>
  );
}

// ─── Modal + Btn ─────────────────────────────────────────────
function Modal(props) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
      onClick={function(e) { if (e.target === e.currentTarget) props.onClose(); }}>
      <div style={{ background: "#1f2937", borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #374151" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f9fafb" }}>{props.title}</h3>
          <button onClick={props.onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 22, cursor: "pointer", padding: 4 }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{props.children}</div>
      </div>
    </div>
  );
}

function Btn(props) {
  const color = props.color || "#3b82f6";
  return (
    <button onClick={props.onClick} disabled={props.disabled}
      style={{ background: props.disabled ? "#374151" : color, color: props.disabled ? "#6b7280" : "#fff", border: "none", borderRadius: 8, cursor: props.disabled ? "not-allowed" : "pointer", padding: props.small ? "6px 12px" : "10px 18px", fontSize: props.small ? 13 : 15, fontWeight: 600, width: props.full ? "100%" : undefined, opacity: props.disabled ? 0.7 : 1 }}>
      {props.children}
    </button>
  );
}

// ─── CockpitSure Modal ────────────────────────────────────────
// Records directly from streamRef — NO canvas (fixes Android freeze)
function CockpitSureModal(props) {
  const branchId = props.branchId;
  const bay = props.bay;
  const plate = props.plate;
  const province = props.province;
  const onClose = props.onClose;
  const onDone = props.onDone;

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [phase, setPhase] = useState("preview");
  const [elapsed, setElapsed] = useState(0);
  const [facingMode, setFacingMode] = useState("environment");
  const [error, setError] = useState("");
  const [uploadPct, setUploadPct] = useState(0);

  const startCamera = useCallback(async function(mode) {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function(t) { t.stop(); });
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(function() {}); }
    } catch (err) { setError("ไม่สามารถเปิดกล้องได้: " + err.message); }
  }, []);

  useEffect(function() {
    startCamera(facingMode);
    return function() {
      if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop(); });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera, facingMode]);

  function handleStartRecord() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const bps = isMobile ? 1500000 : 4000000;
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mime, videoBitsPerSecond: bps });
    recorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start(2000);
    recorderRef.current = recorder;
    setPhase("recording");
    setElapsed(0);
    timerRef.current = setInterval(function() { setElapsed(function(p) { return p + 1; }); }, 1000);
  }

  function handleStopRecord() {
    if (timerRef.current) clearInterval(timerRef.current);
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.onstop = function() { uploadVideo(); };
    recorder.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop(); });
  }

  async function uploadVideo() {
    setPhase("uploading");
    setUploadPct(0);
    const mime = (recorderRef.current && recorderRef.current.mimeType) || "video/webm";
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = plate + "_" + province + "_" + dateStr + "." + ext;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const fd = new FormData();
        fd.append("file", blob, filename);
        fd.append("upload_preset", "cockpit_unsigned");
        fd.append("folder", "cockpit_sure");

        const url = await new Promise(function(resolve, reject) {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = function(e) { if (e.lengthComputable) setUploadPct(Math.round(e.loaded / e.total * 100)); };
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).secure_url);
            else reject(new Error("Upload failed: " + xhr.status));
          };
          xhr.onerror = function() { reject(new Error("Network error")); };
          xhr.open("POST", "https://api.cloudinary.com/v1_1/dnmzyoobh/video/upload");
          xhr.send(fd);
        });

        // Send to backend — uses videoUrl (camelCase) per server.js
        await apiFetch("/api/branch/" + branchId + "/bay/" + bay + "/send-video", {
          method: "POST",
          body: JSON.stringify({ videoUrl: url, plate: plate })
        });
        setPhase("done");
        if (onDone) onDone();
        return;
      } catch (err) {
        if (attempt === 3) { setError("อัปโหลดไม่สำเร็จ: " + err.message); setPhase("preview"); }
        else await new Promise(function(r) { setTimeout(r, 1500 * attempt); });
      }
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const nowStr = new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 2000, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {/* Frame overlay — yellow right strip + top-right strip */}
        <div style={{ position: "absolute", top: 0, right: 0, width: "1.7%", height: "100%", background: "#FFD700", opacity: 0.85 }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "60%", height: "1.7%", background: "#FFD700", opacity: 0.85 }} />
        {/* Logo top-left */}
        <div style={{ position: "absolute", top: 12, left: 12 }}><CockpitLogo size={20} /></div>
        {/* REC badge center-top */}
        {phase === "recording" && (
          <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: "#ef4444", color: "#fff", borderRadius: 6, padding: "4px 12px", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
            REC {mm}:{ss}
          </div>
        )}
        {/* Car info bottom — no background */}
        <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, color: "#FFD700", fontSize: 16, fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
          {plate} {province} | {nowStr}
        </div>
        {/* Camera switch bottom-left above info */}
        {phase !== "uploading" && (
          <button onClick={function() { setFacingMode(function(m) { return m === "environment" ? "user" : "environment"; }); }}
            style={{ position: "absolute", bottom: 60, left: 16, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 44, height: 44, color: "#fff", fontSize: 22, cursor: "pointer" }}>🔄</button>
        )}
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 20, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ background: "#111", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {error && <div style={{ color: "#ef4444", fontWeight: 600, textAlign: "center" }}>{error}</div>}
        {phase === "preview" && (
          <>
            <button onClick={handleStartRecord} style={{ background: "#ef4444", border: "none", borderRadius: 50, width: 64, height: 64, alignSelf: "center", cursor: "pointer", fontSize: 28 }}>⏺</button>
            <div style={{ color: "#9ca3af", textAlign: "center", fontSize: 13 }}>กด ⏺ เพื่อเริ่มบันทึก CockpitSure</div>
          </>
        )}
        {phase === "recording" && (
          <button onClick={handleStopRecord} style={{ background: "#ef4444", border: "2px solid #fff", borderRadius: 8, padding: "12px 24px", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", alignSelf: "center" }}>⏹ หยุดและอัปโหลด</button>
        )}
        {phase === "uploading" && (
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>กำลังอัปโหลด... {uploadPct}%</div>
            <div style={{ background: "#374151", borderRadius: 4, height: 8 }}>
              <div style={{ width: uploadPct + "%", height: "100%", background: "#FFD700", borderRadius: 4, transition: "width 0.3s" }} />
            </div>
          </div>
        )}
        {phase === "done" && (
          <div style={{ textAlign: "center", color: "#10b981", fontWeight: 700, fontSize: 18 }}>
            ✅ อัปโหลดสำเร็จ!
            <div><button onClick={onClose} style={{ marginTop: 12, background: "#374151", border: "none", borderRadius: 8, color: "#fff", padding: "8px 24px", cursor: "pointer" }}>ปิด</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OpenQueueModal ───────────────────────────────────────────
// server.js open expects: { plate, province, phone, userId }
// Creates initial job "รับรถเข้า" automatically on server
// Staff selects additional jobs to add via addjobs after
function OpenQueueModal(props) {
  const branchId = props.branchId;
  const bay = props.bay;
  const [plate, setPlate] = useState("");
  const [province, setProvince] = useState("");
  const [phone, setPhone] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function toggleJob(label) {
    setSelectedJobs(function(prev) {
      if (prev.includes(label)) return prev.filter(function(j) { return j !== label; });
      return prev.concat([label]);
    });
  }

  async function handleSubmit() {
    if (!plate.trim()) { setErr("กรุณากรอกทะเบียน"); return; }
    if (!province) { setErr("กรุณาเลือกจังหวัด"); return; }
    setLoading(true); setErr("");
    try {
      // Open bay — server creates "รับรถเข้า" job automatically
      await apiFetch("/api/branch/" + branchId + "/bay/" + bay + "/open", {
        method: "POST",
        body: JSON.stringify({ plate: plate.trim().toUpperCase(), province: province, phone: phone.trim(), userId: lineUserId.trim() || undefined })
      });
      // If additional jobs selected, add them
      if (selectedJobs.length > 0) {
        await apiFetch("/api/branch/" + branchId + "/bay/" + bay + "/addjobs", {
          method: "POST",
          body: JSON.stringify({ jobs: selectedJobs })
        });
      }
      props.onDone();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal title={"เปิดคิว — ช่อง " + bay} onClose={props.onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 13 }}>ทะเบียนรถ *</label>
          <input value={plate} onChange={function(e) { setPlate(e.target.value); }} placeholder="เช่น กข 1234"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #374151", background: "#111827", color: "#f9fafb", fontSize: 15, boxSizing: "border-box", marginTop: 4 }} />
        </div>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 13 }}>จังหวัด *</label>
          <div style={{ marginTop: 4 }}><ProvincePicker value={province} onChange={setProvince} /></div>
        </div>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 13 }}>เบอร์โทร</label>
          <input value={phone} onChange={function(e) { setPhone(e.target.value); }} placeholder="0812345678" type="tel"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #374151", background: "#111827", color: "#f9fafb", fontSize: 15, boxSizing: "border-box", marginTop: 4 }} />
        </div>
        <div>
          <label style={{ color: "#9ca3af", fontSize: 13 }}>งานเพิ่มเติม (ถ้ามี)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {JOB_TYPES.map(function(jt) {
              const sel = selectedJobs.includes(jt.label);
              return (
                <button key={jt.label} onClick={function() { toggleJob(jt.label); }}
                  style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid", borderColor: sel ? "#3b82f6" : "#374151", background: sel ? "#1d4ed8" : "#111827", color: sel ? "#fff" : "#9ca3af", fontSize: 13, cursor: "pointer", fontWeight: sel ? 700 : 400 }}>
                  {jt.label}
                </button>
              );
            })}
          </div>
        </div>
        {err && <div style={{ color: "#ef4444", fontSize: 14 }}>{err}</div>}
        <Btn onClick={handleSubmit} disabled={loading} full color="#10b981">{loading ? "กำลังบันทึก..." : "✅ เปิดคิว"}</Btn>
      </div>
    </Modal>
  );
}

// ─── AddJobsModal ─────────────────────────────────────────────
// server.js addjobs expects: { jobs: [name1, name2, ...] }  (array of strings!)
function AddJobsModal(props) {
  const currentNames = (props.currentJobs || []).map(function(j) { return j.name; });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function toggle(label) {
    setSelected(function(prev) {
      if (prev.includes(label)) return prev.filter(function(j) { return j !== label; });
      return prev.concat([label]);
    });
  }

  async function handleAdd() {
    if (selected.length === 0) { setErr("เลือกงานก่อน"); return; }
    setLoading(true); setErr("");
    try {
      await apiFetch("/api/branch/" + props.branchId + "/bay/" + props.bay + "/addjobs", {
        method: "POST",
        body: JSON.stringify({ jobs: selected }) // array of strings per server.js
      });
      props.onDone();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="เพิ่มงาน" onClose={props.onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {JOB_TYPES.map(function(jt) {
            const already = currentNames.includes(jt.label);
            const sel = selected.includes(jt.label);
            return (
              <button key={jt.label} onClick={function() { if (!already) toggle(jt.label); }} disabled={already}
                style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid", borderColor: already ? "#374151" : sel ? "#3b82f6" : "#374151", background: already ? "#0f172a" : sel ? "#1d4ed8" : "#111827", color: already ? "#4b5563" : sel ? "#fff" : "#9ca3af", fontSize: 13, cursor: already ? "not-allowed" : "pointer" }}>
                {jt.label} {already ? "✓" : ""}
              </button>
            );
          })}
        </div>
        {err && <div style={{ color: "#ef4444", fontSize: 14 }}>{err}</div>}
        <Btn onClick={handleAdd} disabled={loading} full color="#3b82f6">{loading ? "กำลังเพิ่ม..." : "➕ เพิ่มงาน"}</Btn>
      </div>
    </Modal>
  );
}

// ─── QuotationModal ───────────────────────────────────────────
// server.js quote expects: { plate, note, photoUrls: [...] }  (photoUrls!)
function QuotationModal(props) {
  const [photos, setPhotos] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  function handlePickPhoto(e) {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(function(f) { return f.type.startsWith("image/"); });
    if (photos.length + valid.length > 5) { setErr("สูงสุด 5 รูป"); return; }
    Promise.all(valid.map(function(f) {
      return new Promise(function(resolve) {
        const r = new FileReader();
        r.onload = function(ev) { resolve({ file: f, preview: ev.target.result }); };
        r.readAsDataURL(f);
      });
    })).then(function(results) { setPhotos(function(prev) { return prev.concat(results); }); setErr(""); });
  }

  async function uploadToCloudinary(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "cockpit_unsigned");
    fd.append("folder", "cockpit_quotes");
    const res = await fetch("https://api.cloudinary.com/v1_1/dnmzyoobh/image/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()).secure_url;
  }

  async function handleSend() {
    if (photos.length === 0) { setErr("กรุณาถ่ายหรือเลือกรูปใบเสนอราคา"); return; }
    setLoading(true); setErr("");
    try {
      const photoUrls = await Promise.all(photos.map(function(p) { return uploadToCloudinary(p.file); }));
      await apiFetch("/api/branch/" + props.branchId + "/bay/" + props.bay + "/quote", {
        method: "POST",
        body: JSON.stringify({ plate: props.plate, note: note, photoUrls: photoUrls }) // photoUrls per server.js
      });
      props.onDone();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="ส่งใบเสนอราคา" onClose={props.onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ color: "#9ca3af", fontSize: 14 }}>ถ่ายรูปใบเสนอราคา แล้วส่งไป LINE ลูกค้า</div>
        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display: "none" }} onChange={handlePickPhoto} />
        <Btn onClick={function() { fileRef.current && fileRef.current.click(); }} disabled={photos.length >= 5} color="#6366f1">📷 ถ่าย / เลือกรูป ({photos.length}/5)</Btn>
        {photos.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {photos.map(function(p, i) {
              return (
                <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                  <img src={p.preview} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />
                  <button onClick={function() { setPhotos(function(prev) { return prev.filter(function(_, idx) { return idx !== i; }); }); }}
                    style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", borderRadius: "50%", width: 20, height: 20, color: "#fff", fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              );
            })}
          </div>
        )}
        <div>
          <label style={{ color: "#9ca3af", fontSize: 13 }}>หมายเหตุ</label>
          <textarea value={note} onChange={function(e) { setNote(e.target.value); }} rows={3} placeholder="รายละเอียดเพิ่มเติม..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #374151", background: "#111827", color: "#f9fafb", fontSize: 14, resize: "vertical", boxSizing: "border-box", marginTop: 4 }} />
        </div>
        {err && <div style={{ color: "#ef4444", fontSize: 14 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={props.onClose} color="#374151" full>ยกเลิก</Btn>
          <Btn onClick={handleSend} disabled={loading} color="#10b981" full>{loading ? "กำลังส่ง..." : "📤 ส่งไปยัง LINE"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── QueueCard ────────────────────────────────────────────────
// baysData[bay] = { plate, province, phone, userId, bayStatus, jobs, startTime }
// jobs = [{ name, duration, status }]  status: "waiting"|"in_progress"|"done"
function QueueCard(props) {
  const bay = props.bay;
  const data = props.data;
  const branchId = props.branchId;
  const onRefresh = props.onRefresh;
  const onToast = props.onToast;

  const [expanded, setExpanded] = useState(false);
  const [showAddJobs, setShowAddJobs] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showSure, setShowSure] = useState(false);
  const [loading, setLoading] = useState(false);

  const bayStatus = data.bayStatus || "waiting_entry";
  const statusColor = STATUS_COLOR[bayStatus] || "#6b7280";
  const jobs = (data.jobs || []).filter(function(j) { return j.name !== "รับรถเข้า"; });
  const doneCount = jobs.filter(function(j) { return j.status === "done"; }).length;
  const allJobsDone = jobs.length > 0 && doneCount === jobs.length;

  async function callApi(path, body) {
    setLoading(true);
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify(body || {}) });
      onRefresh();
    } catch (e) { alert("เกิดข้อผิดพลาด: " + e.message); }
    finally { setLoading(false); }
  }

  async function updateJobStatus(idx, newStatus) {
    setLoading(true);
    try {
      await apiFetch("/api/branch/" + branchId + "/bay/" + bay + "/job/" + idx, {
        method: "PATCH", body: JSON.stringify({ status: newStatus })
      });
      if (newStatus === "done") {
        onToast("เสร็จ: " + (data.jobs[idx] && data.jobs[idx].name));
      }
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  async function removeJob(idx) {
    if (!window.confirm("ลบงาน \"" + (data.jobs[idx] && data.jobs[idx].name) + "\" ?")) return;
    setLoading(true);
    try {
      await apiFetch("/api/branch/" + branchId + "/bay/" + bay + "/removejob", {
        method: "POST", body: JSON.stringify({ jobIdx: idx })
      });
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  const hasCockpitSure = (data.jobs || []).some(function(j) { return j.name === "CockpitSure"; });

  // Get real job index in data.jobs (including รับรถเข้า)
  function getRealIdx(displayIdx) {
    let realIdx = 0; let count = 0;
    for (let i = 0; i < (data.jobs || []).length; i++) {
      if ((data.jobs)[i].name !== "รับรถเข้า") {
        if (count === displayIdx) { realIdx = i; break; }
        count++;
      }
    }
    return realIdx;
  }

  return (
    <div style={{ background: "#1f2937", borderRadius: 16, border: "2px solid " + statusColor, overflow: "hidden", marginBottom: 12 }}>
      <div onClick={function() { setExpanded(function(p) { return !p; }); }} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: statusColor, color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700 }}>ช่อง {bay}</div>
          <div>
            <div style={{ color: "#f9fafb", fontWeight: 700, fontSize: 16 }}>{data.plate} {data.province}</div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
              {STATUS_LABEL[bayStatus]} · {doneCount}/{jobs.length} งาน
            </div>
          </div>
        </div>
        <div style={{ color: "#9ca3af", fontSize: 18 }}>{expanded ? "▲" : "▼"}</div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid #374151", padding: "14px 16px" }}>
          {/* Jobs list — show all except รับรถเข้า with cycle: waiting→in_progress→done */}
          <div style={{ marginBottom: 12 }}>
            {jobs.map(function(job, i) {
              const realIdx = getRealIdx(i);
              const jobStatus = job.status || "waiting";
              const nextStatus = jobStatus === "waiting" ? "in_progress" : jobStatus === "in_progress" ? "done" : "done";
              const statusIcons = { "waiting": "⏳", "in_progress": "🔧", "done": "✅" };
              const statusColors2 = { "waiting": "#374151", "in_progress": "#f59e0b", "done": "#10b981" };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < jobs.length - 1 ? "1px solid #374151" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={function() { if (jobStatus !== "done") updateJobStatus(realIdx, nextStatus); }} disabled={loading || jobStatus === "done"}
                      style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid " + statusColors2[jobStatus], background: jobStatus === "done" ? "#10b981" : "transparent", color: "#fff", fontSize: 14, cursor: jobStatus === "done" ? "default" : "pointer" }}>
                      {statusIcons[jobStatus]}
                    </button>
                    <span style={{ color: jobStatus === "done" ? "#6b7280" : "#f9fafb", fontSize: 14, textDecoration: jobStatus === "done" ? "line-through" : "none" }}>
                      {job.name} <span style={{ color: "#6b7280", fontSize: 12 }}>({job.duration || getDuration(job.name)}m)</span>
                    </span>
                  </div>
                  <button onClick={function() { removeJob(realIdx); }} disabled={loading}
                    style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, padding: "0 4px" }}>✕</button>
                </div>
              );
            })}
          </div>

          {/* Info row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12, fontSize: 13 }}>
            {data.phone && <div style={{ color: "#9ca3af" }}>โทร: <span style={{ color: "#f9fafb" }}>{data.phone}</span></div>}
            {data.startTime && <div style={{ color: "#9ca3af" }}>เริ่ม: <span style={{ color: "#f9fafb" }}>{fmtTime(data.startTime)}</span></div>}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {bayStatus === "waiting_entry" && (
              <Btn small color="#3b82f6" onClick={function() { callApi("/api/branch/" + branchId + "/bay/" + bay + "/start"); }} disabled={loading}>▶ เริ่มงาน</Btn>
            )}
            {(bayStatus === "in_service" || (bayStatus === "waiting_entry" && allJobsDone)) && (
              <Btn small color="#10b981" onClick={function() { callApi("/api/branch/" + branchId + "/bay/" + bay + "/close"); }} disabled={loading}>✅ ปิดงาน</Btn>
            )}
            {bayStatus === "done" && (
              <Btn small color="#10b981" onClick={function() { callApi("/api/branch/" + branchId + "/bay/" + bay + "/close"); }} disabled={loading}>✅ ส่งมอบ</Btn>
            )}
            <Btn small color="#6366f1" onClick={function() { setShowAddJobs(true); }} disabled={loading}>➕ งาน</Btn>
            <Btn small color="#f59e0b" onClick={function() { setShowQuote(true); }} disabled={loading}>📋 ใบเสนอราคา</Btn>
            {hasCockpitSure && (
              <Btn small color="#8b5cf6" onClick={function() { setShowSure(true); }} disabled={loading}>🎥 CockpitSure</Btn>
            )}
            <Btn small color="#374151" onClick={function() { callApi("/api/branch/" + branchId + "/bay/" + bay + "/notify"); }} disabled={loading}>🔔 แจ้งลูกค้า</Btn>
          </div>
        </div>
      )}

      {showAddJobs && (
        <AddJobsModal branchId={branchId} bay={bay} currentJobs={data.jobs || []}
          onClose={function() { setShowAddJobs(false); }} onDone={function() { setShowAddJobs(false); onRefresh(); }} />
      )}
      {showQuote && (
        <QuotationModal branchId={branchId} bay={bay} plate={data.plate} province={data.province}
          onClose={function() { setShowQuote(false); }} onDone={function() { setShowQuote(false); onToast("ส่งใบเสนอราคาแล้ว"); }} />
      )}
      {showSure && (
        <CockpitSureModal branchId={branchId} bay={bay} plate={data.plate} province={data.province}
          onClose={function() { setShowSure(false); }} onDone={function() { setShowSure(false); onRefresh(); }} />
      )}
    </div>
  );
}

// ─── EmptyBayCard ─────────────────────────────────────────────
function EmptyBayCard(props) {
  const [showOpen, setShowOpen] = useState(false);
  return (
    <div style={{ background: "#111827", borderRadius: 16, border: "2px dashed #374151", padding: "20px 16px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ color: "#6b7280", fontSize: 15 }}><span style={{ fontWeight: 700, color: "#4b5563" }}>ช่อง {props.bay}</span> — ว่าง</div>
      <Btn small color="#10b981" onClick={function() { setShowOpen(true); }}>+ เปิดคิว</Btn>
      {showOpen && (
        <OpenQueueModal branchId={props.branchId} bay={props.bay}
          onClose={function() { setShowOpen(false); }} onDone={function() { setShowOpen(false); props.onRefresh(); }} />
      )}
    </div>
  );
}

// ─── StaffView ────────────────────────────────────────────────
// GET /api/branch/:id returns { ...branch, baysData: { [bay]: {...} } }
function StaffView(props) {
  const branchId = props.branchId;
  const [data, setData] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async function() {
    if (!branchId) return;
    setLoading(true); setErr("");
    try {
      const res = await apiFetch("/api/branch/" + branchId);
      setData(res);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [branchId]);

  useEffect(function() { load(); }, [load]);
  useEffect(function() {
    const interval = setInterval(load, 30000);
    return function() { clearInterval(interval); };
  }, [load]);

  if (!branchId) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>กรุณาเลือกสาขาด้านบน</div>;
  if (loading && !data) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>กำลังโหลด...</div>;
  if (err) return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <div style={{ color: "#ef4444", marginBottom: 12 }}>⚠️ {err}</div>
      <Btn onClick={load} color="#374151">ลองใหม่</Btn>
    </div>
  );

  const baysData = (data && data.baysData) || {};
  const maxBays = (data && data.max_bays) || 6;
  const occupiedBays = Object.keys(baysData).map(Number);

  const waiting = Object.values(baysData).filter(function(d) { return d.bayStatus === "waiting_entry"; }).length;
  const inService = Object.values(baysData).filter(function(d) { return d.bayStatus === "in_service"; }).length;
  const done = Object.values(baysData).filter(function(d) { return d.bayStatus === "done"; }).length;

  return (
    <div style={{ padding: "0 0 80px 0" }}>
      <CompletionToast message={toast} onClose={function() { setToast(""); }} />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "รอ", count: waiting, color: "#f59e0b" },
          { label: "กำลังทำ", count: inService, color: "#3b82f6" },
          { label: "เสร็จ", count: done, color: "#10b981" },
        ].map(function(s) {
          return (
            <div key={s.label} style={{ background: "#1f2937", borderRadius: 12, padding: "12px 8px", textAlign: "center", borderTop: "3px solid " + s.color }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn small color="#374151" onClick={load} disabled={loading}>{loading ? "⏳" : "🔄"} รีเฟรช</Btn>
      </div>

      {/* Occupied bays */}
      {Object.keys(baysData).sort(function(a, b) { return Number(a) - Number(b); }).map(function(bay) {
        return (
          <QueueCard key={bay} bay={bay} data={baysData[bay]} branchId={branchId} onRefresh={load} onToast={setToast} />
        );
      })}

      {/* Empty bays */}
      {Array.from({ length: maxBays }, function(_, i) { return i + 1; })
        .filter(function(b) { return !occupiedBays.includes(b); })
        .map(function(b) {
          return <EmptyBayCard key={b} bay={b} branchId={branchId} onRefresh={load} />;
        })}

      {Object.keys(baysData).length === 0 && (
        <div style={{ textAlign: "center", color: "#6b7280", padding: "20px 0", fontSize: 15 }}>ไม่มีรถในคิวขณะนี้</div>
      )}
    </div>
  );
}

// ─── VideoView ────────────────────────────────────────────────
function VideoView(props) {
  const branchId = props.branchId;
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState(null);

  const load = useCallback(async function() {
    if (!branchId) return;
    setLoading(true); setErr("");
    try {
      const res = await apiFetch("/api/branch/" + branchId + "/videos");
      setVideos(res.videos || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [branchId]);

  useEffect(function() { load(); }, [load]);

  async function handleDelete(videoId) {
    if (!window.confirm("ลบวิดีโอนี้?")) return;
    try {
      await apiFetch("/api/branch/" + branchId + "/videos/" + videoId, { method: "DELETE" });
      load();
    } catch (e) { alert(e.message); }
  }

  const filtered = videos.filter(function(v) {
    const q = search.toLowerCase();
    return !q || (v.plate && v.plate.toLowerCase().includes(q)) || (v.province && v.province.toLowerCase().includes(q));
  });

  if (!branchId) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>กรุณาเลือกสาขา</div>;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="🔍 ค้นหาทะเบียน / จังหวัด"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #374151", background: "#1f2937", color: "#f9fafb", fontSize: 15, boxSizing: "border-box" }} />
      </div>
      {loading && <div style={{ textAlign: "center", color: "#9ca3af", padding: 20 }}>กำลังโหลด...</div>}
      {err && <div style={{ color: "#ef4444", textAlign: "center", padding: 20 }}>{err}</div>}
      {!loading && filtered.length === 0 && <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>ไม่มีวิดีโอ</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {filtered.map(function(v) {
          return (
            <div key={v.id} style={{ background: "#1f2937", borderRadius: 12, overflow: "hidden" }}>
              <div onClick={function() { setPlaying(v); }} style={{ height: 100, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 36 }}>▶️</div>
              <div style={{ padding: "10px 10px 6px" }}>
                <div style={{ color: "#f9fafb", fontWeight: 700, fontSize: 14 }}>{v.plate}</div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>{v.province}</div>
                <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{fmtDateTime(v.uploaded_at)}</div>
                <button onClick={function() { handleDelete(v.id); }} style={{ marginTop: 8, background: "#7f1d1d", border: "none", borderRadius: 6, color: "#fca5a5", fontSize: 12, padding: "4px 10px", cursor: "pointer", width: "100%" }}>🗑 ลบ</button>
              </div>
            </div>
          );
        })}
      </div>
      {playing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 20 }}>
          <div style={{ color: "#f9fafb", marginBottom: 12, fontWeight: 700, fontSize: 16 }}>{playing.plate} {playing.province}</div>
          <video src={playing.video_url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12 }} />
          <button onClick={function() { setPlaying(null); }} style={{ marginTop: 16, background: "#374151", border: "none", borderRadius: 8, color: "#fff", padding: "10px 24px", cursor: "pointer", fontSize: 15 }}>✕ ปิด</button>
        </div>
      )}
    </div>
  );
}

// ─── HistoryView ──────────────────────────────────────────────
function HistoryView(props) {
  const branchId = props.branchId;
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async function() {
    if (!branchId) return;
    setLoading(true); setErr("");
    try {
      let url = "/api/branch/" + branchId + "/history";
      const params = [];
      if (dateFrom) params.push("from=" + dateFrom);
      if (dateTo) params.push("to=" + dateTo);
      if (params.length > 0) url += "?" + params.join("&");
      const res = await apiFetch(url);
      setHistory(res.history || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [branchId, dateFrom, dateTo]);

  useEffect(function() { load(); }, [load]);

  async function handleReopen(histId) {
    if (!window.confirm("เปิดคิวใหม่? (ได้เฉพาะวันเดียวกัน)")) return;
    try {
      await apiFetch("/api/branch/" + branchId + "/history/" + histId + "/reopen", { method: "POST" });
      load();
    } catch (e) { alert(e.message); }
  }

  function exportCSV() {
    const rows = [["วันที่", "ช่อง", "ทะเบียน", "จังหวัด", "งาน", "ปิด", "ยกเลิก"]];
    filtered.forEach(function(h) {
      rows.push([fmtDate(h.closed_at), h.bay, h.plate, h.province,
        (h.jobs || []).filter(function(j) { return j.name !== "รับรถเข้า"; }).map(function(j) { return j.name; }).join(", "),
        fmtTime(h.closed_at), h.cancelled ? "ใช่" : "ไม่"]);
    });
    const csv = rows.map(function(r) { return r.join(","); }).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "history_" + branchId + ".csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = history.filter(function(h) {
    const q = search.toLowerCase();
    return !q || (h.plate && h.plate.toLowerCase().includes(q)) || (h.province && h.province.toLowerCase().includes(q));
  });

  const totalJobs = filtered.reduce(function(sum, h) { return sum + (h.jobs ? h.jobs.filter(function(j) { return j.name !== "รับรถเข้า"; }).length : 0); }, 0);
  const jobCounts = {};
  filtered.forEach(function(h) {
    (h.jobs || []).filter(function(j) { return j.name !== "รับรถเข้า"; }).forEach(function(j) {
      jobCounts[j.name] = (jobCounts[j.name] || 0) + 1;
    });
  });
  const topJobs = Object.entries(jobCounts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

  if (!branchId) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>กรุณาเลือกสาขา</div>;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="🔍 ค้นหาทะเบียน / จังหวัด"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #374151", background: "#1f2937", color: "#f9fafb", fontSize: 15, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" value={dateFrom} onChange={function(e) { setDateFrom(e.target.value); }}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #374151", background: "#1f2937", color: "#f9fafb", fontSize: 14 }} />
          <input type="date" value={dateTo} onChange={function(e) { setDateTo(e.target.value); }}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #374151", background: "#1f2937", color: "#f9fafb", fontSize: 14 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small color="#374151" onClick={load}>🔄</Btn>
          <Btn small color="#059669" onClick={exportCSV}>📊 Export CSV</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#1f2937", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>รถทั้งหมด</div>
          <div style={{ color: "#f9fafb", fontSize: 26, fontWeight: 800 }}>{filtered.length}</div>
        </div>
        <div style={{ background: "#1f2937", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>งานทั้งหมด</div>
          <div style={{ color: "#f9fafb", fontSize: 26, fontWeight: 800 }}>{totalJobs}</div>
        </div>
      </div>

      {topJobs.length > 0 && (
        <div style={{ background: "#1f2937", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 10 }}>งานยอดนิยม</div>
          {topJobs.map(function(j) {
            return (
              <div key={j[0]} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#f9fafb", fontSize: 14 }}>
                <span>{j[0]}</span>
                <span style={{ color: "#3b82f6", fontWeight: 700 }}>{j[1]} ครั้ง</span>
              </div>
            );
          })}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", color: "#9ca3af", padding: 20 }}>กำลังโหลด...</div>}
      {err && <div style={{ color: "#ef4444", textAlign: "center" }}>{err}</div>}

      {filtered.map(function(h) {
        return (
          <div key={h.id} style={{ background: "#1f2937", borderRadius: 12, padding: "14px 16px", marginBottom: 10, borderLeft: "4px solid " + (h.cancelled ? "#ef4444" : "#10b981") }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#f9fafb", fontWeight: 700, fontSize: 15 }}>{h.plate} {h.province}</div>
                <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                  ช่อง {h.bay} · {fmtDateTime(h.closed_at)}
                  {h.cancelled && <span style={{ color: "#ef4444", marginLeft: 6 }}>ยกเลิก</span>}
                </div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(h.jobs || []).filter(function(j) { return j.name !== "รับรถเข้า"; }).map(function(j, i) {
                    return <span key={i} style={{ background: "#111827", color: "#9ca3af", borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>{j.name}</span>;
                  })}
                </div>
              </div>
              <Btn small color="#374151" onClick={function() { handleReopen(h.id); }}>↩ เปิดใหม่</Btn>
            </div>
          </div>
        );
      })}

      {!loading && filtered.length === 0 && <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>ไม่มีข้อมูลประวัติ</div>}
    </div>
  );
}

// ─── AdminView ────────────────────────────────────────────────
// GET /api/admin/overview returns { overview: [{ branchId, name, activeQueues }] }
function AdminView() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async function() {
    setLoading(true); setErr("");
    try {
      const res = await apiFetch("/api/admin/overview");
      setOverview(res);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(function() { load(); }, [load]);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>กำลังโหลด...</div>;
  if (err) return <div style={{ textAlign: "center", padding: 40 }}><div style={{ color: "#ef4444", marginBottom: 12 }}>{err}</div><Btn onClick={load} color="#374151">ลองใหม่</Btn></div>;

  const branches = (overview && overview.overview) || [];

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn small color="#374151" onClick={load} disabled={loading}>🔄 รีเฟรช</Btn>
      </div>
      {branches.map(function(b) {
        return (
          <div key={b.branchId} style={{ background: "#1f2937", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#f9fafb", fontWeight: 700, fontSize: 16 }}>{b.name}</div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>{b.branchId}</div>
              </div>
              <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 20 }}>{b.activeQueues} คัน</div>
            </div>
          </div>
        );
      })}
      {branches.length === 0 && !loading && <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>ไม่มีข้อมูลสาขา</div>}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(getActiveBranch);
  const [lockedBranch, setLockedBranch] = useState(function() { return localStorage.getItem("lockedBranch") || ""; });
  const [tab, setTab] = useState("staff");

  useEffect(function() {
    apiFetch("/api/admin/overview").then(function(res) {
      setBranches((res && res.overview) || []);
    }).catch(function() {});
  }, []);

  function selectBranch(id) {
    setActiveBranch(id);
    localStorage.setItem("activeBranch", id);
    window.dispatchEvent(new CustomEvent("cockpitBranch", { detail: id }));
  }

  function toggleLock() {
    if (lockedBranch) { setLockedBranch(""); localStorage.removeItem("lockedBranch"); }
    else { setLockedBranch(activeBranch); localStorage.setItem("lockedBranch", activeBranch); }
  }

  useEffect(function() {
    function handler(e) { setActiveBranch(e.detail); }
    window.addEventListener("cockpitBranch", handler);
    return function() { window.removeEventListener("cockpitBranch", handler); };
  }, []);

  const effectiveBranch = lockedBranch || activeBranch;

  const TABS = [
    { key: "staff", label: "🔧 คิว" },
    { key: "video", label: "🎥 วิดีโอ" },
    { key: "history", label: "📋 ประวัติ" },
    { key: "admin", label: "⚙️ ภาพรวม" },
  ];

  return (
    <div style={{ background: "#111827", minHeight: "100vh", color: "#f9fafb", fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Header */}
      <div style={{ background: "#1a1a1a", paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 16, paddingRight: 16, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #FFD700", position: "sticky", top: 0, zIndex: 100 }}>
        <CockpitLogo size={22} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={effectiveBranch} onChange={function(e) { if (!lockedBranch) selectBranch(e.target.value); }} disabled={!!lockedBranch}
            style={{ background: "#374151", border: "1.5px solid #4b5563", color: "#f9fafb", borderRadius: 8, padding: "6px 10px", fontSize: 13, maxWidth: 140 }}>
            <option value="">-- สาขา --</option>
            {branches.map(function(b) { return <option key={b.branchId} value={b.branchId}>{b.name}</option>; })}
          </select>
          <button onClick={toggleLock} style={{ background: lockedBranch ? "#f59e0b" : "#374151", border: "none", borderRadius: 8, color: "#fff", padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>
            {lockedBranch ? "🔒" : "🔓"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #374151", background: "#1f2937", overflowX: "auto" }}>
        {TABS.map(function(t) {
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              style={{ flex: 1, padding: "12px 8px", border: "none", background: "transparent", color: tab === t.key ? "#FFD700" : "#9ca3af", fontWeight: tab === t.key ? 700 : 400, borderBottom: tab === t.key ? "2px solid #FFD700" : "2px solid transparent", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }}>
        {tab === "staff" && <StaffView branchId={effectiveBranch} />}
        {tab === "video" && <VideoView branchId={effectiveBranch} />}
        {tab === "history" && <HistoryView branchId={effectiveBranch} />}
        {tab === "admin" && <AdminView />}
      </div>
    </div>
  );
}
