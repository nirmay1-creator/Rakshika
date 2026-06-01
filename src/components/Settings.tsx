/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Settings, Shield, KeyRound, Languages, Volume2, Save, UserCheck, AlertOctagon } from 'lucide-react';
import { TranslationLang, EmergencyContact } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { getLocalStorageEncryptionKey } from '../lib/crypto';

interface SettingsProps {
  lang: TranslationLang;
  onSetLang: (l: TranslationLang) => void;
  policeNumber: string;
  setPoliceNumber: (num: string) => void;
  guardianPhone: string;
  setGuardianPhone: (num: string) => void;
  guardianName: string;
  setGuardianName: (name: string) => void;
  voiceTrigger: string;
  setVoiceTrigger: (phrase: string) => void;
}

export function SettingsDashboard({
  lang,
  onSetLang,
  policeNumber,
  setPoliceNumber,
  guardianPhone,
  setGuardianPhone,
  guardianName,
  setGuardianName,
  voiceTrigger,
  setVoiceTrigger
}: SettingsProps) {
  const t = TRANSLATIONS[lang];
  const e2eeKey = getLocalStorageEncryptionKey();
  
  const [lclPolice, setLclPolice] = useState<string>(policeNumber);
  const [lclName, setLclName] = useState<string>(guardianName);
  const [lclPhone, setLclPhone] = useState<string>(guardianPhone);
  const [lclPhrase, setLclPhrase] = useState<string>(voiceTrigger);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSavingDashboard = (e: FormEvent) => {
    e.preventDefault();
    setPoliceNumber(lclPolice.trim());
    setGuardianName(lclName.trim());
    setGuardianPhone(lclPhone.trim());
    setVoiceTrigger(lclPhrase.trim());

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div id="settings-dashboard-container" className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-rose-100 shadow-[0_12px_30px_rgba(244,63,94,0.03)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#11010c] tracking-tight font-display">
            {t.settingsTitle}
          </h3>
          <p className="text-[10px] font-mono font-bold text-rose-700 uppercase tracking-wider">
            🚨 SECURE DEVICE SISTER SHIELD & COOP REGISTRATION
          </p>
        </div>
      </div>

      <p className="text-xs text-rose-950/80 font-medium leading-relaxed mb-5">
        {t.settingsDesc}
      </p>

      {/* SECURE FORM LAYOUT */}
      <form onSubmit={handleSavingDashboard} className="space-y-4">
        
        {/* LANG TIGHTS */}
        <div className="p-3.5 bg-rose-50/20 border border-rose-100/50 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-rose-700/80" />
            <span className="text-xs font-bold text-stone-700">{lang === 'hi' ? 'भाषा चुनें (Language):' : 'Interface Language:'}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onSetLang('en')}
              className={`text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                lang === 'en' 
                  ? 'bg-rose-600 text-white shadow-md' 
                  : 'bg-white border border-rose-100 text-rose-900 hover:bg-rose-50/50'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onSetLang('hi')}
              className={`text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                lang === 'hi' 
                  ? 'bg-rose-600 text-white shadow-md' 
                  : 'bg-white border border-rose-100 text-rose-900 hover:bg-rose-50/50'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* POLICE NUM */}
        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1">
            🚓 {t.policeNum}
          </label>
          <input
            type="text"
            value={lclPolice}
            onChange={(e) => setLclPolice(e.target.value)}
            className="w-full text-xs p-3.5 bg-[#fefcfd] border border-rose-100 rounded-xl outline-none focus:bg-white focus:border-rose-500 text-stone-850 font-mono font-bold shadow-inner"
            required
          />
        </div>

        {/* GUARDIAN INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              👤 {t.guardianName}
            </label>
            <input
              type="text"
              value={lclName}
              onChange={(e) => setLclName(e.target.value)}
              className="w-full text-xs p-3.5 bg-[#fefcfd] border border-rose-100 rounded-xl outline-none focus:bg-white focus:border-rose-500 text-stone-850 font-bold shadow-inner"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">
              📞 {t.guardianPhone}
            </label>
            <input
              type="tel"
              value={lclPhone}
              onChange={(e) => setLclPhone(e.target.value)}
              className="w-full text-xs p-3.5 bg-[#fefcfd] border border-rose-100 rounded-xl outline-none focus:bg-white focus:border-rose-500 text-stone-850 font-mono font-bold shadow-inner"
              required
            />
          </div>
        </div>

        {/* CUSTOM TRIGGER PHRASES */}
        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1">
            🗣️ Custom Voice Trigger SOS Sentry Word / Phrase
          </label>
          <input
            type="text"
            value={lclPhrase}
            onChange={(e) => setLclPhrase(e.target.value)}
            placeholder={t.customTriggerPlaceholder}
            className="w-full text-xs p-3.5 bg-[#fefcfd] border border-rose-100 rounded-xl outline-none focus:bg-white focus:border-rose-500 text-stone-850 font-bold shadow-inner"
          />
          <span className="text-[10px] text-rose-800 block mt-1 leading-snug font-medium">
            * Say this phrase out loud when voice commands are active to trigger automated crisis SOS alarms.
          </span>
        </div>

        {/* SECTOR KEY ACCORDION */}
        <div className="bg-[#291723] text-rose-100 rounded-2xl p-4 border border-[#3f1f34] shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-rose-455 font-extrabold font-display">
            <KeyRound className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-mono tracking-wider">🔒 DEVICE-LEVEL HARDWARE CRYPTO STORAGE (E2EE)</span>
          </div>
          <p className="text-[10.5px] text-rose-200/80 leading-relaxed mb-3">
            To fulfill uncompromised safety constraints, this companion hardware sandbox uses local hardware private cipher-scrambling. 
            All contacts, numbers, custom words, and live locations are scrambled BEFORE any transit.
          </p>

          <div className="flex items-center justify-between text-[11px] font-mono bg-[#1d0e19] p-3 rounded-xl border border-[#35192c]">
            <span className="text-rose-400/80">Device Safe Key:</span>
            <span className="font-bold text-rose-300 tracking-widest text-[10px] truncate max-w-[180px]">
              {e2eeKey}
            </span>
          </div>
        </div>

        {/* SAVE PROGRESS CONTAINER */}
        <div className="flex gap-3 justify-end items-center pt-2">
          {saved && (
            <span className="text-xs text-emerald-600 font-extrabold flex items-center gap-1.5 animate-pulse">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>{lang==='hi'?'सेटिंग्स सुरक्षित रूप से सहेजी गईं!':'Secure settings locked and synced!'}</span>
            </span>
          )}

          <button
            type="submit"
            className="bg-gradient-to-r from-rose-600 to-pink-600 hover:brightness-105 hover:scale-101 border border-rose-400 text-white text-xs font-extrabold py-3 px-6 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Save className="w-4 h-4 text-rose-100" />
            <span>{lang==='hi'?'जानकारी सुरक्षित सहेजें':'Apply Emergency Customization'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
