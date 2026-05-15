import { useState, useEffect, useCallback } from "react";

const API = "https://cockpit-pro-backend.onrender.com";
const JOB_TYPES = ["ยาง","ตั้งศูนย์","ถ่วงล้อ","แบตเตอรี่","เบรค","โช้คอัพ","น้ำมันเครื่อง","Cockpit Sure","อื่นๆ"];
const PROVINCES = ["กระบี่","กรุงเทพมหานคร","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getProgress = (jobs = []) => {
  const real = jobs.filter(j => j.name !== "รับรถเข้า");
  if (!real.length) return 0;
  return Math.round(real.filter(j => j.status === "done").length / real.length * 100);
};

const getNextQNo = (queues) => {
  for (let i = 1; i <= 20; i++) { if (!queues[String(i)]) return i; }
  return null;
};

const callAPI = async (method, path, body) => {
  const r = await fetch(`${API}${path}`, {
    method, headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
};

// ─── Brand Logo ───────────────────────────────────────────────────────────────
function CockpitLogo({ height = 46 }) {
  const w = height * 2.8;
  return (
    <svg width={w} height={height} viewBox="0 0 280 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="244" height="88" rx="14" fill="#FFE000"/>
      <polygon points="210,88 244,88 244,56 210,88" fill="#d4b800"/>
      <polygon points="210,88 244,56 244,88" fill="#FFE000"/>
      <text x="122" y="67" fontFamily="'Arial Black','Impact','Helvetica Neue',sans-serif"
        fontSize="52" fontWeight="900" fill="#1A1A1A" textAnchor="middle" letterSpacing="-1">
        COCKPIT
      </text>
    </svg>
  );
}

// ─── Completion Toast (staff only) ───────────────────────────────────────────
function CompletionToast({ plate, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",
      zIndex:300,background:"#059669",color:"#fff",
      borderRadius:14,padding:"16px 28px",fontSize:18,fontWeight:800,
      boxShadow:"0 4px 20px rgba(0,0,0,.3)",textAlign:"center",
      animation:"fadeIn .3s ease",whiteSpace:"nowrap",
      fontFamily:"'Noto Sans Thai',sans-serif"
    }}>
      ✅ ปิดงาน {plate} แล้ว — LINE แจ้งลูกค้าอัตโนมัติ
    </div>
  );
}

// ─── Province Picker ──────────────────────────────────────────────────────────
function ProvincePicker({ value, onChange }) {
  const [search, setSearch] = useState("");
  const filtered = PROVINCES.filter(p => p.includes(search));
  return (
    <div>
      {value && (
        <div style={{background:"#FFE000",borderRadius:10,padding:"12px 16px",marginBottom:10,fontSize:18,fontWeight:800,color:"#1A1A1A"}}>
          ✅ {value}
        </div>
      )}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 ค้นหาจังหวัด..."
        style={{width:"100%",padding:"14px 16px",borderRadius:12,border:"2px solid #e5e7eb",
          fontSize:18,fontFamily:"'Noto Sans Thai',sans-serif",outline:"none",marginBottom:10}}
      />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:220,overflowY:"auto"}}>
        {filtered.map(p => (
          <button key={p} onClick={() => { onChange(p); setSearch(""); }}
            style={{
              padding:"12px 6px",borderRadius:10,textAlign:"center",
              border: value===p ? "3px solid #1A1A1A" : "2px solid #e5e7eb",
              background: value===p ? "#FFE000" : "#f9fafb",
              fontSize:15,fontWeight:700,cursor:"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif"
            }}>{p}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Open Queue Modal ─────────────────────────────────────────────────────────
function OpenQueueModal({ qNo, branchId, onClose, onSuccess }) {
  const [plate, setPlate] = useState("");
  const [province, setProvince] = useState("");
  const [showProvince, setShowProvince] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!plate.trim()) { setError("กรุณากรอกทะเบียนรถ"); return; }
    setLoading(true); setError("");
    try {
      const res = await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/open`, {
        plate: plate.trim().toUpperCase().replace(/\s/g,""),
        phone: "-", province: province || "",
        jobs: ["รับรถเข้า"]
      });
      if (res.success) { onSuccess(); onClose(); }
      else setError(res.error || "เกิดข้อผิดพลาด");
    } catch { setError("ไม่สามารถเชื่อมต่อได้"); }
    setLoading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",maxHeight:"92vh",overflowY:"auto",padding:"24px 20px 48px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <div style={{fontSize:24,fontWeight:900,color:"#1A1A1A"}}>🚗 เพิ่มรถ – ลำดับที่ {qNo}</div>
            <div style={{fontSize:14,color:"#9ca3af",marginTop:4}}>ระบบดึงข้อมูล LINE อัตโนมัติจากทะเบียน</div>
          </div>
          <button onClick={onClose} style={{background:"#f3f4f6",border:"none",borderRadius:10,width:40,height:40,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        {error && <div style={{background:"#fee2e2",color:"#dc2626",padding:"12px",borderRadius:10,marginBottom:16,fontWeight:700,fontSize:16}}>{error}</div>}

        {/* Plate input - main field */}
        <label style={{fontSize:20,fontWeight:900,display:"block",marginBottom:10,color:"#1A1A1A"}}>
          🔢 ทะเบียนรถ
        </label>
        <input
          value={plate}
          onChange={e => setPlate(e.target.value.toUpperCase())}
          placeholder="เช่น กข1234"
          autoFocus
          style={{
            width:"100%",padding:"20px",borderRadius:14,
            border:"3px solid #e5e7eb",fontSize:36,fontWeight:900,
            fontFamily:"'Noto Sans Thai',sans-serif",
            letterSpacing:"0.05em",outline:"none",marginBottom:8,
            textAlign:"center",textTransform:"uppercase"
          }}
        />

        {/* Province - optional toggle */}
        <button
          onClick={() => setShowProvince(!showProvince)}
          style={{
            background:"none",border:"1.5px dashed #d1d5db",borderRadius:10,
            padding:"10px 16px",fontSize:15,fontWeight:700,cursor:"pointer",
            color:"#6b7280",marginBottom:16,fontFamily:"'Noto Sans Thai',sans-serif",
            width:"100%"
          }}>
          {province ? `📍 จังหวัด: ${province}` : "📍 เพิ่มจังหวัด (ถ้ามีทะเบียนซ้ำ)"}
        </button>

        {showProvince && (
          <div style={{marginBottom:16}}>
            <ProvincePicker value={province} onChange={p => { setProvince(p); setShowProvince(false); }}/>
          </div>
        )}

        {/* Info box */}
        <div style={{
          background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:12,
          padding:"12px 16px",marginBottom:20,
          display:"flex",gap:10,alignItems:"flex-start"
        }}>
          <span style={{fontSize:20,flexShrink:0}}>💬</span>
          <div style={{fontSize:14,color:"#166534",fontWeight:700,lineHeight:1.6}}>
            ถ้าลูกค้าลงทะเบียนทะเบียนรถใน LINE แล้ว<br/>
            ระบบจะส่งแจ้งเตือนให้อัตโนมัติ
          </div>
        </div>

        <button onClick={submit} disabled={loading}
          style={{
            width:"100%",padding:"20px",borderRadius:14,border:"none",
            background: loading ? "#9ca3af" : "#1A1A1A",color:"#FFE000",
            fontSize:22,fontWeight:900,cursor:"pointer",
            fontFamily:"'Noto Sans Thai',sans-serif"
          }}>
          {loading ? "⏳ กำลังบันทึก..." : "✅ เปิดคิว"}
        </button>
      </div>
    </div>
  );
}

// ─── Add Jobs Modal ───────────────────────────────────────────────────────────
function AddJobsModal({ qNo, branchId, existingJobs, onClose, onSuccess }) {
  const names = (existingJobs||[]).map(j => j.name);
  const avail = JOB_TYPES.filter(t => !names.includes(t));
  const [sel, setSel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (j) => setSel(p => p.includes(j) ? p.filter(x=>x!==j) : [...p,j]);

  const submit = async () => {
    if (!sel.length) { setError("กรุณาเลือกอย่างน้อย 1 งาน"); return; }
    setLoading(true); setError("");
    try {
      const res = await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/addjobs`, { jobs: sel });
      if (res.success) { onSuccess(); onClose(); }
      else setError(res.error || "เกิดข้อผิดพลาด");
    } catch { setError("ไม่สามารถเชื่อมต่อได้"); }
    setLoading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",padding:"24px 20px 48px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:22,fontWeight:900,color:"#1A1A1A"}}>🔧 เพิ่มงาน – ลำดับที่ {qNo}</div>
          <button onClick={onClose} style={{background:"#f3f4f6",border:"none",borderRadius:10,width:40,height:40,fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        {error && <div style={{background:"#fee2e2",color:"#dc2626",padding:"12px",borderRadius:10,marginBottom:12,fontWeight:700}}>{error}</div>}
        {avail.length === 0
          ? <div style={{textAlign:"center",padding:"40px 0",color:"#9ca3af",fontSize:18}}>เพิ่มงานครบทุกประเภทแล้ว</div>
          : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {avail.map(job => (
                <button key={job} onClick={() => toggle(job)}
                  style={{padding:"18px 8px",borderRadius:12,textAlign:"center",minHeight:60,
                    border: sel.includes(job) ? "3px solid #1A1A1A" : "2px solid #e5e7eb",
                    background: sel.includes(job) ? "#FFE000" : "#f9fafb",
                    fontSize:18,fontWeight:700,cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>
                  {sel.includes(job) ? "✅ " : ""}{job}
                </button>
              ))}
            </div>
        }
        <button onClick={submit} disabled={loading || !sel.length}
          style={{width:"100%",padding:"20px",borderRadius:14,border:"none",
            background: sel.length&&!loading ? "#1A1A1A" : "#e5e7eb",
            color: sel.length&&!loading ? "#FFE000" : "#9ca3af",
            fontSize:20,fontWeight:900,cursor:sel.length?"pointer":"default",
            fontFamily:"'Noto Sans Thai',sans-serif"}}>
          {loading ? "⏳ กำลังบันทึก..." : `➕ เพิ่ม ${sel.length} งาน`}
        </button>
      </div>
    </div>
  );
}

// ─── Queue Card ───────────────────────────────────────────────────────────────
function QueueCard({ qNo, data, branchId, onRefresh, onAddJobs, onComplete }) {
  const [busy, setBusy] = useState(false);
  const jobs = data.jobs || [];
  const jobsIdx = jobs.map((j, i) => ({...j, idx: i}));
  const real = jobsIdx.filter(j => j.name !== "รับรถเข้า");
  const prog = getProgress(jobs);
  const isWait = data.bayStatus === "waiting_entry";
  const isIn   = data.bayStatus === "in_service";

  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  const handleStart = () => run(async () => {
    await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/start`, {});
    onRefresh();
  });

  const handleToggle = (idx) => run(async () => {
    const j = jobs[idx];
    const ns = j.status === "done" ? "waiting" : "done";
    await callAPI("PATCH", `/api/branch/${branchId}/bay/${qNo}/job/${idx}`, { status: ns });
    onRefresh();
  });

  const handleClose = async () => {
    if (!window.confirm(`ยืนยันปิดงานรถ ${data.plate} ?`)) return;
    setBusy(true);
    await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/close`, {});
    onComplete(data.plate);
    setBusy(false);
  };

  return (
    <div style={{
      background:"#fff",borderRadius:20,marginBottom:14,overflow:"hidden",
      boxShadow: isIn ? "0 0 0 2px #059669" : "0 2px 12px rgba(0,0,0,0.08)",
      opacity: busy ? 0.75 : 1, transition:"opacity .2s"
    }}>
      {/* Card header */}
      <div style={{background: isIn ? "#059669" : "#1A1A1A",padding:"14px 16px",
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{background:"#FFE000",borderRadius:10,minWidth:50,height:50,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:20,fontWeight:900,color:"#1A1A1A",flexShrink:0}}>
            {qNo}
          </div>
          <div>
            <div style={{fontSize:34,fontWeight:900,color:"#FFE000",letterSpacing:"0.04em",lineHeight:1}}>{data.plate}</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,.7)",marginTop:2}}>
              {data.province ? `จ.${data.province}` : ""}
            </div>
          </div>
        </div>
        <div style={{background: isWait ? "#FFE000" : "rgba(255,255,255,.18)",
          color: isWait ? "#1A1A1A" : "#fff",
          borderRadius:20,padding:"6px 14px",fontSize:14,fontWeight:800,flexShrink:0}}>
          {isWait ? "⏳ รอคิว" : "🔧 กำลังซ่อม"}
        </div>
      </div>

      {/* Progress bar */}
      {real.length > 0 && (
        <div style={{padding:"14px 16px 6px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:14,fontWeight:700,color:"#6b7280"}}>ความคืบหน้า</span>
            <span style={{fontSize:16,fontWeight:900,color:"#1A1A1A"}}>{prog}%</span>
          </div>
          <div style={{background:"#f3f4f6",borderRadius:99,height:10}}>
            <div style={{background: prog===100?"#059669":"#FFE000",borderRadius:99,height:10,width:`${prog}%`,transition:"width .4s"}}/>
          </div>
        </div>
      )}

      {/* Job list */}
      {real.length > 0 ? (
        <div style={{padding:"6px 16px"}}>
          {real.map(job => (
            <button key={job.idx}
              onClick={() => isIn && !busy && handleToggle(job.idx)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 0",
                background:"none",border:"none",borderBottom:"1px solid #f3f4f6",
                cursor: isIn ? "pointer" : "default",textAlign:"left",
                fontFamily:"'Noto Sans Thai',sans-serif"}}>
              <span style={{fontSize:22,flexShrink:0}}>
                {job.status==="done"?"✅":job.status==="in_progress"?"🔧":"⏳"}
              </span>
              <span style={{fontSize:18,fontWeight:700,flex:1,
                color:job.status==="done"?"#9ca3af":"#1A1A1A",
                textDecoration:job.status==="done"?"line-through":"none"}}>
                {job.name}
              </span>
              <span style={{fontSize:13,color:"#9ca3af",flexShrink:0}}>{job.duration}นาที</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{padding:"14px 16px",color:"#9ca3af",fontSize:16,fontStyle:"italic"}}>
          ยังไม่มีรายการงาน – กดเพิ่มงานด้านล่าง
        </div>
      )}

      {/* Action buttons */}
      <div style={{padding:"12px 16px 16px",display:"flex",gap:8}}>
        <button onClick={() => onAddJobs(String(qNo))}
          style={{flex:1,padding:"12px 0",borderRadius:10,border:"2px solid #e5e7eb",
            background:"#f9fafb",color:"#374151",fontSize:16,fontWeight:700,cursor:"pointer",
            fontFamily:"'Noto Sans Thai',sans-serif"}}>
          ➕ เพิ่มงาน
        </button>
        {isWait && real.length > 0 && (
          <button onClick={handleStart} disabled={busy}
            style={{flex:1,padding:"12px 0",borderRadius:10,border:"none",
              background:"#FFE000",color:"#1A1A1A",fontSize:16,fontWeight:800,cursor:"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif"}}>
            ▶ เริ่มซ่อม
          </button>
        )}
        {isIn && (
          <button onClick={handleClose} disabled={busy}
            style={{flex:1,padding:"12px 0",borderRadius:10,border:"none",
              background:"#059669",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif"}}>
            ✓ เสร็จสิ้น
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Staff View ───────────────────────────────────────────────────────────────
function StaffView() {
  const [branches, setBranches]     = useState([]);
  const [branchId, setBranchId]     = useState(null);
  const [queues, setQueues]         = useState({});
  const [branchName, setBranchName] = useState("Cockpit Pro");
  const [loading, setLoading]       = useState(true);
  const [openModal, setOpenModal]   = useState(false);
  const [addTarget, setAddTarget]   = useState(null);
  const [completion, setCompletion] = useState(null);

  // โหลดรายชื่อสาขาจาก API
  useEffect(() => {
    fetch(`${API}/api/admin/overview`)
      .then(r => r.json())
      .then(d => {
        const list = d.overview || [];
        setBranches(list);
        if (list.length) setBranchId(list[0].branchId);
      })
      .catch(() => setBranchId("BR107"));
  }, []);

  const fetch_ = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await fetch(`${API}/api/branch/${branchId}`);
      const data = await res.json();
      setQueues(data.baysData || {});
      setBranchName(data.name || "Cockpit Pro");
    } catch {}
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    setLoading(true); setQueues({});
    fetch_();
    const t = setInterval(fetch_, 15000);
    return () => clearInterval(t);
  }, [fetch_, branchId]);

  const qList = Object.values(queues);
  const total = qList.length, inSrv = qList.filter(q=>q.bayStatus==="in_service").length;
  const wait  = qList.filter(q=>q.bayStatus==="waiting_entry").length;
  const nextQ = getNextQNo(queues);
  const sorted = Object.entries(queues).sort((a,b) => parseInt(a[0])-parseInt(b[0]));

  return (
    <div style={{paddingBottom:100}}>

      {/* Branch selector tabs */}
      {branches.length > 1 && (
        <div style={{padding:"12px 16px 4px",display:"flex",gap:8,overflowX:"auto"}}>
          {branches.map(b => (
            <button key={b.branchId} onClick={() => setBranchId(b.branchId)}
              style={{
                padding:"10px 18px",borderRadius:12,border:"none",cursor:"pointer",
                background: branchId===b.branchId ? "#1A1A1A" : "#fff",
                color: branchId===b.branchId ? "#FFE000" : "#374151",
                fontSize:15,fontWeight:800,whiteSpace:"nowrap",flexShrink:0,
                boxShadow:"0 2px 8px rgba(0,0,0,.08)",
                fontFamily:"'Noto Sans Thai',sans-serif"
              }}>
              📍 {b.name}
            </button>
          ))}
        </div>
      )}

      <div style={{padding:"12px 16px 4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:18,fontWeight:800,color:"#374151"}}>📍 {branchName}</div>
        <button onClick={fetch_} style={{background:"none",border:"1.5px solid #d1d5db",borderRadius:8,
          padding:"6px 12px",fontSize:14,fontWeight:700,cursor:"pointer",color:"#6b7280",
          fontFamily:"'Noto Sans Thai',sans-serif"}}>🔄 รีเฟรช</button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"8px 16px 16px"}}>
        {[
          {label:"คิวทั้งหมด",value:total,bg:"#FFE000",color:"#1A1A1A"},
          {label:"เริ่มทำแล้ว",value:inSrv,bg:"#059669",color:"#fff"},
          {label:"รออีก",value:wait,bg:"#d97706",color:"#fff"},
        ].map(s => (
          <div key={s.label} style={{background:s.bg,borderRadius:16,padding:"16px 8px",textAlign:"center"}}>
            <div style={{fontSize:42,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:13,fontWeight:700,color:s.color,opacity:.9,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{textAlign:"center",padding:60,fontSize:18,color:"#9ca3af"}}>⏳ กำลังโหลด...</div>}
      {!loading && total===0 && (
        <div style={{textAlign:"center",padding:60,color:"#9ca3af"}}>
          <div style={{fontSize:60,marginBottom:16}}>🅿️</div>
          <div style={{fontSize:20,fontWeight:700}}>ยังไม่มีรถในคิว</div>
          <div style={{fontSize:16,marginTop:8}}>กดปุ่ม + ด้านล่างเพื่อเพิ่มรถ</div>
        </div>
      )}

      <div style={{padding:"0 16px"}}>
        {sorted.map(([qNo, data]) => (
          <QueueCard key={qNo} qNo={qNo} data={data} branchId={branchId}
            onRefresh={fetch_}
            onAddJobs={setAddTarget}
            onComplete={plate => { setCompletion(plate); fetch_(); }}/>
        ))}
      </div>

      {/* FAB */}
      {nextQ && !openModal && !addTarget && !completion && (
        <button onClick={() => setOpenModal(true)} style={{
          position:"fixed",bottom:88,right:20,width:64,height:64,borderRadius:32,
          background:"#FFE000",border:"none",fontSize:32,cursor:"pointer",zIndex:50,
          boxShadow:"0 4px 20px rgba(0,0,0,.3)",display:"flex",alignItems:"center",
          justifyContent:"center",fontWeight:900,color:"#1A1A1A"}}>+</button>
      )}

      {openModal && <OpenQueueModal qNo={nextQ} branchId={branchId}
        onClose={() => setOpenModal(false)} onSuccess={fetch_}/>}
      {addTarget && <AddJobsModal qNo={addTarget} branchId={branchId}
        existingJobs={queues[addTarget]?.jobs||[]}
        onClose={() => setAddTarget(null)} onSuccess={fetch_}/>}
      {completion && <CompletionToast plate={completion} onClose={() => setCompletion(null)}/>}
    </div>
  );
}

// ─── Admin View (TV-optimized) ────────────────────────────────────────────────
function AdminView() {
  const [overview, setOverview]   = useState([]);
  const [selBranch, setSelBranch] = useState(null);
  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [detLoad, setDetLoad]     = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");

  const fetchOv = async () => {
    try {
      const r = await fetch(`${API}/api/admin/overview`);
      const d = await r.json();
      setOverview(d.overview || []);
      if (d.overview?.length && !selBranch) selectBranch(d.overview[0].branchId);
    } catch {}
    setLoading(false);
  };

  const selectBranch = async (id) => {
    setSelBranch(id); setDetLoad(true);
    try {
      const r = await fetch(`${API}/api/branch/${id}`);
      setDetail(await r.json());
      setLastUpdate(new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    } catch {}
    setDetLoad(false);
  };

  const refresh = () => selBranch && selectBranch(selBranch);

  useEffect(() => { fetchOv(); }, []);
  useEffect(() => {
    if (!selBranch) return;
    const t = setInterval(() => selectBranch(selBranch), 20000);
    return () => clearInterval(t);
  }, [selBranch]);

  if (loading) return <div style={{textAlign:"center",padding:60,fontSize:18,color:"#9ca3af"}}>⏳ กำลังโหลด...</div>;
  if (!overview.length) return <div style={{textAlign:"center",padding:60,fontSize:18,color:"#9ca3af"}}>ไม่พบข้อมูลสาขา</div>;

  const cars = Object.entries(detail?.baysData||{}).sort((a,b)=>parseInt(a[0])-parseInt(b[0]));
  const total = cars.length;
  const inSrv = cars.filter(([,c])=>c.bayStatus==="in_service").length;
  const wait  = cars.filter(([,c])=>c.bayStatus==="waiting_entry").length;
  const done  = cars.filter(([,c])=>getProgress(c.jobs)===100).length;

  // Responsive columns: fit all cards on screen
  const cols = total <= 4 ? total || 1 : total <= 8 ? 4 : total <= 12 ? 4 : total <= 16 ? 4 : 5;

  return (
    <div style={{background:"#0f1117",minHeight:"calc(100vh - 110px)",display:"flex",flexDirection:"column"}}>

      {/* Top bar */}
      <div style={{background:"#1A1A1A",borderBottom:"2px solid #FFE000",padding:"10px 20px",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>

        {/* Title + branch */}
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#FFE000",letterSpacing:"2px",textTransform:"uppercase"}}>
              ข้อมูลการใช้บริการ
            </div>
            <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>
              {detail?.name || "กำลังโหลด..."}
            </div>
          </div>
        </div>

        {/* Branch tabs */}
        <div style={{display:"flex",gap:6}}>
          {overview.map(b => (
            <button key={b.branchId} onClick={() => selectBranch(b.branchId)}
              style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",
                background: selBranch===b.branchId ? "#FFE000" : "rgba(255,255,255,0.1)",
                color: selBranch===b.branchId ? "#1A1A1A" : "#ccc",
                fontSize:13,fontWeight:800,fontFamily:"'Noto Sans Thai',sans-serif"}}>
              {b.name}
            </button>
          ))}
        </div>

        {/* Stats + refresh */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {[
            {v:total,l:"ทั้งหมด",bg:"#FFE000",c:"#1A1A1A"},
            {v:inSrv,l:"ซ่อมอยู่",bg:"#059669",c:"#fff"},
            {v:wait,l:"รอคิว",bg:"#d97706",c:"#fff"},
            {v:done,l:"เสร็จแล้ว",bg:"#374151",c:"#fff"},
          ].map(s => (
            <div key={s.l} style={{background:s.bg,borderRadius:8,padding:"4px 12px",textAlign:"center",minWidth:52}}>
              <div style={{fontSize:20,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:10,fontWeight:700,color:s.c,opacity:.85}}>{s.l}</div>
            </div>
          ))}
          <div style={{fontSize:11,color:"#6b7280",marginLeft:4}}>
            🔄 {lastUpdate}
          </div>
          <button onClick={refresh}
            style={{background:"rgba(255,255,255,0.08)",border:"1px solid #444",borderRadius:8,
              padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",color:"#ccc",
              fontFamily:"'Noto Sans Thai',sans-serif"}}>
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Queue grid */}
      {detLoad ? (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:16}}>
          ⏳ กำลังโหลด...
        </div>
      ) : (
        <div style={{
          flex:1, padding:"12px 16px",
          display:"grid",
          gridTemplateColumns:`repeat(${cols}, 1fr)`,
          gap:10,
          alignContent:"start",
        }}>
          {cars.length === 0 && (
            <div style={{gridColumn:`1/-1`,textAlign:"center",padding:60,color:"#6b7280",fontSize:16}}>
              ไม่มีรถในคิวขณะนี้
            </div>
          )}

          {cars.map(([qNo, car]) => {
            const real = (car.jobs||[]).filter(j=>j.name!=="รับรถเข้า");
            const prog = getProgress(car.jobs);
            const isIn = car.bayStatus==="in_service";
            const isDone = prog === 100 && real.length > 0;

            return (
              <div key={qNo} style={{
                background: isIn ? "#1a2a1a" : "#1a1a2a",
                border: `2px solid ${isDone?"#059669":isIn?"#22c55e":"#374151"}`,
                borderRadius:12,overflow:"hidden",
                display:"flex",flexDirection:"column",
              }}>
                {/* Card header */}
                <div style={{
                  background: isDone?"#059669":isIn?"#166534":"#1e293b",
                  padding:"8px 10px",
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{
                      background:"#FFE000",borderRadius:6,minWidth:28,height:28,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:13,fontWeight:900,color:"#1A1A1A",flexShrink:0,
                    }}>{qNo}</div>
                    <div>
                      <div style={{fontSize:20,fontWeight:900,color:"#FFE000",letterSpacing:"0.04em",lineHeight:1}}>
                        {car.plate}
                      </div>
                      {car.province && (
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:1}}>
                          จ.{car.province}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    background: isDone?"rgba(255,255,255,.2)":isIn?"#FFE000":"#d97706",
                    color: isDone?"#fff":isIn?"#1A1A1A":"#fff",
                    borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:900,textAlign:"center",
                  }}>
                    {isDone?"✅ เสร็จ":isIn?"🔧 ซ่อม":"⏳ รอ"}
                  </div>
                </div>

                {/* Progress bar */}
                {real.length > 0 && (
                  <div style={{padding:"6px 10px 4px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:"#9ca3af",fontWeight:700}}>ความคืบหน้า</span>
                      <span style={{fontSize:12,fontWeight:900,color:"#fff"}}>{prog}%</span>
                    </div>
                    <div style={{background:"#374151",borderRadius:99,height:6}}>
                      <div style={{
                        background:isDone?"#059669":"#FFE000",
                        borderRadius:99,height:6,width:`${prog}%`,transition:"width .4s"
                      }}/>
                    </div>
                  </div>
                )}

                {/* Jobs */}
                <div style={{padding:"4px 10px 8px",flex:1}}>
                  {real.length === 0 ? (
                    <div style={{color:"#4b5563",fontSize:12,fontStyle:"italic",padding:"4px 0"}}>
                      รอเพิ่มรายการงาน
                    </div>
                  ) : real.map((job,i) => (
                    <div key={i} style={{
                      display:"flex",alignItems:"center",gap:6,
                      padding:"3px 0",
                      borderBottom: i<real.length-1?"1px solid #1f2937":"none"
                    }}>
                      <span style={{fontSize:13,flexShrink:0}}>
                        {job.status==="done"?"✅":job.status==="in_progress"?"🔧":"⏳"}
                      </span>
                      <span style={{
                        fontSize:13,fontWeight:700,flex:1,
                        color:job.status==="done"?"#4b5563":"#e5e7eb",
                        textDecoration:job.status==="done"?"line-through":"none",
                      }}>
                        {job.name}
                      </span>
                      <span style={{
                        fontSize:11,fontWeight:700,flexShrink:0,
                        borderRadius:4,padding:"1px 6px",
                        background:job.status==="done"?"#064e3b":job.status==="in_progress"?"#78350f":"#1f2937",
                        color:job.status==="done"?"#34d399":job.status==="in_progress"?"#fbbf24":"#6b7280",
                      }}>
                        {job.status==="done"?"เสร็จ":job.status==="in_progress"?"ทำอยู่":"รอ"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("staff");
  return (
    <div style={{fontFamily:"'Noto Sans Thai',sans-serif",background:"#F2F2EE",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;} body{margin:0;padding:0;}
        button,input{font-family:'Noto Sans Thai',sans-serif;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Sticky header */}
      <div style={{background:"#1A1A1A",padding:"14px 16px 0",position:"sticky",top:0,zIndex:40,
        boxShadow:"0 2px 16px rgba(0,0,0,.5)"}}>
        <div style={{marginBottom:14}}><CockpitLogo height={44}/></div>
        <div style={{display:"flex"}}>
          {[{key:"staff",label:"👨‍🔧 พนักงาน"},{key:"admin",label:"📺 ข้อมูลการใช้บริการ"}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex:1,padding:"12px 0",border:"none",background:"transparent",
              color: tab===t.key ? "#FFE000" : "rgba(255,255,255,.4)",
              fontSize:16,fontWeight:800,cursor:"pointer",
              borderBottom: tab===t.key ? "3px solid #FFE000" : "3px solid transparent",
              transition:"all .2s",fontFamily:"'Noto Sans Thai',sans-serif"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>{tab === "staff" ? <StaffView/> : <AdminView/>}</div>
    </div>
  );
}
