import React, { useState, useEffect, useRef } from 'react';
import { Shield, Activity, RefreshCw, Volume2, Search, VolumeX, AlertOctagon, Zap, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

interface AIThreatEngineProps {
  lang: 'en' | 'hi';
  onEmergencyTriggered: () => void;
  sosAlertActive: boolean;
}

export function AIThreatEngine({ lang, onEmergencyTriggered, sosAlertActive }: AIThreatEngineProps) {
  const [threatScore, setThreatScore] = useState<number>(10);
  const [riskLevel, setRiskLevel] = useState<'SAFE' | 'WARNING' | 'CRITICAL'>('SAFE');
  
  // Real or Simulated sensor states
  const [sensors, setSensors] = useState({
    accelX: 0.1,
    accelY: -0.2,
    accelZ: 9.81,
    amplitude: 15,
    deviation: 0,
    snatState: 'RETAINED'
  });

  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);
  const [escTimer, setEscTimer] = useState<number | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [detectedKeyword, setDetectedKeyword] = useState<string>('');

  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = {
    en: {
      title: "AI Risk Analysis & Threat Shield",
      desc: "Monitors real-time spatial diagnostics: sudden acceleration (device snatching), step rate peaks (running from threats), audio distress triggers, and routing deviance. Auto-escalates to police if response missed.",
      scoreLabel: "AI THREAT RISK METRIC",
      riskLabel: "SENTRY RISK LEVEL",
      sensorsTitle: "ACTIVE TELEMETRY STREAM",
      listening: "Acoustic Guard Active...",
      devSnatch: "Device Snatch (Theft Acceleration)",
      runPattern: "Corpse Surges (Running Behavior)",
      devRoute: "Route Deviation Alert",
      cancelEsc: "CANCEL ESCALATION CHANNELS",
      secondsRemaining: "Auto-escalating SOS in {n}s",
      simulateText: "Test Sentry Triggers",
      accelText: "Shockwave Vectors",
      microphoneText: "Distress Acoustic Decibel",
      deviationText: "Hotspot Proximity Deviance",
      meshRelayActive: "Sentry Radar Online"
    },
    hi: {
      title: "एआई जोखिम विश्लेषण और खतरा शील्ड",
      desc: "वास्तविक समय के स्थानिक निदान की निगरानी करता है: अचानक झटका (फोन छीनना), अत्यधिक कंपन (दौड़ने का पैटर्न), आवाज का स्तर और मार्ग विचलन। विफलता की स्थिति में पुलिस को तुरंत सूचित करता है।",
      scoreLabel: "एआई थ्रेट स्कोर",
      riskLabel: "सेंटी सुरक्षा स्तर",
      sensorsTitle: "सक्रिय सेंसर टेलीमेट्री स्ट्रीम",
      listening: "ध्वनिक सुरक्षा गार्ड सक्रिय...",
      devSnatch: "डिवाइस छीनना (अत्यधिक त्वरण कंपन)",
      runPattern: "दौड़ने का पैटर्न (असुरक्षित कंपन)",
      devRoute: "मार्ग विचलन (रुकावट अलर्ट)",
      cancelEsc: "ऑटो रिस्पॉन्स निरस्त करें",
      secondsRemaining: "{n} सेकंड में स्वतः एसओएस सक्रिय होगा",
      simulateText: "सेंटी सेंसर सिम्युलेटर टेस्ट",
      accelText: "कंपन त्वरण वेक्टर",
      microphoneText: "ध्वनि आवृत्ति स्तर (डेसिबल)",
      deviationText: "खतरे / अंधेरे पथ की निकटता",
      meshRelayActive: "सेंटी रडार स्कैनर सक्रिय"
    }
  }[lang];

  // Threat score mapping with risk status
  useEffect(() => {
    if (threatScore >= 75) {
      setRiskLevel('CRITICAL');
    } else if (threatScore >= 35) {
      setRiskLevel('WARNING');
    } else {
      setRiskLevel('SAFE');
    }
  }, [threatScore]);

  // Automated Escalation Timer
  useEffect(() => {
    if (riskLevel === 'CRITICAL' && !sosAlertActive) {
      setEscTimer(4);
      const interval = setInterval(() => {
        setEscTimer((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            onEmergencyTriggered();
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (riskLevel !== 'CRITICAL' || sosAlertActive) {
      setEscTimer(null);
    }
  }, [riskLevel, sosAlertActive]);

  // Radar Animation Canvas Effect
  useEffect(() => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    // Pulse circles config
    const pulses = [
      { r: 10, speed: 0.5, alpha: 0.8 },
      { r: 40, speed: 0.3, alpha: 0.5 },
      { r: 80, speed: 0.2, alpha: 0.3 }
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxRadius = Math.min(cx, cy) - 10;

      // Draw Radar circular grid
      ctx.strokeStyle = riskLevel === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : riskLevel === 'WARNING' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1;
      
      // Draw outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Middle grids
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius * 0.66, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius * 0.33, 0, Math.PI * 2);
      ctx.stroke();

      // Horizontal and vertical axis line mapping
      ctx.beginPath();
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.stroke();

      // Draw sweeping scanner line
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      
      // Sweep gradient
      const sweepGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
      const activeColor = riskLevel === 'CRITICAL' ? '239, 68, 68' : riskLevel === 'WARNING' ? '245, 158, 11' : '16, 185, 129';
      sweepGradient.addColorStop(0, `rgba(${activeColor}, 0)`);
      sweepGradient.addColorStop(1, `rgba(${activeColor}, 0.15)`);
      
      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, -0.2, 0);
      ctx.lineTo(0, 0);
      ctx.fill();

      ctx.strokeStyle = `rgba(${activeColor}, 0.8)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxRadius, 0);
      ctx.stroke();
      ctx.restore();

      // Draw sweeping dots (blips) representing simulated threats
      const blips = [
        { x: cx - maxRadius * 0.4, y: cy - maxRadius * 0.3, name: "Police Hut", safe: true },
        { x: cx + maxRadius * 0.5, y: cy + maxRadius * 0.4, name: "Stalker Alert", safe: false }
      ];

      blips.forEach((blip) => {
        ctx.fillStyle = blip.safe ? 'rgba(74, 222, 128, 0.8)' : 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.arc(blip.x, blip.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.font = '8px monospace';
        ctx.fillText(blip.name, blip.x + 8, blip.y + 3);
        
        // Ring
        ctx.strokeStyle = blip.safe ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.arc(blip.x, blip.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Update sweep angle
      angle += 0.035;
      if (angle >= Math.PI * 2) angle = 0;

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [riskLevel]);

  // Audio Capture liveness test using Web Speech API if supported
  const startVoiceListener = () => {
    setIsListeningVoice(true);
    setDetectedKeyword('');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = lang === 'hi' ? 'hi-IN' : 'en-US';

      rec.onresult = (e: any) => {
        const lastIndex = e.results.length - 1;
        const speechText = e.results[lastIndex][0].transcript.toLowerCase();
        console.log("Detected speech:", speechText);
        setDetectedKeyword(speechText);

        const dangerKeywords = ['help', 'bachao', 'emergency', 'rakshika', 'saver', 'sentry', 'save', 'police', 'dost'];
        const matched = dangerKeywords.some(keyword => speechText.includes(keyword));

        if (matched) {
          setThreatScore(85);
          setSensors(prev => ({ ...prev, amplitude: 85 }));
        } else {
          setThreatScore(prev => Math.min(95, prev + 15));
          setSensors(prev => ({ ...prev, amplitude: 50 }));
        }
      };

      rec.onerror = () => setIsListeningVoice(false);
      rec.onend = () => setIsListeningVoice(false);
      rec.start();
    } else {
      // Mock recognition helper if Web Speech unsupported
      setTimeout(() => {
        setDetectedKeyword(lang === 'hi' ? "बचाओ बचाओ (सिम्युलेटेड वॉयस)" : "HELP EMERGENCY (Simulated Voice)");
        setThreatScore(90);
        setSensors(prev => ({ ...prev, amplitude: 90 }));
        setIsListeningVoice(false);
      }, 1500);
    }
  };

  // Run dynamic simulation scenarios for the AI Studio
  const runSimulation = (type: string) => {
    if (simulationTimeoutRef.current) clearTimeout(simulationTimeoutRef.current);
    setActiveSimulation(type);

    if (type === 'snatch') {
      // Violent acceleration vectors
      setSensors({
        accelX: 38.6,
        accelY: -15.4,
        accelZ: -2.3,
        amplitude: 25,
        deviation: 15,
        snatState: 'FORCIBLE_SEPARATED'
      });
      setThreatScore(98);
    } else if (type === 'running') {
      // Pulsing, high acceleration steps
      setSensors({
        accelX: -8.1,
        accelY: 14.5,
        accelZ: 18.2,
        amplitude: 45,
        deviation: 30,
        snatState: 'RUNNING_ACCELERATED'
      });
      setThreatScore(65);
    } else if (type === 'routing') {
      setSensors({
        accelX: 0.5,
        accelY: -0.1,
        accelZ: 9.8,
        amplitude: 12,
        deviation: 88,
        snatState: 'PATH_DEVIATION_DETECTOR'
      });
      setThreatScore(45);
    }
  };

  const handleMuteOrResetAll = () => {
    setActiveSimulation(null);
    setThreatScore(10);
    setSensors({
      accelX: 0.1,
      accelY: -0.2,
      accelZ: 9.81,
      amplitude: 15,
      deviation: 0,
      snatState: 'RETAINED'
    });
    setDetectedKeyword('');
    setEscTimer(null);
  };

  return (
    <div id="ai-threat-shield-wrapper" className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-12 gap-5 select-none md:items-center">
      
      {/* LEFT PORT: CHRONO THREAT RADAR */}
      <div className="md:col-span-4 flex flex-col justify-center items-center text-center space-y-3 relative bg-slate-950/40 p-4 rounded-xl border border-slate-800 shadow-inner">
        <canvas ref={radarCanvasRef} width={200} height={200} className="w-40 h-40" />
        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase flex items-center gap-1.5 justify-center tracking-wide">
          <Activity className={`w-3.5 h-3.5 ${riskLevel === 'CRITICAL' ? 'text-red-500 animate-spin' : riskLevel === 'WARNING' ? 'text-amber-500' : 'text-emerald-500 opacity-60'}`} />
          {t.meshRelayActive}
        </span>
      </div>

      {/* MIDDLE PORT: CURRENT DIAGNOSTICS */}
      <div className="md:col-span-5 space-y-4">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2 font-display">
            <Shield className="w-5 h-5 text-red-500 animate-pulse" />
            <span>{t.title}</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-normal font-mono">
            {t.desc}
          </p>
        </div>

        {/* THREAT SCORES AND GAUGES */}
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-slate-400">{t.scoreLabel}</span>
            <span className={`text-base font-black ${riskLevel === "CRITICAL" ? "text-red-500" : riskLevel === "WARNING" ? "text-amber-500" : "text-emerald-400"}`}>
              {threatScore}/100
            </span>
          </div>

          {/* Progress bar container */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                riskLevel === 'CRITICAL' ? 'bg-red-500' : riskLevel === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${threatScore}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-800 pt-2.5">
            <span className="text-slate-500">{t.riskLabel}</span>
            <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] tracking-wide ${
              riskLevel === 'CRITICAL' 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : riskLevel === 'WARNING' 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              ⚡ {riskLevel}
            </span>
          </div>
        </div>

        {/* VOICE HANDS FREE CONTROL PANEL */}
        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-sm text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isListeningVoice ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`}></span>
            <span className="text-slate-300 font-bold">{isListeningVoice ? t.listening : "Hands-Free Sentry Off"}</span>
          </div>

          <button 
            type="button"
            onClick={startVoiceListener}
            className="text-[10px] uppercase font-black bg-slate-800 hover:bg-slate-750 text-red-400 hover:text-red-300 border border-slate-700 px-2.5 py-1 rounded transition-all cursor-pointer"
          >
            🔊 LISTEN NOW
          </button>
        </div>

        {detectedKeyword && (
          <div className="bg-red-950/40 p-2 border border-red-800/30 rounded-lg text-[10px] text-red-300 font-mono">
            <strong>🗣️ Speech Heard:</strong> "{detectedKeyword}"
          </div>
        )}
      </div>

      {/* RIGHT PORT: SENSORS & ACCEL METRICS & SIMULATORS */}
      <div className="md:col-span-3 space-y-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
          🧪 {t.simulateText}
        </span>

        <div className="flex flex-col gap-1.5 font-mono">
          <button
            onClick={() => runSimulation('snatch')}
            className={`w-full text-left text-[10.5px] font-bold py-2 px-2.5 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
              activeSimulation === 'snatch'
                ? 'bg-red-600 border-red-500 text-white font-heavy scale-95'
                : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300'
            }`}
          >
            <span>🚨 {t.devSnatch}</span>
          </button>

          <button
            onClick={() => runSimulation('running')}
            className={`w-full text-left text-[10.5px] font-bold py-2 px-2.5 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
              activeSimulation === 'running'
                ? 'bg-amber-600 border-amber-500 text-white scale-95'
                : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300'
            }`}
          >
            <span>🏃 {t.runPattern}</span>
          </button>

          <button
            onClick={() => runSimulation('routing')}
            className={`w-full text-left text-[10.5px] font-bold py-2 px-2.5 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
              activeSimulation === 'routing'
                ? 'bg-amber-700 border-amber-600 text-white scale-95'
                : 'bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-300'
            }`}
          >
            <span>🧭 {t.devRoute}</span>
          </button>

          {(activeSimulation || threatScore > 10) && (
            <button
              onClick={handleMuteOrResetAll}
              className="text-center text-[10px] font-black uppercase text-slate-400 bg-slate-800 hover:bg-slate-750 py-1.5 rounded"
            >
              🔄 Reset Senses
            </button>
          )}
        </div>

        {/* TELEMETRY READINGS */}
        <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[9px] font-mono leading-none">
          <div className="flex justify-between">
            <span className="text-slate-500">ACC X/Y/Z (m/s²):</span>
            <span className="text-slate-300 font-bold">
              {sensors.accelX.toFixed(1)} / {sensors.accelY.toFixed(1)} / {sensors.accelZ.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">SOUND LEVEL:</span>
            <span className="text-slate-300 font-bold">{sensors.amplitude} db</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">DEVIATION DIST:</span>
            <span className="text-slate-300 font-bold">{sensors.deviation}m</span>
          </div>
        </div>

        {/* ESCALATION TIMER ON DANGER RED ZONE */}
        {escTimer !== null && (
          <div className="bg-red-600 text-white p-3.5 rounded-xl border border-red-500 text-center font-bold text-xs shadow-md alarm-blink">
            <ShieldAlert className="w-5 h-5 mx-auto mb-1 animate-ping" />
            <span className="font-display block">{t.secondsRemaining.replace('{n}', String(escTimer))}</span>
            <button 
              onClick={handleMuteOrResetAll}
              className="mt-2 bg-white text-red-600 font-black text-[10px] font-mono py-1 px-2.5 rounded hover:bg-slate-100"
            >
              {t.cancelEsc}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
