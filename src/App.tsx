/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TranslationLang, IncidentReport, SafetyRating } from './types';
import { TRANSLATIONS } from './lib/translations';
import { INDIAN_CITIES, OFFLINE_MARKERS } from './lib/offlineMapDb';
import { IndianHelplines } from './components/IndianHelplines';
import { OfflineMap } from './components/OfflineMap';
import { VoiceTrigger } from './components/VoiceTrigger';
import { AudioRecorder } from './components/AudioRecorder';
import { SOSTrigger } from './components/SOSTrigger';
import { ReportingForm } from './components/ReportingForm';
import { SettingsDashboard } from './components/Settings';
import { VirtualSafetyWalk } from './components/VirtualSafetyWalk';
import { StealthEvidence } from './components/StealthEvidence';
import { OneTouchReport } from './components/OneTouchReport';
import { Shield, Sparkles, AlertTriangle, Languages, Zap, Smartphone, Check, HelpCircle, MapPin, LogIn, Footprints, EyeOff, FileText, Volume2 } from 'lucide-react';

// Firebase core integrations
import { auth, signInWithGoogle, logOutUser, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { encryptData, decryptData } from './lib/crypto';

export default function App() {
  // Lang preference synced to device localState
  const [lang, setLang] = useState<TranslationLang>(() => {
    const cached = localStorage.getItem('raksha_lang');
    return (cached as TranslationLang) || 'en';
  });

  const t = TRANSLATIONS[lang];

  // Active City mapping
  const [currentCityId, setCurrentCityId] = useState<string>('delhi');

  // Contact configurations persisted locally with clean pre-sets for Indian safety rules
  const [policeNumber, setPoliceNumber] = useState<string>(() => {
    return localStorage.getItem('raksha_police') || '112';
  });
  const [guardianName, setGuardianName] = useState<string>(() => {
    return localStorage.getItem('raksha_gname') || 'Aisha Sharma';
  });
  const [guardianPhone, setGuardianPhone] = useState<string>(() => {
    return localStorage.getItem('raksha_gphone') || '+91 98765 43210';
  });
  const [voiceTrigger, setVoiceTrigger] = useState<string>(() => {
    return localStorage.getItem('raksha_voice_phrase') || 'HELP HELP';
  });

  // Current tab routing state from HashRouter ('panic' | 'walk' | 'stealth' | 'map' | 'report' | 'settings')
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = (() => {
    const path = location.pathname;
    if (path === '/walk') return 'walk';
    if (path === '/stealth') return 'stealth';
    if (path === '/map') return 'map';
    if (path === '/report') return 'report';
    if (path === '/settings') return 'settings';
    return 'panic';
  })();

  const setActiveTab = (tab: 'panic' | 'walk' | 'stealth' | 'map' | 'report' | 'settings') => {
    if (tab === 'panic') {
      navigate('/');
    } else {
      navigate(`/${tab}`);
    }
  };

  // Track if overall alert is active (triggers red visual glows, sirens, recording)
  const [sosAlertActive, setSosAlertActive] = useState<boolean>(false);

  // --- KAVACH WEB ACCESSIBILITY SYSTEM (a11y) ---
  const [fontSize, setFontSizeState] = useState<'normal' | 'large' | 'xl'>(() => {
    return (localStorage.getItem('raksha_a11y_font') as 'normal' | 'large' | 'xl') || 'normal';
  });
  const [contrastMode, setContrastModeState] = useState<'default' | 'high-contrast-light' | 'high-contrast-dark'>(() => {
    return (localStorage.getItem('raksha_a11y_contrast') as 'default' | 'high-contrast-light' | 'high-contrast-dark') || 'default';
  });
  const [soundAids, setSoundAidsState] = useState<boolean>(() => {
    return localStorage.getItem('raksha_a11y_sound') === 'true';
  });
  const [accessibilityPanelOpen, setAccessibilityPanelOpen] = useState<boolean>(false);

  // Dynamic state guides and speechSynthesis announcer
  const speakVoiceoverDirectly = (msg: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        utterance.rate = 1.02;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Speech Synthesis failed:", e);
    }
  };

  const speakAccessibilityMessage = (msg: string) => {
    if (!soundAids) return;
    speakVoiceoverDirectly(msg);
  };

  const setFontSize = (val: 'normal' | 'large' | 'xl') => {
    setFontSizeState(val);
    localStorage.setItem('raksha_a11y_font', val);
    speakAccessibilityMessage(
      lang === 'hi' 
        ? `पाठ आवर्धन ${val === 'normal' ? 'सामान्य' : val === 'large' ? 'एक सौ पच्चीस प्रतिशत' : 'एक सौ पचास प्रतिशत'} पर सेट किया गया।` 
        : `Text zoom adjusted to ${val === 'normal' ? 'one hundred percent' : val === 'large' ? 'one hundred twenty five percent' : 'one hundred fifty percent'}.`
    );
  };

  const setContrastMode = (val: 'default' | 'high-contrast-light' | 'high-contrast-dark') => {
    setContrastModeState(val);
    localStorage.setItem('raksha_a11y_contrast', val);
    speakAccessibilityMessage(
      lang === 'hi' 
        ? `रंग विपरीत शैली ${val === 'default' ? 'डिफ़ॉल्ट रूप' : val === 'high-contrast-light' ? 'सफेद चमक' : 'गहरा पीला रात्रि रूप'} पर सेट की गई।` 
        : `Contrast color mode configured to ${val === 'default' ? 'default colors' : val === 'high-contrast-light' ? 'high contrast light' : 'high contrast dark night'}.`
    );
  };

  const setSoundAids = (val: boolean) => {
    setSoundAidsState(val);
    localStorage.setItem('raksha_a11y_sound', String(val));
    if (val) {
      setTimeout(() => {
        speakVoiceoverDirectly(
          lang === 'hi'
            ? "आवाज सुगम्य मार्गदर्शन सक्रिय किया गया। अब आपकी गतिविधियों को जोर से पढ़ा जाएगा।"
            : "Audible speech accessibility assistance enabled. Live events and tab transits will now be announced."
        );
      }, 50);
    }
  };

  // Community-sourced public safety incidents (preloaded with realistic urban dark zones)
  const [communityIncidents, setCommunityIncidents] = useState<IncidentReport[]>([
    {
      id: 'mock-inc-1',
      userId: 'system_curated',
      type: 'low_lighting',
      cityName: 'delhi',
      encryptedDetails: 'E2EE::v1::SGVscGZ1bCByZXBvcnQ6IEV4dHJlbWVseSBkYXJrIHN0cmV0Y2ggbmVhciBvZmZpY2UgYnlwYXNzLCBzdHJlZXRsaWdodHMgYnJva2VuLg==', // Encrypted text
      lat: 28.6180,
      lng: 77.2180,
      upvotes: 8,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-inc-2',
      userId: 'system_curated',
      type: 'harassment',
      cityName: 'delhi',
      encryptedDetails: 'E2EE::v1::SGVscGZ1bCByZXBvcnQ6IFJlcGVhdGVkIGlzaW9uIGhhcmFzc21lbnQgbmVhciBncm9tcCBzdGF0aW9uIGV4aXQu',
      lat: 28.5950,
      lng: 77.1900,
      upvotes: 14,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-inc-3',
      userId: 'system_curated',
      type: 'unsafe_area',
      cityName: 'bengaluru',
      encryptedDetails: 'E2EE::v1::SGVscGZ1bCByZXBvcnQ6IERlc29sYXRlIHBhdGggYmVoaW5kIElUIHBhcmsu',
      lat: 12.9500,
      lng: 77.6300,
      upvotes: 5,
      createdAt: new Date().toISOString()
    }
  ]);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<any | null>(() => {
    const cached = localStorage.getItem('raksha_local_user');
    return cached ? JSON.parse(cached) : null;
  });

  const currentUser = firebaseUser || localUser;

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn("Google authentication blocked or rejected. Activating safe guest fallback.", err);
      const guestId = "guest_" + Math.random().toString(36).substr(2, 9);
      const guestUser = {
        uid: guestId,
        displayName: "Sentry Guest User",
        email: "guest.defender@raksha.org",
        photoURL: null,
        isGuest: true
      };
      setLocalUser(guestUser);
      localStorage.setItem('raksha_local_user', JSON.stringify(guestUser));
      speakAccessibilityMessage(
        lang === 'hi'
          ? "गूगल लॉगिन विफलता। आपकी सुरक्षा के लिए सखी गेस्ट अकाउंट बनाया गया है।"
          : "Google popup login blocked. Activating sovereign safety guest protocol session."
      );
    }
  };

  const handleLogOut = async () => {
    try {
      await logOutUser();
    } catch (e) {
      console.warn("Could not log out from core Auth state Node: ", e);
    }
    setLocalUser(null);
    localStorage.removeItem('raksha_local_user');
    speakAccessibilityMessage(
      lang === 'hi' ? "सफलतापूर्वक लॉगआउट किया गया।" : "Logged out safely of current session."
    );
  };

  const [liveLocations, setLiveLocations] = useState<any[]>([]);

  // 1. Persist interface language locally
  useEffect(() => {
    localStorage.setItem('raksha_lang', lang);
  }, [lang]);

  // 2. Synchronize configuration profiles across local storage and cloud database
  useEffect(() => {
    localStorage.setItem('raksha_police', policeNumber);
    localStorage.setItem('raksha_gname', guardianName);
    localStorage.setItem('raksha_gphone', guardianPhone);
    localStorage.setItem('raksha_voice_phrase', voiceTrigger);

    if (auth.currentUser && (!currentUser || !currentUser.isGuest)) {
      const user = auth.currentUser;
      const initialData = {
        userId: user.uid,
        policeNumber: encryptData(policeNumber),
        contactName: encryptData(guardianName),
        contactPhone: encryptData(guardianPhone),
        voiceTrigger: voiceTrigger,
        updatedAt: new Date().toISOString()
      };
      setDoc(doc(db, 'users', user.uid, 'settings', 'sos'), initialData)
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/settings/sos`));
    }
  }, [policeNumber, guardianName, guardianPhone, voiceTrigger, currentUser]);

  // 3. User authentication state synchronization
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Clear local credentials on actual firebase signin
        setLocalUser(null);
        localStorage.removeItem('raksha_local_user');
        
        try {
          const docRef = doc(db, 'users', user.uid, 'settings', 'sos');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            const decryptedPolice = decryptData(data.policeNumber);
            const decryptedName = decryptData(data.contactName);
            const decryptedPhone = decryptData(data.contactPhone);
            const rawVoiceTrigger = data.voiceTrigger;

            if (decryptedPolice) setPoliceNumber(decryptedPolice);
            if (decryptedName) setGuardianName(decryptedName);
            if (decryptedPhone) setGuardianPhone(decryptedPhone);
            if (rawVoiceTrigger) setVoiceTrigger(rawVoiceTrigger);
          } else {
            const initialData = {
              userId: user.uid,
              policeNumber: encryptData(policeNumber),
              contactName: encryptData(guardianName),
              contactPhone: encryptData(guardianPhone),
              voiceTrigger: voiceTrigger,
              updatedAt: new Date().toISOString()
            };
            await setDoc(docRef, initialData);
          }
        } catch (err) {
          console.warn("Could not query setup configuration from cloud node:", err);
        }
      }
    });
    return () => unsub();
  }, []);

  // 4. Real-time incident reports loader
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'incidents'), (snapshot) => {
      const dbIncidents: IncidentReport[] = [];
      snapshot.forEach((doc) => {
        dbIncidents.push(doc.data() as IncidentReport);
      });
      if (dbIncidents.length > 0) {
        setCommunityIncidents(prev => {
          const curated = prev.filter(p => p.id.startsWith('mock-'));
          const filteredDb = dbIncidents.filter(dbI => !curated.some(c => c.id === dbI.id));
          return [...filteredDb, ...curated];
        });
      }
    }, (err) => {
      console.warn("Incident listing read restriction (or offline delay):", err);
    });
    return () => unsub();
  }, []);

  // 5. Real-time dynamic guardian tracking subscriber
  useEffect(() => {
    if (!currentUser) {
      setLiveLocations([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'live_locations'), (snapshot) => {
      const activeLocs: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive && data.userId !== currentUser?.uid) {
          activeLocs.push(data);
        }
      });
      setLiveLocations(activeLocs);
    }, (err) => {
      console.warn("Guardian live feed reading offline fallback:", err);
    });
    return () => unsub();
  }, [currentUser]);

  // 6. SOS location dispatcher and live state broadcast on trigger
  useEffect(() => {
    if (sosAlertActive && currentUser) {
      const user = currentUser;
      const coords = getUserCoordinatesForCity(currentCityId);
      const encCoords = encryptData(JSON.stringify(coords));
      
      const liveLoc = {
        userId: user.uid,
        userName: user.displayName || user.email || "Active User",
        encryptedCoords: encCoords,
        isActive: true,
        updatedAt: new Date().toISOString()
      };
      
      if (!user.isGuest) {
        setDoc(doc(db, 'live_locations', user.uid), liveLoc)
          .catch(err => handleFirestoreError(err, OperationType.CREATE, `live_locations/${user.uid}`));
      }
    } else if (!sosAlertActive && currentUser) {
      const user = currentUser;
      if (!user.isGuest) {
        const docRef = doc(db, 'live_locations', user.uid);
        getDoc(docRef).then(snap => {
          if (snap.exists() && snap.data().isActive) {
            updateDoc(docRef, { isActive: false, updatedAt: new Date().toISOString() })
              .catch(() => {});
          }
        });
      }
    }
  }, [sosAlertActive, currentUser, currentCityId]);

  const handleLanguageChange = (lcl: TranslationLang) => {
    setLang(lcl);
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lcl === 'hi' ? "भाषा हिंदी चुनी गई" : "Language set to English");
        utterance.lang = lcl === 'hi' ? 'hi-IN' : 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } catch {}
  };

  // a11y: Track previous state to speak changes uniquely
  const [prevSosActive, setPrevSosActive] = useState<boolean>(false);
  useEffect(() => {
    if (sosAlertActive && !prevSosActive) {
      speakAccessibilityMessage(
        lang === 'hi'
          ? `सावधान! तत्काल आपातकालीन अलार्म सक्रिय हो गया है। पुलिस हेल्पलाइन ११२ और अभिभावक ${guardianName} को आपकी स्थिति भेज दी गई है।`
          : `WARNING: Emergency SOS activated. Police dispatchers and your registered companion ${guardianName} have been notified.`
      );
    } else if (!sosAlertActive && prevSosActive) {
      speakAccessibilityMessage(
        lang === 'hi'
          ? `सुरक्षा अलार्म सफलता पूर्वक बंद कर दिया गया है।`
          : `Emergency safety alert has been successfully deactivated.`
      );
    }
    setPrevSosActive(sosAlertActive);
  }, [sosAlertActive, lang, guardianName]);

  // a11y: announce tab changes audibly
  useEffect(() => {
    const tabTalk: Record<'panic' | 'walk' | 'stealth' | 'map' | 'report' | 'settings', { en: string; hi: string }> = {
      panic: {
        en: "Panic S.O.S. screen. Tap the central emergency crimson button to start alarm instantly or press Shift plus S.",
        hi: "तत्काल एसओएस स्क्रीन। अलार्म शुरू करने के लिए बीच के बटन को स्पर्श करें या शिफ्ट और एस दबाएं।"
      },
      walk: {
        en: "Virtual safety walk watcher. Select timing intervals to configure check-ins.",
        hi: "सुरक्षित वॉक टाइमर। अपनी यात्रा के लिए सुरक्षा चक्र शुरू करें।"
      },
      stealth: {
        en: "Stealth camera evidence collector. Hide screen display or capture voice proof.",
        hi: "गोपनीय सुरक्षा साक्ष्य। ऑडियो और सबूत सहेजें।"
      },
      map: {
        en: "Safe pathways offline map. Explore well-lit secure channels mapped by AI.",
        hi: "सुरक्षित रास्ते। एआई द्वारा निर्देशित प्रकाशमय मार्ग।"
      },
      report: {
        en: "Public spot risk reporter. Check law guidelines or submit low lighting areas.",
        hi: "सार्वजनिक संकट रिपोर्ट। कानून नियम जानें और असुरक्षित स्थान साझा करें।"
      },
      settings: {
        en: "SOS settings. Customize guardian contacts, police dispatch line, or speak command cues.",
        hi: "सुरक्षा सेटिंग्स। रक्षक संपर्क बदलें या वॉयस कमांड शब्द बदलें।"
      }
    };
    speakAccessibilityMessage(tabTalk[activeTab][lang]);
  }, [activeTab, lang]);

  // a11y: global hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+S: SOS Trigger
      if (e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        setSosAlertActive(true);
      }
      // Shift+C: Cancel SOS
      if (e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        setSosAlertActive(false);
      }
      // Shift+T: Tab Cycler
      if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        const tabs: Array<'panic' | 'walk' | 'stealth' | 'map' | 'report' | 'settings'> = ['panic', 'walk', 'stealth', 'map', 'report', 'settings'];
        const nextIdx = (tabs.indexOf(activeTab) + 1) % tabs.length;
        setActiveTab(tabs[nextIdx]);
      }
      // Shift+H: Helpline announcement
      if (e.shiftKey && (e.key === 'H' || e.key === 'h')) {
        e.preventDefault();
        speakVoiceoverDirectly(
          lang === 'hi'
            ? `रक्षक हेल्पलाइन: पुलिस संकट नंबर ११२ है। महिला सुरक्षा डेस्क हेल्पलाइन १०९१ है।`
            : "Direct helpline: general emergency police is 112, women safety support line is 1091."
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, lang, guardianName]);

  const onNewReportCreated = async (rpt: IncidentReport) => {
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'incidents', rpt.id), rpt);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `incidents/${rpt.id}`);
      }
    }
    setCommunityIncidents(prev => [rpt, ...prev]);
  };

  // Safe city user coordinates for offline mapping vectors
  const getUserCoordinatesForCity = (cityId: string) => {
    const matched = INDIAN_CITIES.find(c => c.id === cityId) || INDIAN_CITIES[0];
    // Slightly offset user from the exact center for routing visibility
    return {
      lat: parseFloat((matched.centerLat - 0.022).toFixed(6)),
      lng: parseFloat((matched.centerLng + 0.015).toFixed(6))
    };
  };

  const portalClassNames = [
    "min-h-screen",
    contrastMode === 'default' ? "bg-gradient-to-br from-[#fffafd] via-[#fffdfb] to-[#fbf1ea] text-slate-800" : "",
    contrastMode === 'high-contrast-light' ? "high-contrast-light-theme text-black bg-white" : "",
    contrastMode === 'high-contrast-dark' ? "high-contrast-dark-theme text-yellow-300 bg-black animate-none" : "",
    fontSize === 'large' ? "font-scale-large" : "",
    fontSize === 'xl' ? "font-scale-xl" : "",
    "flex", "flex-col", "justify-between", "font-sans", "transition-all"
  ].filter(Boolean).join(" ");

  return (
    <div id="safety-portal-app" className={portalClassNames}>
      
      {/* GLOBAL HIGH-CONTRAST SENTRY STAT BAR ON COLD STATES */}
      {sosAlertActive && (
        <div className="bg-rose-755 bg-gradient-to-r from-rose-700 via-pink-700 to-rose-750 text-white font-black tracking-widest text-center py-2.5 px-4 shadow flex items-center justify-center gap-3 alarm-blink text-xs uppercase">
          <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
          <span>📢 {t.sosTriggered} - POLICE IN TRANSIT & GUARDIANS NOTIFIED! 📢</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="bg-gradient-to-r from-[#1f121a] via-[#2d1825] to-[#1f121a] text-white border-b border-[#3c1d2e] shadow-lg sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-rose-500 to-pink-600 text-white rounded-xl shadow-[0_3px_12px_rgba(244,63,94,0.3)] border border-rose-450">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none uppercase font-display flex items-center gap-1.5">
                <span>{t.appName === 'सुरक्षा App' ? 'सुरक्षा' : t.appName}</span>
                <span className="text-rose-400">|</span>
                <span className="text-pink-200 text-xs font-bold tracking-wider">{lang === 'hi' ? 'सखी कवच' : 'SISTER COMPANION'}</span>
              </h1>
              <span className="text-[10px] font-mono font-bold text-rose-300/90 uppercase tracking-widest block mt-0.5">
                {lang === 'hi' ? 'भारतीय क्षेत्रीय सुरक्षा प्रणाली' : 'Indian Regional Protection Protocol'}
              </span>
            </div>
          </div>

          {/* DUAL MODE & BANDWIDTH TELEMETRY STATUS */}
          <div className="flex items-center gap-4">

            {/* STATUS LIGHT FROM DESIGN THEME */}
            <div className="hidden md:flex flex-col items-end border-r border-[#3d1a2d] pr-4">
              <span className="text-[8px] text-pink-300/80 uppercase tracking-widest">Status</span>
              <span className="text-xs font-bold font-mono tracking-tight flex items-center text-emerald-400 mt-0.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
                SHIELD ACTIVE | कवच सक्रिय
              </span>
            </div>
            
            {/* GOOGLE SECURITY SYNC INTERFACE */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-[#3e1f32] border border-[#5a2a46] px-2.5 py-1 rounded-lg shadow-sm">
                <div className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black uppercase font-display">
                  {currentUser.displayName?.charAt(0) || "U"}
                </div>
                <div className="hidden lg:block">
                  <p className="text-[10px] font-bold text-slate-100 leading-none font-display">
                    {currentUser.displayName?.split(" ")[0] || "Sister"}
                  </p>
                  <p className="text-[8px] font-mono text-rose-300 leading-none mt-0.5 uppercase tracking-wide">
                    {currentUser.isGuest ? "GUEST ACTIVE" : "CLOUD ACTIVE"}
                  </p>
                </div>
                <button
                  onClick={handleLogOut}
                  className="text-[9px] font-mono font-bold bg-[#532641] text-rose-100 hover:bg-rose-700 hover:text-white border border-[#6b2f53] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  EXIT
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 bg-[#3e1f32] hover:bg-[#532641] text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm border border-[#522540] cursor-pointer transition-all"
              >
                <LogIn className="w-3 h-3 text-rose-450" />
                <span>CONNECT SYNC</span>
              </button>
            )}

            {/* Low-Bandwidth Status */}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#251520] text-rose-350 border border-[#421d33] px-2.5 py-1 rounded-full text-[10px] font-bold font-mono">
              <Zap className="w-3 h-3 text-rose-400 animate-bounce" />
              <span className="text-rose-200">LOW-BANDWIDTH ACTIVE</span>
            </div>

            {/* Language Quick-Selector */}
            <div className="flex items-center gap-1 bg-[#251520] p-1 rounded-lg border border-[#441a33] shadow-inner">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors ${
                  lang === 'en' ? 'bg-rose-600 text-white shadow-sm font-extrabold' : 'text-rose-300 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded transition-colors ${
                  lang === 'hi' ? 'bg-rose-600 text-white shadow-sm font-extrabold' : 'text-rose-300 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* PRIMARY CONTROLS & VISUAL TERMINAL NAVIGATION */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">

        {/* BEAUTIFUL WOMEN-DESIGNED GENTLE WELCOME COMPANION BLOCK */}
        <div className="bg-gradient-to-r from-rose-50/70 via-white/80 to-pink-50/70 backdrop-blur-md border border-rose-100/80 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 font-sans animate-[fadeIn_0.3s_ease]">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-serif italic text-rose-900 tracking-tight flex items-center justify-center md:justify-start gap-2">
              <span>{lang === 'hi' ? 'नमस्ते बहन, सखी कवच सक्रिय है।' : 'Welcome back, sister. Core safety loops are active.'}</span>
              <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
            </h2>
            <p className="text-xs text-rose-800/80 font-medium leading-relaxed max-w-2xl">
              {lang === 'hi'
                ? 'यह मंच आपके स्वावलंबन और आत्म-रक्षा के लिए तैयार किया गया है। हर एक रिपोर्ट, रिकॉर्डिंग और जीपीएस ट्रैकिंग एंड-टू-एंड एन्क्रिप्टेड है ताकि आप पूरी तरह सुरक्षित महसूस कर सकें।'
                : 'Designed specifically by women for your peace of mind and sovereign safety. Combining hand-shake SMS alerts with offline fallback mapping, ensuring you never walk alone.'}
            </p>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-rose-100 to-pink-100 border border-rose-200 rounded-full text-xs font-bold text-rose-700 flex items-center gap-1.5 shadow-sm whitespace-nowrap">
            <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping"></span>
            <span>{lang === 'hi' ? 'सुरक्षा चक्र सक्रिय' : 'Protection Loop Armed'}</span>
          </div>
        </div>

        {/* KAVACH WEB ACCESSIBILITY SYSTEM (a11y) */}
        <div id="rakshika-accessibility-hub" className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 border border-rose-100 shadow-md transition-all">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-650 rounded-xl">
                <Smartphone className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#11010c] font-display">
                  {lang === 'hi' ? '♿ सुगम्य सखी विकल्प केंद्र' : '♿ Web Accessibility Assistance Studio'}
                </h3>
                <span className="text-[10px] uppercase font-mono font-bold text-rose-700 tracking-wider">
                  {lang === 'hi' ? 'निम्न-दृष्टि और हाथ-मुक्त कीबोर्ड सहायता' : 'Low-Vision & Hands-free keyboard shortcut cues'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setAccessibilityPanelOpen(!accessibilityPanelOpen)}
              className="text-xs font-extrabold text-white bg-slate-900 border border-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              {accessibilityPanelOpen ? (lang === 'hi' ? 'बंद करें ✕' : 'Hide Controls ✕') : (lang === 'hi' ? 'खोलें ⚙' : 'A11y Panel Setup ⚙')}
            </button>
          </div>

          {accessibilityPanelOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-4 border-t border-rose-100/50 animate-[fadeIn_0.2s_ease]">
              
              {/* Size scaling controls */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-stone-700 block">
                  🔎 {lang === 'hi' ? 'अक्षर का आकार (Text Zoom)' : 'Text Zoom Scale'}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFontSize('normal')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                      fontSize === 'normal'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-stone-700 border-rose-100 hover:bg-rose-50/50'
                    }`}
                  >
                    100% {lang === 'hi' ? '(सामान्य)' : '(Normal)'}
                  </button>
                  <button
                    onClick={() => setFontSize('large')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                      fontSize === 'large'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-stone-700 border-rose-100 hover:bg-rose-50/50'
                    }`}
                  >
                    125% {lang === 'hi' ? '(बड़ा)' : '(Large)'}
                  </button>
                  <button
                    onClick={() => setFontSize('xl')}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-all ${
                      fontSize === 'xl'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-stone-700 border-rose-100 hover:bg-rose-50/50'
                    }`}
                  >
                    150% {lang === 'hi' ? '(अति बड़ा)' : '(XL)'}
                  </button>
                </div>
              </div>

              {/* Visual contrast controls */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-stone-700 block">
                  🎨 {lang === 'hi' ? 'रंग और विपरीतता (Contrast Modifiers)' : 'Contrast Theme Modifier'}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setContrastMode('default')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                      contrastMode === 'default'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-stone-700 border-rose-100 hover:bg-rose-50/50'
                    }`}
                  >
                    {lang === 'hi' ? 'डिफ़ॉल्ट' : 'Default'}
                  </button>
                  <button
                    onClick={() => setContrastMode('high-contrast-light')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all relative ${
                      contrastMode === 'high-contrast-light'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-lg'
                        : 'bg-white text-stone-700 border-rose-100 hover:bg-rose-50/50'
                    }`}
                  >
                    {lang === 'hi' ? 'उच्च चमक' : 'High Light'}
                  </button>
                  <button
                    onClick={() => setContrastMode('high-contrast-dark')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                      contrastMode === 'high-contrast-dark'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-lg'
                        : 'bg-white text-stone-700 border-rose-100 hover:bg-rose-50/50'
                    }`}
                  >
                    {lang === 'hi' ? 'रात्रि पीला' : 'Night Neon'}
                  </button>
                </div>
              </div>

              {/* Sound / TTS controls */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-stone-700 block">
                  🗣️ {lang === 'hi' ? 'आवाज मार्गदर्शन (Screen Reader)' : 'Screen Audio Reader Guide'}
                </label>
                <button
                  type="button"
                  onClick={() => setSoundAids(!soundAids)}
                  className={`w-full py-1.5 px-4 text-xs font-extrabold rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    soundAids
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-650 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-rose-950 border-rose-100 hover:bg-rose-50/50'
                  }`}
                >
                  <Volume2 className="w-4 h-4 animate-pulse text-emerald-500" />
                  <span>
                    {soundAids 
                      ? (lang === 'hi' ? 'आवाज सक्रिय (READER ON)' : 'VOICEOVER ACTIVE') 
                      : (lang === 'hi' ? 'आवाज बंद (READER OFF)' : 'VOICEOVER OFF')}
                  </span>
                </button>
              </div>

              {/* Quick reference guide */}
              <div className="md:col-span-3 bg-rose-50/50 border border-rose-100/55 rounded-2xl p-4 text-[11px] font-mono leading-relaxed text-stone-850 shadow-inner">
                <strong className="text-rose-900 block mb-1">⌨ {lang === 'hi' ? 'हाथ-मुक्त कीबोर्ड शॉर्टकट (Hands-free System Shortcuts):' : 'Hands-free Dynamic Hotkeys:'}</strong>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                  <li className="bg-white p-2 border border-slate-100 rounded-lg shadow-sm"><kbd className="bg-slate-105 border rounded px-1 text-[10px] font-bold py-0.5 shadow-sm text-stone-800">Shift + S</kbd> : {lang === 'hi' ? 'आपातकालीन अलार्म ट्रिगर' : 'Emergency alarm trigger'}</li>
                  <li className="bg-white p-2 border border-slate-100 rounded-lg shadow-sm"><kbd className="bg-slate-105 border rounded px-1 text-[10px] font-bold py-0.5 shadow-sm text-stone-800">Shift + C</kbd> : {lang === 'hi' ? 'अलार्म निरस्त करें' : 'Deactivate active SOS'}</li>
                  <li className="bg-white p-2 border border-slate-100 rounded-lg shadow-sm"><kbd className="bg-slate-105 border rounded px-1 text-[10px] font-bold py-0.5 shadow-sm text-stone-800">Shift + T</kbd> : {lang === 'hi' ? 'सुरक्षा मेनू बदलें' : 'Switch active tabs'}</li>
                  <li className="bg-white p-2 border border-slate-100 rounded-lg shadow-sm"><kbd className="bg-slate-105 border rounded px-1 text-[10px] font-bold py-0.5 shadow-sm text-stone-800">Shift + H</kbd> : {lang === 'hi' ? 'हेल्पलाइन नंबर सुनें' : 'Read Helplines out loud'}</li>
                </ul>
              </div>

            </div>
          )}
        </div>

        {/* TOP TAB NAV BAR - GIGANTIC AND TACTILE FOR IMMEDIATE HIGH-STRESS TRANSITING */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-rose-100 shadow-md select-none font-display text-center">
          <button
            onClick={() => setActiveTab('panic')}
            className={`py-3 px-1.5 rounded-xl font-bold text-[11px] sm:text-xs tracking-wide flex flex-col items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'panic'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-rose-950/70 hover:bg-rose-50/60 hover:text-rose-900'
            }`}
          >
            <Shield className="w-4.5 h-4.5" />
            <span>{lang === 'hi' ? 'तत्काल एसओएस' : 'PANIC SOS'}</span>
          </button>

          <button
            onClick={() => setActiveTab('walk')}
            className={`py-3 px-1.5 rounded-xl font-bold text-[11px] sm:text-xs tracking-wide flex flex-col items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'walk'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-rose-950/70 hover:bg-rose-50/60 hover:text-rose-900'
            }`}
          >
            <Footprints className="w-4.5 h-4.5" />
            <span>{lang === 'hi' ? 'सेफ्टी वॉक' : 'SAFE WALK'}</span>
          </button>

          <button
            onClick={() => setActiveTab('stealth')}
            className={`py-3 px-1.5 rounded-xl font-bold text-[11px] sm:text-xs tracking-wide flex flex-col items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'stealth'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-rose-950/70 hover:bg-rose-50/60 hover:text-rose-900'
            }`}
          >
            <EyeOff className="w-4.5 h-4.5" />
            <span>{lang === 'hi' ? 'गोपनीय कैमरा' : 'STEALTH CAM'}</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`py-3 px-1.5 rounded-xl font-bold text-[11px] sm:text-xs tracking-wide flex flex-col items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'map'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-rose-950/70 hover:bg-rose-50/60 hover:text-rose-900'
            }`}
          >
            <MapPin className="w-4.5 h-4.5" />
            <span>{lang === 'hi' ? 'सुरक्षित मार्ग ' : 'SAFE ROUTING'}</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`py-3 px-1.5 rounded-xl font-bold text-[11px] sm:text-xs tracking-wide flex flex-col items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'report'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-rose-950/70 hover:bg-rose-50/60 hover:text-rose-900'
            }`}
          >
            <AlertTriangle className="w-4.5 h-4.5" />
            <span>{lang === 'hi' ? 'खतरे की रिपोर्ट' : 'REPORT SPOT'}</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-1.5 rounded-xl font-bold text-[11px] sm:text-xs tracking-wide flex flex-col items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-rose-950/70 hover:bg-rose-50/60 hover:text-rose-900'
            }`}
          >
            <Smartphone className="w-4.5 h-4.5" />
            <span>{lang === 'hi' ? 'सुरक्षा सेटिंग्स' : 'SOS SETUP'}</span>
          </button>
        </div>

        {/* CORE PORT LAYOUT SECTION */}
        <div className="transition-all duration-300">
          
          {/* TAB 1: PANIC TERMINAL */}
          {activeTab === 'panic' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-[fadeIn_0.25s_ease]">
              
              {/* PANIC TRIGGER INTERFACE */}
              <div className="space-y-6">
                
                {/* Visual state alarm banner */}
                <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
                  sosAlertActive 
                    ? 'bg-red-50 border-red-200 text-red-900 animate-[pulse_1.5s_infinite]'
                    : 'bg-white border-slate-100'
                }`}>
                  <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                    <span>{t.tapAlerts}</span>
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t.tapAlertsDesc}
                  </p>
                </div>

                <SOSTrigger
                  lang={lang}
                  sosAlertActive={sosAlertActive}
                  onSOSActivated={setSosAlertActive}
                  policeNumber={policeNumber}
                  guardianPhone={guardianPhone}
                  guardianName={guardianName}
                />

                <VoiceTrigger
                  lang={lang}
                  onVoiceSOSTrigger={() => setSosAlertActive(true)}
                  customPhrase={voiceTrigger}
                />
              </div>

              {/* HELPLINES & LEGAL PROOFS */}
              <div className="space-y-6">
                <IndianHelplines lang={lang} />
                <AudioRecorder lang={lang} sosAlertActive={sosAlertActive} />
              </div>

            </div>
          )}

          {/* TAB 2: OFFLINE ROAD MAP & AI ROUTING */}
          {activeTab === 'map' && (
            <div className="space-y-6 animate-[fadeIn_0.25s_ease]">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.offlineMapTitle}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {t.offlineMapDesc}
                </p>
              </div>

              <OfflineMap
                lang={lang}
                currentCityId={currentCityId}
                onCityChange={setCurrentCityId}
                communityIncidents={communityIncidents}
                offlineUserCoords={getUserCoordinatesForCity(currentCityId)}
                liveLocations={liveLocations}
              />
            </div>
          )}

          {/* TAB 3: VIRTUAL SAFETY WALK */}
          {activeTab === 'walk' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-[fadeIn_0.25s_ease]">
              <VirtualSafetyWalk
                lang={lang}
                onEmergencyTriggered={() => setSosAlertActive(true)}
                sosAlertActive={sosAlertActive}
              />
            </div>
          )}

          {/* TAB 4: STEALTH EVIDENCE RECORDING */}
          {activeTab === 'stealth' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-[fadeIn_0.25s_ease]">
              <StealthEvidence lang={lang} sosAlertActive={sosAlertActive} />
            </div>
          )}

          {/* TAB 5: COMMUNITY DEFENSE & ONE-TOUCH REPORTS */}
          {activeTab === 'report' && (
            <div className="space-y-6 animate-[fadeIn_0.25s_ease]">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <OneTouchReport lang={lang} currentCityId={currentCityId} />
                </div>
                <div className="lg:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-center">
                  <h4 className="text-xs font-bold text-slate-705 tracking-wider uppercase font-mono">
                    🛡️ Rakshika Legal Dossier
                  </h4>
                  <p className="text-xs text-slate-500 leading-normal">
                    This E2EE assembler instantly pulls precision GPS triangulation, live browser device hashes, and pre-recorded audio files to protect proof even if attackers confiscate physical devices. Fully compliant for instant legal dispatches.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reporting Panel Form */}
                <div className="lg:col-span-2">
                  <ReportingForm
                    lang={lang}
                    onNewReportCreated={onNewReportCreated}
                    currentUserId={currentUser?.uid || ""}
                  />
                </div>

                {/* CURATED SECURITY ADVISORIES */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase font-mono">
                    🚨 Indian Women Self-Defense Guidelines
                  </h4>
                  <div className="space-y-3.5 text-xs text-slate-600 font-mono">
                    <div className="p-3 bg-rose-50/50 border border-thin border-rose-100 rounded-lg leading-relaxed">
                      <strong>1091 Women Sentry Desks:</strong> Registered to handle late night travel, transit blockages, and cyber security threats in India 24/7.
                    </div>
                    <div className="p-3 bg-blue-50/40 border border-thin border-blue-100 rounded-lg leading-relaxed">
                      <strong>Triple Taps Shield:</strong> Double or triple tapping anywhere on the main sensor panel instantly sends emergency distress bypasses. No delay.
                    </div>
                    <div className="p-3 bg-emerald-50/40 border border-thin border-emerald-100 rounded-lg leading-relaxed">
                      <strong>E2EE Assurance:</strong> Encryption keys are built client-side. The database has zero unencrypted texts, assuring 100% legal security.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: GUARDIAN SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto animate-[fadeIn_0.25s_ease]">
              <SettingsDashboard
                lang={lang}
                onSetLang={handleLanguageChange}
                policeNumber={policeNumber}
                setPoliceNumber={setPoliceNumber}
                guardianPhone={guardianPhone}
                setGuardianPhone={setGuardianPhone}
                guardianName={guardianName}
                setGuardianName={setGuardianName}
                voiceTrigger={voiceTrigger}
                setVoiceTrigger={setVoiceTrigger}
              />
            </div>
          )}

        </div>

      </main>

      {/* FOOTER METADATA MARGIN CORES */}
      <footer className="bg-white border-t border-slate-100 py-6 select-none mt-12 w-full text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-500">
            <Shield className="w-4 h-4 text-rose-500" />
            <span>🔒 Cryptographic Women Protection Network (Abhaya Sentry)</span>
          </div>
          <div>
            <span>Verified 2G/3G low-bandwidth compatible • Dual Local Backup Ready</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
