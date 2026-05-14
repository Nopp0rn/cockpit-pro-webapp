import { useState, useEffect, useCallback } from "react";

// ── Config ─────────────────────────────────────────────────
const API = "https://cockpit-pro-backend.onrender.com";

// ── Brand ──────────────────────────────────────────────────
const C = {
  yellow: "#FFE000", black: "#1A1A1A", bg: "#F7F7F2",
  border: "#E2E2DA", white: "#FFFFFF", green: "#16a34a",
  lineGreen: "#06c755",
};

const JOB_TYPES = ["ยาง","ตั้งศูนย์","ถ่วงล้อ","แบตเตอรี่","เบรค","โช้คอัพ","น้ำมันเครื่อง","Cockpit Sure","อื่นๆ"];
const JOB_DURATION = { ยาง:45,ตั้งศูนย์:60,ถ่วงล้อ:30,แบตเตอรี่:20,เบรค:50,โช้คอัพ:90,น้ำมันเครื่อง:25,"Cockpit Sure":35,อื่นๆ:40 };

// ── API Helpers ────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Icons ──────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    car: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
    tool: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    store: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    line: <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    refresh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    gear: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };
  return icons[name] || null;
};

const CockpitLogo = ({ height = 30 }) => (
  <div style={{ background: C.yellow, padding: "4px 10px", borderRadius: 5, fontFamily: "'Arial Black','Impact',sans-serif", fontSize: height * 0.72, fontWeight: 900, color: C.black, letterSpacing: "-0.5px", lineHeight: 1 }}>
    COCKPIT
  </div>
);

// ── Toast ──────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ background: t.type==="line" ? C.lineGreen : t.type==="error" ? "#dc2626" : C.black, color: t.type==="line" ? "#fff" : C.yellow, padding:"12px 18px", borderRadius:8, fontSize:13, fontWeight:700, boxShadow:"0 4px 24px rgba(0,0,0,0.4)", display:"flex", alignItems:"center", gap:8, animation:"slideIn 0.3s ease", maxWidth:320, borderLeft:`4px solid ${t.type==="line"?"#04a844":t.type==="error"?"#991b1b":C.yellow}` }}>
          {t.type==="line" && <Icon name="line" size={16} color="#fff"/>}
          {t.type==="success" && <Icon name="check" size={16} color={C.yellow}/>}
          {t.type==="error" && <span>❌</span>}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Loading Spinner ────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <div style={{ width:size, height:size, border:`3px solid rgba(255,224,0,0.3)`, borderTop:`3px solid ${C.yellow}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", display:"inline-block" }} />
  );
}

// ── Badges ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    waiting_entry: { label:"รอเข้าช่อง", bg:"#fef9c3", color:"#713f12", dot:"#eab308" },
    in_service:    { label:"กำลังซ่อม",  bg:C.yellow,  color:C.black,   dot:C.black  },
    done:          { label:"เสร็จแล้ว",  bg:"#d1fae5", color:"#065f46", dot:"#10b981" },
  };
  const c = cfg[status] || cfg.waiting_entry;
  return (
    <span style={{ background:c.bg, color:c.color, padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:800, display:"inline-flex", alignItems:"center", gap:5 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot, display:"inline-block" }}/>
      {c.label}
    </span>
  );
}

function JobStatusBadge({ status }) {
  const cfg = { waiting:{label:"รอ",bg:"#f3f4f6",color:"#6b7280"}, in_progress:{label:"กำลังทำ",bg:C.yellow,color:C.black}, done:{label:"เสร็จ",bg:"#d1fae5",color:"#047857"} };
  const c = cfg[status] || cfg.waiting;
  return <span style={{ background:c.bg, color:c.color, padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:800 }}>{c.label}</span>;
}

// ── Bay Card ───────────────────────────────────────────────
function BayCard({ bayNum, job, loading, onOpenJob, onCloseJob, onUpdateJobStatus, onSendLineUpdate }) {
  const isEmpty = !job;
  const isActive = job?.bayStatus === "in_service";

  return (
    <div style={{ background:C.white, border:`2px solid ${isEmpty?C.border:isActive?C.yellow:"#fde047"}`, borderRadius:12, padding:14, minHeight:160, boxShadow:isActive?`0 0 0 3px rgba(255,224,0,0.2)`:"none", transition:"all 0.2s", position:"relative" }}>
      {loading && <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.7)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", zIndex:10 }}><Spinner/></div>}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:30, height:30, borderRadius:6, background:isEmpty?"#e5e7eb":isActive?C.yellow:"#fde047", display:"flex", alignItems:"center", justifyContent:"center", color:isEmpty?"#9ca3af":C.black, fontFamily:"'Arial Black',sans-serif", fontWeight:900, fontSize:14 }}>{bayNum}</div>
          <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>ช่องที่ {bayNum}</span>
        </div>
        {isEmpty ? <span style={{ fontSize:11, color:C.green, fontWeight:700 }}>● ว่าง</span> : <StatusBadge status={job.bayStatus}/>}
      </div>

      {isEmpty ? (
        <div style={{ textAlign:"center", paddingTop:10 }}>
          <div style={{ color:"#e5e7eb", marginBottom:6 }}><Icon name="car" size={28} color="#e5e7eb"/></div>
          <p style={{ color:"#9ca3af", fontSize:12, margin:"0 0 10px" }}>ไม่มีงาน</p>
          <button onClick={() => onOpenJob(bayNum)} style={{ background:C.yellow, color:C.black, border:"none", padding:"7px 20px", borderRadius:8, fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4, margin:"0 auto" }}>
            <Icon name="plus" size={12} color={C.black}/> เปิดงาน
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:1 }}>
              <Icon name="car" size={13} color="#9ca3af"/>
              <span style={{ fontSize:15, fontWeight:900, color:C.black, fontFamily:"'Arial Black',sans-serif", letterSpacing:0.5 }}>{job.plate}</span>
            </div>
            <div style={{ fontSize:11, color:"#9ca3af" }}>{job.phone}</div>
          </div>

          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
            {job.jobs?.map((j, i) => {
              const nextStatus = { waiting:"in_progress", in_progress:"done", done:"waiting" }[j.status];
              return (
                <button key={i} onClick={() => onUpdateJobStatus(bayNum, i, nextStatus)} style={{ background:j.status==="done"?"#d1fae5":j.status==="in_progress"?C.yellow:"#f3f4f6", color:j.status==="done"?"#047857":j.status==="in_progress"?C.black:"#6b7280", border:"none", borderRadius:6, padding:"3px 9px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit", textDecoration:j.status==="done"?"line-through":"none" }}>
                  {j.status==="done"?"✓ ":j.status==="in_progress"?"⚙ ":""}{j.name}
                </button>
              );
            })}
          </div>

          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => onSendLineUpdate(bayNum)} style={{ flex:1, background:C.lineGreen, color:"#fff", border:"none", padding:"7px 0", borderRadius:8, fontSize:11, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"inherit" }}>
              <Icon name="line" size={12} color="#fff"/> LINE
            </button>
            <button onClick={() => onCloseJob(bayNum)} style={{ flex:1.5, background:C.black, color:C.yellow, border:"none", padding:"7px 0", borderRadius:8, fontSize:11, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"inherit" }}>
              <Icon name="check" size={12} color={C.yellow}/> ปิดงาน
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Open Job Modal ─────────────────────────────────────────
function OpenJobModal({ bay, onConfirm, onClose, loading }) {
  const [plate, setPlate] = useState("");
  const [phone, setPhone] = useState("");
  const [sel, setSel] = useState([]);
  const toggle = (j) => setSel((p) => p.includes(j) ? p.filter((x)=>x!==j) : [...p,j]);
  const canSubmit = plate && phone && sel.length > 0 && !loading;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:16, width:"100%", maxWidth:440, overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ background:C.yellow, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:"#7a6200", letterSpacing:1.5 }}>COCKPIT PRO คิว</div>
            <div style={{ fontSize:18, fontWeight:900, color:C.black, fontFamily:"'Arial Black',sans-serif" }}>เปิดงาน – ช่องที่ {bay}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(0,0,0,0.12)", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="x" size={18} color={C.black}/>
          </button>
        </div>
        <div style={{ padding:20 }}>
          <label style={{ fontSize:11, fontWeight:800, color:"#374151", display:"block", marginBottom:5, letterSpacing:1 }}>ทะเบียนรถ</label>
          <input value={plate} onChange={(e)=>setPlate(e.target.value)} placeholder="เช่น กข 1234" style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`2px solid ${C.border}`, fontSize:15, fontWeight:800, marginBottom:12, boxSizing:"border-box", outline:"none", fontFamily:"inherit" }}/>
          <label style={{ fontSize:11, fontWeight:800, color:"#374151", display:"block", marginBottom:5, letterSpacing:1 }}>เบอร์โทรลูกค้า</label>
          <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="เช่น 081-234-5678" style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`2px solid ${C.border}`, fontSize:14, marginBottom:16, boxSizing:"border-box", outline:"none", fontFamily:"inherit" }}/>
          <label style={{ fontSize:11, fontWeight:800, color:"#374151", display:"block", marginBottom:8, letterSpacing:1 }}>งานที่ต้องทำ</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:20 }}>
            {JOB_TYPES.map((j) => (
              <button key={j} onClick={()=>toggle(j)} style={{ padding:"7px 14px", borderRadius:8, fontFamily:"inherit", border:`2px solid ${sel.includes(j)?C.black:C.border}`, background:sel.includes(j)?C.yellow:C.white, color:C.black, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {sel.includes(j)?"✓ ":""}{j}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`2px solid ${C.border}`, background:C.white, color:"#6b7280", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>ยกเลิก</button>
            <button onClick={() => canSubmit && onConfirm({ plate, phone, jobs:sel })} style={{ flex:2, padding:"11px 0", borderRadius:10, border:"none", fontFamily:"inherit", cursor:canSubmit?"pointer":"not-allowed", fontWeight:900, fontSize:14, background:canSubmit?C.black:"#e5e7eb", color:canSubmit?C.yellow:"#9ca3af", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading ? <Spinner size={16}/> : "✓ ยืนยันเปิดงาน"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Set Bays Modal ─────────────────────────────────────────
function SetBaysModal({ branch, currentBays, onConfirm, onClose, loading }) {
  const [bays, setBays] = useState(currentBays);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.white, borderRadius:16, width:"100%", maxWidth:380, overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ background:C.black, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:C.yellow, letterSpacing:1.5 }}>ตั้งค่าสาขา</div>
            <div style={{ fontSize:16, fontWeight:900, color:C.white, fontFamily:"'Arial Black',sans-serif" }}>{branch.name}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="x" size={18} color={C.white}/>
          </button>
        </div>
        <div style={{ padding:24 }}>
          <p style={{ fontSize:13, fontWeight:700, color:"#374151", margin:"0 0 20px" }}>จำนวนช่องซ่อม (1–20)</p>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:20, marginBottom:24 }}>
            <button onClick={()=>setBays((p)=>Math.max(1,p-1))} style={{ width:48, height:48, borderRadius:12, border:`2px solid ${C.border}`, background:C.white, fontSize:24, fontWeight:900, cursor:"pointer", fontFamily:"inherit" }}>−</button>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:56, fontWeight:900, color:C.black, fontFamily:"'Arial Black',sans-serif", lineHeight:1 }}>{bays}</div>
              <div style={{ fontSize:12, color:"#9ca3af", fontWeight:600, marginTop:4 }}>ช่องซ่อม</div>
            </div>
            <button onClick={()=>setBays((p)=>Math.min(20,p+1))} style={{ width:48, height:48, borderRadius:12, border:`2px solid ${C.border}`, background:C.white, fontSize:24, fontWeight:900, cursor:"pointer", fontFamily:"inherit" }}>+</button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:22 }}>
            {[2,4,6,8,10,12,15,20].map((n)=>(
              <button key={n} onClick={()=>setBays(n)} style={{ padding:"6px 14px", borderRadius:8, fontFamily:"inherit", border:`2px solid ${bays===n?C.black:C.border}`, background:bays===n?C.yellow:C.white, color:C.black, fontSize:13, fontWeight:800, cursor:"pointer" }}>{n}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`2px solid ${C.border}`, background:C.white, color:"#6b7280", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>ยกเลิก</button>
            <button onClick={()=>onConfirm(bays)} style={{ flex:2, padding:"11px 0", borderRadius:10, border:"none", background:C.black, color:C.yellow, fontWeight:900, fontSize:14, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading ? <Spinner size={16}/> : `✓ บันทึก ${bays} ช่อง`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Branch View ────────────────────────────────────────────
function BranchView({ branch, addToast }) {
  const [baysData, setBaysData] = useState({});
  const [branchInfo, setBranchInfo] = useState(branch);
  const [openModal, setOpenModal] = useState(null);
  const [showSetBays, setShowSetBays] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bayLoading, setBayLoading] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchBranch = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/branch/${branch.id}`);
      setBranchInfo(data);
      setBaysData(data.bays || {});
      setLastUpdated(new Date());
    } catch (err) {
      addToast({ type:"error", message:"โหลดข้อมูลไม่ได้ ลองใหม่อีกครั้ง" });
    } finally {
      setLoading(false);
    }
  }, [branch.id]);

  useEffect(() => {
    setLoading(true);
    fetchBranch();
    const interval = setInterval(fetchBranch, 30000); // Auto-refresh ทุก 30 วิ
    return () => clearInterval(interval);
  }, [fetchBranch]);

  const setBayLoading_ = (bay, val) => setBayLoading((p) => ({ ...p, [bay]: val }));

  const handleOpenJob = async (bay, data) => {
    setModalLoading(true);
    try {
      await apiFetch(`/api/branch/${branch.id}/bay/${bay}/open`, {
        method:"POST",
        body: JSON.stringify({ ...data }),
      });
      addToast({ type:"success", message:`เปิดงานช่องที่ ${bay} – ${data.plate}` });
      setTimeout(() => addToast({ type:"line", message:`LINE แจ้ง ${data.plate} เข้าคิวแล้ว 🚗` }), 600);
      await fetchBranch();
      setOpenModal(null);
    } catch {
      addToast({ type:"error", message:"เปิดงานไม่สำเร็จ กรุณาลองใหม่" });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseJob = async (bay) => {
    const job = baysData[bay];
    setBayLoading_(bay, true);
    try {
      await apiFetch(`/api/branch/${branch.id}/bay/${bay}/close`, { method:"POST" });
      addToast({ type:"success", message:`ปิดงาน ${job?.plate} – ช่องที่ ${bay} ว่างแล้ว` });
      if (job) setTimeout(() => addToast({ type:"line", message:`LINE แจ้ง ${job.plate} – รถพร้อมรับแล้ว 🎉` }), 600);
      await fetchBranch();
    } catch {
      addToast({ type:"error", message:"ปิดงานไม่สำเร็จ กรุณาลองใหม่" });
    } finally {
      setBayLoading_(bay, false);
    }
  };

  const handleUpdateJobStatus = async (bay, jobIdx, newStatus) => {
    setBayLoading_(bay, true);
    try {
      await apiFetch(`/api/branch/${branch.id}/bay/${bay}/job/${jobIdx}`, {
        method:"PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      const jobName = baysData[bay]?.jobs?.[jobIdx]?.name;
      addToast({ type:"success", message:`อัปเดต "${jobName}" → ${newStatus==="in_progress"?"กำลังทำ":newStatus==="done"?"เสร็จ":"รอ"}` });
      await fetchBranch();
    } catch {
      addToast({ type:"error", message:"อัปเดตไม่สำเร็จ" });
    } finally {
      setBayLoading_(bay, false);
    }
  };

  const handleSendLine = async (bay) => {
    setBayLoading_(bay, true);
    try {
      await apiFetch(`/api/branch/${branch.id}/bay/${bay}/notify`, { method:"POST" });
      addToast({ type:"line", message:`LINE ส่งอัปเดตให้ ${baysData[bay]?.plate} แล้ว` });
      await fetchBranch();
    } catch {
      addToast({ type:"error", message:"ส่ง LINE ไม่สำเร็จ" });
    } finally {
      setBayLoading_(bay, false);
    }
  };

  const handleSetBays = async (newBays) => {
    setModalLoading(true);
    try {
      await apiFetch(`/api/branch/${branch.id}/settings`, {
        method:"PUT",
        body: JSON.stringify({ bays: newBays }),
      });
      addToast({ type:"success", message:`ตั้งค่า ${branchInfo.name} เป็น ${newBays} ช่อง` });
      await fetchBranch();
      setShowSetBays(false);
    } catch {
      addToast({ type:"error", message:"บันทึกไม่สำเร็จ" });
    } finally {
      setModalLoading(false);
    }
  };

  const totalBays = branchInfo.bays || 8;
  const activeBays = Object.values(baysData).filter(Boolean).length;
  const emptyBays = totalBays - activeBays;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:80, flexDirection:"column", gap:16 }}>
      <Spinner size={40}/>
      <p style={{ color:"#9ca3af", fontWeight:600 }}>กำลังโหลดข้อมูลจาก Firebase...</p>
    </div>
  );

  return (
    <div style={{ paddingBottom:40 }}>
      {/* Branch Header */}
      <div style={{ background:C.black, borderRadius:14, padding:"18px 22px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <Icon name="store" size={13} color={C.yellow}/>
            <span style={{ fontSize:10, color:C.yellow, fontWeight:800, letterSpacing:2 }}>COCKPIT PRO คิว · สาขา</span>
            {lastUpdated && <span style={{ fontSize:10, color:"#6b7280" }}>อัปเดต {lastUpdated.toLocaleTimeString("th")}</span>}
          </div>
          <div style={{ fontSize:20, fontWeight:900, color:C.white, fontFamily:"'Arial Black',sans-serif" }}>{branchInfo.name}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
            <Icon name="line" size={13} color={C.lineGreen}/>
            <span style={{ fontSize:12, color:"#6b7280" }}>{branchInfo.lineOA}</span>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={fetchBranch} style={{ background:"rgba(255,224,0,0.1)", border:`1.5px solid ${C.yellow}`, color:C.yellow, padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}>
              <Icon name="refresh" size={13} color={C.yellow}/> รีเฟรช
            </button>
            <button onClick={()=>setShowSetBays(true)} style={{ background:"rgba(255,224,0,0.1)", border:`1.5px solid ${C.yellow}`, color:C.yellow, padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}>
              <Icon name="gear" size={13} color={C.yellow}/> ตั้งค่าช่อง ({totalBays})
            </button>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {[{v:emptyBays,l:"ว่าง",col:"#4ade80"},{v:activeBays,l:"ไม่ว่าง",col:C.yellow},{v:totalBays,l:"ทั้งหมด",col:"#9ca3af"}].map((s)=>(
              <div key={s.l} style={{ textAlign:"center", background:"rgba(255,255,255,0.07)", padding:"10px 14px", borderRadius:10, border:s.col===C.yellow?`2px solid ${C.yellow}`:"2px solid transparent" }}>
                <div style={{ fontSize:26, fontWeight:900, color:s.col, fontFamily:"'Arial Black',sans-serif" }}>{s.v}</div>
                <div style={{ fontSize:10, color:"#6b7280" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bay Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:12 }}>
        {Array.from({ length:totalBays }, (_,i)=>i+1).map((bay) => (
          <BayCard key={bay} bayNum={bay} job={baysData[String(bay)] || baysData[bay] || null}
            loading={!!bayLoading[bay]}
            onOpenJob={setOpenModal} onCloseJob={handleCloseJob}
            onUpdateJobStatus={handleUpdateJobStatus} onSendLineUpdate={handleSendLine}/>
        ))}
      </div>

      {openModal && <OpenJobModal bay={openModal} loading={modalLoading} onConfirm={(d)=>handleOpenJob(openModal,d)} onClose={()=>setOpenModal(null)}/>}
      {showSetBays && <SetBaysModal branch={branchInfo} currentBays={totalBays} loading={modalLoading} onConfirm={handleSetBays} onClose={()=>setShowSetBays(false)}/>}
    </div>
  );
}

// ── Admin Dashboard ────────────────────────────────────────
function AdminDashboard({ addToast }) {
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/overview");
      setOverview(data.overview || []);
      setLastUpdated(new Date());
    } catch {
      addToast({ type:"error", message:"โหลด Dashboard ไม่ได้" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const totals = overview.reduce((a,s) => ({
    bays: a.bays+s.totalBays, active: a.active+s.activeBays,
    total: a.total+s.totalJobs, done: a.done+s.doneJobs, inProg: a.inProg+s.inProgressJobs,
  }), { bays:0, active:0, total:0, done:0, inProg:0 });

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:80, flexDirection:"column", gap:16 }}>
      <Spinner size={40}/><p style={{ color:"#9ca3af", fontWeight:600 }}>กำลังโหลด Dashboard...</p>
    </div>
  );

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ background:C.black, borderRadius:14, padding:"18px 22px", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
          <Icon name="chart" size={18} color={C.yellow}/>
          <span style={{ fontSize:16, fontWeight:900, color:C.white, fontFamily:"'Arial Black',sans-serif" }}>ADMIN DASHBOARD</span>
          <span style={{ fontSize:11, background:C.yellow, color:C.black, padding:"2px 10px", borderRadius:99, fontWeight:800 }}>Live Firebase</span>
          {lastUpdated && <span style={{ fontSize:11, color:"#6b7280", marginLeft:"auto" }}>อัปเดต {lastUpdated.toLocaleTimeString("th")}</span>}
          <button onClick={fetchOverview} style={{ background:"rgba(255,224,0,0.1)", border:`1.5px solid ${C.yellow}`, color:C.yellow, padding:"5px 12px", borderRadius:8, fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}>
            <Icon name="refresh" size={13} color={C.yellow}/> รีเฟรช
          </button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(110px, 1fr))", gap:10 }}>
          {[{l:"ช่องทั้งหมด",v:totals.bays},{l:"กำลังใช้งาน",v:totals.active,hi:true},{l:"งานทั้งหมด",v:totals.total},{l:"เสร็จแล้ว",v:totals.done,hi:true},{l:"กำลังทำ",v:totals.inProg}].map((s)=>(
            <div key={s.l} style={{ background:"rgba(255,255,255,0.07)", borderRadius:10, padding:"12px 14px", textAlign:"center", border:s.hi?`2px solid ${C.yellow}`:"2px solid transparent" }}>
              <div style={{ fontSize:28, fontWeight:900, color:s.hi?C.yellow:C.white, fontFamily:"'Arial Black',sans-serif" }}>{s.v}</div>
              <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:C.white, border:`2px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:`2px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:4, height:18, background:C.yellow, borderRadius:2 }}/>
          <h3 style={{ margin:0, fontSize:14, fontWeight:900, color:C.black }}>สถานะรายสาขา (Firebase Live)</h3>
        </div>
        {overview.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"#9ca3af" }}>ยังไม่มีข้อมูลสาขาใน Firebase</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.black }}>
                  {["สาขา","ช่อง","ใช้งาน","ว่าง","Utilization","รอ","กำลังทำ","เสร็จ"].map((h)=>(
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:900, color:C.yellow, letterSpacing:0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overview.map((s,i)=>{
                  const util = Math.round((s.activeBays/s.totalBays)*100);
                  return (
                    <tr key={s.branchId} style={{ background:i%2===0?C.white:"#f7f7f2", borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"10px 14px", fontSize:13, fontWeight:700, color:C.black }}>{s.name}</td>
                      <td style={{ padding:"10px 14px", textAlign:"center", fontWeight:700 }}>{s.totalBays}</td>
                      <td style={{ padding:"10px 14px", textAlign:"center" }}><span style={{ background:C.yellow, color:C.black, padding:"2px 10px", borderRadius:99, fontSize:12, fontWeight:900 }}>{s.activeBays}</span></td>
                      <td style={{ padding:"10px 14px", textAlign:"center" }}><span style={{ background:"#d1fae5", color:"#047857", padding:"2px 10px", borderRadius:99, fontSize:12, fontWeight:700 }}>{s.emptyBays}</span></td>
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ flex:1, height:8, background:"#f3f4f6", borderRadius:99, overflow:"hidden", minWidth:60 }}>
                            <div style={{ height:"100%", width:`${util}%`, background:util>80?"#ef4444":C.yellow, borderRadius:99 }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:900, color:util>80?"#ef4444":C.black, minWidth:32 }}>{util}%</span>
                        </div>
                      </td>
                      <td style={{ padding:"10px 14px", textAlign:"center" }}><span style={{ background:"#fef9c3", color:"#92400e", padding:"2px 8px", borderRadius:6, fontSize:12, fontWeight:700 }}>{s.waitingJobs}</span></td>
                      <td style={{ padding:"10px 14px", textAlign:"center" }}><span style={{ background:C.yellow, color:C.black, padding:"2px 8px", borderRadius:6, fontSize:12, fontWeight:900 }}>{s.inProgressJobs}</span></td>
                      <td style={{ padding:"10px 14px", textAlign:"center" }}><span style={{ background:"#d1fae5", color:"#047857", padding:"2px 8px", borderRadius:6, fontSize:12, fontWeight:700 }}>{s.doneJobs}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("branch");
  const [branches, setBranches] = useState([{ id:"BR107", name:"Cockpit บายพาส อุดรธานี", lineOA:"@027qubjk", bays:8 }]);
  const [branch, setBranch] = useState(branches[0]);
  const [toasts, setToasts] = useState([]);

  const addToast = (t) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x)=>x.id!==id)), 4000);
  };

  const navItems = [
    { id:"branch",  label:"สาขา",  icon:"store", bg:C.yellow,    fg:C.black },
    { id:"admin",   label:"Admin",  icon:"chart", bg:C.black,     fg:C.yellow },
  ];

  return (
    <div style={{ fontFamily:"'Noto Sans Thai','Sarabun',sans-serif", background:C.bg, minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; }
        @keyframes slideIn { from { transform:translateX(40px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        button { transition:opacity 0.15s, transform 0.1s; }
        button:active { transform:scale(0.96); }
        input:focus { border-color:#FFE000 !important; box-shadow:0 0 0 3px rgba(255,224,0,0.25); }
      `}</style>

      {/* Top Bar */}
      <div style={{ background:C.white, borderBottom:`3px solid ${C.yellow}`, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:58, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <CockpitLogo height={30}/>
          <div style={{ borderLeft:`2px solid ${C.border}`, paddingLeft:10 }}>
            <div style={{ fontSize:13, fontWeight:900, color:C.black, lineHeight:1, fontFamily:"'Arial Black',sans-serif", letterSpacing:0.5 }}>PRO คิว</div>
            <div style={{ fontSize:10, color:"#9ca3af", fontWeight:600 }}>🔴 Live · Firebase + LINE OA</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {navItems.map((n)=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{ padding:"7px 16px", borderRadius:10, border:"none", fontFamily:"inherit", background:view===n.id?n.bg:"transparent", color:view===n.id?n.fg:"#6b7280", fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <Icon name={n.icon} size={14} color={view===n.id?n.fg:"#9ca3af"}/>{n.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex" }}>
        {/* Sidebar */}
        {view === "branch" && (
          <div style={{ width:208, background:C.white, borderRight:`2px solid ${C.border}`, minHeight:"calc(100vh - 58px)", padding:"14px 10px", flexShrink:0 }}>
            <p style={{ fontSize:10, fontWeight:800, color:"#9ca3af", letterSpacing:1.5, margin:"0 0 10px 6px" }}>เลือกสาขา</p>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              {branches.map((b)=>{
                const isSel = branch.id===b.id;
                return (
                  <button key={b.id} onClick={()=>setBranch(b)} style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 12px", borderRadius:10, border:`2px solid ${isSel?C.yellow:"transparent"}`, background:isSel?C.yellow:"transparent", cursor:"pointer", fontFamily:"inherit" }}>
                    <div style={{ fontSize:12, fontWeight:800, color:C.black, marginBottom:2 }}>{b.name}</div>
                    <div style={{ fontSize:11, color:isSel?"#5a4c00":"#9ca3af" }}>{b.id} · {b.lineOA}</div>
                  </button>
                );
              })}
            </div>
            {/* ป้ายแจ้งเตือน Live */}
            <div style={{ margin:"16px 6px 0", padding:"10px 12px", background:"#f0fdf4", borderRadius:10, border:"1.5px solid #86efac" }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#16a34a", marginBottom:4 }}>🔴 Live Mode</div>
              <div style={{ fontSize:10, color:"#6b7280", lineHeight:1.5 }}>ข้อมูลเชื่อมต่อ Firebase + LINE OA จริงแล้ว อัปเดตอัตโนมัติทุก 30 วินาที</div>
            </div>
          </div>
        )}

        <div style={{ flex:1, padding:20, overflow:"auto" }}>
          {view==="branch" && <BranchView key={branch.id} branch={branch} addToast={addToast}/>}
          {view==="admin"  && <AdminDashboard addToast={addToast}/>}
        </div>
      </div>

      <Toast toasts={toasts}/>
    </div>
  );
}
