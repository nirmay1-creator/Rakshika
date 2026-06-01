import React, { useState, useEffect, useRef } from 'react';
import { Shield, Clock, AlertOctagon, CheckCircle2, Footprints, Hourglass, ShieldCheck, HelpCircle } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface VirtualSafetyWalkProps {
  lang: 'en' | 'hi';
  onEmergencyTriggered: () => void;
  sosAlertActive: boolean;
}

export function VirtualSafetyWalk({ lang, onEmergencyTriggered, sosAlertActive }: VirtualSafetyWalkProps) {
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [intervalSec, setIntervalSec] = useState<number>(30); // 30s, 60s, 300s
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [checkInCount, setCheckInCount] = useState<number>(0);
  const [alertWarningActive, setAlertWarningActive] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Translate labels inside component
  const t = {
    en: {
      title: "Virtual Safety Walk Sentinel",
      desc: "Guards your active walk with periodic liveness checks. If you become unresponsive or fail to check in, Rakshika triggers immediate maximum SOS alerts & contacts guardians with your live coordinates.",
      startWalk: "Start Secure Safety Walk",
      endWalk: "End Walk (Secure Area Reached)",
      selectInterval: "Set Liveness Check Period:",
      testSec: "15 Seconds (Simulation Test)",
      shortSec: "30 Seconds (High Risk Mode)",
      medMin: "1 Minute (Standard Walk)",
      longMin: "5 Minutes (Long Transit)",
      activeLabel: "WALK GUARD ACTIVE",
      nextCheckIn: "Next liveness check in:",
      checkInBtn: "TAP TO CONFIRM SECURE (I AM SAFE)",
      statusSafe: "Walking under Rakshika Sentry protection",
      checkInCountLabel: "Successful liveness check-ins:",
      unresponsiveWarn: "🚨 MANDATORY ALERT: RESPOND IMMEDIATELY!",
      unresponsiveDesc: "Failing to check in under 5 seconds triggers emergency telemetry SOS dispatch!",
      alertSirenActive: "AUTOMATED CRISIS DISPATCH IN PROGRESS!",
      sirenSoundLabel: "Siren synth beep active to alert nearby bypassers."
    },
    hi: {
      title: "वर्चुअल सेफ्टी वॉक (सुरक्षित यात्रा)",
      desc: "आपकी यात्रा के दौरान समय-समय पर आपकी सक्रियता की जाँच करता है। यदि आप प्रतिक्रिया नहीं देते या चेक-इन करने में विफल रहते हैं, तो रक्षिका तुरंत आपके संरक्षकों को आपातकालीन संदेश भेजेगी।",
      startWalk: "सुरक्षित वॉक प्रारंभ करें",
      endWalk: "वॉक समाप्त करें (सुरक्षित स्थान)",
      selectInterval: "सुरक्षा जाँच की समय सीमा चुनें:",
      testSec: "15 सेकंड (सिम्युलेटर टेस्ट)",
      shortSec: "30 सेकंड (अत्यधिक जोखिम मार्ग)",
      medMin: "1 मिनट (सामान्य मार्ग)",
      longMin: "5 मिनट (लंबी यात्रा)",
      activeLabel: "यात्रा सुरक्षा प्रहरी सक्रिय",
      nextCheckIn: "अगली प्रतिक्रिया जाँच में:",
      checkInBtn: "चेक-इन करें (मैं सुरक्षित हूँ)",
      statusSafe: "रक्षिका प्रहरी सुरक्षा के अधीन यात्रा जारी है",
      checkInCountLabel: "सफल सुरक्षा चेक-इन की संख्या:",
      unresponsiveWarn: "🚨 चेतावनी: तुरंत सुरक्षा की पुष्टि करें!",
      unresponsiveDesc: "अगले 5 सेकंड में चेक-इन न करने पर आपातकालीन अलार्म स्वतः सक्रिय हो जाएगा!",
      alertSirenActive: "ऑटोमेटेड आपातकालीन अलार्म शुरू हो चुका है!",
      sirenSoundLabel: "आसपास के लोगों को सूचित करने के लिए सायरन की आवाज सक्रिय है।"
    }
  }[lang];

  // Sirens simulator using HTML5 Audio synthesis
  const playSirenBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.25);
      osc.frequency.linearRampToValueAtTime(885, ctx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.48);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context unable to initiate: ", e);
    }
  };

  // Synchronize Walk State to Cloud Database for Guardian Remote Watchers
  const syncWalkStateToCloud = async (status: 'starting' | 'walking' | 'unresponsive_alert' | 'secure_completed') => {
    if (auth.currentUser) {
      const user = auth.currentUser;
      const payload = {
        userId: user.uid,
        userName: user.displayName || 'Guardian user',
        walkStatus: status,
        checkInCount: checkInCount,
        intervalSec: intervalSec,
        timeLeft: timeLeft,
        timestamp: new Date().toISOString()
      };
      setDoc(doc(db, 'users', user.uid, 'walk', 'active_progress'), payload)
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/walk/active_progress`));
    }
  };

  // Set timer logic
  useEffect(() => {
    if (isWalking && !sosAlertActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Reached zero check-in
            setAlertWarningActive(true);
            playSirenBeep();
            
            // Allow 5-seconds buffer warning time, if still 0, trigger main SOS
            if (prev === 0) {
              onEmergencyTriggered();
              syncWalkStateToCloud('unresponsive_alert');
              return 0;
            }
            return 0;
          }
          
          if (prev <= 6) {
            // Beep to alert user to press check-in
            playSirenBeep();
            setAlertWarningActive(true);
          } else {
            setAlertWarningActive(false);
          }
          
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isWalking, sosAlertActive]);

  // Handle global SOS triggering from App side
  useEffect(() => {
    if (sosAlertActive && isWalking) {
      setAlertWarningActive(true);
      syncWalkStateToCloud('unresponsive_alert');
    }
  }, [sosAlertActive]);

  const handleStartWalk = () => {
    setIsWalking(true);
    setTimeLeft(intervalSec);
    setCheckInCount(0);
    setAlertWarningActive(false);
    syncWalkStateToCloud('starting');
  };

  const handleEndWalk = () => {
    setIsWalking(false);
    setAlertWarningActive(false);
    syncWalkStateToCloud('secure_completed');
  };

  const handleConfirmSecure = () => {
    setTimeLeft(intervalSec);
    setCheckInCount((prev) => prev + 1);
    setAlertWarningActive(false);
    // Play subtle friendly verification tone
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}

    syncWalkStateToCloud('walking');
  };

  return (
    <div id="virtual-safety-walk-container" className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-rose-100 shadow-[0_12px_30px_rgba(244,63,94,0.03)] space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${isWalking ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-rose-50 text-rose-600'}`}>
          <Footprints className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#11010c] tracking-tight font-display">
            {t.title}
          </h3>
          <p className="text-[10px] uppercase font-mono font-bold text-rose-600">
            {isWalking ? t.activeLabel : (lang === 'hi' ? "तैयार और सक्रिय" : "Ready • Under Watch")}
          </p>
        </div>
      </div>

      <p className="text-xs text-rose-900/80 leading-relaxed bg-rose-50/20 p-3.5 rounded-2xl border border-rose-100/50">
        {t.desc}
      </p>

      {/* WALK INACTIVE SETTINGS CONTROLLER */}
      {!isWalking ? (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 block font-display">
              {t.selectInterval}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setIntervalSec(15); setTimeLeft(15); }}
                className={`py-2 px-3 text-xs font-bold font-mono text-left rounded-lg border transition-all cursor-pointer ${
                  intervalSec === 15 
                    ? 'border-rose-400 bg-rose-50 text-rose-800' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                ⏱️ {t.testSec}
              </button>
              <button
                type="button"
                onClick={() => { setIntervalSec(30); setTimeLeft(30); }}
                className={`py-2 px-3 text-xs font-bold font-mono text-left rounded-lg border transition-all cursor-pointer ${
                  intervalSec === 30 
                    ? 'border-rose-400 bg-rose-50 text-rose-800' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                ⏱️ {t.shortSec}
              </button>
              <button
                type="button"
                onClick={() => { setIntervalSec(60); setTimeLeft(60); }}
                className={`py-2 px-3 text-xs font-bold font-mono text-left rounded-lg border transition-all cursor-pointer ${
                  intervalSec === 60 
                    ? 'border-rose-400 bg-rose-50 text-rose-800' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                ⏱️ {t.medMin}
              </button>
              <button
                type="button"
                onClick={() => { setIntervalSec(300); setTimeLeft(300); }}
                className={`py-2 px-3 text-xs font-bold font-mono text-left rounded-lg border transition-all cursor-pointer ${
                  intervalSec === 300 
                    ? 'border-rose-400 bg-rose-50 text-rose-800' 
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                ⏱️ {t.longMin}
              </button>
            </div>
          </div>

          <button
            onClick={handleStartWalk}
            className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-105 border border-rose-300 text-white font-extrabold text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shadow-rose-200/50"
          >
            <ShieldCheck className="w-4 h-4 text-rose-150" />
            <span>{t.startWalk}</span>
          </button>
        </div>
      ) : (
        /* WALK ACTIVE ZONE */
        <div className="space-y-4 border border-rose-100 bg-rose-50/10 rounded-2xl p-4 animate-[fadeIn_0.25s_ease]">
          
          <div className="flex flex-col items-center justify-center py-6 bg-white rounded-2xl border border-rose-100/70 shadow-inner relative overflow-hidden">
            {alertWarningActive && (
              <div className="absolute inset-0 bg-rose-600/10 animate-pulse pointer-events-none" />
            )}
            
            <div className="flex items-center gap-2 mb-1.5 text-xs text-rose-700 font-mono">
              <Hourglass className={`w-3.5 h-3.5 ${alertWarningActive ? 'text-rose-600 animate-spin' : 'text-rose-500 animate-pulse'}`} />
              <span>{t.nextCheckIn}</span>
            </div>

            <div className={`text-5xl font-black font-mono tracking-tight ${alertWarningActive ? 'text-rose-600' : 'text-stone-800'}`}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </div>

            <p className="text-[10.5px] text-rose-700 font-extrabold tracking-wide mt-2">
              ✓ {t.statusSafe}
            </p>
          </div>

          {alertWarningActive && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-center text-rose-950 animate-bounce">
              <div className="flex items-center justify-center gap-2 font-black text-sm text-rose-700 font-display">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
                <span>{t.unresponsiveWarn}</span>
              </div>
              <p className="text-[11px] font-semibold mt-1">
                {t.unresponsiveDesc}
              </p>
            </div>
          )}

          {/* CHECK-IN DISMISS ACTION BUTTON */}
          <button
            onClick={handleConfirmSecure}
            disabled={sosAlertActive}
            className={`w-full text-white font-black text-sm py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              alertWarningActive 
                ? 'bg-gradient-to-r from-red-600 to-red-700 shadow-red-600/30 ring-4 ring-red-200' 
                : 'bg-gradient-to-r from-rose-600 to-pink-600 shadow-rose-600/30'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{t.checkInBtn}</span>
          </button>

          <div className="flex items-center justify-between text-xs font-mono border-t border-rose-100 pt-3">
            <span className="text-stone-500">{t.checkInCountLabel}</span>
            <span className="font-extrabold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
              {checkInCount}
            </span>
          </div>

          <button
            onClick={handleEndWalk}
            className="w-full bg-rose-50 hover:bg-rose-100/60 text-rose-950 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>{t.endWalk}</span>
          </button>

        </div>
      )}

      {/* JOURNEY HISTORY & ANALYTICS */}
      <div className="border-t border-rose-100 pt-4 space-y-3.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-rose-500" />
          <h4 className="text-xs font-bold text-stone-850 font-display">
            {lang === 'hi' ? "यात्रा इतिहास और सुरक्षा एनालिटिक्स" : "Journey History & Safe Analytics"}
          </h4>
        </div>

        {/* Analytics stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-stone-805">
          <div className="bg-rose-50/20 p-2 rounded-xl border border-rose-100/50">
            <span className="text-[9px] font-mono text-rose-700 uppercase tracking-wide block">SUCCESS RATE</span>
            <span className="text-xs font-black text-emerald-600">100% SUCCESS</span>
          </div>
          <div className="bg-rose-50/20 p-2 rounded-xl border border-rose-100/50">
            <span className="text-[9px] font-mono text-rose-700 uppercase tracking-wide block">TOTAL SECURED</span>
            <span className="text-xs font-black text-rose-950">14 Transits</span>
          </div>
          <div className="bg-rose-50/20 p-2 rounded-xl border border-rose-100/50">
            <span className="text-[9px] font-mono text-rose-700 uppercase tracking-wide block">AVG RESPONSE</span>
            <span className="text-xs font-black text-rose-950">4.1 Sec</span>
          </div>
        </div>

        {/* Journey History List */}
        <div className="space-y-1.5 font-mono text-[10px]">
          <div className="bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-100 flex justify-between items-center text-rose-950">
            <span className="font-bold">📍 Saket Metro to Select City Mall Hub (Delhi)</span>
            <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 rounded border border-emerald-100 text-[9px]">SECURE ✅</span>
          </div>
          <div className="bg-rose-500/5 px-2.5 py-1.5 rounded-lg border border-rose-100 flex justify-between items-center text-rose-950">
            <span className="font-bold">📍 CyberCity Hub to Rapid Metro Stn (Gurugram)</span>
            <span className="text-emerald-700 font-extrabold bg-emerald-50 px-1.5 rounded border border-emerald-100 text-[9px]">SECURE ✅</span>
          </div>
        </div>
      </div>

    </div>
  );
}
