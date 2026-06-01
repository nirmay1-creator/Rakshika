/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Flag, ShieldCheck, AlertCircle, PlusCircle, CheckCircle2, LogIn } from 'lucide-react';
import { TranslationLang, IncidentReport } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { encryptData, decryptData } from '../lib/crypto';
import { INDIAN_CITIES } from '../lib/offlineMapDb';
import { signInWithGoogle } from '../lib/firebase';

interface ReportingFormProps {
  lang: TranslationLang;
  onNewReportCreated: (report: IncidentReport) => void;
  currentUserId: string;
}

export function ReportingForm({ lang, onNewReportCreated, currentUserId }: ReportingFormProps) {
  const t = TRANSLATIONS[lang];
  const [reportType, setReportType] = useState<'harassment' | 'unsafe_area' | 'low_lighting' | 'no_police' | 'other'>('unsafe_area');
  const [cityName, setCityName] = useState<string>('delhi');
  const [rawDetails, setRawDetails] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Approximate relative offsets to add slight randomized noise around chosen city grids so report dots disperse nicely
  const getCityCoordinatesNoise = (cityId: string) => {
    const matched = INDIAN_CITIES.find(c => c.id === cityId) || INDIAN_CITIES[0];
    const latOffset = (Math.random() - 0.5) * 0.15;
    const lngOffset = (Math.random() - 0.5) * 0.15;
    return {
      lat: parseFloat((matched.centerLat + latOffset).toFixed(6)),
      lng: parseFloat((matched.centerLng + lngOffset).toFixed(6))
    };
  };

  const handleSubmittingForm = async (e: FormEvent) => {
    e.preventDefault();
    if (!rawDetails.trim()) return;

    setLoading(true);
    setSuccess(false);

    // Client-side End-To-End encryption of details prior to Firestore transmission!
    const encryptedBody = encryptData(rawDetails.trim());
    const coords = getCityCoordinatesNoise(cityName);

    const newReport: IncidentReport = {
      id: `inc-${Date.now()}`,
      userId: currentUserId || "anonymous_user_uid",
      type: reportType,
      encryptedDetails: encryptedBody,
      cityName,
      lat: coords.lat,
      lng: coords.lng,
      upvotes: 0,
      createdAt: new Date().toISOString()
    };

    // Simulate async publishing
    setTimeout(() => {
      onNewReportCreated(newReport);
      setRawDetails('');
      setLoading(false);
      setSuccess(true);
      // Fade success deck
      setTimeout(() => setSuccess(false), 3500);
    }, 1200);
  };

  if (!currentUserId) {
    return (
      <div id="community-report-login-prompt" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center space-y-4">
        <div className="mx-auto p-3 bg-red-100 text-red-600 rounded-full w-12 h-12 flex items-center justify-center shadow-sm">
          <Flag className="w-6 h-6 animate-bounce" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-display">
            {lang === 'hi' ? 'सुरक्षित पोर्टल प्रमाणीकरण' : 'Google Auth Verification Required'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            {lang === 'hi' 
              ? 'समुदाय सुरक्षा ग्रिड में खतरे की रिपोर्ट सबमिट करने के लिए आपको प्रमाणित होना आवश्यक है।' 
              : 'To contribute dark zones, unsafe stretches or hotspots, please verify with your Google Account.'}
          </p>
        </div>
        <button
          onClick={signInWithGoogle}
          className="mx-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4 text-red-500" />
          <span>{lang === 'hi' ? 'गूगल अकाउंट से जुड़ें' : 'Connect Account with Google'}</span>
        </button>
      </div>
    );
  }

  return (
    <div id="community-report-container" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
          <Flag className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
            {t.communityDefense}
          </h3>
          <p className="text-[10px] font-mono font-bold text-red-600 uppercase">
            E2EE ENCRYPTED PUBLIC SURVEILLANCE DATA
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-4">
        {t.communityDefenseDesc}
      </p>

      <form onSubmit={handleSubmittingForm} className="space-y-4">
        
        {/* INCIDENT TYPE DROPDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Threat Category:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-lg text-slate-800 outline-none focus:bg-white focus:border-red-500 transition-all font-display"
            >
              <option value="low_lighting">💡 {lang==='hi'?'खराब बिजली/रोशनी की कमी':'Low/No Lighting Stretch'}</option>
              <option value="unsafe_area">⚠️ {lang==='hi'?'सुनसान या जोखिम भरा रास्ता':'Desolate Transit Area'}</option>
              <option value="harassment">🚶‍♀️ {lang==='hi'?'उत्पीड़न/छेड़खानी का केंद्र':'Active Harassment Hotspot'}</option>
              <option value="no_police">👮 {lang==='hi'?'कोई पुलिस पोस्ट या गश्त नहीं':'No Active Police Beat'}</option>
              <option value="other">❓ {lang==='hi'?'अन्य सुरक्षा खतरा':'Other Safety Threat'}</option>
            </select>
          </div>

          {/* CHOOSE CITY */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Location City Scope:
            </label>
            <select
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-lg text-slate-800 outline-none focus:bg-white focus:border-red-500 transition-all font-display"
            >
              {INDIAN_CITIES.map(c => (
                <option key={c.id} value={c.id}>
                  {lang === 'hi' ? c.hindiName : c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* INCIDENT DETAILS */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Specify Incident Markers (Poor lighting, dark spots, transit obstacles)
          </label>
          <textarea
            value={rawDetails}
            onChange={(e) => setRawDetails(e.target.value)}
            placeholder={lang==='hi'?'अंधेरे कोने या सुरक्षा खतरे के विशेष बिंदु यहाँ लिखें...':'Specify details of threat. Describe poor layout, shadows or threats...'}
            rows={3}
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-red-500 transition-all text-slate-800"
            required
          />
        </div>

        {/* SECURITY CONFIRMATION ADVISORIES */}
        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold leading-snug">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>
            {lang==='hi' 
              ? "आपकी पहचान गुप्त रखी जाएगी। डिवाइस-लेवल एन्ड-टू-एन्ड सुरक्षा चालू है।" 
              : "End-To-End Device Cryptography active. Details will be encrypted before submission."}
          </span>
        </div>

        {/* ACTION BUTTON */}
        <button
          type="submit"
          disabled={loading || !rawDetails.trim()}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>
            {loading ? (lang==='hi'?'सिंक्रनाइज़ किया जा रहा है...':'Encrypting & Publishing...') : (lang==='hi'?'रिपोर्ट प्रकाशित करें':'Publish Encrypted Report')}
          </span>
        </button>

        {/* SUCCESS MESSAGE */}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-[fadeIn_0.2s_ease]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="leading-snug">
              {t.reportSuccess}
            </p>
          </div>
        )}

      </form>
    </div>
  );
}
