import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────
const BACKEND = "https://cockpit-pro-backend-staging.onrender.com";

// ─── Thai Provinces ───────────────────────────────────────────
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

// ─── Job Types ────────────────────────────────────────────────
const JOB_TYPES = [
  { label:"เปลี่ยนยาง 4 เส้น", minutes:52 },
  { label:"สลับยาง", minutes:12 },
  { label:"ยาง 1,2,3 เส้น", minutes:20 },
  { label:"ถ่วงล้อ", minutes:35 },
  { label:"ตั้งศูนย์ล้อ", minutes:52 },
  { label:"เปลี่ยนถ่ายน้ำมันเครื่อง", minutes:35 },
  { label:"เปลี่ยนแบตเตอรี่", minutes:25 },
  { label:"เปลี่ยนเบรก", minutes:52 },
  { label:"CockpitSure", minutes:17 },
  { label:"เปลี่ยนโช้คอัพ", minutes:52 },
  { label:"งานซ่อมช่วงล่าง", minutes:135 },
  { label:"เบิกอะไหล่", minutes:85 },
  { label:"งานซ่อมอื่น", minutes:75 },
];

// ─── Design Tokens ────────────────────────────────────────────
const C = {
  yellow:    "#FFE000",
  black:     "#1A1A1A",
  white:     "#FFFFFF",
  bg:        "#F5F5F0",
  green:     "#22C55E",
  orange:    "#F97316",
  red:       "#EF4444",
  blue:      "#3B82F6",
  gray:      "#6B7280",
  grayLight: "#E5E7EB",
  grayBg:    "#F9FAFB",
  purple:    "#8B5CF6",
};

// ─── Helpers ──────────────────────────────────────────────────
function getActiveBranch() { return localStorage.getItem("activeBranch") || ""; }

function fmtTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit" });
}
function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { day:"2-digit", month:"2-digit", year:"2-digit" });
}
function fmtDateTime(iso) { return !iso ? "-" : fmtDate(iso) + " " + fmtTime(iso); }
function minutesSince(iso) { return !iso ? 0 : Math.floor((Date.now() - new Date(iso).getTime()) / 60000); }
function getDuration(name) {
  const j = JOB_TYPES.find(function(x) { return x.label === name; });
  return j ? j.minutes : 30;
}

async function apiFetch(path, opts) {
  const res = await fetch(BACKEND + path, Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {}));
  if (!res.ok) { const t = await res.text(); throw new Error(t || res.statusText); }
  return res.json();
}

// ─── Toast ────────────────────────────────────────────────────
function Toast(props) {
  useEffect(function() {
    if (!props.message) return;
    const t = setTimeout(props.onClose, 3000);
    return function() { clearTimeout(t); };
  }, [props.message, props.onClose]);
  if (!props.message) return null;
  return (
    <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:C.black, color:C.yellow, padding:"12px 24px", borderRadius:100, fontWeight:700, fontSize:14, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.25)", whiteSpace:"nowrap", border:"2px solid "+C.yellow }}>
      ✅ {props.message}
    </div>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────────
function Sheet(props) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"flex-end" }}
      onClick={function(e) { if (e.target === e.currentTarget) props.onClose(); }}>
      <div style={{ background:C.white, borderRadius:"20px 20px 0 0", width:"100%", maxHeight:"92vh", overflowY:"auto", paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:C.grayLight }} />
        </div>
        <div style={{ padding:"0 20px 28px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:C.black }}>{props.title}</h3>
            <button onClick={props.onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.gray, padding:4 }}>✕</button>
          </div>
          {props.children}
        </div>
      </div>
    </div>
  );
}

// ─── Buttons ──────────────────────────────────────────────────
function Btn(props) {
  const bg = props.disabled ? C.grayLight : (props.color || C.yellow);
  const fg = props.disabled ? C.gray : (props.textColor || (props.color ? C.white : C.black));
  return (
    <button onClick={props.onClick} disabled={props.disabled}
      style={{ background:bg, color:fg, border:"none", borderRadius:12, padding:props.small ? "8px 14px" : "14px", fontSize:props.small ? 13 : 16, fontWeight:800, cursor:props.disabled ? "not-allowed" : "pointer", width:props.full ? "100%" : undefined, fontFamily:"inherit", opacity:props.disabled ? 0.6 : 1, transition:"opacity 0.15s" }}>
      {props.children}
    </button>
  );
}

function GhostBtn(props) {
  return (
    <button onClick={props.onClick} disabled={props.disabled}
      style={{ background:"transparent", color:props.color || C.black, border:"1.5px solid "+(props.border || C.grayLight), borderRadius:10, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:props.disabled ? "not-allowed" : "pointer", fontFamily:"inherit", opacity:props.disabled ? 0.5 : 1, width:props.full ? "100%" : undefined }}>
      {props.children}
    </button>
  );
}

function IconBtn(props) {
  return (
    <button onClick={props.onClick} disabled={props.disabled} title={props.title}
      style={{ width:34, height:34, borderRadius:"50%", background:props.bg || "rgba(255,255,255,0.15)", border:"none", cursor:props.disabled ? "not-allowed" : "pointer", fontSize:16, color:C.white, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      {props.children}
    </button>
  );
}

// ─── Field & Input ────────────────────────────────────────────
function Field(props) {
  return (
    <div style={{ marginBottom:14 }}>
      {props.label && <label style={{ display:"block", fontSize:13, fontWeight:700, color:C.gray, marginBottom:6 }}>{props.label}</label>}
      {props.children}
    </div>
  );
}

function TextInput(props) {
  return (
    <input {...props}
      style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:"1.5px solid "+C.grayLight, background:C.white, color:C.black, fontSize:16, fontFamily:"inherit", boxSizing:"border-box", outline:"none", ...(props.style||{}) }} />
  );
}

function ProvincePicker(props) {
  return (
    <select value={props.value} onChange={function(e) { props.onChange(e.target.value); }}
      style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:"1.5px solid "+C.grayLight, background:C.white, color:C.black, fontSize:16, fontFamily:"inherit" }}>
      <option value="">-- เลือกจังหวัด --</option>
      {THAI_PROVINCES.map(function(p) { return <option key={p} value={p}>{p}</option>; })}
    </select>
  );
}

// ─── CockpitSure Camera ───────────────────────────────────────
function CockpitSureModal(props) {
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
    if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop(); });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:mode, width:{ideal:1280}, height:{ideal:720} }, audio:true
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(function() {}); }
    } catch(e) { setError("ไม่สามารถเปิดกล้องได้: "+e.message); }
  }, []);

  useEffect(function() {
    startCamera(facingMode);
    return function() {
      if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop(); });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera, facingMode]);

  function handleStartRecord() {
    chunksRef.current = [];
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const bps = isMobile ? 1500000 : 4000000;
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    const rec = new MediaRecorder(streamRef.current, { mimeType:mime, videoBitsPerSecond:bps });
    rec.ondataavailable = function(e) { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    rec.start(2000);
    recorderRef.current = rec;
    setPhase("recording"); setElapsed(0);
    timerRef.current = setInterval(function() { setElapsed(function(p) { return p+1; }); }, 1000);
  }

  function handleStopRecord() {
    if (timerRef.current) clearInterval(timerRef.current);
    const rec = recorderRef.current;
    if (!rec) return;
    rec.onstop = function() { uploadVideo(); };
    rec.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop(); });
  }

  async function uploadVideo() {
    setPhase("uploading"); setUploadPct(0);
    const mime = (recorderRef.current && recorderRef.current.mimeType) || "video/webm";
    const ext = mime.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(chunksRef.current, { type:mime });
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const fn = props.plate+"_"+props.province+"_"+dateStr+"."+ext;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const fd = new FormData();
        fd.append("file", blob, fn);
        fd.append("upload_preset", "cockpit_unsigned");
        fd.append("folder", "cockpit_sure");
        const url = await new Promise(function(resolve, reject) {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = function(e) { if (e.lengthComputable) setUploadPct(Math.round(e.loaded/e.total*100)); };
          xhr.onload = function() { if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).secure_url); else reject(new Error("Upload "+xhr.status)); };
          xhr.onerror = function() { reject(new Error("Network error")); };
          xhr.open("POST", "https://api.cloudinary.com/v1_1/dnmzyoobh/video/upload");
          xhr.send(fd);
        });
        await apiFetch("/api/branch/"+props.branchId+"/bay/"+props.bay+"/send-video", {
          method:"POST", body:JSON.stringify({ videoUrl:url, plate:props.plate })
        });
        setPhase("done"); if (props.onDone) props.onDone(); return;
      } catch(e) {
        if (attempt === 3) { setError("อัปโหลดไม่สำเร็จ: "+e.message); setPhase("preview"); }
        else await new Promise(function(r) { setTimeout(r, 1500*attempt); });
      }
    }
  }

  const mm = String(Math.floor(elapsed/60)).padStart(2,"0");
  const ss = String(elapsed%60).padStart(2,"0");
  const nowStr = new Date().toLocaleDateString("th-TH",{day:"2-digit",month:"2-digit",year:"2-digit"});

  return (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:2000, display:"flex", flexDirection:"column" }}>
      <div style={{ position:"relative", flex:1, overflow:"hidden" }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        <div style={{ position:"absolute", top:0, right:0, width:"1.7%", height:"100%", background:C.yellow, opacity:0.9 }} />
        <div style={{ position:"absolute", top:0, right:0, width:"60%", height:"1.7%", background:C.yellow, opacity:0.9 }} />
        <div style={{ position:"absolute", top:14, left:16, background:C.black, padding:"6px 12px", borderRadius:8 }}>
          <span style={{ color:C.yellow, fontWeight:900, fontSize:16, letterSpacing:1 }}>COCKPIT</span>
        </div>
        {phase === "recording" && (
          <div style={{ position:"absolute", top:16, left:"50%", transform:"translateX(-50%)", background:"#EF4444", color:"#fff", borderRadius:20, padding:"5px 14px", fontWeight:800, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />
            REC {mm}:{ss}
          </div>
        )}
        <div style={{ position:"absolute", bottom:16, left:16, right:20, color:C.yellow, fontSize:15, fontWeight:800, textShadow:"0 1px 6px rgba(0,0,0,0.9)" }}>
          {props.plate} {props.province} | {nowStr}
        </div>
        {phase !== "uploading" && (
          <button onClick={function() { setFacingMode(function(m) { return m==="environment"?"user":"environment"; }); }}
            style={{ position:"absolute", bottom:60, left:16, background:"rgba(0,0,0,0.6)", border:"none", borderRadius:"50%", width:44, height:44, color:"#fff", fontSize:22, cursor:"pointer" }}>🔄</button>
        )}
        <button onClick={props.onClose} style={{ position:"absolute", top:14, right:20, background:"rgba(0,0,0,0.6)", border:"none", borderRadius:"50%", width:36, height:36, color:"#fff", fontSize:18, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ background:C.black, padding:"20px 24px", display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
        {error && <div style={{ color:"#EF4444", fontWeight:700, fontSize:14, textAlign:"center" }}>{error}</div>}
        {phase === "preview" && <>
          <button onClick={handleStartRecord} style={{ width:68, height:68, borderRadius:"50%", background:"#EF4444", border:"3px solid rgba(255,255,255,0.3)", cursor:"pointer", fontSize:28 }}>⏺</button>
          <span style={{ color:"rgba(255,255,255,0.5)", fontSize:13 }}>กดเพื่อเริ่มบันทึก</span>
        </>}
        {phase === "recording" && (
          <button onClick={handleStopRecord} style={{ background:"#EF4444", border:"2px solid rgba(255,255,255,0.4)", borderRadius:14, padding:"13px 32px", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer", fontFamily:"inherit" }}>⏹ หยุดและอัปโหลด</button>
        )}
        {phase === "uploading" && (
          <div style={{ width:"100%", textAlign:"center" }}>
            <div style={{ color:"#fff", marginBottom:10, fontWeight:700 }}>กำลังอัปโหลด {uploadPct}%</div>
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:4, height:8 }}>
              <div style={{ width:uploadPct+"%", height:"100%", background:C.yellow, borderRadius:4, transition:"width 0.3s" }} />
            </div>
          </div>
        )}
        {phase === "done" && (
          <div style={{ color:C.yellow, fontWeight:800, fontSize:18 }}>
            ✅ อัปโหลดสำเร็จ!
            <button onClick={props.onClose} style={{ marginLeft:12, background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, color:"#fff", padding:"6px 16px", cursor:"pointer", fontFamily:"inherit" }}>ปิด</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Open Queue Sheet ─────────────────────────────────────────
function OpenQueueSheet(props) {
  const [plate, setPlate] = useState("");
  const [province, setProvince] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function toggleJob(label) {
    setSelectedJobs(function(prev) {
      return prev.includes(label) ? prev.filter(function(j) { return j !== label; }) : prev.concat([label]);
    });
  }

  async function handleSubmit() {
    if (!plate.trim()) { setErr("กรุณากรอกทะเบียน"); return; }
    if (!province) { setErr("กรุณาเลือกจังหวัด"); return; }
    setLoading(true); setErr("");
    try {
      await apiFetch("/api/branch/"+props.branchId+"/bay/"+props.bay+"/open", {
        method:"POST",
        body:JSON.stringify({ plate:plate.trim().toUpperCase(), province:province, phone:phone.trim() })
      });
      if (selectedJobs.length > 0) {
        await apiFetch("/api/branch/"+props.branchId+"/bay/"+props.bay+"/addjobs", {
          method:"POST", body:JSON.stringify({ jobs:selectedJobs })
        });
      }
      props.onDone();
    } catch(e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <Sheet title={"เปิดคิว — ช่อง "+props.bay} onClose={props.onClose}>
      <Field label="ทะเบียนรถ *">
        <TextInput value={plate} onChange={function(e){setPlate(e.target.value);}} placeholder="เช่น กข 1234" autoCapitalize="characters" />
      </Field>
      <Field label="จังหวัด *"><ProvincePicker value={province} onChange={setProvince} /></Field>
      <Field label="เบอร์โทร">
        <TextInput value={phone} onChange={function(e){setPhone(e.target.value);}} placeholder="0812345678" type="tel" />
      </Field>
      <Field label="เลือกงาน (ไม่บังคับ)">
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {JOB_TYPES.map(function(jt) {
            const sel = selectedJobs.includes(jt.label);
            return (
              <button key={jt.label} onClick={function(){toggleJob(jt.label);}}
                style={{ padding:"7px 13px", borderRadius:20, border:"1.5px solid "+(sel?C.black:C.grayLight), background:sel?C.yellow:C.white, color:C.black, fontSize:13, fontWeight:sel?800:500, cursor:"pointer", fontFamily:"inherit" }}>
                {jt.label}
              </button>
            );
          })}
        </div>
      </Field>
      {err && <div style={{ color:"#EF4444", fontSize:13, marginBottom:12 }}>{err}</div>}
      <Btn onClick={handleSubmit} disabled={loading} full>
        {loading ? "กำลังบันทึก..." : "✅ เปิดคิว"}
      </Btn>
    </Sheet>
  );
}

// ─── Add Jobs Sheet ───────────────────────────────────────────
function AddJobsSheet(props) {
  const currentNames = (props.currentJobs||[]).map(function(j){return j.name;});
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleAdd() {
    if (!selected.length) { setErr("เลือกงานก่อน"); return; }
    setLoading(true); setErr("");
    try {
      await apiFetch("/api/branch/"+props.branchId+"/bay/"+props.bay+"/addjobs", {
        method:"POST", body:JSON.stringify({ jobs:selected })
      });
      props.onDone();
    } catch(e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <Sheet title="เพิ่มงาน" onClose={props.onClose}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
        {JOB_TYPES.map(function(jt) {
          const already = currentNames.includes(jt.label);
          const sel = selected.includes(jt.label);
          return (
            <button key={jt.label} disabled={already}
              onClick={function(){
                if (already) return;
                setSelected(function(prev) { return prev.includes(jt.label) ? prev.filter(function(j){return j!==jt.label;}) : prev.concat([jt.label]); });
              }}
              style={{ padding:"7px 13px", borderRadius:20, border:"1.5px solid "+(already?"#E5E7EB":sel?C.black:C.grayLight), background:already?"#F3F4F6":sel?C.yellow:C.white, color:already?C.gray:C.black, fontSize:13, fontWeight:sel?800:500, cursor:already?"not-allowed":"pointer", fontFamily:"inherit", opacity:already?0.5:1 }}>
              {jt.label} {already?"✓":""}
            </button>
          );
        })}
      </div>
      {err && <div style={{ color:"#EF4444", fontSize:13, marginBottom:12 }}>{err}</div>}
      <Btn onClick={handleAdd} disabled={loading} full color={C.black} textColor={C.yellow}>
        {loading ? "กำลังเพิ่ม..." : "➕ เพิ่มงาน"}
      </Btn>
    </Sheet>
  );
}

// ─── Quote Sheet ──────────────────────────────────────────────
function QuoteSheet(props) {
  const [photos, setPhotos] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  function handlePick(e) {
    const files = Array.from(e.target.files||[]).filter(function(f){return f.type.startsWith("image/");});
    if (photos.length + files.length > 5) { setErr("สูงสุด 5 รูป"); return; }
    Promise.all(files.map(function(f) {
      return new Promise(function(resolve) {
        const r = new FileReader();
        r.onload = function(ev) { resolve({ file:f, preview:ev.target.result }); };
        r.readAsDataURL(f);
      });
    })).then(function(res) { setPhotos(function(prev){return prev.concat(res);}); setErr(""); });
  }

  async function uploadCloudinary(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", "cockpit_unsigned");
    fd.append("folder", "cockpit_quotes");
    const res = await fetch("https://api.cloudinary.com/v1_1/dnmzyoobh/image/upload", { method:"POST", body:fd });
    if (!res.ok) throw new Error("Upload failed");
    return (await res.json()).secure_url;
  }

  async function handleSend() {
    if (!photos.length) { setErr("กรุณาเลือกรูปก่อน"); return; }
    setLoading(true); setErr("");
    try {
      const photoUrls = await Promise.all(photos.map(function(p){return uploadCloudinary(p.file);}));
      await apiFetch("/api/branch/"+props.branchId+"/bay/"+props.bay+"/quote", {
        method:"POST", body:JSON.stringify({ plate:props.plate, note:note, photoUrls:photoUrls })
      });
      props.onDone();
    } catch(e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <Sheet title="ส่งใบเสนอราคา" onClose={props.onClose}>
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display:"none" }} onChange={handlePick} />
      <Btn onClick={function(){fileRef.current&&fileRef.current.click();}} disabled={photos.length>=5} full color={C.black} textColor={C.yellow}>
        📷 ถ่าย / เลือกรูป ({photos.length}/5)
      </Btn>
      {photos.length > 0 && (
        <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
          {photos.map(function(p,i) {
            return (
              <div key={i} style={{ position:"relative", width:76, height:76 }}>
                <img src={p.preview} alt="" style={{ width:76, height:76, objectFit:"cover", borderRadius:10 }} />
                <button onClick={function(){setPhotos(function(prev){return prev.filter(function(_,idx){return idx!==i;});});}}
                  style={{ position:"absolute", top:-6, right:-6, background:"#EF4444", border:"none", borderRadius:"50%", width:20, height:20, color:"#fff", fontSize:12, cursor:"pointer", padding:0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop:14 }}>
        <label style={{ display:"block", fontSize:13, fontWeight:700, color:C.gray, marginBottom:6 }}>หมายเหตุ (ถ้ามี)</label>
        <textarea value={note} onChange={function(e){setNote(e.target.value);}} rows={3} placeholder="รายละเอียดเพิ่มเติม..."
          style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid "+C.grayLight, fontSize:14, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }} />
      </div>
      {err && <div style={{ color:"#EF4444", fontSize:13, marginTop:8 }}>{err}</div>}
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <GhostBtn onClick={props.onClose} full>ยกเลิก</GhostBtn>
        <Btn onClick={handleSend} disabled={loading} full color={C.green}>
          {loading ? "กำลังส่ง..." : "📤 ส่ง LINE"}
        </Btn>
      </div>
    </Sheet>
  );
}

// ─── Queue Card ───────────────────────────────────────────────
function QueueCard(props) {
  const bay = props.bay;
  const data = props.data;
  const branchId = props.branchId;
  const onRefresh = props.onRefresh;
  const onToast = props.onToast;

  const [showAddJobs, setShowAddJobs] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showSure, setShowSure] = useState(false);
  const [loading, setLoading] = useState(false);

  const bayStatus = data.bayStatus || "waiting_entry";
  const jobs = (data.jobs||[]).filter(function(j){return j.name!=="รับรถเข้า";});
  const doneCount = jobs.filter(function(j){return j.status==="done";}).length;
  const pct = jobs.length ? Math.round(doneCount/jobs.length*100) : 0;
  const hasCockpitSure = (data.jobs||[]).some(function(j){return j.name==="CockpitSure";});

  const cardBg = bayStatus==="in_service" ? C.green : bayStatus==="done" ? C.blue : C.black;

  async function callApi(path, body) {
    setLoading(true);
    try { await apiFetch(path, { method:"POST", body:JSON.stringify(body||{}) }); onRefresh(); }
    catch(e) { alert("เกิดข้อผิดพลาด: "+e.message); } finally { setLoading(false); }
  }

  async function toggleJobStatus(realIdx, currentStatus) {
    const next = currentStatus==="waiting" ? "in_progress" : currentStatus==="in_progress" ? "done" : "done";
    setLoading(true);
    try {
      await apiFetch("/api/branch/"+branchId+"/bay/"+bay+"/job/"+realIdx, {
        method:"PATCH", body:JSON.stringify({ status:next })
      });
      if (next==="done") onToast("เสร็จ: "+(data.jobs[realIdx]&&data.jobs[realIdx].name));
      onRefresh();
    } catch(e) { alert(e.message); } finally { setLoading(false); }
  }

  async function removeJob(realIdx) {
    if (!window.confirm("ลบงานนี้?")) return;
    setLoading(true);
    try {
      await apiFetch("/api/branch/"+branchId+"/bay/"+bay+"/removejob", {
        method:"POST", body:JSON.stringify({ jobIdx:realIdx })
      });
      onRefresh();
    } catch(e) { alert(e.message); } finally { setLoading(false); }
  }

  function getRealIdx(displayIdx) {
    let count = 0;
    for (let i = 0; i < (data.jobs||[]).length; i++) {
      if (data.jobs[i].name !== "รับรถเข้า") {
        if (count === displayIdx) return i;
        count++;
      }
    }
    return displayIdx;
  }

  return (
    <>
      <div style={{ background:cardBg, borderRadius:16, padding:"14px 16px", marginBottom:10 }}>
        {/* Header row */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:jobs.length>0?10:8 }}>
          <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:10, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:cardBg===C.black?C.yellow:C.white, flexShrink:0 }}>
            {bay}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:cardBg===C.black?C.yellow:C.white, fontWeight:900, fontSize:22, lineHeight:1.1, letterSpacing:0.5, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {data.plate}
            </div>
            <div style={{ color:"rgba(255,255,255,0.65)", fontSize:12, marginTop:1 }}>
              จ.{data.province} · {minutesSince(data.createdAt)}น.
              {data.phone && " · "+data.phone}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ color:"rgba(255,255,255,0.9)", fontWeight:800, fontSize:15 }}>{pct}%</div>
            <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11 }}>
              {bayStatus==="in_service"?"ซ่อมอยู่":bayStatus==="done"?"เสร็จ":"รอ"}
            </div>
          </div>
          {/* Action icon buttons */}
          <div style={{ display:"flex", gap:5, flexShrink:0 }}>
            {bayStatus==="waiting_entry" && (
              <IconBtn onClick={function(){callApi("/api/branch/"+branchId+"/bay/"+bay+"/start");}} disabled={loading} title="เริ่มซ่อม">🔧</IconBtn>
            )}
            <IconBtn onClick={function(){setShowAddJobs(true);}} disabled={loading} title="เพิ่มงาน">➕</IconBtn>
            {(bayStatus==="in_service"||bayStatus==="done") && (
              <IconBtn onClick={function(){callApi("/api/branch/"+branchId+"/bay/"+bay+"/close");}} disabled={loading} title="ปิดงาน/ส่งมอบ">✅</IconBtn>
            )}
            <IconBtn onClick={function(){if(window.confirm("ยกเลิกและลบคิวนี้?"))callApi("/api/branch/"+branchId+"/bay/"+bay+"/close",{nonotify:true});}} disabled={loading} title="ยกเลิก" bg="rgba(239,68,68,0.3)">❌</IconBtn>
          </div>
        </div>

        {/* Progress bar */}
        {jobs.length > 0 && (
          <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:99, height:6, marginBottom:10, overflow:"hidden" }}>
            <div style={{ width:pct+"%", height:"100%", background:pct===100?"#fff":C.yellow, borderRadius:99, transition:"width 0.4s ease" }} />
          </div>
        )}

        {/* Job chips — tap to cycle status */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
          {jobs.map(function(job, i) {
            const realIdx = getRealIdx(i);
            const st = job.status || "waiting";
            const icon = st==="done"?"✅":st==="in_progress"?"🔧":"⏳";
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:4, background:st==="done"?"rgba(0,0,0,0.25)":"rgba(255,255,255,0.15)", borderRadius:20, padding:"5px 10px 5px 8px" }}>
                <span onClick={function(){if(st!=="done"&&!loading)toggleJobStatus(realIdx,st);}} style={{ fontSize:13, cursor:st!=="done"?"pointer":"default" }}>{icon}</span>
                <span onClick={function(){if(st!=="done"&&!loading)toggleJobStatus(realIdx,st);}} style={{ color:st==="done"?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.95)", fontSize:13, fontWeight:600, textDecoration:st==="done"?"line-through":"none", cursor:st!=="done"?"pointer":"default" }}>
                  {job.name} <span style={{opacity:0.55,fontSize:11}}>{job.duration||getDuration(job.name)}น.</span>
                </span>
                <button onClick={function(){removeJob(realIdx);}} disabled={loading}
                  style={{ background:"none", border:"none", color:"rgba(255,120,120,0.8)", cursor:"pointer", fontSize:14, padding:"0 0 0 2px", lineHeight:1 }}>✕</button>
              </div>
            );
          })}
          {jobs.length === 0 && (
            <span style={{ color:"rgba(255,255,255,0.4)", fontSize:13 }}>ยังไม่มีงาน — กด ➕ เพื่อเพิ่ม</span>
          )}
        </div>

        {/* Secondary actions row */}
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          <button onClick={function(){setShowQuote(true);}}
            style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"6px 11px", color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            📋 ใบเสนอราคา
          </button>
          {hasCockpitSure && (
            <button onClick={function(){setShowSure(true);}}
              style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"6px 11px", color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              🎥 CockpitSure
            </button>
          )}
          <button onClick={function(){callApi("/api/branch/"+branchId+"/bay/"+bay+"/notify");}}
            style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"6px 11px", color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            🔔 แจ้งลูกค้า
          </button>
        </div>
      </div>

      {showAddJobs && <AddJobsSheet branchId={branchId} bay={bay} currentJobs={data.jobs||[]} onClose={function(){setShowAddJobs(false);}} onDone={function(){setShowAddJobs(false);onRefresh();}} />}
      {showQuote && <QuoteSheet branchId={branchId} bay={bay} plate={data.plate} province={data.province} onClose={function(){setShowQuote(false);}} onDone={function(){setShowQuote(false);onToast("ส่งใบเสนอราคาแล้ว");}} />}
      {showSure && <CockpitSureModal branchId={branchId} bay={bay} plate={data.plate} province={data.province} onClose={function(){setShowSure(false);}} onDone={function(){setShowSure(false);onRefresh();}} />}
    </>
  );
}

// ─── Empty Bay Card — tap to open queue ───────────────────────
function EmptyBayCard(props) {
  const [showOpen, setShowOpen] = useState(false);
  return (
    <>
      <div onClick={function(){setShowOpen(true);}}
        style={{ background:"rgba(0,0,0,0.04)", borderRadius:16, padding:"16px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", border:"1.5px dashed "+C.grayLight }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ background:C.grayLight, borderRadius:10, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:C.gray }}>
            {props.bay}
          </div>
          <span style={{ color:C.gray, fontWeight:600, fontSize:15 }}>ว่าง</span>
        </div>
        <div style={{ background:C.green, color:C.white, borderRadius:20, padding:"6px 14px", fontSize:13, fontWeight:800 }}>+ เปิดคิว</div>
      </div>
      {showOpen && (
        <OpenQueueSheet branchId={props.branchId} bay={props.bay}
          onClose={function(){setShowOpen(false);}}
          onDone={function(){setShowOpen(false);props.onRefresh();}} />
      )}
    </>
  );
}

// ─── Staff View ───────────────────────────────────────────────
function StaffView(props) {
  const branchId = props.branchId;
  const branchName = props.branchName;
  const [data, setData] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async function() {
    if (!branchId) return;
    setLoading(true); setErr("");
    try { const res = await apiFetch("/api/branch/"+branchId); setData(res); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  }, [branchId]);

  useEffect(function(){load();},[load]);
  useEffect(function(){const iv=setInterval(load,30000);return function(){clearInterval(iv);};},[load]);

  if (!branchId) return (
    <div style={{textAlign:"center",padding:"60px 20px",color:C.gray}}>
      <div style={{fontSize:40,marginBottom:12}}>📍</div>
      <div style={{fontWeight:700}}>กรุณาเลือกสาขาด้านบน</div>
    </div>
  );
  if (loading&&!data) return <div style={{textAlign:"center",padding:40,color:C.gray}}>กำลังโหลด...</div>;
  if (err) return (
    <div style={{textAlign:"center",padding:40}}>
      <div style={{color:"#EF4444",marginBottom:12}}>⚠️ {err}</div>
      <Btn onClick={load} small>ลองใหม่</Btn>
    </div>
  );

  const baysData = (data&&data.baysData)||{};
  const maxBays = (data&&data.max_bays)||6;
  const allBays = Array.from({length:maxBays},function(_,i){return String(i+1);});
  const occupiedBays = Object.keys(baysData);
  const emptyBays = allBays.filter(function(b){return !occupiedBays.includes(b);});

  const totalQ = occupiedBays.length;
  const inService = Object.values(baysData).filter(function(d){return d.bayStatus==="in_service";}).length;
  const waiting = Object.values(baysData).filter(function(d){return d.bayStatus==="waiting_entry";}).length;

  return (
    <div style={{paddingBottom:100}}>
      <Toast message={toast} onClose={function(){setToast("");}} />

      {/* Branch + Refresh */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14}}>📍</span>
          <span style={{fontWeight:800,fontSize:16,color:C.black}}>{branchName}</span>
        </div>
        <button onClick={load} disabled={loading}
          style={{display:"flex",alignItems:"center",gap:6,background:C.white,border:"1.5px solid "+C.grayLight,borderRadius:10,padding:"6px 14px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",color:C.black}}>
          🔄 รีเฟรช
        </button>
      </div>

      {/* Stats — 3 colored boxes */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {[
          {label:"คิวทั้งหมด",count:totalQ,bg:C.yellow,text:C.black},
          {label:"เริ่มทำแล้ว",count:inService,bg:C.green,text:C.white},
          {label:"รออีก",count:waiting,bg:C.orange,text:C.white},
        ].map(function(s){
          return (
            <div key={s.label} style={{background:s.bg,borderRadius:14,padding:"16px 8px",textAlign:"center"}}>
              <div style={{fontSize:36,fontWeight:900,color:s.text,lineHeight:1}}>{s.count}</div>
              <div style={{fontSize:12,fontWeight:700,color:s.text==="white"?"rgba(255,255,255,0.8)":C.black,marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Occupied bays */}
      {occupiedBays.sort(function(a,b){return Number(a)-Number(b);}).map(function(bay){
        return <QueueCard key={bay} bay={bay} data={baysData[bay]} branchId={branchId} onRefresh={load} onToast={setToast} />;
      })}

      {/* Empty bays — each one tappable to open queue */}
      {emptyBays.map(function(bay){
        return <EmptyBayCard key={bay} bay={bay} branchId={branchId} onRefresh={load} />;
      })}

      {totalQ===0&&emptyBays.length===0&&!loading&&(
        <div style={{textAlign:"center",padding:"40px 0",color:C.gray}}>ไม่มีช่องว่าง</div>
      )}
    </div>
  );
}

// ─── Info View (TV display) ───────────────────────────────────
function InfoView(props) {
  const branchId = props.branchId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async function() {
    if (!branchId) return;
    setLoading(true);
    try { const res = await apiFetch("/api/branch/"+branchId); setData(res); }
    catch(e) {} finally { setLoading(false); }
  }, [branchId]);

  useEffect(function(){load();},[load]);
  useEffect(function(){const iv=setInterval(load,20000);return function(){clearInterval(iv);};},[load]);

  if (!branchId) return <div style={{textAlign:"center",padding:40,color:C.gray}}>กรุณาเลือกสาขา</div>;
  if (loading&&!data) return <div style={{textAlign:"center",padding:40,color:C.gray}}>กำลังโหลด...</div>;

  const baysData = (data&&data.baysData)||{};
  const entries = Object.entries(baysData).sort(function(a,b){return Number(a[0])-Number(b[0]);});

  if (!entries.length) return (
    <div style={{textAlign:"center",padding:"60px 0",color:C.gray}}>
      <div style={{fontSize:48,marginBottom:12}}>🅿️</div>
      <div style={{fontWeight:700}}>ไม่มีรถในคิวขณะนี้</div>
    </div>
  );

  return (
    <div style={{paddingBottom:80}}>
      {entries.map(function(entry){
        const bay = entry[0];
        const car = entry[1];
        const realJobs = (car.jobs||[]).filter(function(j){return j.name!=="รับรถเข้า";});
        const done = realJobs.filter(function(j){return j.status==="done";}).length;
        const pct = realJobs.length ? Math.round(done/realJobs.length*100) : 0;
        const isIn = car.bayStatus==="in_service";
        const isDone = car.bayStatus==="done";
        const bg = isDone?C.blue:isIn?C.green:C.black;
        return (
          <div key={bay} style={{background:bg,borderRadius:16,padding:16,marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{background:"rgba(255,255,255,0.2)",borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:"#fff",fontSize:14,flexShrink:0}}>{bay}</div>
              <div style={{flex:1}}>
                <div style={{color:bg===C.black?C.yellow:C.white,fontWeight:900,fontSize:20}}>{car.plate}</div>
                <div style={{color:"rgba(255,255,255,0.6)",fontSize:12}}>จ.{car.province}</div>
              </div>
              <div style={{color:"rgba(255,255,255,0.9)",fontWeight:800,fontSize:16}}>{pct}%</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.15)",borderRadius:99,height:6,marginBottom:10}}>
              <div style={{width:pct+"%",height:"100%",background:pct===100?"#fff":C.yellow,borderRadius:99,transition:"width 0.4s"}} />
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {realJobs.map(function(j,i){
                return (
                  <span key={i} style={{background:"rgba(255,255,255,0.12)",borderRadius:20,padding:"4px 10px",color:j.status==="done"?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.9)",fontSize:12,fontWeight:600,textDecoration:j.status==="done"?"line-through":"none"}}>
                    {j.status==="done"?"✅":j.status==="in_progress"?"🔧":"⏳"} {j.name}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stats View (History) ─────────────────────────────────────
function StatsView(props) {
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
      let url = "/api/branch/"+branchId+"/history";
      const p = [];
      if (dateFrom) p.push("from="+dateFrom);
      if (dateTo) p.push("to="+dateTo);
      if (p.length) url += "?"+p.join("&");
      const res = await apiFetch(url);
      setHistory(res.history||[]);
    } catch(e) { setErr(e.message); } finally { setLoading(false); }
  }, [branchId, dateFrom, dateTo]);

  useEffect(function(){load();},[load]);

  async function handleReopen(histId) {
    if (!window.confirm("เปิดคิวใหม่สำหรับรถคันนี้?")) return;
    try {
      const res = await apiFetch("/api/branch/"+branchId+"/history/"+histId+"/reopen", { method:"POST" });
      alert("เปิดคิวใหม่แล้ว — ช่อง "+res.bay);
      load();
    } catch(e) { alert("เกิดข้อผิดพลาด: "+e.message); }
  }

  const filtered = history.filter(function(h){
    const q = search.toLowerCase();
    return !q||(h.plate&&h.plate.toLowerCase().includes(q))||(h.province&&h.province.toLowerCase().includes(q));
  });

  const totalJobs = filtered.reduce(function(sum,h){return sum+(h.jobs?h.jobs.filter(function(j){return j.name!=="รับรถเข้า";}).length:0);},0);
  const jobCounts = {};
  filtered.forEach(function(h){(h.jobs||[]).filter(function(j){return j.name!=="รับรถเข้า";}).forEach(function(j){jobCounts[j.name]=(jobCounts[j.name]||0)+1;});});
  const topJobs = Object.entries(jobCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,5);

  function exportCSV() {
    const rows = [["วันที่","ช่อง","ทะเบียน","จังหวัด","งาน","ปิด","ยกเลิก"]];
    filtered.forEach(function(h){
      rows.push([fmtDate(h.closed_at),h.bay,h.plate,h.province,
        (h.jobs||[]).filter(function(j){return j.name!=="รับรถเข้า";}).map(function(j){return j.name;}).join("|"),
        fmtTime(h.closed_at),h.cancelled?"ใช่":"ไม่"]);
    });
    const csv = rows.map(function(r){return r.join(",");}).join("\n");
    const blob = new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="history_"+branchId+".csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (!branchId) return <div style={{textAlign:"center",padding:40,color:C.gray}}>กรุณาเลือกสาขา</div>;

  return (
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        <input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="🔍 ค้นหาทะเบียน / จังหวัด"
          style={{width:"100%",padding:"11px 14px",borderRadius:12,border:"1.5px solid "+C.grayLight,fontSize:15,fontFamily:"inherit",boxSizing:"border-box",background:C.white}} />
        <div style={{display:"flex",gap:8}}>
          <input type="date" value={dateFrom} onChange={function(e){setDateFrom(e.target.value);}} style={{flex:1,padding:"9px 10px",borderRadius:10,border:"1.5px solid "+C.grayLight,fontSize:14,fontFamily:"inherit"}} />
          <input type="date" value={dateTo} onChange={function(e){setDateTo(e.target.value);}} style={{flex:1,padding:"9px 10px",borderRadius:10,border:"1.5px solid "+C.grayLight,fontSize:14,fontFamily:"inherit"}} />
        </div>
        <div style={{display:"flex",gap:8}}>
          <GhostBtn onClick={load} small>🔄 โหลดใหม่</GhostBtn>
          <GhostBtn onClick={exportCSV} small>📊 Export CSV</GhostBtn>
        </div>
      </div>

      {/* Summary boxes */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[{label:"รถทั้งหมด",val:filtered.length},{label:"งานทั้งหมด",val:totalJobs}].map(function(s){
          return (
            <div key={s.label} style={{background:C.black,borderRadius:14,padding:14,textAlign:"center"}}>
              <div style={{fontSize:32,fontWeight:900,color:C.yellow}}>{s.val}</div>
              <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)",marginTop:4}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Top jobs */}
      {topJobs.length>0&&(
        <div style={{background:C.white,borderRadius:14,padding:"14px 16px",marginBottom:16,border:"1px solid "+C.grayLight}}>
          <div style={{fontWeight:800,fontSize:14,color:C.black,marginBottom:10}}>งานยอดนิยม</div>
          {topJobs.map(function(j){
            return (
              <div key={j[0]} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.grayLight,fontSize:14}}>
                <span style={{color:C.black}}>{j[0]}</span>
                <span style={{color:C.green,fontWeight:800}}>{j[1]} ครั้ง</span>
              </div>
            );
          })}
        </div>
      )}

      {loading && <div style={{textAlign:"center",color:C.gray,padding:20}}>กำลังโหลด...</div>}
      {err && <div style={{color:"#EF4444",textAlign:"center",marginBottom:12}}>{err}</div>}

      {/* History list with REOPEN button */}
      {filtered.map(function(h){
        return (
          <div key={h.id} style={{background:C.white,borderRadius:14,padding:"14px 16px",marginBottom:10,border:"1px solid "+C.grayLight,borderLeft:"4px solid "+(h.cancelled?"#EF4444":C.green)}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:15,color:C.black}}>
                  {h.plate} <span style={{fontWeight:500,color:C.gray,fontSize:13}}>{h.province}</span>
                </div>
                <div style={{fontSize:12,color:C.gray,marginTop:2}}>
                  ช่อง {h.bay} · {fmtDateTime(h.closed_at)}
                  {h.cancelled&&<span style={{color:"#EF4444",marginLeft:6,fontWeight:700}}>ยกเลิก</span>}
                </div>
                <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:4}}>
                  {(h.jobs||[]).filter(function(j){return j.name!=="รับรถเข้า";}).map(function(j,i){
                    return <span key={i} style={{background:C.grayBg,color:C.gray,borderRadius:6,padding:"2px 8px",fontSize:12}}>{j.name}</span>;
                  })}
                </div>
              </div>
              {/* REOPEN button */}
              <button onClick={function(){handleReopen(h.id);}}
                style={{background:C.black,color:C.yellow,border:"none",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}>
                ↩ เปิดใหม่
              </button>
            </div>
          </div>
        );
      })}
      {!loading&&filtered.length===0&&<div style={{textAlign:"center",color:C.gray,padding:40}}>ไม่มีข้อมูลประวัติ</div>}
    </div>
  );
}

// ─── Video View — with DELETE ─────────────────────────────────
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
    try { const res = await apiFetch("/api/branch/"+branchId+"/videos"); setVideos(res.videos||[]); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  }, [branchId]);

  useEffect(function(){load();},[load]);

  async function handleDelete(id, plate) {
    if (!window.confirm("ลบวิดีโอ "+plate+"?")) return;
    try {
      await apiFetch("/api/branch/"+branchId+"/videos/"+id, { method:"DELETE" });
      load();
    } catch(e) { alert("ลบไม่ได้: "+e.message); }
  }

  const filtered = videos.filter(function(v){
    const q = search.toLowerCase();
    return !q||(v.plate&&v.plate.toLowerCase().includes(q))||(v.province&&v.province.toLowerCase().includes(q));
  });

  if (!branchId) return <div style={{textAlign:"center",padding:40,color:C.gray}}>กรุณาเลือกสาขา</div>;

  return (
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
        <input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="🔍 ค้นหาทะเบียน"
          style={{flex:1,padding:"11px 14px",borderRadius:12,border:"1.5px solid "+C.grayLight,fontSize:15,fontFamily:"inherit",background:C.white}} />
        <GhostBtn onClick={load} small>🔄</GhostBtn>
      </div>
      {loading && <div style={{textAlign:"center",color:C.gray,padding:20}}>กำลังโหลด...</div>}
      {err && <div style={{color:"#EF4444",textAlign:"center",marginBottom:12}}>{err}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
        {filtered.map(function(v){
          return (
            <div key={v.id} style={{background:C.white,borderRadius:14,overflow:"hidden",border:"1px solid "+C.grayLight}}>
              <div onClick={function(){setPlaying(v);}} style={{height:90,background:C.black,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:34}}>▶️</div>
              <div style={{padding:"10px"}}>
                <div style={{fontWeight:800,fontSize:14,color:C.black}}>{v.plate}</div>
                <div style={{color:C.gray,fontSize:12}}>{v.province}</div>
                <div style={{color:C.gray,fontSize:11,marginTop:3}}>{fmtDate(v.uploaded_at)}</div>
                {/* DELETE button */}
                <button onClick={function(){handleDelete(v.id,v.plate);}}
                  style={{marginTop:8,width:"100%",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,color:"#EF4444",fontSize:12,fontWeight:700,padding:"6px 0",cursor:"pointer",fontFamily:"inherit"}}>
                  🗑 ลบ
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!loading&&filtered.length===0&&<div style={{textAlign:"center",color:C.gray,padding:40}}>ไม่มีวิดีโอ</div>}

      {/* Video player modal */}
      {playing && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:3000,padding:20}}>
          <div style={{color:"#fff",marginBottom:12,fontWeight:800,fontSize:16}}>{playing.plate} {playing.province}</div>
          <video src={playing.video_url} controls autoPlay style={{maxWidth:"100%",maxHeight:"70vh",borderRadius:12}} />
          <button onClick={function(){setPlaying(null);}} style={{marginTop:16,background:C.yellow,border:"none",borderRadius:12,color:C.black,padding:"12px 32px",cursor:"pointer",fontSize:15,fontWeight:800,fontFamily:"inherit"}}>ปิด</button>
        </div>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────
export default function App() {
  const [branches, setBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(getActiveBranch);
  const [tab, setTab] = useState("staff");

  useEffect(function() {
    apiFetch("/api/admin/overview").then(function(res) {
      const list = (res&&res.overview)||[];
      setBranches(list);
      if (!activeBranch && list.length > 0) {
        const id = list[0].branchId;
        setActiveBranch(id);
        localStorage.setItem("activeBranch", id);
      }
    }).catch(function(){});
  }, [activeBranch]);

  function selectBranch(id) {
    setActiveBranch(id);
    localStorage.setItem("activeBranch", id);
    window.dispatchEvent(new CustomEvent("cockpitBranch", { detail:id }));
  }

  useEffect(function() {
    function handler(e) { setActiveBranch(e.detail); }
    window.addEventListener("cockpitBranch", handler);
    return function() { window.removeEventListener("cockpitBranch", handler); };
  }, []);

  const currentBranch = branches.find(function(b){return b.branchId===activeBranch;});
  const branchName = currentBranch ? currentBranch.name : "";

  const TABS = [
    { key:"staff",  label:"👨",  subLabel:"พนักงาน"    },
    { key:"info",   label:"🖥",  subLabel:"ข้อมูลการใช้บริการ" },
    { key:"stats",  label:"📊",  subLabel:"สถิติ"       },
    { key:"videos", label:"🎥",  subLabel:"วีดีโอ"      },
  ];

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'Sarabun','Noto Sans Thai',sans-serif", paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
      {/* ── Header ── */}
      <div style={{
        background:C.black,
        paddingTop:"calc(16px + env(safe-area-inset-top,0px))",
        paddingBottom:0,
        paddingLeft:20, paddingRight:20,
        position:"sticky", top:0, zIndex:100,
        boxShadow:"0 2px 12px rgba(0,0,0,0.3)"
      }}>
        {/* Logo */}
        <div style={{marginBottom:14}}>
          <div style={{display:"inline-flex",alignItems:"center",background:C.yellow,padding:"6px 14px",borderRadius:8}}>
            <span style={{fontWeight:900,fontSize:24,color:C.black,letterSpacing:1}}>COCKPIT</span>
          </div>
        </div>
        {/* Tab bar */}
        <div style={{display:"flex",borderBottom:"2px solid rgba(255,255,255,0.1)",overflowX:"auto"}}>
          {TABS.map(function(t) {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={function(){setTab(t.key);}}
                style={{ flex:1, padding:"10px 6px 12px", border:"none", background:"transparent", color:active?C.yellow:"rgba(255,255,255,0.4)", fontWeight:active?800:500, borderBottom:active?"2px solid "+C.yellow:"2px solid transparent", cursor:"pointer", fontSize:11, fontFamily:"inherit", textAlign:"center", lineHeight:1.4, minWidth:56, transition:"color 0.15s" }}>
                <div style={{fontSize:18,marginBottom:2}}>{t.label}</div>
                <div>{t.subLabel}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Branch Selector ── */}
      <div style={{background:C.white,padding:"12px 16px",borderBottom:"1px solid "+C.grayLight,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14,flexShrink:0}}>📍</span>
        <span style={{fontSize:13,fontWeight:700,color:C.gray,flexShrink:0}}>สาขา:</span>
        <select value={activeBranch} onChange={function(e){selectBranch(e.target.value);}}
          style={{flex:1,padding:"9px 12px",borderRadius:10,border:"1.5px solid "+C.grayLight,background:C.white,color:C.black,fontSize:15,fontWeight:600,fontFamily:"inherit"}}>
          <option value="">-- เลือกสาขา --</option>
          {branches.map(function(b){return <option key={b.branchId} value={b.branchId}>{b.name}</option>;})}
        </select>
      </div>

      {/* ── Content ── */}
      <div style={{padding:"16px 16px 0"}}>
        {tab==="staff"  && <StaffView  branchId={activeBranch} branchName={branchName} />}
        {tab==="info"   && <InfoView   branchId={activeBranch} />}
        {tab==="stats"  && <StatsView  branchId={activeBranch} />}
        {tab==="videos" && <VideoView  branchId={activeBranch} />}
      </div>
    </div>
  );
}
