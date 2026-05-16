import { useState, useEffect, useCallback, useRef } from "react";

// ── Cloudinary Config ─────────────────────────────────────────────────────────
// ⚠️ เปลี่ยนค่านี้เป็น Cloud Name ของคุณ (จาก cloudinary.com → Dashboard)
const CLOUDINARY_CLOUD  = "dnmzyoobh";
const CLOUDINARY_PRESET = "cockpit_unsigned";

const API = "https://cockpit-pro-backend.onrender.com";
const JOB_TYPES = [
  {name:"เปลี่ยนยาง 4 เส้น", duration:52, timeLabel:"45-60 นาที"},
  {name:"ถ่วงล้อ", duration:35, timeLabel:"30-40 นาที"},
  {name:"ตั้งศูนย์ล้อ", duration:52, timeLabel:"45-60 นาที"},
  {name:"เปลี่ยนถ่ายน้ำมันเครื่อง", duration:35, timeLabel:"30-40 นาที"},
  {name:"เปลี่ยนแบตเตอรี่", duration:25, timeLabel:"20-30 นาที"},
  {name:"เปลี่ยนเบรก", duration:52, timeLabel:"45-60 นาที"},
  {name:"CockpitSure", duration:17, timeLabel:"15-20 นาที"},
  {name:"เปลี่ยนโช้คอัพ", duration:52, timeLabel:"45-60 นาที"},
  {name:"งานซ่อมช่วงล่าง", duration:135, timeLabel:"90-180 นาที"},
  {name:"เบิกอะไหล่", duration:85, timeLabel:"50-120 นาที"},
  {name:"งานซ่อมอื่น", duration:75, timeLabel:"30-120 นาที"},
];
const PROVINCES = ["กระบี่","กรุงเทพมหานคร","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getProgress = (jobs = []) => {
  const real = jobs.filter(j => j.name !== "รับรถเข้า");
  if (!real.length) return 0;
  return Math.round(real.filter(j => j.status === "done").length / real.length * 100);
};

const getElapsed = (startTime) => {
  if (!startTime) return "";
  const diff = Date.now() - new Date(startTime).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}ชม.${m}น.`;
  return `${m}น.`;
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
const LOGO_B64 = "data:image/png;base64,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";
function CockpitLogo({ height = 46 }) {
  return (
    <img src={LOGO_B64} alt="COCKPIT" style={{height:height,display:"block",objectFit:"contain"}}/>
  );
}

// ─── Completion Toast (staff only) ───────────────────────────────────────────
// ─── CockpitSure Video Modal ──────────────────────────────────────────────────
function CockpitSureModal({ qNo, branchId, data, jobIdx, onClose, onSuccess }) {
  const [phase, setPhase]           = useState("intro");   // intro|ready|recording|preview|uploading|done|error
  const [stream, setStream]         = useState(null);
  const [recorder, setRecorder]     = useState(null);
  const [paused, setPaused]         = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // back cam default
  const [videoBlob, setVideoBlob]   = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [timer, setTimer]           = useState(0);
  const [error, setError]           = useState("");

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const previewRef = useRef(null);
  const timerRef   = useRef(null);
  const chunksRef  = useRef([]);
  const animRef    = useRef(null);
  const MAX_SEC    = 120;

  // Cleanup on unmount
  useEffect(() => () => {
    stream?.getTracks().forEach(t => t.stop());
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
  }, [stream]);

  // Attach stream to video
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(()=>{});
    }
  }, [stream]);

  const openCamera = async (facing = facingMode) => {
    stream?.getTracks().forEach(t => t.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width:{ideal:1280}, height:{ideal:720} },
        audio: true
      });
      setStream(s); setPhase("ready");
    } catch(e) {
      setError("ไม่สามารถเปิดกล้องได้\nกรุณาอนุญาตการใช้กล้องใน Settings");
      setPhase("error");
    }
  };

  const switchCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await openCamera(next);
  };

  // Canvas compositing draw loop
  const startDrawLoop = (video, canvas, ctx, frameImg) => {
    const draw = () => {
      if (video.readyState >= 2) {
        // Fill canvas with video (handle portrait orientation)
        const vW = video.videoWidth, vH = video.videoHeight;
        const cW = canvas.width, cH = canvas.height;
        if (vW && vH) {
          const vAspect = vW / vH, cAspect = cW / cH;
          let sx=0, sy=0, sw=vW, sh=vH;
          if (vAspect > cAspect) { sw = vH * cAspect; sx = (vW-sw)/2; }
          else { sh = vW / cAspect; sy = (vH-sh)/2; }
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cW, cH);
        }
        // Draw frame overlay (transparent center shows video)
        if (frameImg.complete && frameImg.naturalWidth > 0) {
          ctx.drawImage(frameImg, 0, 0, cW, cH);
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const startRec = () => {
    chunksRef.current = [];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;
    // Portrait canvas (9:16)
    canvas.width = 720; canvas.height = 1280;

    const beginRecord = () => {
      startDrawLoop(video, canvas, ctx, frameImg);
      // Canvas stream + audio
      const canvasStream = canvas.captureStream(30);
      stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9" : "video/webm";
      const mr = new MediaRecorder(canvasStream, {mimeType});
      mr.ondataavailable = e => { if(e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        cancelAnimationFrame(animRef.current);
        const blob = new Blob(chunksRef.current, {type:"video/webm"});
        setVideoBlob(blob); setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t=>t.stop()); setStream(null); setPhase("preview");
      };
      mr.start(500); setRecorder(mr); setTimer(0); setPhase("recording"); setPaused(false);
      timerRef.current = setInterval(() => {
        setTimer(t => { if(t>=MAX_SEC-1){mr.stop();clearInterval(timerRef.current);return MAX_SEC;} return t+1;});
      }, 1000);
    };

    if (frameImg.complete) beginRecord();
    else { frameImg.onload = beginRecord; frameImg.onerror = beginRecord; }
  };

  const handlePause = () => {
    if (!recorder || recorder.state!=="recording") return;
    recorder.pause(); setPaused(true); clearInterval(timerRef.current);
  };
  const handleResume = () => {
    if (!recorder || recorder.state!=="paused") return;
    recorder.resume(); setPaused(false);
    timerRef.current = setInterval(() => {
      setTimer(t => { if(t>=MAX_SEC-1){recorder.stop();clearInterval(timerRef.current);return MAX_SEC;} return t+1;});
    }, 1000);
  };
  const handleFinish = () => {
    if (recorder && recorder.state!=="inactive") recorder.stop();
    clearInterval(timerRef.current);
  };

  const uploadAndSend = async () => {
    setPhase("uploading");
    try {
      const fd = new FormData();
      fd.append("file", videoBlob, `cs_${data.plate}_${Date.now()}.webm`);
      fd.append("upload_preset", CLOUDINARY_PRESET);
      const upRes  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`,{method:"POST",body:fd});
      const upData = await upRes.json();
      if (!upData.secure_url) {
        const msg = upData.error?.message||"Upload ไม่สำเร็จ";
        if (msg.includes("Unknown API key")||msg.includes("api_key"))
          throw new Error("Upload Preset ยังไม่ถูกต้อง\ncloudinary.com → Settings → Upload Presets\n→ cockpit_unsigned → Signing Mode: Unsigned → Save");
        throw new Error(msg);
      }
      await callAPI("POST",`/api/branch/${branchId}/bay/${qNo}/send-video`,{videoUrl:upData.secure_url,plate:data.plate});
      await callAPI("PATCH",`/api/branch/${branchId}/bay/${qNo}/job/${jobIdx}`,{status:"done"});
      setPhase("done"); setTimeout(()=>{onSuccess();onClose();},2000);
    } catch(e) { setError(e.message); setPhase("error"); }
  };

  const pct = Math.round((timer/MAX_SEC)*100);

  // Shared camera view (video)
  const CameraView = ({showSwitchBtn=false}) => (
    <div style={{position:"relative",borderRadius:14,overflow:"hidden",
      background:"#000",aspectRatio:"9/16",maxHeight:"58vh",marginBottom:10}}>
      <video ref={videoRef} autoPlay muted playsInline
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      {/* Camera switch button */}
      {showSwitchBtn && (
        <button onClick={switchCamera}
          style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,0.6)",
            border:"none",borderRadius:20,padding:"6px 12px",color:"#fff",
            fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
          🔄 {facingMode==="environment" ? "สลับกล้องหน้า" : "สลับกล้องหลัง"}
        </button>
      )}
    </div>
  );

  return (
    <>
    {/* Hidden canvas for recording composition */}
    <canvas ref={canvasRef} style={{display:"none"}}/>
    <video ref={videoRef} autoPlay muted playsInline style={{display:"none"}}/>

    <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.95)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:380}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontSize:11,color:"#FFE000",fontWeight:800,letterSpacing:"1.5px"}}>COCKPITSURE</div>
            <div style={{fontSize:20,color:"#fff",fontWeight:900}}>{data.plate}</div>
            <div style={{fontSize:11,color:"#6b7280"}}>บันทึกวีดีโอส่งลูกค้าก่อนปิดงาน</div>
          </div>
          {["intro","error"].includes(phase) && (
            <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",border:"none",
              borderRadius:8,padding:"6px 14px",color:"#ccc",fontSize:13,cursor:"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif"}}>ยกเลิก</button>
          )}
        </div>

        {/* INTRO */}
        {phase==="intro" && (
          <div style={{background:"#1a1a1a",borderRadius:16,padding:24,textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:10}}>🎥</div>
            <div style={{fontSize:14,color:"#9ca3af",marginBottom:18,lineHeight:1.7}}>
              บันทึกวีดีโอผลงาน CockpitSure<br/>
              พร้อมเฟรมโลโก้อัตโนมัติ<br/>
              <span style={{color:"#6b7280",fontSize:12}}>⏱ สูงสุด {MAX_SEC} วินาที</span>
            </div>
            <button onClick={()=>openCamera()} style={{width:"100%",padding:"15px",borderRadius:12,
              border:"none",background:"#FFE000",color:"#1A1A1A",fontSize:16,fontWeight:900,
              cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>
              📷 เปิดกล้อง
            </button>
          </div>
        )}

        {/* READY */}
        {phase==="ready" && (
          <div>
            {/* Live preview with frame - CSS overlay */}
            <div style={{position:"relative",borderRadius:14,overflow:"hidden",
              background:"#000",aspectRatio:"9/16",maxHeight:"58vh",marginBottom:10}}>
              <video ref={null} autoPlay muted playsInline
                style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                ref={videoRef}/>
              {/* Camera switch */}
              <button onClick={switchCamera} style={{position:"absolute",top:10,left:10,
                background:"rgba(0,0,0,0.65)",border:"none",borderRadius:20,
                padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                🔄 {facingMode==="environment"?"กล้องหน้า":"กล้องหลัง"}
              </button>
            </div>
            <button onClick={startRec} style={{width:"100%",padding:"15px",borderRadius:12,
              border:"none",background:"#dc2626",color:"#fff",fontSize:16,fontWeight:900,
              cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>
              ⏺ เริ่มบันทึก
            </button>
          </div>
        )}

        {/* RECORDING */}
        {phase==="recording" && (
          <div>
            {/* Canvas output (shows composited video+frame) */}
            <div style={{position:"relative",borderRadius:14,overflow:"hidden",
              background:"#000",aspectRatio:"9/16",maxHeight:"52vh",marginBottom:8}}>
              <canvas ref={canvasRef}
                style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>
              <video ref={videoRef} autoPlay muted playsInline style={{display:"none"}}/>
              {/* REC badge */}
              <div style={{position:"absolute",top:10,right:10,
                background:paused?"#d97706":"#dc2626",color:"#fff",
                borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:800,
                display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:"#fff",
                  animation:paused?"none":"blink 1s infinite",display:"inline-block"}}/>
                {paused ? "⏸" : `⏺ ${timer}s`}
              </div>
              {paused && (
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:52}}>⏸</div>
              )}
            </div>
            {/* Progress bar */}
            <div style={{background:"#374151",borderRadius:99,height:4,marginBottom:6}}>
              <div style={{background:paused?"#d97706":"#dc2626",borderRadius:99,height:4,
                width:`${pct}%`,transition:paused?"none":"width 1s linear"}}/>
            </div>
            <div style={{fontSize:10,color:"#9ca3af",marginBottom:8,textAlign:"center"}}>
              {paused ? `⏸ หยุดชั่วคราว ${timer}s/${MAX_SEC}s` : `⏺ ${timer}s / ${MAX_SEC}s`}
            </div>
            <div style={{display:"flex",gap:7}}>
              {!paused
                ? <button onClick={handlePause} style={{flex:1,padding:"11px",borderRadius:10,border:"none",
                    background:"#d97706",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",
                    fontFamily:"'Noto Sans Thai',sans-serif"}}>⏸ หยุดชั่วคราว</button>
                : <button onClick={handleResume} style={{flex:1,padding:"11px",borderRadius:10,border:"none",
                    background:"#2563eb",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",
                    fontFamily:"'Noto Sans Thai',sans-serif"}}>▶ บันทึกต่อ</button>
              }
              <button onClick={handleFinish} style={{flex:1,padding:"11px",borderRadius:10,border:"none",
                background:"#059669",color:"#fff",fontSize:13,fontWeight:900,cursor:"pointer",
                fontFamily:"'Noto Sans Thai',sans-serif"}}>✅ เสร็จสิ้น</button>
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {phase==="preview" && (
          <div>
            <div style={{borderRadius:14,overflow:"hidden",marginBottom:10,
              background:"#000",aspectRatio:"9/16",maxHeight:"55vh"}}>
              <video ref={previewRef} src={previewUrl} controls playsInline
                style={{width:"100%",height:"100%",objectFit:"contain"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setVideoBlob(null);setPhase("intro");}}
                style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid #4b5563",
                  background:"transparent",color:"#fff",fontSize:13,fontWeight:700,
                  cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>🔄 ถ่ายใหม่</button>
              <button onClick={uploadAndSend} style={{flex:2,padding:"12px",borderRadius:10,
                border:"none",background:"#059669",color:"#fff",fontSize:13,fontWeight:900,
                cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>📤 ส่ง LINE ลูกค้า</button>
            </div>
          </div>
        )}

        {/* UPLOADING */}
        {phase==="uploading" && (
          <div style={{background:"#1a1a1a",borderRadius:16,padding:32,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:10}}>📤</div>
            <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:6}}>กำลังส่งวีดีโอ...</div>
            <div style={{fontSize:12,color:"#9ca3af",marginBottom:14}}>อัปโหลดและส่ง LINE ให้ลูกค้า</div>
            <div style={{height:4,background:"#374151",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:4,background:"#FFE000",borderRadius:99,width:"60%",
                animation:"slideRight 1.2s ease-in-out infinite"}}/>
            </div>
          </div>
        )}

        {/* DONE */}
        {phase==="done" && (
          <div style={{background:"#064e3b",borderRadius:16,padding:32,textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:10}}>✅</div>
            <div style={{fontSize:17,fontWeight:900,color:"#34d399",marginBottom:6}}>ส่งวีดีโอสำเร็จ!</div>
            <div style={{fontSize:13,color:"#6ee7b7"}}>LINE แจ้งลูกค้าแล้ว — กำลังปิดงาน...</div>
          </div>
        )}

        {/* ERROR */}
        {phase==="error" && (
          <div style={{background:"#1a1a1a",borderRadius:16,padding:22,textAlign:"center"}}>
            <div style={{fontSize:34,marginBottom:8}}>⚠️</div>
            <div style={{fontSize:12,color:"#fca5a5",marginBottom:14,lineHeight:1.7,whiteSpace:"pre-line"}}>{error}</div>
            <button onClick={()=>setPhase("intro")} style={{padding:"10px 28px",borderRadius:10,
              border:"none",background:"#FFE000",color:"#1A1A1A",fontSize:14,fontWeight:800,
              cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>ลองใหม่</button>
          </div>
        )}

      </div>
    </div>
    </>
  );
}


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
  const avail = JOB_TYPES.filter(t => !names.includes(t.name));
  const [sel, setSel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (j) => setSel(p => p.includes(j) ? p.filter(x=>x!==j) : [...p,j]);

  const submit = async () => {
    if (!sel.length) { setError("กรุณาเลือกอย่างน้อย 1 งาน"); return; }
    setLoading(true); setError("");
    try {
      const res = await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/addjobs`, { jobs: sel.map(j=>j.name||j) });
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
          ? <div style={{textAlign:"center",padding:"30px 0",color:"#9ca3af",fontSize:16}}>เพิ่มงานครบทุกประเภทแล้ว</div>
          : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {avail.map(job => (
                <button key={job.name} onClick={() => toggle(job)}
                  style={{padding:"10px 6px",borderRadius:10,textAlign:"center",minHeight:48,
                    border: sel.includes(job) ? "3px solid #1A1A1A" : "2px solid #e5e7eb",
                    background: sel.includes(job) ? "#FFE000" : "#f9fafb",
                    fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>
                  {sel.includes(job) ? "✅ " : ""}{job.name}
                  <div style={{fontSize:10,color:"#9ca3af",fontWeight:400,marginTop:2}}>{job.timeLabel}</div>
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
  const [busy, setBusy]       = useState(false);
  const [csModal, setCsModal] = useState(null); // { jobIdx } when open
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

  const handleToggle = (idx) => {
    const job = jobs[idx];
    // CockpitSure: open camera modal instead of direct toggle
    if (job.name === "CockpitSure" && job.status !== "done") {
      setCsModal({ jobIdx: idx });
      return;
    }
    run(async () => {
      const j = jobs[idx];
      const ns = j.status === "done" ? "waiting" : "done";
      await callAPI("PATCH", `/api/branch/${branchId}/bay/${qNo}/job/${idx}`, { status: ns });
      onRefresh();
    });
  };

  const handleCancelJob = (idx) => run(async () => {
    if (!window.confirm(`ยกเลิกงานนี้? (ไม่แจ้ง LINE ลูกค้า)`)) return;
    await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/removejob`, { jobIdx: idx, nonotify: true });
    onRefresh();
  });

  const handleCancelCar = async () => {
    if (!window.confirm(`ยกเลิกรถ ${data.plate}\nรถออกจากคิวโดยไม่แจ้ง LINE ลูกค้า\nยืนยัน?`)) return;
    setBusy(true);
    await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/close`, { nonotify: true });
    onRefresh();
    setBusy(false);
  };

  const handleClose = async () => {
    if (!window.confirm(`ยืนยันปิดงานรถ ${data.plate} ?`)) return;
    setBusy(true);
    await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/close`, {});
    onComplete(data.plate);
    setBusy(false);
  };

  return (
    <>
    <div style={{
      background:"#fff",borderRadius:12,marginBottom:6,overflow:"hidden",
      boxShadow: isIn ? "0 0 0 2px #059669" : "0 1px 6px rgba(0,0,0,0.08)",
      opacity: busy ? 0.75 : 1, transition:"opacity .2s",
      border: isIn ? "2px solid #059669" : "1px solid #e5e7eb"
    }}>
      {/* ── ROW 1: Info + Status + Buttons ── */}
      <div style={{
        background: isIn ? "#059669" : "#1A1A1A",
        padding:"7px 10px",
        display:"flex",alignItems:"center",gap:8,
      }}>
        {/* Queue badge */}
        <div style={{background:"#FFE000",borderRadius:6,minWidth:28,height:28,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:13,fontWeight:900,color:"#1A1A1A",flexShrink:0}}>
          {qNo}
        </div>

        {/* Plate + province + time */}
        <div style={{flexShrink:0}}>
          <div style={{fontSize:24,fontWeight:900,color:"#FFE000",letterSpacing:"0.04em",lineHeight:1}}>
            {data.plate}
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:1,display:"flex",gap:5}}>
            {data.province && <span>จ.{data.province}</span>}
            {data.startTime && <span style={{color:"rgba(255,224,0,.75)"}}>{getElapsed(data.startTime)}</span>}
          </div>
        </div>

        {/* Progress (inline) */}
        {real.length > 0 && (
          <div style={{flex:1,minWidth:60}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:9,color:"rgba(255,255,255,.5)",fontWeight:700}}>คืบหน้า</span>
              <span style={{fontSize:11,fontWeight:900,color:"#fff"}}>{prog}%</span>
            </div>
            <div style={{background:"rgba(255,255,255,.2)",borderRadius:99,height:5}}>
              <div style={{background:prog===100?"#fff":"#FFE000",borderRadius:99,height:5,
                width:`${prog}%`,transition:"width .4s"}}/>
            </div>
          </div>
        )}
        {real.length === 0 && <div style={{flex:1}}/>}

        {/* Status + cancel + action buttons */}
        <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
          <span style={{background: isWait?"#FFE000":"rgba(255,255,255,.18)",
            color: isWait?"#1A1A1A":"#fff",
            borderRadius:10,padding:"3px 8px",fontSize:11,fontWeight:800}}>
            {isWait?"⏳ รอ":"🔧 ซ่อม"}
          </span>

          <button onClick={() => onAddJobs(String(qNo))}
            style={{padding:"4px 8px",borderRadius:7,border:"1.5px solid rgba(255,255,255,.3)",
              background:"transparent",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif"}}>
            ➕
          </button>

          {isWait && real.length > 0 && (
            <button onClick={handleStart} disabled={busy}
              style={{padding:"4px 10px",borderRadius:7,border:"none",
                background:"#FFE000",color:"#1A1A1A",fontSize:11,fontWeight:800,cursor:"pointer",
                fontFamily:"'Noto Sans Thai',sans-serif"}}>
              ▶ เริ่ม
            </button>
          )}
          {isIn && (
            <button onClick={handleClose} disabled={busy}
              style={{padding:"4px 10px",borderRadius:7,border:"none",
                background:"#fff",color:"#059669",fontSize:11,fontWeight:900,cursor:"pointer",
                fontFamily:"'Noto Sans Thai',sans-serif"}}>
              ✓ เสร็จ
            </button>
          )}
          <button onClick={handleCancelCar} disabled={busy}
            title="ยกเลิกรถ — ไม่แจ้ง LINE"
            style={{padding:"4px 8px",borderRadius:7,border:"none",
              background:"#dc2626",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif",opacity:busy?0.5:1}}>
            🚫
          </button>
        </div>
      </div>

      {/* ── ROW 2: Jobs inline ── */}
      {real.length > 0 ? (
        <div style={{padding:"4px 10px 5px",display:"flex",flexWrap:"wrap",gap:4,alignItems:"center",
          background:"#fafafa",borderTop:"1px solid #f0f0f0"}}>
          {real.map(job => (
            <div key={job.idx} style={{
              display:"flex",alignItems:"center",gap:3,
              background: job.status==="done"?"#d1fae5":job.status==="in_progress"?"#fef3c7":"#f3f4f6",
              borderRadius:6,padding:"3px 6px 3px 8px",
              border: job.status==="in_progress"?"1.5px solid #d97706":"1px solid transparent"
            }}>
              <span style={{fontSize:11}}>
                {job.status==="done"?"✅":job.status==="in_progress"?"🔧":"⏳"}
              </span>
              <button
                onClick={() => isIn && !busy && handleToggle(job.idx)}
                style={{fontSize:12,fontWeight:700,background:"none",border:"none",padding:0,
                  cursor: isIn?"pointer":"default",fontFamily:"'Noto Sans Thai',sans-serif",
                  color:job.status==="done"?"#6b7280":"#1A1A1A",
                  textDecoration:job.status==="done"?"line-through":"none"}}>
                {job.name}
              </button>
              <span style={{fontSize:10,color:"#9ca3af"}}>{job.duration}น.</span>
              <button onClick={() => !busy && handleCancelJob(job.idx)}
                style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",
                  fontSize:11,fontWeight:900,padding:"0 2px",lineHeight:1}}>✕</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{padding:"4px 10px 5px",background:"#fafafa",
          borderTop:"1px solid #f0f0f0",fontSize:11,color:"#9ca3af",fontStyle:"italic"}}>
          ยังไม่มีรายการงาน — กด ➕ เพิ่มงาน
        </div>
      )}
    </div>
    {csModal && (
      <CockpitSureModal
        qNo={qNo} branchId={branchId} data={data}
        jobIdx={csModal.jobIdx}
        onClose={() => setCsModal(null)}
        onSuccess={() => { setCsModal(null); onRefresh(); }}
      />
    )}
    </>
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
    <div style={{paddingBottom:80}}>

      {/* Branch selector dropdown */}
      {branches.length > 0 && (
        <div style={{padding:"6px 12px 2px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,fontWeight:700,color:"#6b7280",flexShrink:0}}>📍 สาขา:</span>
          <select
            value={branchId||""}
            onChange={e => setBranchId(e.target.value)}
            style={{flex:1,padding:"5px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",
              fontSize:13,fontWeight:700,fontFamily:"'Noto Sans Thai',sans-serif",
              background:"#fff",cursor:"pointer",outline:"none"}}>
            {branches.map(b => (
              <option key={b.branchId} value={b.branchId}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{padding:"4px 12px 2px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#374151"}}>📍 {branchName}</div>
        <button onClick={fetch_} style={{background:"none",border:"1px solid #d1d5db",borderRadius:6,
          padding:"3px 8px",fontSize:12,fontWeight:700,cursor:"pointer",color:"#6b7280",
          fontFamily:"'Noto Sans Thai',sans-serif"}}>🔄 รีเฟรช</button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,padding:"4px 12px 6px"}}>
        {[
          {label:"คิวทั้งหมด",value:total,bg:"#FFE000",color:"#1A1A1A"},
          {label:"เริ่มทำแล้ว",value:inSrv,bg:"#059669",color:"#fff"},
          {label:"รออีก",value:wait,bg:"#d97706",color:"#fff"},
        ].map(s => (
          <div key={s.label} style={{background:s.bg,borderRadius:10,padding:"6px 4px",textAlign:"center"}}>
            <div style={{fontSize:26,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:11,fontWeight:700,color:s.color,opacity:.9,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{textAlign:"center",padding:40,fontSize:16,color:"#9ca3af"}}>⏳ กำลังโหลด...</div>}
      {!loading && total===0 && (
        <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>
          <div style={{fontSize:48,marginBottom:12}}>🅿️</div>
          <div style={{fontSize:16,fontWeight:700}}>ยังไม่มีรถในคิว</div>
          <div style={{fontSize:13,marginTop:6}}>กดปุ่ม + ด้านล่างเพื่อเพิ่มรถ</div>
        </div>
      )}

      <div style={{padding:"0 8px"}}>
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
          position:"fixed",bottom:76,right:16,
          width:52,height:52,borderRadius:26,
          background:"#FFE000",border:"none",fontSize:26,cursor:"pointer",zIndex:50,
          boxShadow:"0 3px 14px rgba(0,0,0,.3)",display:"flex",alignItems:"center",
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
// ─── History View ─────────────────────────────────────────────────────────────
function HistoryView() {
  const [overview, setOverview] = useState([]);
  const [selBranch, setSelBranch] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detLoad, setDetLoad] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/admin/overview`).then(r=>r.json()).then(d=>{
      setOverview(d.overview||[]);
      if (d.overview?.length) loadHistory(d.overview[0].branchId);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  const loadHistory = async (id) => {
    setSelBranch(id); setDetLoad(true);
    try {
      const r = await fetch(`${API}/api/branch/${id}/history?limit=100`);
      const d = await r.json();
      setHistory(d.history||[]);
    } catch {}
    setDetLoad(false);
  };

  // Stats from history
  const totalJobs = history.reduce((a,h)=>(a+(h.jobs||[]).filter(j=>j.name!=="รับรถเข้า").length),0);
  const jobCounts = {};
  history.forEach(h=>(h.jobs||[]).filter(j=>j.name!=="รับรถเข้า").forEach(j=>{jobCounts[j.name]=(jobCounts[j.name]||0)+1;}));
  const topJobs = Object.entries(jobCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>⏳ กำลังโหลด...</div>;

  return (
    <div style={{padding:"8px 12px",paddingBottom:40}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:12,fontWeight:700,color:"#6b7280"}}>📍 สาขา:</span>
        <select value={selBranch||""} onChange={e=>loadHistory(e.target.value)}
          style={{padding:"5px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",
            fontSize:13,fontWeight:700,fontFamily:"'Noto Sans Thai',sans-serif",
            background:"#fff",cursor:"pointer",outline:"none"}}>
          {overview.map(b=><option key={b.branchId} value={b.branchId}>{b.name}</option>)}
        </select>
        <button onClick={()=>selBranch&&loadHistory(selBranch)} style={{
          padding:"5px 12px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",
          fontSize:12,fontWeight:700,cursor:"pointer",color:"#6b7280",fontFamily:"'Noto Sans Thai',sans-serif"}}>
          🔄
        </button>
        <span style={{fontSize:12,color:"#9ca3af"}}>{history.length} รายการ</span>
      </div>

      {/* Summary stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
        {[
          {v:history.length,l:"ทั้งหมด",bg:"#FFE000",c:"#1A1A1A"},
          {v:totalJobs,l:"งานทั้งหมด",bg:"#1A1A1A",c:"#FFE000"},
          {v:topJobs[0]?topJobs[0][0]:"-",l:"งานยอดนิยม",bg:"#059669",c:"#fff"},
          {v:topJobs[0]?topJobs[0][1]:0,l:"ครั้ง",bg:"#d97706",c:"#fff"},
        ].map(s=>(
          <div key={s.l} style={{background:s.bg,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
            <div style={{fontSize:s.l==="งานยอดนิยม"?11:20,fontWeight:900,color:s.c,lineHeight:1.2}}>{s.v}</div>
            <div style={{fontSize:10,fontWeight:700,color:s.c,opacity:.85,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Top jobs */}
      {topJobs.length > 0 && (
        <div style={{background:"#1A1A1A",borderRadius:8,padding:"10px 12px",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:800,color:"#FFE000",marginBottom:8}}>งานที่ทำบ่อย</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {topJobs.map(([name,count])=>(
              <div key={name} style={{background:"#2a2a2a",borderRadius:6,padding:"4px 10px",
                fontSize:12,fontWeight:700,color:"#fff"}}>
                {name} <span style={{color:"#FFE000"}}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History table */}
      {detLoad ? (
        <div style={{textAlign:"center",padding:30,color:"#9ca3af"}}>⏳ โหลดประวัติ...</div>
      ) : (
        <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #e5e7eb"}}>
          <div style={{display:"grid",gridTemplateColumns:"60px 100px 80px 1fr 80px",
            background:"#1A1A1A",padding:"6px 10px",gap:8}}>
            {["วันที่","ทะเบียน","จังหวัด","งานที่ทำ","เวลาปิด"].map(h=>(
              <div key={h} style={{fontSize:10,fontWeight:800,color:"#FFE000"}}>{h}</div>
            ))}
          </div>
          {history.length === 0 && (
            <div style={{textAlign:"center",padding:30,color:"#9ca3af",fontSize:14}}>ยังไม่มีประวัติ</div>
          )}
          {history.slice(0,50).map((h,i) => {
            const realJobs = (h.jobs||[]).filter(j=>j.name!=="รับรถเข้า");
            const closedDate = h.closedAt ? new Date(h.closedAt).toLocaleDateString("th-TH",{day:"2-digit",month:"2-digit"}) : "-";
            const closedTime = h.closedAt ? new Date(h.closedAt).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"}) : "-";
            return (
              <div key={i} style={{display:"grid",gridTemplateColumns:"60px 100px 80px 1fr 80px",
                padding:"5px 10px",gap:8,alignItems:"center",
                borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f9fafb"}}>
                <div style={{fontSize:10,color:"#9ca3af"}}>{closedDate}</div>
                <div style={{fontSize:13,fontWeight:900,color:"#1A1A1A"}}>{h.plate}</div>
                <div style={{fontSize:10,color:"#6b7280"}}>{h.province||"-"}</div>
                <div style={{fontSize:10,color:"#374151",lineHeight:1.5}}>
                  {realJobs.map(j=>j.name).join(" • ") || "-"}
                </div>
                <div style={{fontSize:10,color:"#9ca3af"}}>{closedTime}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Admin View (TV horizontal rows) ─────────────────────────────────────────
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

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>⏳</div>;
  if (!overview.length) return <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>ไม่พบสาขา</div>;

  const cars = Object.entries(detail?.baysData||{}).sort((a,b)=>parseInt(a[0])-parseInt(b[0]));
  const total = cars.length;
  const inSrv = cars.filter(([,c])=>c.bayStatus==="in_service").length;
  const wait  = cars.filter(([,c])=>c.bayStatus==="waiting_entry").length;
  const done  = cars.filter(([,c])=>getProgress(c.jobs)===100).length;

  return (
    <div style={{background:"#0f1117",minHeight:"calc(100vh - 110px)",display:"flex",flexDirection:"column"}}>
      {/* Top bar */}
      <div style={{background:"#1A1A1A",borderBottom:"2px solid #FFE000",padding:"6px 14px",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:10,fontWeight:800,color:"#FFE000",letterSpacing:"1.5px",textTransform:"uppercase"}}>
            ข้อมูลการใช้บริการ
          </div>
          <div style={{fontSize:14,fontWeight:900,color:"#fff"}}>{detail?.name||"..."}</div>
        </div>
        {/* Branch dropdown */}
        <select value={selBranch||""} onChange={e=>selectBranch(e.target.value)}
          style={{padding:"4px 10px",borderRadius:8,border:"1px solid #444",background:"#2a2a2a",
            color:"#fff",fontSize:12,fontWeight:700,fontFamily:"'Noto Sans Thai',sans-serif",cursor:"pointer",outline:"none"}}>
          {overview.map(b=><option key={b.branchId} value={b.branchId}>{b.name}</option>)}
        </select>
        {/* Stats */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {[{v:total,l:"ทั้งหมด",bg:"#FFE000",c:"#1A1A1A"},{v:inSrv,l:"ซ่อมอยู่",bg:"#059669",c:"#fff"},
            {v:wait,l:"รอคิว",bg:"#d97706",c:"#fff"},{v:done,l:"เสร็จ",bg:"#374151",c:"#fff"}
          ].map(s=>(
            <div key={s.l} style={{background:s.bg,borderRadius:6,padding:"3px 10px",textAlign:"center",minWidth:44}}>
              <div style={{fontSize:16,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:9,fontWeight:700,color:s.c,opacity:.85}}>{s.l}</div>
            </div>
          ))}
          <span style={{fontSize:10,color:"#6b7280"}}>🔄 {lastUpdate}</span>
          <button onClick={refresh} style={{background:"rgba(255,255,255,0.08)",border:"1px solid #444",
            borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",color:"#ccc",
            fontFamily:"'Noto Sans Thai',sans-serif"}}>รีเฟรช</button>
        </div>
      </div>

      {/* Table - scrollable container for mobile */}
      <div style={{flex:1,overflowX:"auto",overflowY:"auto"}}>
        {/* Table header */}
        <div style={{display:"grid",
          gridTemplateColumns:"32px 100px 56px 62px 58px 80px 1fr",
          minWidth:"520px",
          gap:0,background:"#1A1A1A",padding:"5px 10px",alignItems:"center",
          position:"sticky",top:0,zIndex:10}}>
          {["#","ทะเบียน","จ.","สถานะ","เวลา","คืบหน้า","รายการงาน"].map(h=>(
            <div key={h} style={{fontSize:10,fontWeight:800,color:"#FFE000",padding:"0 3px",whiteSpace:"nowrap"}}>{h}</div>
          ))}
        </div>

        {/* Queue rows */}
        {detLoad && <div style={{textAlign:"center",padding:20,color:"#9ca3af",minWidth:"520px"}}>⏳</div>}
        {!detLoad && cars.length===0 && (
          <div style={{textAlign:"center",padding:30,color:"#6b7280",fontSize:14,minWidth:"520px"}}>ไม่มีรถในคิว</div>
        )}
        {!detLoad && cars.map(([qNo,car],idx) => {
          const real = (car.jobs||[]).filter(j=>j.name!=="รับรถเข้า");
          const prog = getProgress(car.jobs);
          const isIn = car.bayStatus==="in_service";
          const isDone = prog===100 && real.length>0;
          const elapsed = getElapsed(car.startTime);
          const rowBg = isDone?"#0a1a0a":isIn?"#0d1a0d":"#0a0a1a";
          const borderColor = isDone?"#059669":isIn?"#22c55e":"#2a2a3a";
          // Abbreviate province
          const prov = (car.province||"").replace("กรุงเทพมหานคร","กทม.").replace("มหานคร","").slice(0,6);
          return (
            <div key={qNo} style={{
              display:"grid",
              gridTemplateColumns:"32px 100px 56px 62px 58px 80px 1fr",
              minWidth:"520px",
              gap:0,padding:"5px 10px",alignItems:"center",
              background:rowBg,
              borderBottom:`1px solid ${borderColor}`,
              minHeight:42,
            }}>
              {/* Queue # */}
              <div style={{background:"#FFE000",borderRadius:5,width:24,height:24,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:900,color:"#1A1A1A"}}>{qNo}</div>
              {/* Plate */}
              <div style={{fontSize:18,fontWeight:900,color:"#FFE000",letterSpacing:"0.03em",lineHeight:1,padding:"0 2px"}}>
                {car.plate}
              </div>
              {/* Province - abbreviated */}
              <div style={{fontSize:10,color:"#9ca3af",padding:"0 2px",overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {prov||"-"}
              </div>
              {/* Status */}
              <div style={{padding:"0 2px"}}>
                <span style={{
                  background:isDone?"#059669":isIn?"#166534":"#d97706",
                  color:"#fff",borderRadius:5,padding:"2px 5px",
                  fontSize:10,fontWeight:800,whiteSpace:"nowrap"
                }}>
                  {isDone?"✅เสร็จ":isIn?"🔧ซ่อม":"⏳รอ"}
                </span>
              </div>
              {/* Elapsed */}
              <div style={{fontSize:11,fontWeight:700,color:elapsed?"#FFE000":"#4b5563",padding:"0 2px",whiteSpace:"nowrap"}}>
                {elapsed||"-"}
              </div>
              {/* Progress */}
              <div style={{padding:"0 4px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:9,color:"#9ca3af"}}>{real.length}งาน</span>
                  <span style={{fontSize:10,fontWeight:900,color:"#fff"}}>{prog}%</span>
                </div>
                <div style={{background:"#374151",borderRadius:99,height:5}}>
                  <div style={{background:isDone?"#059669":"#FFE000",borderRadius:99,height:5,width:`${prog}%`}}/>
                </div>
              </div>
              {/* Jobs */}
              <div style={{display:"flex",flexWrap:"wrap",gap:3,padding:"0 4px"}}>
                {real.length===0 ? (
                  <span style={{fontSize:10,color:"#4b5563",fontStyle:"italic"}}>รอเพิ่มงาน</span>
                ) : real.map((job,ji)=>(
                  <span key={ji} style={{
                    fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,
                    background:job.status==="done"?"#064e3b":job.status==="in_progress"?"#78350f":"#1f2937",
                    color:job.status==="done"?"#34d399":job.status==="in_progress"?"#fbbf24":"#9ca3af",
                    textDecoration:job.status==="done"?"line-through":"none"
                  }}>{job.name}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function App() {
  const [tab, setTab] = useState("staff");
  return (
    <div style={{fontFamily:"'Noto Sans Thai',sans-serif",background:"#F2F2EE",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;} body{margin:0;padding:0;}
        button,input{font-family:'Noto Sans Thai',sans-serif;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideRight{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
      `}</style>

      {/* Sticky header */}
      <div style={{background:"#1A1A1A",padding:"14px 16px 0",position:"sticky",top:0,zIndex:40,
        boxShadow:"0 2px 16px rgba(0,0,0,.5)"}}>
        <div style={{marginBottom:14}}><CockpitLogo height={44}/></div>
        <div style={{display:"flex"}}>
          {[{key:"staff",label:"👨‍🔧 พนักงาน"},{key:"admin",label:"📺 ข้อมูลการใช้บริการ"},{key:"history",label:"📊 สถิติ"}].map(t => (
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

      <div>{tab === "staff" ? <StaffView/> : tab === "admin" ? <AdminView/> : <HistoryView/>}</div>
    </div>
  );
}
