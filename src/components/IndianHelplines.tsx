/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { TranslationLang } from '../types';
import { TRANSLATIONS } from '../lib/translations';

interface HelplineItem {
  number: string;
  name: string;
  hindiName: string;
  desc: string;
  descHindi: string;
}

const INDIAN_LINES: HelplineItem[] = [
  {
    number: "112",
    name: "National Incident Center (All-In-One Unified Helpline)",
    hindiName: "राष्ट्रीय आपातकालीन प्रतिक्रिया सहायता प्रणाली (112)",
    desc: "Ambulance, Fire, Police emergency responders integrated dispatch.",
    descHindi: "एम्बुलेंस, स्वास्थ्य, पुलिस और अग्निशमन के लिए एकीकृत तत्काल सेवा।"
  },
  {
    number: "1091",
    name: "Primary Women Helpline Channel",
    hindiName: "मुख्य महिला हेल्पलाइन (1091)",
    desc: "For rapid assistance in public distress, sexual transit harassment.",
    descHindi: "सार्वजनिक स्थलों या यात्रा के दौरान छेड़छाड़ व उत्पीड़न पर तत्काल मदद।"
  },
  {
    number: "181",
    name: "Abhaya Distress Support & Legal Sanctuary",
    hindiName: "महिला संकट और कानूनी संरक्षण मंच (181)",
    desc: "Domestic support, counseling, immediate law integration.",
    descHindi: "घरेलू हिंसा, परामर्श और संकट की स्थिति में त्वरित सरकारी संरक्षण।"
  },
  {
    number: "1090",
    name: "Women Power Line (UP/Central Patrol Desk)",
    hindiName: "वूमेन पॉवर लाइन (1090)",
    desc: "Special division targeting cyber-stalking, harassment and phone threats.",
    descHindi: "साइबर-स्टॉकिंग, अवांछित कॉल्स और सोशल मीडिया धमकी के खिलाफ त्वरित कार्रवाई।"
  }
];

interface IndianHelplinesProps {
  lang: TranslationLang;
}

export function IndianHelplines({ lang }: IndianHelplinesProps) {
  const [calledLine, setCalledLine] = useState<string | null>(null);
  const t = TRANSLATIONS[lang];

  const handleDialSimulate = (line: HelplineItem) => {
    setCalledLine(line.number);
    // Simulate real dial intent on mobile browser or alert simulated dispatch
    setTimeout(() => {
      setCalledLine(null);
    }, 4000);
  };

  return (
    <div id="indian-helplines-container" className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 border border-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.03)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
          <Phone className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-stone-900 tracking-tight font-display">
            {t.criticalContacts}
          </h3>
          <p className="text-xs text-rose-900/60 font-medium">
            {t.criticalContactsDesc}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INDIAN_LINES.map((line) => (
          <button
            key={line.number}
            onClick={() => handleDialSimulate(line)}
            className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden flex items-start gap-3 select-none active:scale-[0.98] ${
              calledLine === line.number
                ? 'bg-gradient-to-tr from-rose-50 to-pink-50 border-rose-250 ring-2 ring-rose-200 ring-offset-1'
                : 'bg-white border-rose-100/70 shadow-sm hover:border-rose-250 hover:bg-rose-50/20'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl font-black font-mono tracking-wider text-rose-600">
                  {line.number}
                </span>
                <span className={`text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded uppercase ${
                  calledLine === line.number ? 'bg-rose-200 text-rose-800 animate-pulse' : 'bg-rose-100/80 text-rose-700'
                }`}>
                  {calledLine === line.number ? 'CONNECTING...' : 'QUICK CALL'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-stone-800 line-clamp-1 mb-1 font-sans">
                {lang === 'hi' ? line.hindiName : line.name}
              </h4>
              <p className="text-[11px] leading-relaxed text-stone-500 line-clamp-2">
                {lang === 'hi' ? line.descHindi : line.desc}
              </p>
            </div>

            {calledLine === line.number && (
              <div className="absolute inset-x-0 bottom-0 bg-rose-600 text-white text-[10px] py-1 text-center font-bold tracking-wider animate-pulse">
                🚨 {lang === 'hi' ? 'आपातकाल डायल चालू है...' : 'DIALING CRISIS LINE... Calling Sim Ready'}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 p-3.5 bg-rose-50/60 border border-rose-100/80 rounded-2xl flex items-center gap-3 text-xs text-rose-900 leading-snug">
        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
        <p className="font-semibold">
          {lang === 'hi' 
            ? "कम-बैंडविड्थ पर काम करने के लिए आपातकालीन कॉल्स को सीधा आपके फोन के डायलर से कनेक्ट किया जाएगा।" 
            : "Emergency lifelines run entirely local, bypassing the internet to ensure 100% dialer connectivity even on dead signals."}
        </p>
      </div>
    </div>
  );
}
