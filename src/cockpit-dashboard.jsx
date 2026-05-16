import { useState, useEffect, useCallback, useRef } from "react";

// ── Cloudinary Config ─────────────────────────────────────────────────────────
// ⚠️ เปลี่ยนค่านี้เป็น Cloud Name ของคุณ (จาก cloudinary.com → Dashboard)
const CLOUDINARY_CLOUD  = "dnmzyoobh";
const CLOUDINARY_PRESET = "cockpit_unsigned";

// CockpitSure video frame overlay (transparent center)
const COCKPITSURE_FRAME =
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

    const frameImg = new Image();
    frameImg.src = COCKPITSURE_FRAME;

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

  // Shared camera view (video + frame overlay via CSS)
  const CameraView = ({showSwitchBtn=false}) => (
    <div style={{position:"relative",borderRadius:14,overflow:"hidden",
      background:"#000",aspectRatio:"9/16",maxHeight:"58vh",marginBottom:10}}>
      <video ref={videoRef} autoPlay muted playsInline
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      {/* Frame overlay via CSS - transparent center shows video */}
      <img src={COCKPITSURE_FRAME} alt=""
        style={{position:"absolute",inset:0,width:"100%",height:"100%",
          objectFit:"fill",pointerEvents:"none"}}/>
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
              <img src={COCKPITSURE_FRAME} alt="" style={{position:"absolute",inset:0,
                width:"100%",height:"100%",objectFit:"fill",pointerEvents:"none"}}/>
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
