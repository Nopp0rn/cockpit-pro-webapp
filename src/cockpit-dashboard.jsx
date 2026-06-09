import { useState, useEffect, useCallback, useRef } from "react";

// ── Cloudinary Config ─────────────────────────────────────────────────────────
// ⚠️ เปลี่ยนค่านี้เป็น Cloud Name ของคุณ (จาก cloudinary.com → Dashboard)
const CLOUDINARY_CLOUD  = "dd7fg1swh";
const CLOUDINARY_PRESET = "cockpit_unsigned_v2";
const frameOverlay = new Image();
frameOverlay.src = "/frame-overlay.png";

const API = "https://cockpit-pro-backend.onrender.com";
const JOB_TYPES = [
  {name:"เปลี่ยนยาง 4 เส้น", duration:52, timeLabel:"45-60 นาที"},
  {name:"สลับยาง", duration:12, timeLabel:"10-15 นาที"},
  {name:"ยาง 1,2,3 เส้น", duration:20, timeLabel:"15-25 นาที"},
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
const PROVINCES = ["กระบี่","กรุงเทพมหานคร","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี","อื่นๆ"];

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
  try {
    const r = await fetch(`${API}${path}`, {
      method, headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    try { return await r.json(); }
    catch { return { error: `Server error (${r.status})` }; }
  } catch(e) {
    return { error: e.message || "Network error" };
  }
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
  const [phase, setPhase]           = useState("intro");
  const [stream, setStream]         = useState(null);
  const [recorder, setRecorder]     = useState(null);
  const [paused, setPaused]         = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [videoBlob, setVideoBlob]   = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [timer, setTimer]           = useState(0);
  const [error, setError]           = useState("");

  const videoRef   = useRef(null);
  const previewRef = useRef(null);
  const canvasRef  = useRef(null);
  const timerRef   = useRef(null);
  const chunksRef  = useRef([]);
  const animRef    = useRef(null);
  const streamRef  = useRef(null); // track current stream for canvas draw
  const MAX_SEC    = 120;

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(timerRef.current);
    if (animRef.current) {
      if (typeof animRef.current === "number") cancelAnimationFrame(animRef.current);
      else if (animRef.current.stop) animRef.current.stop();
    }
  }, []);

  // ── Open camera (initial) ────────────────────────────────────
  const openCamera = async (facing) => {
    const f = facing ?? facingMode;
    streamRef.current?.getTracks().forEach(t => t.stop());

    // ตรวจ LINE in-app browser บน iOS
    const ua = navigator.userAgent || "";
    const isLineBrowser = /Line\//.test(ua) || /LIFF/.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua);

    if (isLineBrowser && isIOS) {
      setError(
        "กล้องไม่รองรับใน LINE Browser\n\n" +
        "กรุณาเปิดในเบราว์เซอร์ Safari:\n" +
        "กด ··· มุมขวาบน → เปิดใน Browser"
      );
      setPhase("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser นี้ไม่รองรับกล้อง\nกรุณาเปิดใน Safari หรือ Chrome");
      setPhase("error");
      return;
    }

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: f, width:{ideal:1280}, height:{ideal:720} },
        audio: true
      });
      streamRef.current = s;
      setPhase("ready");   // render video element ก่อน
      // delay เพื่อให้ video element mount แล้วค่อย set stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setStream(s);
      }, 100);
    } catch(e) {
      const msg = e.name === "NotAllowedError"
        ? "ไม่ได้รับอนุญาตใช้กล้อง\nกรุณาไปที่ Settings → Safari → กล้อง → อนุญาต"
        : e.name === "NotFoundError"
        ? "ไม่พบกล้องในอุปกรณ์นี้"
        : `เปิดกล้องไม่ได้: ${e.message}`;
      setError(msg);
      setPhase("error");
    }
  };

  // ── Switch camera (swap video track only — recorder keeps running) ──
  const switchCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    try {
      if (phase === "ready") {
        // ก่อนบันทึก: เปลี่ยน stream ทั้งหมด
        await openCamera(next);
      } else {
        // ระหว่างบันทึก: เปลี่ยนแค่ video track, recorder ยังทำงานต่อ
        const newVidStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: next, width:{ideal:1280}, height:{ideal:720} },
          audio: false
        });
        // หยุด video track เดิม
        streamRef.current?.getVideoTracks().forEach(t => t.stop());
        // ประกอบ stream ใหม่: video ใหม่ + audio เดิม
        const audioTracks = streamRef.current?.getAudioTracks() || [];
        const combined = new MediaStream([
          ...newVidStream.getVideoTracks(),
          ...audioTracks,
        ]);
        streamRef.current = combined;
        setStream(combined);
        // อัปเดต video element → canvas draw loop จะรับโดยอัตโนมัติ
        if (videoRef.current) {
          videoRef.current.srcObject = combined;
          videoRef.current.play().catch(()=>{});
        }
        // ไม่ต้อง reset recorder, timer, หรือ phase
      }
    } catch(e) {
      setError("สลับกล้องไม่สำเร็จ: " + e.message);
    }
  };

  // ── Start recording: canvas compositing (logo baked in) ─────────────────────
  // ใช้ canvas เพื่อ burn logo ลงวิดีโอโดยตรง
  // ป้องกัน Android freeze ด้วย resolution ต่ำ + bitrate limit + timeslice ยาว
  function startRec() {
    chunksRef.current = [];
    const stream = streamRef.current;
    if (!stream) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    // 720p portrait canvas (9:16) — getUserMedia ขอ landscape 1280×720 (iOS compatible)
    // drawLoop crop logic จะตัดกลางให้เป็น portrait โดยอัตโนมัติ
    canvas.width  = 720;   // 720p portrait width (9:16)
    canvas.height = 1280;  // 720p portrait height (9:16)


    // วาด Frame Cockpit Sure + Bridgestone

    function beginRecord() {
      // drawLoop: ทำงานตลอด — วาด video frame + logo ลง canvas ทุก rAF
      let firstFrameDrawn = false;
      let animFrameId = null;

      function drawLoop() {
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          const vW=video.videoWidth, vH=video.videoHeight;
          const cW=canvas.width, cH=canvas.height;
          const vA=vW/vH, cA=cW/cH;
          let sx=0,sy=0,sw=vW,sh=vH;
          if (vA>cA){ sw=vH*cA; sx=(vW-sw)/2; }
          else      { sh=vW/cA; sy=(vH-sh)/2; }
          ctx.clearRect(0,0,cW,cH);
          ctx.drawImage(video, sx,sy,sw,sh, 0,0,cW,cH);
          ctx.clearRect(0,0,cW,cH);

ctx.drawImage(
  video,
  sx,
  sy,
  sw,
  sh,
  0,
  0,
  cW,
  cH
);

try {

  if (
    frameOverlay &&
    frameOverlay.complete &&
    frameOverlay.naturalWidth > 0
  ) {

    ctx.drawImage(
      frameOverlay,
      0,
      0,
      cW,
      cH
    );

  }

} catch(e) {
  console.error(e);
}

firstFrameDrawn = true;
       }
        
        animFrameId = requestAnimationFrame(drawLoop);
      }
      animRef.current = { stop: () => { if (animFrameId) cancelAnimationFrame(animFrameId); } };
      drawLoop(); // เริ่ม draw loop ก่อน

      // รอจนกว่าจะวาดเฟรมแรกสำเร็จ แล้วค่อย captureStream + เริ่ม MediaRecorder
      function startAfterFirstFrame() {
        if (!firstFrameDrawn) {
          setTimeout(startAfterFirstFrame, 80); // ยังไม่ ready — รออีก 80ms
          return;
        }
        // canvas มีภาพแล้ว — safe to captureStream
        const canvasStream = canvas.captureStream(24); // 24fps
        stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));

        const bitsPerSecond = 500000; // 500kbps: ไฟล์เล็ก Upload เร็ว เสถียรทุกรุ่น
        const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=h264,aac")
          ? "video/mp4;codecs=h264,aac"
          : MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

        const options = { bitsPerSecond };
        if (mimeType) options.mimeType = mimeType;

        const mr = new MediaRecorder(canvasStream, options);
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => {
          if (animRef.current) animRef.current.stop();
          if (chunksRef.current.length === 0) return;
          const finalType = mr.mimeType || mimeType || "video/webm";
          const blob = new Blob(chunksRef.current, { type: finalType });
          setVideoBlob(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          streamRef.current?.getTracks().forEach(t => t.stop());
          setPhase("preview");
        };
        mr.start(500); // 500ms timeslice: chunk เร็วขึ้น RAM น้อย Android รุ่นเก่าเสถียร
        setRecorder(mr); setTimer(0); setPhase("recording"); setPaused(false);
        timerRef.current = setInterval(() => {
          setTimer(t => {
            if (t >= MAX_SEC - 1) { mr.stop(); clearInterval(timerRef.current); return MAX_SEC; }
            return t + 1;
          });
        }, 1000);
      }

      startAfterFirstFrame();
    }

    // รอโหลด logo ก่อนเริ่ม record
    let loaded = 0;
    function onLoaded() { loaded++; if (loaded >= 2) beginRecord(); }
    if (logoImg.complete) onLoaded(); else { logoImg.onload = onLoaded; logoImg.onerror = onLoaded; }
    if (bsImg.complete)   onLoaded(); else { bsImg.onload  = onLoaded; bsImg.onerror  = onLoaded; }
  }


  const handlePause = () => {
    if (!recorder || recorder.state!=="recording") return;
    recorder.pause(); setPaused(true); clearInterval(timerRef.current);
    // Android: ensure video preview stays alive
    if (videoRef.current) videoRef.current.play().catch(()=>{});
  };
  const handleResume = () => {
    if (!recorder || recorder.state!=="paused") return;
    recorder.resume(); setPaused(false);
    // Android: ensure video keeps playing
    if (videoRef.current) videoRef.current.play().catch(()=>{});
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if(t>=MAX_SEC-1){ recorder.stop(); clearInterval(timerRef.current); return MAX_SEC; }
        return t+1;
      });
    }, 1000);
  };
  const handleFinish = () => {
    if (recorder && recorder.state!=="inactive") recorder.stop();
    clearInterval(timerRef.current);
  };

  // ── Upload & send via LINE ────────────────────────────────────
  const uploadAndSend = async () => {
    setPhase("uploading");
    try {
      // ตรวจ blob ว่ามีข้อมูลจริง
      if (!videoBlob || videoBlob.size < 1000) {
        throw new Error("ไฟล์วีดีโอไม่สมบูรณ์ กรุณาบันทึกใหม่");
      }
      // แจ้ง size ถ้าใหญ่เกิน 200MB (Cloudinary free limit)
      if (videoBlob.size > 200 * 1024 * 1024) {
        throw new Error(`วีดีโอใหญ่เกินไป (${Math.round(videoBlob.size/1024/1024)}MB)\nกรุณาบันทึกให้สั้นลง`);
      }

      const ext = videoBlob.type.includes("mp4") ? "mp4"
        : videoBlob.type.includes("quicktime") ? "mov" : "webm";
      const filename = `cs_${data.plate}_${Date.now()}.${ext}`;

      // Upload พร้อม retry 3 ครั้ง
      let upData = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const fd = new FormData();
          fd.append("file", videoBlob, filename);
          fd.append("upload_preset", CLOUDINARY_PRESET);
          fd.append("resource_type", "video");
          fd.append("folder", "cockpit_sure");
          fd.append("quality", "auto");       // บีบอัดอัตโนมัติ: ไฟล์เล็กลง เปิดใน LINE เร็ว
          fd.append("fetch_format", "mp4");   // แปลงเป็น mp4 ทันทีหลัง upload
          const upRes = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`,
            { method: "POST", body: fd }
          );
          upData = await upRes.json();
          if (upData.secure_url) break; // success
          if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
        } catch (fetchErr) {
          if (attempt === 3) throw fetchErr;
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }

      // Inject f_mp4 transformation into Cloudinary URL for guaranteed MP4 delivery
      // This works regardless of source format (.webm, .mov, etc.)
      // and is served immediately (no waiting for async conversion like .webm→.mp4 rename)
      const videoUrl = upData?.secure_url
        ? upData.secure_url.replace('/upload/', '/upload/f_mp4/')
        : null;
      if (!videoUrl) {
        const msg = upData?.error?.message || "Upload ไม่สำเร็จ";
        if (msg.includes("Unknown API key") || msg.includes("api_key") || msg.includes("preset"))
          throw new Error("Upload Preset ยังไม่ถูกต้อง\ncloudinary.com → Settings\n→ Upload Presets → cockpit_unsigned\n→ Signing Mode: Unsigned → Save");
        throw new Error(msg);
      }

      // PATCH job เป็น done + ส่ง LINE พร้อมกัน (ลบ delay 500ms)
      await callAPI("PATCH", `/api/branch/${branchId}/bay/${qNo}/job/${jobIdx}`, { status: "done" });
      // ส่ง video link ทาง LINE (ไม่รอ delay — เร็วขึ้นทันที)
      await callAPI("POST", `/api/branch/${branchId}/bay/${qNo}/send-video`,
        { videoUrl, plate: data.plate });
      setPhase("done");
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } catch(e) { setError(e.message); setPhase("error"); }
  };

  const pct = Math.round((timer/MAX_SEC)*100);
  const isCameraActive = phase==="ready" || phase==="recording";

  return (
    <>
      <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.95)",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        padding:"12px 16px"}}>
        <div style={{width:"100%",maxWidth:380}}>

          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",
            alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:11,color:"#FFE000",fontWeight:800,letterSpacing:"1.5px"}}>
                COCKPITSURE
              </div>
              <div style={{fontSize:20,color:"#fff",fontWeight:900}}>{data.plate}</div>
              <div style={{fontSize:11,color:"#6b7280"}}>บันทึกวีดีโอส่งลูกค้าก่อนปิดงาน</div>
            </div>
            {["intro","error"].includes(phase) && (
              <button onClick={onClose}
                style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,
                  padding:"6px 14px",color:"#ccc",fontSize:13,cursor:"pointer",
                  fontFamily:"'Noto Sans Thai',sans-serif"}}>
                ยกเลิก
              </button>
            )}
          </div>

          {/* ── CAMERA VIEW (ready + recording) ── */}
          {isCameraActive && (
            <div>
              <div style={{position:"relative",borderRadius:14,overflow:"hidden",
                background:"#111",aspectRatio:"9/16",maxHeight:"54vh",marginBottom:8}}>

                {/* Live video */}
                <video ref={videoRef} autoPlay muted playsInline
                  webkit-playsinline="true"
                  style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>

                <img
  src="/frame-overlay.png"
  alt=""
  style={{
    position:"absolute",
    inset:0,
    width:"100%",
    height:"100%",
    objectFit:"cover",
    pointerEvents:"none",
    zIndex:5
  }}
/>
                
                {/* Canvas for recording — MUST be visible to browser (not display:none)
                    so canvas.captureStream() works on Android/iOS.
                    We position it far offscreen so user cannot see it. */}
                <canvas ref={canvasRef} style={{
                  position:"absolute", left:"-9999px", top:0,
                  width:"1px", height:"1px", pointerEvents:"none"
                }}/>
{/* Cockpit + Bridgestone Preview Overlay */}
<div
  style={{
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 15
  }}
>

  {/* COCKPIT */}
<img
  src={COCKPITSURE_LOGO}
  alt=""
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "44%",
    height: "auto",
    zIndex: 20
  }}
/>

{/* BRIDGESTONE */}
<img
  src={BRIDGESTONE_LOGO}
  alt=""
  style={{
    position: "absolute",
    bottom: 0,
    right: 0,
    width: "56%",
    height: "auto",
    zIndex: 20
  }}
/>
  
</div>
                {/* Camera switch — top-right, z-index above stripes */}
                {phase==="ready" && (
                  <button onClick={switchCamera} style={{
                    position:"absolute",top:"2%",right:"4%",zIndex:50,
                    background:"rgba(0,0,0,0.75)",border:"1px solid rgba(255,255,255,0.3)",
                    borderRadius:20,padding:"4px 10px",color:"#fff",
                    fontSize:11,fontWeight:700,cursor:"pointer",
                    display:"flex",alignItems:"center",gap:4}}>
                    🔄 {facingMode==="environment" ? "กล้องหน้า" : "กล้องหลัง"}
                  </button>
                )}

                {/* REC badge — center-top (หลีกโลโก้) */}
                {phase==="recording" && (
                  <div style={{position:"absolute",top:"2%",left:"50%",
                    transform:"translateX(-50%)",zIndex:20,
                    background:paused?"#d97706":"#dc2626",color:"#fff",
                    borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:800,
                    display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:"#fff",
                      display:"inline-block",
                      animation:paused?"none":"blink 1s infinite"}}/>
                    {paused ? `⏸ ${timer}s` : `⏺ ${timer}s`}
                  </div>
                )}

                {/* Pause overlay */}
                {phase==="recording" && paused && (
                  <div style={{position:"absolute",inset:0,zIndex:10,
                    background:"rgba(0,0,0,0.35)",display:"flex",
                    alignItems:"center",justifyContent:"center",fontSize:52}}>⏸</div>
                )}
              </div>

              {/* Progress bar */}
              {phase==="recording" && (
                <>
                  <div style={{background:"#374151",borderRadius:99,height:4,marginBottom:5}}>
                    <div style={{background:paused?"#d97706":"#dc2626",borderRadius:99,
                      height:4,width:`${pct}%`,
                      transition:paused?"none":"width 1s linear"}}/>
                  </div>
                  <div style={{fontSize:10,color:"#9ca3af",marginBottom:8,textAlign:"center"}}>
                    {paused ? `⏸ ${timer}s/${MAX_SEC}s — กด ▶ บันทึกต่อ`
                            : `⏺ ${timer}s / ${MAX_SEC}s`}
                  </div>
                </>
              )}

              {/* Action buttons */}
              {phase==="ready" && (
                <button onClick={startRec} style={{
                  width:"100%",padding:"14px",borderRadius:12,border:"none",
                  background:"#dc2626",color:"#fff",fontSize:15,fontWeight:900,
                  cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>
                  ⏺ เริ่มบันทึก
                </button>
              )}

              {phase==="recording" && (
                <div style={{display:"flex",gap:8}}>
                  {!paused
                    ? <button onClick={handlePause} style={{flex:1,padding:"12px",
                        borderRadius:10,border:"none",background:"#d97706",color:"#fff",
                        fontSize:13,fontWeight:800,cursor:"pointer",
                        fontFamily:"'Noto Sans Thai',sans-serif"}}>
                        ⏸ หยุดชั่วคราว
                      </button>
                    : <button onClick={handleResume} style={{flex:1,padding:"12px",
                        borderRadius:10,border:"none",background:"#2563eb",color:"#fff",
                        fontSize:13,fontWeight:800,cursor:"pointer",
                        fontFamily:"'Noto Sans Thai',sans-serif"}}>
                        ▶ บันทึกต่อ
                      </button>
                  }
                  <button onClick={handleFinish} style={{flex:1,padding:"12px",
                    borderRadius:10,border:"none",background:"#059669",color:"#fff",
                    fontSize:13,fontWeight:900,cursor:"pointer",
                    fontFamily:"'Noto Sans Thai',sans-serif"}}>
                    ✅ เสร็จสิ้น
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── INTRO ── */}
          {phase==="intro" && (
            <div style={{background:"#1a1a1a",borderRadius:16,padding:24,textAlign:"center"}}>
              <div style={{fontSize:52,marginBottom:10}}>🎥</div>
              <div style={{fontSize:14,color:"#9ca3af",marginBottom:18,lineHeight:1.7}}>
                บันทึกวีดีโอผลงาน CockpitSure<br/>
                พร้อมเฟรมโลโก้อัตโนมัติ<br/>
                <span style={{color:"#6b7280",fontSize:12}}>⏱ สูงสุด {MAX_SEC} วินาที</span>
              </div>
              <button onClick={()=>openCamera()} style={{width:"100%",padding:"15px",
                borderRadius:12,border:"none",background:"#FFE000",color:"#1A1A1A",
                fontSize:16,fontWeight:900,cursor:"pointer",
                fontFamily:"'Noto Sans Thai',sans-serif"}}>
                📷 เปิดกล้อง
              </button>
            </div>
          )}

          {/* ── PREVIEW ── */}
          {phase==="preview" && (
            <div>
              <div style={{borderRadius:14,overflow:"hidden",marginBottom:10,
                background:"#000",aspectRatio:"9/16",maxHeight:"54vh"}}>
                <video ref={previewRef} src={previewUrl} controls playsInline
                  webkit-playsinline="true"
                  style={{width:"100%",height:"100%",objectFit:"contain"}}/>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setVideoBlob(null);setPhase("intro");}}
                  style={{flex:1,padding:"12px",borderRadius:10,
                    border:"1.5px solid #4b5563",background:"transparent",
                    color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",
                    fontFamily:"'Noto Sans Thai',sans-serif"}}>
                  🔄 ถ่ายใหม่
                </button>
                <button onClick={uploadAndSend} style={{flex:2,padding:"12px",
                  borderRadius:10,border:"none",background:"#059669",color:"#fff",
                  fontSize:13,fontWeight:900,cursor:"pointer",
                  fontFamily:"'Noto Sans Thai',sans-serif"}}>
                  📤 ส่ง LINE ลูกค้า
                </button>
              </div>
            </div>
          )}

          {/* ── UPLOADING ── */}
          {phase==="uploading" && (
            <div style={{background:"#1a1a1a",borderRadius:16,padding:32,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:10}}>📤</div>
              <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:6}}>
                กำลังส่งวีดีโอ...
              </div>
              <div style={{fontSize:12,color:"#9ca3af",marginBottom:14}}>
                อัปโหลดและส่ง LINE ให้ลูกค้า
              </div>
              <div style={{height:4,background:"#374151",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:4,background:"#FFE000",borderRadius:99,width:"60%",
                  animation:"slideRight 1.2s ease-in-out infinite"}}/>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {phase==="done" && (
            <div style={{background:"#064e3b",borderRadius:16,padding:32,textAlign:"center"}}>
              <div style={{fontSize:52,marginBottom:10}}>✅</div>
              <div style={{fontSize:17,fontWeight:900,color:"#34d399",marginBottom:6}}>
                ส่งวีดีโอสำเร็จ!
              </div>
              <div style={{fontSize:13,color:"#6ee7b7"}}>
                LINE แจ้งลูกค้าแล้ว — กำลังปิดงาน...
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {phase==="error" && (
            <div style={{background:"#1a1a1a",borderRadius:16,padding:22,textAlign:"center"}}>
              <div style={{fontSize:34,marginBottom:8}}>⚠️</div>
              <div style={{fontSize:12,color:"#fca5a5",marginBottom:14,
                lineHeight:1.7,whiteSpace:"pre-line"}}>{error}</div>
              <button onClick={()=>setPhase("intro")} style={{
                padding:"10px 28px",borderRadius:10,border:"none",
                background:"#FFE000",color:"#1A1A1A",fontSize:14,fontWeight:800,
                cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>
                ลองใหม่
              </button>
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

// ─── Quotation Modal ──────────────────────────────────────────────────────────
function QuotationModal({ qNo, branchId, data, onClose }) {
  const [photos, setPhotos]   = useState([]); // [{ url, file }]
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const inputRef              = useRef(null);
  const MAX_PHOTOS            = 5;

  // Composite CockpitSure v8 frame onto photo before upload
  const compositeFrameOnPhoto = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const W = img.naturalWidth, H = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);

     // Load Overlay Frame
const overlay = new Image();

overlay.onload = () => {

  ctx.drawImage(
    overlay,
    0,
    0,
    W,
    H
  );

  canvas.toBlob(blob => {

    const compositeFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, ".jpg"),
      { type: "image/jpeg" }
    );

    resolve({
      file: compositeFile,
      url: URL.createObjectURL(compositeFile)
    });

  }, "image/jpeg", 0.92);

};

overlay.onerror = () => {

  resolve({
    file,
    url: URL.createObjectURL(file)
  });

};

overlay.src = "/frame-overlay.png"; 
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ file, url: URL.createObjectURL(file) }); };
    img.src = url;
  });

  const handleCapture = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = files.slice(0, remaining);
    e.target.value = "";
    const composited = await Promise.all(toProcess.map(f => compositeFrameOnPhoto(f)));
    setPhotos(prev => [...prev, ...composited]);
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadToCloudinary = async (file) => {
    // Composite v8 frame onto photo before upload
    const composited = await compositeFrameOnPhoto(file);
    const uploadFile = (composited && composited.file) ? composited.file : file;
    const fd = new FormData();
    fd.append("file",          uploadFile);
    fd.append("upload_preset", CLOUDINARY_PRESET);
    fd.append("folder",        "cockpit_quotes");
    const r = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: "POST", body: fd }
    );
    const d = await r.json();
    if (!d.secure_url) throw new Error("Upload failed");
    return d.secure_url;
  };

  const handleSend = async () => {
    if (!photos.length) { setError("กรุณาถ่ายรูปใบเสนอราคาก่อน"); return; }
    if (!data.userId)   { setError("ไม่พบ LINE ของลูกค้า"); return; }
    setLoading(true); setError("");
    try {
      // 1. Upload ทุกรูปไป Cloudinary
      const imageUrls = await Promise.all(photos.map(p => uploadToCloudinary(p.file)));

      // 2. ส่งไป backend → LINE
      const msg = `📋 ใบเสนอราคา\n🚗 ทะเบียน: ${data.plate}\n\nกรุณาตรวจสอบรายการงานและราคาด้านล่างนี้ครับ/ค่ะ 🙏`;
      const res = await callAPI("POST",
        `/api/branch/${branchId}/bay/${qNo}/quote`,
        { imageUrls, message: msg }
      );
      if (res.error) throw new Error(res.error);
      setSent(true);
    } catch(e) {
      setError("เกิดข้อผิดพลาด: " + e.message);
    }
    setLoading(false);
  };

  // ── Sent screen ──────────────────────────────────────────────────────────────
  if (sent) return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#fff",borderRadius:16,padding:32,textAlign:"center",maxWidth:320,width:"100%"}}>
        <div style={{fontSize:56,marginBottom:12}}>✅</div>
        <div style={{fontSize:18,fontWeight:900,color:"#059669",marginBottom:6}}>ส่งใบเสนอราคาแล้ว</div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:24}}>
          ส่งรูปใบเสนอราคา {photos.length} รูป ไปยัง LINE ลูกค้าเรียบร้อยแล้ว
        </div>
        <button onClick={onClose}
          style={{width:"100%",padding:"12px 0",borderRadius:10,border:"none",
            background:"#1A1A1A",color:"#FFE000",fontSize:15,fontWeight:900,cursor:"pointer",
            fontFamily:"'Noto Sans Thai',sans-serif"}}>
          ปิด
        </button>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:480,
        maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:"#1A1A1A",padding:"14px 16px",display:"flex",
          alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:"#FFE000"}}>📋 ใบเสนอราคา</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:2}}>
              {data.plate} · ช่องที่ {qNo}
            </div>
          </div>
          <button onClick={onClose}
            style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,
              width:32,height:32,color:"#fff",fontSize:18,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:12,textAlign:"center"}}>
            ถ่ายรูปใบเสนอราคาเพื่อส่งให้ลูกค้าทาง LINE ({photos.length}/{MAX_PHOTOS} รูป)
          </div>

          {/* Photo grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            {photos.map((p, i) => (
              <div key={i} style={{position:"relative",aspectRatio:"3/4",borderRadius:10,
                overflow:"hidden",border:"1px solid #e5e7eb"}}>
                <img src={p.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>

                {/* Frame already baked into image via compositeFrameOnPhoto */}

                <button onClick={() => removePhoto(i)}
                  style={{position:"absolute",top:4,right:4,zIndex:5,
                    background:"rgba(0,0,0,.65)",border:"none",borderRadius:"50%",
                    width:22,height:22,color:"#fff",fontSize:11,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  ✕
                </button>
                <div style={{position:"absolute",bottom:"22%",left:6,zIndex:5,
                  fontSize:10,fontWeight:700,color:"#fff",
                  textShadow:"0 1px 3px rgba(0,0,0,.8)"}}>
                  {i+1}
                </div>
              </div>
            ))}

            {/* Add photo button */}
            {photos.length < MAX_PHOTOS && (
              <button onClick={() => inputRef.current?.click()}
                style={{aspectRatio:"1",borderRadius:10,border:"2px dashed #d1d5db",
                  background:"#f9fafb",display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",cursor:"pointer",gap:4}}>
                <span style={{fontSize:24}}>📷</span>
                <span style={{fontSize:10,fontWeight:700,color:"#9ca3af"}}>ถ่ายรูป</span>
              </button>
            )}
          </div>

      {/* Hidden file input — camera capture */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleCapture}
            style={{display:"none"}}
          />

          {/* LINE warning if no userId */}
          {!data.userId && (
            <div style={{background:"#fef3c7",borderRadius:8,padding:"10px 12px",
              fontSize:12,color:"#92400e",marginBottom:12,textAlign:"center"}}>
              ⚠️ ลูกค้าไม่ได้ลงทะเบียน LINE — ไม่สามารถส่งได้
            </div>
          )}

          {error && (
            <div style={{background:"#fee2e2",borderRadius:8,padding:"10px 12px",
              fontSize:12,color:"#991b1b",marginBottom:12,textAlign:"center"}}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid #f0f0f0",
          display:"grid",gridTemplateColumns:"1fr 2fr",gap:10,flexShrink:0,
          paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))"}}>
          <button onClick={onClose}
            style={{padding:"12px 0",borderRadius:10,border:"1.5px solid #e5e7eb",
              background:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",
              color:"#6b7280",fontFamily:"'Noto Sans Thai',sans-serif"}}>
            ยกเลิก
          </button>
          <button onClick={handleSend}
            disabled={loading || !photos.length || !data.userId}
            style={{padding:"12px 0",borderRadius:10,border:"none",
              background: loading || !photos.length || !data.userId ? "#e5e7eb" : "#FFE000",
              color: loading || !photos.length || !data.userId ? "#9ca3af" : "#1A1A1A",
              fontSize:14,fontWeight:900,cursor: loading||!photos.length||!data.userId?"not-allowed":"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif"}}>
            {loading ? "⏳ กำลังส่ง..." : `📤 ส่ง LINE (${photos.length} รูป)`}
          </button>
        </div>
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
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.75)",
      display:"flex",alignItems:"flex-end"}}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"100%",
        maxHeight:"92dvh", display:"flex",flexDirection:"column"}}>

        {/* Header — fixed */}
        <div style={{padding:"20px 20px 12px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:20,fontWeight:900,color:"#1A1A1A"}}>🔧 เพิ่มงาน – ลำดับที่ {qNo}</div>
            <button onClick={onClose}
              style={{background:"#f3f4f6",border:"none",borderRadius:10,
                width:40,height:40,fontSize:22,cursor:"pointer"}}>✕</button>
          </div>
          {error && (
            <div style={{background:"#fee2e2",color:"#dc2626",padding:"10px 12px",
              borderRadius:10,marginTop:10,fontWeight:700,fontSize:14}}>{error}</div>
          )}
        </div>

        {/* Scrollable job grid */}
        <div style={{flex:1,overflowY:"auto",padding:"0 20px",minHeight:0}}>
          {avail.length === 0
            ? <div style={{textAlign:"center",padding:"30px 0",color:"#9ca3af",fontSize:16}}>
                เพิ่มงานครบทุกประเภทแล้ว
              </div>
            : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,paddingBottom:8}}>
                {avail.map(job => (
                  <button key={job.name} onClick={() => toggle(job)}
                    style={{padding:"12px 6px",borderRadius:10,textAlign:"center",minHeight:52,
                      border: sel.includes(job) ? "3px solid #1A1A1A" : "2px solid #e5e7eb",
                      background: sel.includes(job) ? "#FFE000" : "#f9fafb",
                      fontSize:13,fontWeight:700,cursor:"pointer",
                      fontFamily:"'Noto Sans Thai',sans-serif"}}>
                    {sel.includes(job) ? "✅ " : ""}{job.name}
                    <div style={{fontSize:10,color:"#9ca3af",fontWeight:400,marginTop:2}}>
                      {job.timeLabel}
                    </div>
                  </button>
                ))}
              </div>
          }
        </div>

        {/* Submit button — fixed at bottom */}
        <div style={{padding:"12px 20px 32px",flexShrink:0,
          borderTop:"1px solid #f3f4f6",background:"#fff"}}>
          <button onClick={submit} disabled={loading || !sel.length}
            style={{width:"100%",padding:"18px",borderRadius:14,border:"none",
              background: sel.length&&!loading ? "#1A1A1A" : "#e5e7eb",
              color: sel.length&&!loading ? "#FFE000" : "#9ca3af",
              fontSize:18,fontWeight:900,cursor:sel.length?"pointer":"default",
              fontFamily:"'Noto Sans Thai',sans-serif"}}>
            {loading ? "⏳ กำลังบันทึก..." : `➕ เพิ่ม ${sel.length} งาน`}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Queue Card ───────────────────────────────────────────────────────────────
function QueueCard({ qNo, data, branchId, onRefresh, onAddJobs, onComplete }) {
  const [busy, setBusy]         = useState(false);
  const [csModal, setCsModal]   = useState(null);
  const [quoteModal, setQuoteModal] = useState(false);
  const jobs = data.jobs || [];
  const jobsIdx = jobs.map((j, i) => ({...j, idx: i}));
  const real = jobsIdx.filter(j => j.name !== "รับรถเข้า");
  const prog = getProgress(jobs);
  const isWait = data.bayStatus === "waiting_entry";
  const isIn   = data.bayStatus === "in_service";

  const run = async (fn) => { setBusy(true); try { await fn(); } catch(e) { console.error("run:", e.message); } finally { setBusy(false); } };

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
        overflow:"hidden",
      }}>
        {/* Queue badge */}
        <div style={{background:"#FFE000",borderRadius:5,minWidth:26,height:26,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:13,fontWeight:900,color:"#1A1A1A",flexShrink:0}}>
          {qNo}
        </div>

        {/* Plate + phone + province + time */}
        <div style={{flexShrink:1,minWidth:0}}>
          {/* Row A: plate + phone */}
          <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:20,fontWeight:900,color:"#FFE000",
              letterSpacing:"0.03em",lineHeight:1}}>
              {data.plate}
            </span>
            {data.phone && (
              <span style={{fontSize:14,fontWeight:800,color:"rgba(255,255,255,.9)",
                lineHeight:1}}>
                {data.phone}
              </span>
            )}
          </div>
          {/* Row B: province + elapsed */}
          <div style={{fontSize:9,color:"rgba(255,255,255,.6)",marginTop:2,
            display:"flex",gap:5,flexWrap:"wrap"}}>
            {data.province && <span>จ.{data.province.slice(0,7)}</span>}
            {data.startTime && (
              <span style={{color:"rgba(255,224,0,.8)"}}>
                {getElapsed(data.startTime)}
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        {real.length > 0 && (
          <div style={{flex:1,minWidth:50}}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:2}}>
              <span style={{fontSize:10,fontWeight:900,color:"#fff"}}>{prog}%</span>
            </div>
            <div style={{background:"rgba(255,255,255,.2)",borderRadius:99,height:4}}>
              <div style={{background:prog===100?"#fff":"#FFE000",borderRadius:99,height:4,
                width:`${prog}%`,transition:"width .4s"}}/>
            </div>
          </div>
        )}
        {real.length === 0 && <div style={{flex:1}}/>}

        {/* Buttons — gap เพิ่มขึ้น + ปุ่มใหญ่ขึ้น ป้องกันกดผิด */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          {/* Status badge */}
          <span style={{background:isWait?"#FFE000":"rgba(255,255,255,.18)",
            color:isWait?"#1A1A1A":"#fff",
            borderRadius:8,padding:"4px 8px",fontSize:10,fontWeight:800,whiteSpace:"nowrap"}}>
            {isWait?"⏳":"🔧"}
          </span>

          <button onClick={() => onAddJobs(String(qNo))}
            style={{width:36,height:36,borderRadius:10,
              border:"1.5px solid rgba(255,255,255,.35)",
              background:"transparent",color:"#fff",fontSize:17,fontWeight:700,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            ➕
          </button>

          {/* Quotation button — เฉพาะเมื่อรถอยู่ระหว่างให้บริการ */}
          {isIn && (
            <button onClick={() => setQuoteModal(true)}
              title="ส่งใบเสนอราคา LINE"
              style={{width:36,height:36,borderRadius:10,
                border:"1.5px solid rgba(255,255,255,.35)",
                background:"transparent",color:"#fff",fontSize:17,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              📋
            </button>
          )}

          {isWait && real.length > 0 && (
            <button onClick={handleStart} disabled={busy}
              style={{height:36,padding:"0 14px",borderRadius:10,border:"none",
                background:"#FFE000",color:"#1A1A1A",fontSize:13,fontWeight:800,
                cursor:"pointer",whiteSpace:"nowrap",
                fontFamily:"'Noto Sans Thai',sans-serif"}}>
              ▶ เริ่ม
            </button>
          )}
          {isIn && (
            <button onClick={handleClose} disabled={busy}
              style={{width:36,height:36,borderRadius:10,border:"none",
                background:"#fff",color:"#059669",fontSize:18,fontWeight:900,
                cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'Noto Sans Thai',sans-serif"}}>
              ✓
            </button>
          )}

          {/* Cancel — แยกด้วย margin ซ้ายเพิ่มเติม ป้องกันกดสลับกับ ✓ */}
          <button onClick={handleCancelCar} disabled={busy}
            title="ยกเลิกรถ (ไม่แจ้ง LINE)"
            style={{width:36,height:36,borderRadius:10,
              border:"2px solid rgba(255,255,255,0.5)",
              background:"#dc2626",color:"#fff",fontSize:15,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",
              marginLeft:2,
              opacity:busy?0.5:1}}>
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
    {quoteModal && (
      <QuotationModal
        qNo={qNo} branchId={branchId} data={data}
        onClose={() => setQuoteModal(false)}
      />
    )}
    </>
  );
}

// ─── Staff View ───────────────────────────────────────────────────────────────
function StaffView({ branchId, branchName: branchNameProp }) {
  const [queues, setQueues]         = useState({});
  const [branchName, setBranchName] = useState(branchNameProp || "Cockpit Pro");
  const [loading, setLoading]       = useState(true);
  const [openModal, setOpenModal]   = useState(false);
  const [addTarget, setAddTarget]   = useState(null);
  const [completion, setCompletion] = useState(null);
  const [todayHistory, setTodayHistory] = useState([]);

  // sync branchName จาก prop
  useEffect(() => { if (branchNameProp) setBranchName(branchNameProp); }, [branchNameProp]);

  const fetch_ = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await fetch(`${API}/api/branch/${branchId}`);
      const data = await res.json();
      setQueues(data.baysData || {});
      setBranchName(data.name || "Cockpit Pro");
      // ดึงประวัติวันนี้เพื่อแสดงปุ่มคืนสถานะ
      try {
        const hr = await fetch(`${API}/api/branch/${branchId}/history?limit=50`);
        const hd = await hr.json();
        const today = new Date().toDateString();
        setTodayHistory((hd.history||[]).filter(h =>
          h.closed_at && new Date(h.closed_at).toDateString() === today && !h.cancelled
        ));
      } catch {}
    } catch {}
    setLoading(false);
  }, [branchId]);

  const handleReopen = async (historyId) => {
    if (!window.confirm("คืนสถานะรถนี้กลับสู่คิว?")) return;
    try {
      const r = await callAPI("POST",
        `/api/branch/${branchId}/history/${historyId}/reopen`, {});
      if (r.error) { alert(r.error); return; }
      alert(`✅ คืนสถานะสำเร็จ — ช่องที่ ${r.bay}`);
      fetch_();
    } catch(e) { alert("เกิดข้อผิดพลาด: " + e.message); }
  };

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
    <div style={{paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))"}}>

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
      {/* ── คืนสถานะ — รถที่ปิดงานวันนี้ ── */}
      {todayHistory.length > 0 && (
        <div style={{padding:"8px 12px 4px"}}>
          <div style={{fontSize:11,fontWeight:800,color:"#9ca3af",
            letterSpacing:"0.5px",marginBottom:6}}>
            ↩ คืนสถานะได้ (ปิดงานวันนี้)
          </div>
          {todayHistory.map(h => (
            <div key={h.id} style={{background:"#fff",borderRadius:10,
              marginBottom:6,padding:"8px 10px",
              border:"1px solid #fbbf24",
              display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:16,fontWeight:900,color:"#1A1A1A"}}>
                  {h.plate}
                </div>
                <div style={{fontSize:10,color:"#9ca3af"}}>
                  {h.province ? `จ.${h.province} · ` : ""}
                  ปิด {new Date(h.closed_at).toLocaleTimeString("th-TH",
                    {hour:"2-digit",minute:"2-digit"})}น.
                  {" · "}{(h.jobs||[]).filter(j=>j.name!=="รับรถเข้า").map(j=>j.name).join(", ")}
                </div>
              </div>
              <button onClick={() => handleReopen(h.id)}
                style={{flexShrink:0,padding:"6px 12px",borderRadius:8,border:"none",
                  background:"#d97706",color:"#fff",fontSize:12,fontWeight:800,
                  cursor:"pointer",fontFamily:"'Noto Sans Thai',sans-serif"}}>
                ↩ คืน
              </button>
            </div>
          ))}
        </div>
      )}

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
// ─── Video View ───────────────────────────────────────────────────────────────
function VideoView({ branchId }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detLoad, setDetLoad] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadVideos = useCallback(async (id) => {
    if (!id) return;
    setDetLoad(true); setPlayingId(null);
    try {
      const r = await fetch(`${API}/api/branch/${id}/videos?limit=60`);
      const d = await r.json();
      setVideos(d.videos||[]);
    } catch {}
    setDetLoad(false);
    setLoading(false);
  }, []);

  useEffect(() => { loadVideos(branchId); }, [branchId, loadVideos]);

  // Cloudinary thumbnail URL (replace extension with .jpg)
  const thumbUrl = (url) => {
    try {
      // Cloudinary video thumbnail: ใช้ so_0 (screenshot at 0s) + format jpg
      return url
        .replace('/upload/', '/upload/w_400,h_711,c_fill,so_0,q_60/')
        .replace(/\.(webm|mp4|mov|avi)$/i, '.jpg');
    } catch { return ""; }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH",{day:"2-digit",month:"short",year:"2-digit"}) +
      " " + d.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"});
  };

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>⏳ กำลังโหลด...</div>;

  return (
    <div style={{padding:"8px 12px",paddingBottom:40}}>
      {/* Refresh + count */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <button onClick={()=>loadVideos(branchId)}
          style={{padding:"5px 12px",borderRadius:8,border:"1px solid #d1d5db",
            background:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",
            color:"#6b7280",fontFamily:"'Noto Sans Thai',sans-serif"}}>🔄 รีเฟรช</button>
        {!detLoad && (
          <span style={{fontSize:12,color:"#9ca3af"}}>{videos.length} คลิป</span>
        )}
      </div>

      {detLoad && <div style={{textAlign:"center",padding:30,color:"#9ca3af"}}>⏳</div>}

      {!detLoad && videos.length === 0 && (
        <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>
          <div style={{fontSize:48,marginBottom:12}}>🎥</div>
          <div style={{fontSize:15,fontWeight:700}}>ยังไม่มีวีดีโอ</div>
          <div style={{fontSize:12,marginTop:6}}>วีดีโอจะปรากฎหลังจากพนักงานส่ง CockpitSure</div>
        </div>
      )}

      {/* Video grid */}
      {!detLoad && videos.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
          {videos.map(v => (
            <div key={v.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
              boxShadow:"0 2px 8px rgba(0,0,0,.08)",border:"1px solid #f0f0f0"}}>

              {/* Thumbnail / Player */}
              {playingId === v.id ? (
                <video src={v.video_url} controls autoPlay playsInline
                  webkit-playsinline="true"
                  style={{width:"100%",aspectRatio:"9/16",objectFit:"cover",display:"block",background:"#000"}}/>
              ) : (
                <div style={{position:"relative",cursor:"pointer",aspectRatio:"9/16",
                  background:"#1A1A1A",overflow:"hidden"}}
                  onClick={()=>setPlayingId(v.id)}>
                  <img src={thumbUrl(v.video_url)} alt=""
                    style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                    onError={e=>{e.target.style.display="none";}}/>
                  {/* Play button overlay */}
                  <div style={{position:"absolute",inset:0,display:"flex",
                    alignItems:"center",justifyContent:"center",
                    background:"rgba(0,0,0,0.3)"}}>
                    <div style={{width:44,height:44,borderRadius:22,
                      background:"rgba(255,224,0,0.9)",display:"flex",
                      alignItems:"center",justifyContent:"center",fontSize:20}}>
                      ▶
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div style={{padding:"8px 10px"}}>
                <div style={{fontSize:16,fontWeight:900,color:"#1A1A1A",lineHeight:1}}>
                  {v.plate}
                </div>
                {v.province && (
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>จ.{v.province}</div>
                )}
                <div style={{fontSize:10,color:"#9ca3af",marginTop:4}}>
                  {formatDate(v.uploaded_at)}
                </div>
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:6,padding:"0 10px 10px"}}>
                <a href={v.video_url} target="_blank" rel="noreferrer"
                  style={{flex:1,padding:"6px 0",borderRadius:8,border:"1px solid #e5e7eb",
                    background:"#f9fafb",color:"#374151",fontSize:12,fontWeight:700,
                    cursor:"pointer",textDecoration:"none",textAlign:"center",
                    fontFamily:"'Noto Sans Thai',sans-serif"}}>
                  🔗 เปิด
                </a>
                <button onClick={()=>{
                    const dlUrl = v.video_url.replace('/upload/','/upload/fl_attachment/');
                    const a = document.createElement('a');
                    a.href = dlUrl;
                    a.target = '_blank';
                    const dlExt = (v.video_url||"").includes(".mp4") ? "mp4"
                      : (v.video_url||"").includes(".mov") ? "mov" : "webm";
                    a.download = `cockpitsure_${v.plate}.${dlExt}`;
                    a.click();
                  }}
                  style={{flex:1,padding:"6px 0",borderRadius:8,border:"none",
                    background:"#1A1A1A",color:"#FFE000",fontSize:12,fontWeight:700,
                    cursor:"pointer",textAlign:"center",
                    fontFamily:"'Noto Sans Thai',sans-serif"}}>
                  ⬇ โหลด
                </button>
                <button
                  disabled={deletingId === v.id}
                  onClick={async () => {
                    if (!window.confirm(`ลบวีดีโอ ${v.plate} ?\nไม่สามารถกู้คืนได้`)) return;
                    setDeletingId(v.id);
                    try {
                      const r = await callAPI("DELETE", `/api/branch/${branchId}/videos/${v.id}`);
                      if (r.success) setVideos(prev => prev.filter(x => x.id !== v.id));
                      else alert("ลบไม่สำเร็จ: " + (r.error||""));
                    } catch(e) { alert("เกิดข้อผิดพลาด: " + e.message); }
                    finally { setDeletingId(null); }
                  }}
                  style={{width:34,padding:"6px 0",borderRadius:8,border:"none",
                    background: deletingId===v.id ? "#9ca3af" : "#dc2626",
                    color:"#fff",fontSize:14,fontWeight:700,
                    cursor: deletingId===v.id ? "not-allowed" : "pointer",
                    textAlign:"center"}}>
                  {deletingId===v.id ? "⏳" : "🗑"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── History View ─────────────────────────────────────────────────────────────
function HistoryView({ branchId, branchName: branchNameProp }) {
  const getToday   = () => new Date().toISOString().split('T')[0];
  const getWeekAgo = () => new Date(Date.now()-7*24*60*60*1000).toISOString().split('T')[0];

  const [history,     setHistory]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [detLoad,     setDetLoad]     = useState(false);
  const [fromDate,    setFromDate]    = useState(getWeekAgo());
  const [toDate,      setToDate]      = useState(getToday());
  const [selJobs,     setSelJobs]     = useState([]); // job name filter

  // ── doLoad must be defined BEFORE useEffect ────────────────────────────────
  async function doLoad(id, from, to) {
    if (!id) return;
    setDetLoad(true);
    try {
      const params = new URLSearchParams({ limit: 500, from, to });
      const r = await fetch(`${API}/api/branch/${id}/history?${params}`);
      const d = await r.json();
      setHistory((d.history || []).filter(h => !h.cancelled));
    } catch(e) { console.error(e); }
    setDetLoad(false);
  }

  // โหลดครั้งแรก + โหลดใหม่เมื่อ branchId เปลี่ยน
  useEffect(() => {
    if (!branchId) return;
    setLoading(true); setHistory([]);
    doLoad(branchId, getWeekAgo(), getToday());
    setLoading(false);
  }, [branchId]);

  function onSearch() {
    if (branchId) doLoad(branchId, fromDate, toDate);
  }

  function setQuickRange(f, t) {
    setFromDate(f); setToDate(t);
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const BOM = "\uFEFF";
    const hdrs = ["วันที่","เวลา","ทะเบียน","จังหวัด","สาขา","รายการงาน","จำนวนงาน"];
    const rows = filteredHistory.map(h => {
      const d = new Date(h.closed_at);
      const jobs = (h.jobs || []).filter(j => j.name !== "รับรถเข้า");
      return [
        d.toLocaleDateString("th-TH"),
        d.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit" }),
        h.plate,
        h.province || "",
        h.branchName || branchNameProp || branchId,
        '"' + jobs.map(j => j.name).join(" | ") + '"',
        jobs.length
      ].join(",");
    });
    const csv = BOM + [hdrs.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cockpit_${branchId}_${fromDate}_${toDate}.csv`;
    a.click();
  }

  // ── Export Excel (HTML→XLS) ────────────────────────────────────────────────
  function exportExcel() {
    const rows = filteredHistory.map(h => {
      const d = new Date(h.closed_at);
      const jobs = (h.jobs || []).filter(j => j.name !== "รับรถเข้า");
      return "<tr><td>" + [
        d.toLocaleDateString("th-TH"),
        d.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit" }),
        h.plate,
        h.province || "",
        h.branchName || branchNameProp || branchId,
        jobs.map(j => j.name).join(", "),
        jobs.length
      ].join("</td><td>") + "</td></tr>";
    }).join("");
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
      + 'xmlns:x="urn:schemas-microsoft-com:office:excel">'
      + '<head><meta charset="utf-8"/></head><body><table border="1">'
      + '<tr style="background:#1A1A1A;color:#FFE000;font-weight:bold;">'
      + '<th>วันที่</th><th>เวลา</th><th>ทะเบียน</th><th>จังหวัด</th>'
      + '<th>สาขา</th><th>รายการงาน</th><th>จำนวนงาน</th></tr>'
      + rows + '</table></body></html>';
    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cockpit_${branchId}_${fromDate}_${toDate}.xls`;
    a.click();
  }

  // ── Computed stats ─────────────────────────────────────────────────────────
  const allJobs = history.flatMap(h => (h.jobs || []).filter(j => j.name !== "รับรถเข้า"));
  const jobCount = {};
  allJobs.forEach(j => { jobCount[j.name] = (jobCount[j.name] || 0) + 1; });
  const topJobs = Object.entries(jobCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Job names for filter chips (all unique jobs in result)
  const allJobNames = Object.keys(jobCount).sort((a,b) =>
    (jobCount[b]||0) - (jobCount[a]||0)
  );

  // Filtered history by selected jobs
  const filteredHistory = selJobs.length === 0 ? history : history.filter(h =>
    selJobs.every(j => (h.jobs||[]).some(jb => jb.name === j))
  );

  const toggleJob = (name) =>
    setSelJobs(prev => prev.includes(name) ? prev.filter(x=>x!==name) : [...prev, name]);

  if (loading) return (
    <div style={{ textAlign:"center", padding:40, color:"#9ca3af" }}>⏳ กำลังโหลด...</div>
  );

  const quickRanges = [
    { l:"วันนี้",  f: getToday(),   t: getToday() },
    { l:"7 วัน",  f: getWeekAgo(), t: getToday() },
    { l:"30 วัน", f: new Date(Date.now()-30*864e5).toISOString().split('T')[0], t: getToday() },
    { l:"เดือนนี้",f: new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split('T')[0], t: getToday() },
  ];

  return (
    <div style={{ padding:"10px 12px", paddingBottom:40 }}>

      {/* ── Filter Panel ── */}
      <div style={{ background:"#1A1A1A", borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:800, color:"#FFE000", letterSpacing:"1px", marginBottom:10 }}>
          📊 ค้นหาข้อมูล
        </div>

        {/* Branch name display (no selector — controlled from header) */}
        <div style={{ marginBottom:10, fontSize:12, color:"#9ca3af", fontWeight:700 }}>
          📍 {branchNameProp || branchId}
        </div>

        {/* Date inputs */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, marginBottom:4 }}>จากวันที่</div>
            <input type="date" value={fromDate} max={toDate}
              onChange={e => setFromDate(e.target.value)}
              style={{ width:"100%", padding:"8px", borderRadius:8, border:"none",
                fontSize:12, background:"#2a2a2a", color:"#fff",
                outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, marginBottom:4 }}>ถึงวันที่</div>
            <input type="date" value={toDate} min={fromDate} max={getToday()}
              onChange={e => setToDate(e.target.value)}
              style={{ width:"100%", padding:"8px", borderRadius:8, border:"none",
                fontSize:12, background:"#2a2a2a", color:"#fff",
                outline:"none", boxSizing:"border-box" }}/>
          </div>
        </div>

        {/* Quick range buttons */}
        <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
          {quickRanges.map(s => (
            <button key={s.l} onClick={() => setQuickRange(s.f, s.t)}
              style={{ padding:"4px 12px", borderRadius:6,
                border: fromDate===s.f && toDate===s.t ? "none" : "1px solid #444",
                background: fromDate===s.f && toDate===s.t ? "#FFE000" : "#2a2a2a",
                color: fromDate===s.f && toDate===s.t ? "#1A1A1A" : "#ccc",
                fontSize:12, fontWeight:700, cursor:"pointer",
                fontFamily:"'Noto Sans Thai',sans-serif" }}>
              {s.l}
            </button>
          ))}
        </div>

        <button onClick={onSearch} disabled={detLoad}
          style={{ width:"100%", padding:"11px", borderRadius:8, border:"none",
            background: detLoad ? "#555" : "#FFE000",
            color: detLoad ? "#999" : "#1A1A1A",
            fontSize:14, fontWeight:900, cursor: detLoad ? "not-allowed" : "pointer",
            fontFamily:"'Noto Sans Thai',sans-serif" }}>
          {detLoad ? "⏳ กำลังโหลด..." : "🔍 ค้นหา"}
        </button>

        {/* Job filter chips */}
        {allJobNames.length > 0 && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:10, fontWeight:800, color:"#FFE000",
              letterSpacing:"0.5px", marginBottom:6 }}>
              🔧 กรองตามประเภทงาน {selJobs.length > 0 &&
                <span style={{ color:"#9ca3af", fontWeight:600 }}>
                  ({selJobs.length} เลือก)
                </span>}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {allJobNames.map(name => (
                <button key={name} onClick={() => toggleJob(name)}
                  style={{ padding:"4px 10px", borderRadius:20,
                    border: selJobs.includes(name) ? "none" : "1px solid #444",
                    background: selJobs.includes(name) ? "#FFE000" : "#2a2a2a",
                    color: selJobs.includes(name) ? "#1A1A1A" : "#ccc",
                    fontSize:11, fontWeight:700, cursor:"pointer",
                    fontFamily:"'Noto Sans Thai',sans-serif" }}>
                  {name}
                  <span style={{ marginLeft:4, opacity:0.65 }}>
                    {jobCount[name]}
                  </span>
                </button>
              ))}
              {selJobs.length > 0 && (
                <button onClick={() => setSelJobs([])}
                  style={{ padding:"4px 10px", borderRadius:20,
                    border:"1px solid #dc2626", background:"transparent",
                    color:"#dc2626", fontSize:11, fontWeight:700, cursor:"pointer",
                    fontFamily:"'Noto Sans Thai',sans-serif" }}>
                  ✕ ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {!detLoad && history.length > 0 && (
        <>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:6, marginBottom:10 }}>
            {[
              { v: filteredHistory.length, l: selJobs.length?"รถที่กรอง":"รถทั้งหมด", bg:"#FFE000", c:"#1A1A1A" },
              { v: allJobs.length, l:"งานทั้งหมด", bg:"#1A1A1A", c:"#FFE000" },
              { v: topJobs[0] ? topJobs[0][0] : "-", l:"งานยอดนิยม", bg:"#059669", c:"#fff" },
              { v: topJobs[0] ? topJobs[0][1] : 0,  l:"ครั้ง",       bg:"#d97706", c:"#fff" },
            ].map(s => (
              <div key={s.l} style={{ background:s.bg, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize: s.l==="งานยอดนิยม"?11:22, fontWeight:900,
                  color:s.c, lineHeight:1.2 }}>{s.v}</div>
                <div style={{ fontSize:10, fontWeight:700, color:s.c, opacity:.85, marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {topJobs.length > 0 && (
            <div style={{ background:"#1A1A1A", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#FFE000", marginBottom:6 }}>🏆 งานที่ทำบ่อย</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {topJobs.map(([name, count]) => (
                  <div key={name} style={{ background:"#2a2a2a", borderRadius:6,
                    padding:"3px 10px", fontSize:11, fontWeight:700, color:"#fff" }}>
                    {name} <span style={{ color:"#FFE000" }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            <button onClick={exportCSV} style={{ padding:"11px 0", borderRadius:10,
              border:"2px solid #059669", background:"#fff", color:"#059669",
              fontSize:13, fontWeight:800, cursor:"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif" }}>
              📄 Export CSV
            </button>
            <button onClick={exportExcel} style={{ padding:"11px 0", borderRadius:10,
              border:"none", background:"#059669", color:"#fff",
              fontSize:13, fontWeight:800, cursor:"pointer",
              fontFamily:"'Noto Sans Thai',sans-serif" }}>
              📊 Export Excel
            </button>
          </div>

          {/* Table */}
          <div style={{ background:"#fff", borderRadius:10, overflow:"hidden", border:"1px solid #e5e7eb" }}>
            <div style={{ display:"grid", gridTemplateColumns:"50px 80px 55px 1fr 44px",
              background:"#1A1A1A", padding:"6px 8px", gap:4 }}>
              {["วันที่","ทะเบียน","จ.","งานที่ทำ","เวลา"].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:800, color:"#FFE000" }}>{h}</div>
              ))}
            </div>
            {filteredHistory.slice(0, 200).map((h, i) => {
              const jobs = (h.jobs || []).filter(j => j.name !== "รับรถเข้า");
              const d = new Date(h.closed_at);
              return (
                <div key={i} style={{ display:"grid",
                  gridTemplateColumns:"50px 80px 55px 1fr 44px",
                  padding:"6px 8px", gap:4, alignItems:"center",
                  borderBottom:"1px solid #f3f4f6",
                  background: i%2===0 ? "#fff" : "#fafafa" }}>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>
                    {d.toLocaleDateString("th-TH",{day:"2-digit",month:"2-digit"})}
                  </div>
                  <div style={{ fontSize:13, fontWeight:900, color:"#1A1A1A" }}>{h.plate}</div>
                  <div style={{ fontSize:10, color:"#6b7280" }}>{(h.province||"-").slice(0,5)}</div>
                  <div style={{ fontSize:10, color:"#374151", lineHeight:1.5 }}>
                    {jobs.map(j => j.name).join(" · ") || "-"}
                  </div>
                  <div style={{ fontSize:10, color:"#9ca3af", textAlign:"right" }}>
                    {d.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              );
            })}
            {filteredHistory.length > 200 && (
              <div style={{ textAlign:"center", padding:10, fontSize:11,
                color:"#9ca3af", background:"#fafafa" }}>
                แสดง 200 จาก {filteredHistory.length} รายการ — กด Export เพื่อดูทั้งหมด
              </div>
            )}
          </div>
        </>
      )}

      {!detLoad && history.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
          <div style={{ fontSize:14, fontWeight:700 }}>ไม่พบข้อมูล</div>
          <div style={{ fontSize:12, marginTop:4 }}>ลองเปลี่ยนช่วงวันที่แล้วกด ค้นหา</div>
        </div>
      )}
    </div>
  );
}


// ─── Admin View (TV horizontal rows) ─────────────────────────────────────────
function AdminView({ branchId }) {
  const [detail, setDetail]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [detLoad, setDetLoad]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");

  const loadBranch = useCallback(async (id) => {
    if (!id) return;
    setDetLoad(true);
    try {
      const r = await fetch(`${API}/api/branch/${id}`);
      setDetail(await r.json());
      setLastUpdate(new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    } catch {}
    setDetLoad(false);
    setLoading(false);
  }, []);

  const refresh = () => loadBranch(branchId);

  useEffect(() => { loadBranch(branchId); }, [branchId, loadBranch]);
  useEffect(() => {
    if (!branchId) return;
    const t = setInterval(() => loadBranch(branchId), 20000);
    return () => clearInterval(t);
  }, [branchId, loadBranch]);

  if (loading) return <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>⏳</div>;
  if (!branchId) return <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>ไม่พบสาขา</div>;

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


// ── Branch sort helper (used in App header selector) ──────────────────────────
function sortBranches(list) {
  return [...list].sort((a, b) => {
    const at = a.name.toLowerCase().includes("test") ? 1 : 0;
    const bt = b.name.toLowerCase().includes("test") ? 1 : 0;
    if (at !== bt) return at - bt;
    const ai = parseInt((a.branchId || "").replace(/\D/g, "")) || 999;
    const bi = parseInt((b.branchId || "").replace(/\D/g, "")) || 999;
    return ai - bi;
  });
}

export default function App() {
  const [tab, setTab]           = useState("staff");
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState(() =>
    localStorage.getItem("cp_branch") || null
  );
  const [locked, setLocked] = useState(() =>
    localStorage.getItem("cp_locked") === "1"
  );

  // โหลด overview ครั้งเดียวที่ root
  useEffect(() => {
    fetch(`${API}/api/admin/overview`)
      .then(r => r.json())
      .then(d => {
        const list = sortBranches(d.overview || []);
        setBranches(list);
        // ถ้ายังไม่มีสาขาที่เลือก หรือสาขาที่เลือกไม่มีในรายการ ให้เลือกอันแรก
        setBranchId(prev => {
          const exists = list.some(b => b.branchId === prev);
          if (prev && exists) return prev;
          const first = list[0]?.branchId || null;
          if (first) localStorage.setItem("cp_branch", first);
          return first;
        });
      })
      .catch(() => {});
  }, []);

  // persist branchId ทุกครั้งที่เปลี่ยน
  const handleBranchChange = (id) => {
    if (locked) return; // ล็อกอยู่ ไม่ให้เปลี่ยน
    setBranchId(id);
    localStorage.setItem("cp_branch", id);
  };

  // toggle lock
  const toggleLock = () => {
    setLocked(prev => {
      const next = !prev;
      localStorage.setItem("cp_locked", next ? "1" : "0");
      return next;
    });
  };

  const activeBranch = branches.find(b => b.branchId === branchId);
  const branchName   = activeBranch?.name || branchId || "Cockpit Pro";

  return (
    <div style={{fontFamily:"'Noto Sans Thai',sans-serif",background:"#F2F2EE",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;} body{margin:0;padding:0;padding-bottom:env(safe-area-inset-bottom,0px);}
        button,input{font-family:'Noto Sans Thai',sans-serif;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideRight{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
      `}</style>

      {/* ── Sticky Header ── */}
      <div style={{background:"#1A1A1A",position:"sticky",top:0,zIndex:40,
        boxShadow:"0 2px 16px rgba(0,0,0,.5)"}}>

        {/* Logo row + Branch selector — paddingTop รองรับ Dynamic Island / notch */}
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          paddingTop:"calc(10px + env(safe-area-inset-top, 0px))",
          paddingBottom:"6px",
          paddingLeft:"14px",
          paddingRight:"14px",
        }}>
          {/* Logo */}
          <div style={{flexShrink:0}}>
            <CockpitLogo height={38}/>
          </div>

          {/* Branch selector + lock — flex grow */}
          <div style={{flex:1,display:"flex",alignItems:"center",gap:6,minWidth:0}}>
            <div style={{position:"relative",flex:1,minWidth:0}}>
              <select
                value={branchId || ""}
                onChange={e => handleBranchChange(e.target.value)}
                disabled={locked}
                style={{
                  width:"100%",
                  padding:"6px 28px 6px 10px",
                  borderRadius:8,
                  border: locked ? "1.5px solid #FFE000" : "1.5px solid #444",
                  background: locked ? "#2a2200" : "#2a2a2a",
                  color:"#fff",
                  fontSize:13,
                  fontWeight:800,
                  fontFamily:"'Noto Sans Thai',sans-serif",
                  cursor: locked ? "not-allowed" : "pointer",
                  outline:"none",
                  appearance:"none",
                  WebkitAppearance:"none",
                  opacity: locked ? 0.85 : 1,
                }}>
                {branches.length === 0 && (
                  <option value="">⏳ กำลังโหลด...</option>
                )}
                {sortBranches(branches).map(b => (
                  <option key={b.branchId} value={b.branchId}>{b.name}</option>
                ))}
              </select>
              {/* dropdown arrow */}
              <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                color:"#9ca3af",pointerEvents:"none",fontSize:10}}>▼</span>
            </div>

            {/* Lock button */}
            <button
              onClick={toggleLock}
              title={locked ? "ปลดล็อกสาขา" : "ล็อกสาขานี้"}
              style={{
                flexShrink:0,
                width:34,height:34,
                borderRadius:8,
                border: locked ? "1.5px solid #FFE000" : "1.5px solid #555",
                background: locked ? "#FFE000" : "transparent",
                color: locked ? "#1A1A1A" : "#9ca3af",
                fontSize:16,
                cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all .15s",
              }}>
              {locked ? "🔒" : "🔓"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{display:"flex",paddingLeft:4,paddingRight:4}}>
          {[
            {key:"staff",   label:"👨‍🔧 พนักงาน"},
            {key:"admin",   label:"📺 ข้อมูล"},
            {key:"history", label:"📊 สถิติ"},
            {key:"videos",  label:"🎥 วีดีโอ"},
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex:1, padding:"9px 2px", border:"none", background:"transparent",
              color: tab===t.key ? "#FFE000" : "rgba(255,255,255,.4)",
              fontSize:13, fontWeight:800, cursor:"pointer",
              borderBottom: tab===t.key ? "3px solid #FFE000" : "3px solid transparent",
              transition:"all .2s", fontFamily:"'Noto Sans Thai',sans-serif",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Views — branchId + branchName passed as props ── */}
      <div>
        {tab === "staff"   && <StaffView   branchId={branchId} branchName={branchName}/>}
        {tab === "admin"   && <AdminView   branchId={branchId}/>}
        {tab === "history" && <HistoryView branchId={branchId} branchName={branchName}/>}
        {tab === "videos"  && <VideoView   branchId={branchId}/>}
      </div>
    </div>
  );
}
