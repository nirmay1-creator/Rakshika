import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Shield, Car, User, Navigation, AlertOctagon, Phone, UserCheck, Battery, Power, Check, Volume2 } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface RideProps {
  lang: 'en' | 'hi';
  onEmergencyTrigger: () => void;
}

export function RideGuardian({ lang, onEmergencyTrigger }: RideProps) {
  // Taxi parameters
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [isRideActive, setIsRideActive] = useState<boolean>(false);
  const [routeDeviatedAlert, setRouteDeviatedAlert] = useState<boolean>(false);
  
  // Fake Call setup
  const [callerName, setCallerName] = useState<string>('Mom / माँ');
  const [callDelay, setCallDelay] = useState<number>(5); // seconds
  const [ringState, setRingState] = useState<'IDLE' | 'SCHEDULED' | 'RINGING' | 'CONNECTED'>('IDLE');
  const [voicePlaybackActive, setVoicePlaybackActive] = useState<boolean>(false);
  
  // Battery emergency
  const [simulatedBattery, setSimulatedBattery] = useState<number>(85);
  const [isLowPowerActive, setIsLowPowerActive] = useState<boolean>(false);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const ringAudioRef = useRef<AudioContext | null>(null);

  const t = {
    en: {
      rideTitle: "Ride Safety Sentry",
      rideDesc: "Protects you during taxi/rideshares. Register vehicle identity & route bounds. Rakshika continuously audits your transit vector.",
      numberPlat: "Vehicle License Number (e.g., DL3C-AB-1234)",
      driverPlat: "Driver Full Name / Contact Details",
      startRide: "Deploy Ride Sentry Monitoring",
      activeStatus: "CAB SENTRY DEPLOYED",
      mismatchAlert: "⚠️ UNEXPECTED ROUTE DEVIATION DETECTED",
      mismatchDesc: "Your vehicle has veered 350 meters off the standard highway track. If this is an emergency, trigger SOS.",
      fakeCallTitle: "Stealth Fake Call Escape",
      fakeCallDesc: "Avoid discomfort or threatening environments. Schedules a realistic fake incoming call from family or police departments.",
      triggerDelay: "Schedule Ring in (Seconds):",
      callerNameLabel: "Select Outward Caller Profile:",
      btnCallNow: "Instant Ring (3s)",
      btnScheduleCall: "Schedule Escort Call",
      btnEndCall: "Decline Call",
      btnAcceptCall: "Accept Call",
      ringTitle: "INCOMING EMERGENCY CALL",
      speakingLabel: "Guardian speaking: 'Aisha, where are you? I am waiting with the police team.'",
      batteryTitle: "Low Battery Rescue Grid",
      batteryDesc: "If battery drops under 10%, Rakshika immediately uploads last GPS snapshot, alerts guardians, and shifts into low-bandwidth dark mode.",
      activateLowBattery: "Simulate Critical Battery (<10%)",
      batteryStatusLabel: "Sentry Emergency Beacon Active!",
      guardianAlerted: "✓ Guardian contact backup list successfully alerted with coordinate logs."
    },
    hi: {
      rideTitle: "टैक्सी और सफ़र सुरक्षा प्रहरी",
      rideDesc: "टैक्सी/ऑटो यात्रा के दौरान आपकी रक्षा करता है। गाड़ी नंबर और ड्राइवर का नाम दर्ज करें। रक्षिका लगातार स्थान का ऑडिट करेगी।",
      numberPlat: "गाड़ी लाइसेंन्स नंबर (उदा. DL3C-AB-1234)",
      driverPlat: "ड्राइवर का नाम या फ़ोन नंबर",
      startRide: "सफ़र सुरक्षा तैनात करें",
      activeStatus: "सफ़र प्रहरी सक्रिय है",
      mismatchAlert: "⚠️ मार्ग विचलन: अनपेक्षित रास्ता पकड़ा है",
      mismatchDesc: "आपकी गाड़ी निर्धारित ट्रैक से 350 मीटर दूर जा चुकी है। खतरे के समय तुरंत एसओएस सक्षम करें।",
      fakeCallTitle: "नकली कॉल स्केप प्रणाली",
      fakeCallDesc: "असहज परिस्थितियों से बचने के लिए परिवार या पुलिस से नकली इनकमिंग कॉल शेड्यूल करें।",
      triggerDelay: "कॉल आने का समय (सेकंड):",
      callerNameLabel: "कॉल करने वाले का विवरण:",
      btnCallNow: "तुरंत रिंग (3 सेकंड)",
      btnScheduleCall: "नकली कॉल की व्यवस्था करें",
      btnEndCall: "कॉल काटें",
      btnAcceptCall: "कॉल उठाएं",
      ringTitle: "इनकमिंग सुरक्षा सहायता कॉल",
      speakingLabel: "संरक्षक की आवाज: 'बेटा कहाँ हो? मैं पुलिस चौकी के बाहर खड़ा हूँ आपका इंतज़ार कर रहा हूँ।'",
      batteryTitle: "लो-बैटरी जीपीएस बचाव प्रणाली",
      batteryDesc: "बैटरी 10% से कम होने पर, रक्षिका स्वतः जीपीएस लोकेशन अपलोड करती है और संरक्षकों को अलर्ट भेजकर डार्क लो-बैंडविड्थ में शिफ्ट हो जाती है।",
      activateLowBattery: "क्रिटिकल बैटरी का परीक्षण करें (<10%)",
      batteryStatusLabel: "लो-बैटरी बीकन अलर्ट चालू है!",
      guardianAlerted: "✓ आख़िरी लोकेशन विवरण संरक्षकों को सफलतापूर्वक प्रेषित कर दिया गया है।"
    }
  }[lang];

  // Synthesize Phone Standard ring tones
  const playSynthesizedRingTone = () => {
    try {
      if (!ringAudioRef.current) {
        ringAudioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ringAudioRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.9);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 2.0);
      osc2.stop(ctx.currentTime + 2.0);
    } catch (e) {}
  };

  // Scheduled Call Timer
  useEffect(() => {
    if (ringState === 'SCHEDULED' && callDelay > 0) {
      const timer = setTimeout(() => {
        setRingState('RINGING');
      }, callDelay * 1000);
      return () => clearTimeout(timer);
    }
  }, [ringState, callDelay]);

  // Periodic ring vibration tone synthesizer
  useEffect(() => {
    let interval: any;
    if (ringState === 'RINGING') {
      playSynthesizedRingTone();
      interval = setInterval(() => {
        playSynthesizedRingTone();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [ringState]);

  // Handle active call simulated talk
  const handleAnswerCall = () => {
    setRingState('CONNECTED');
    setVoicePlaybackActive(true);
    
    // Play realistic spoken warning voice targeting harassers
    try {
      if ('speechSynthesis' in window) {
        const text = lang === 'hi' 
          ? "हाँ बेटा, बिल्कुल! मैं और पुलिस ऑफिसर मिश्राजी आपकी लाइव लोकेशन देख रहे हैं। हम बस पार्क के पास वाले चौराहे पर खड़े हैं, आप कितनी देर में टैक्सी से पहुँच रही हो?"
          : "Yes Aisha, we see your active GPS coordinates on Google Maps. Officer Mishra and I are waiting right at the main roundabout. Let us know the moment your taxi reaches.";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {}
  };

  const handleDeclineCall = () => {
    setRingState('IDLE');
    setVoicePlaybackActive(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Simulate taxi tracking state
  const handleDeployRide = () => {
    setIsRideActive(true);
    setRouteDeviatedAlert(false);

    // After 6 seconds, simulate a route deflection alert!
    setTimeout(() => {
      setRouteDeviatedAlert(true);
    }, 6000);
  };

  // Simulate Battery rescue beacon
  const handleBatteryCriticalTrigger = async () => {
    setSimulatedBattery(7);
    setIsLowPowerActive(true);

    if (auth.currentUser) {
      const user = auth.currentUser;
      const data = {
        userId: user.uid,
        batteryStatus: '7%',
        lastKnownGPS: { lat: 28.61, lng: 77.22 },
        timestamp: new Date().toISOString(),
        criticalMode: true
      };
      setDoc(doc(db, 'users', user.uid, 'battery_rescue', 'beacon'), data)
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/battery_rescue/beacon`));
    }
  };

  return (
    <div id="ride-guardian-dashboard" className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none leading-relaxed text-xs">
      
      {/* COLUMN 1: RIDE SENTRY */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl">
            <Car className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">{t.rideTitle}</h3>
            <p className="text-[10px] text-slate-400 font-mono">ENCRYPTED VEHICLE MATRIX</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-normal">
          {t.rideDesc}
        </p>

        {/* INPUTS FIELD */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.numberPlat}</label>
            <input 
              type="text"
              placeholder="e.g. DL3C-AH-7722"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              disabled={isRideActive}
              className="w-full bg-white border border-slate-250 py-2 px-3 rounded-lg outline-none text-xs text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.driverPlat}</label>
            <input 
              type="text"
              placeholder="e.g. Ramesh Singh / +91 99999 88888"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              disabled={isRideActive}
              className="w-full bg-white border border-slate-250 py-2 px-3 rounded-lg outline-none text-xs text-slate-800"
            />
          </div>

          {!isRideActive ? (
            <button
              onClick={handleDeployRide}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{t.startRide}</span>
            </button>
          ) : (
            <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200 text-center font-black uppercase text-[10px] tracking-wider font-mono">
              ✓ {t.activeStatus}
            </div>
          )}
        </div>

        {/* ROUTE DEVIATION DEFEAT SYSTEM */}
        {routeDeviatedAlert && isRideActive && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-3.5 text-red-950 space-y-2 animate-bounce">
            <div className="flex items-center gap-2 font-bold text-red-800">
              <AlertOctagon className="w-4 h-4 animate-ping" />
              <span>{t.mismatchAlert}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {t.mismatchDesc}
            </p>
            <button
              onClick={onEmergencyTrigger}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-heavy text-xs py-2 rounded-lg"
            >
              🚨 FIRE INSTANT SOS ESCALATION
            </button>
          </div>
        )}
      </div>

      {/* COLUMN 2: STEALTH FAKE CALL SYSTEM & BATTERY RESCUE */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-5">
        
        {/* FAKE CALL */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-slate-900 border border-slate-950 text-white rounded-xl">
              <Phone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">{t.fakeCallTitle}</h3>
              <p className="text-[10px] text-slate-400 font-mono font-bold">ANTI-THREAT ESCAPE VESSEL</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            {t.fakeCallDesc}
          </p>

          {ringState === 'IDLE' ? (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">{t.callerNameLabel}</label>
                  <select
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    className="w-full bg-white border border-slate-250 p-1.5 rounded-lg outline-none text-xs"
                  >
                    <option value="Mom / माँ">✨ Mom / माँ</option>
                    <option value="Dad / पिता">✨ Dad / पिता</option>
                    <option value="Inspector Rawat">👮 Inspector Rawat</option>
                    <option value="Pink Patrol Patrol">🌸 Pink Patrol Helpline</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block">{t.triggerDelay}</label>
                  <select
                    value={callDelay}
                    onChange={(e) => setCallDelay(Number(e.target.value))}
                    className="w-full bg-white border border-slate-250 p-1.5 rounded-lg outline-none text-xs"
                  >
                    <option value={3}>3 Seconds</option>
                    <option value={10}>10 Seconds</option>
                    <option value={30}>30 Seconds</option>
                    <option value={60}>1 Minute</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setCallDelay(3); setRingState('SCHEDULED'); }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg cursor-pointer text-center"
                >
                  {t.btnCallNow}
                </button>
                <button
                  onClick={() => setRingState('SCHEDULED')}
                  className="bg-red-600 hover:bg-red-700 text-white font-heavy py-2 rounded-lg cursor-pointer text-center"
                >
                  {t.btnScheduleCall}
                </button>
              </div>
            </div>
          ) : null}

          {/* RING STATE OVERLAY MODAL / SCREEN CARDS */}
          {ringState === 'RINGING' && (
            <div className="p-4 bg-emerald-600 text-white rounded-xl border border-emerald-500 text-center space-y-3 animate-pulse">
              <div>
                <span className="text-[10px] uppercase font-mono bg-white/20 px-2 py-0.5 rounded tracking-widest">{t.ringTitle}</span>
                <p className="text-xl font-black mt-2 font-display">{callerName}</p>
                <p className="text-xs text-white/80 font-mono mt-0.5">+91 SOS-SAFE-LINE</p>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDeclineCall}
                  className="bg-red-600 font-bold px-4 py-2 rounded-lg hover:bg-red-700 border border-red-500 text-xs"
                >
                  ❌ {t.btnEndCall}
                </button>
                <button
                  onClick={handleAnswerCall}
                  className="bg-white text-emerald-800 font-heavy px-4 py-2 rounded-lg hover:bg-slate-50 text-xs"
                >
                  📞 {t.btnAcceptCall}
                </button>
              </div>
            </div>
          )}

          {ringState === 'CONNECTED' && (
            <div className="p-4 bg-slate-900 border border-slate-950 text-white rounded-xl text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
                <p className="text-sm font-bold">{callerName} - CONNECTED</p>
              </div>
              <p className="text-xs bg-slate-950 text-slate-300 p-3 rounded-lg border border-slate-800 italic leading-snug">
                {t.speakingLabel}
              </p>
              <button
                onClick={handleDeclineCall}
                className="w-full bg-red-600 hover:bg-red-700 font-bold py-1.5 rounded-lg text-xs"
              >
                End Speaking Feed
              </button>
            </div>
          )}
        </div>

        {/* BATTERY EMERGENCY SHIELD */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className={`w-5 h-5 ${simulatedBattery <= 10 ? 'text-red-500 animate-bounce' : 'text-slate-500'}`} />
              <span className="font-bold text-slate-900 font-display">{t.batteryTitle}</span>
            </div>
            <span className={`font-mono font-bold ${simulatedBattery <= 10 ? 'text-red-600 font-black' : 'text-slate-500'}`}>
              ⚡ {simulatedBattery}%
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            {t.batteryDesc}
          </p>

          {!isLowPowerActive ? (
            <button
              onClick={handleBatteryCriticalTrigger}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 text-red-500" />
              <span>{t.activateLowBattery}</span>
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-3 space-y-1 animate-pulse text-[11px] font-mono font-medium">
              <div className="font-bold flex items-center gap-1.5 text-red-700">
                <Check className="w-3.5 h-3.5 text-red-600" />
                <span>{t.batteryStatusLabel}</span>
              </div>
              <p>{t.guardianAlerted}</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
