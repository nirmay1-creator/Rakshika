/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Check, AlertCircle, HelpCircle } from 'lucide-react';
import { TranslationLang } from '../types';
import { TRANSLATIONS } from '../lib/translations';

interface VoiceTriggerProps {
  lang: TranslationLang;
  onVoiceSOSTrigger: () => void;
  customPhrase: string;
}

export function VoiceTrigger({ lang, onVoiceSOSTrigger, customPhrase }: VoiceTriggerProps) {
  const t = TRANSLATIONS[lang];
  const [isListening, setIsListening] = useState<boolean>(false);
  const [lastMatchText, setLastMatchText] = useState<string>('');
  const [recognitionSupported, setRecognitionSupported] = useState<boolean>(true);
  const [waveAnimation, setWaveAnimation] = useState<number[]>([10, 25, 10, 5, 10, 45, 10, 5, 20]);
  
  const recognitionRef = useRef<any>(null);

  // Trigger keywords list (multi-language English / Hindi default)
  const triggers = [
    'help help', 'safe me', 'emergency', 'police', 'save me', 'danger',
    'बचाओ बचाओ', 'बचाओ', 'मदद करो', 'आपातकाल', 'पुलिस', 
    customPhrase.toLowerCase().trim()
  ].filter(Boolean);

  // Setup actual web speech recognition if available
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          setLastMatchText(transcript);
          
          // Match the spoken transcript against any register trigger words
          const matched = triggers.some(tr => transcript.includes(tr));
          if (matched) {
            console.log("🚨 VOICE EMERGENCY DETECTED:", transcript);
            onVoiceSOSTrigger();
          }
        }
      }
    };

    rec.onerror = (e: any) => {
      console.warn("Speech recognition error:", e.error);
      if (e.error === 'not-allowed') {
        // Iframe permission blocks
      }
    };

    rec.onend = () => {
      if (isListening) {
        // auto-restart unless explicitly turned off
        try { rec.start(); } catch {}
      }
    };

    recognitionRef.current = rec;
  }, [lang, customPhrase, isListening]);

  // Handle listening toggles
  const toggleListening = () => {
    if (!recognitionRef.current && recognitionSupported) return;

    if (isListening) {
      setIsListening(false);
      try { recognitionRef.current.stop(); } catch {}
    } else {
      setIsListening(true);
      try { recognitionRef.current.start(); } catch {}
    }
  };

  // Simulates a wave movement for visual signaling
  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(() => {
      setWaveAnimation(
        Array.from({ length: 9 }, () => Math.floor(Math.random() * 50) + 5)
      );
    }, 150);
    return () => clearInterval(interval);
  }, [isListening]);

  // Direct manual simulator helper (to ensure unhindered operation in sandboxed frames)
  const handleKeywordSimulatedScream = (word: string) => {
    setIsListening(true);
    setLastMatchText(word);
    setTimeout(() => {
      onVoiceSOSTrigger();
    }, 1200);
  };

  return (
    <div id="voice-trigger-contain" className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {t.voiceCommandTitle}
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              HANDS-FREE OPERATION ACTIVATOR
            </p>
          </div>
        </div>

        {/* Listen State indicator pill */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
          isListening 
            ? 'bg-rose-100 text-rose-700 animate-pulse' 
            : 'bg-slate-100 text-slate-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-rose-600' : 'bg-slate-400'}`}></span>
          <span>{isListening ? t.activeStatus : 'OFFLINE'}</span>
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-4">
        {t.voiceCommandDesc}
      </p>

      {/* TRIGGERS MATCHING GLOW WRAPPERS */}
      <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mb-4">
        <span className="text-[10px] font-bold tracking-wider text-slate-500 block mb-2 uppercase">
          Configured Smart Phrase Triggers:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {['HELP HELP', 'बचाओ बचाओ', customPhrase.toUpperCase()].filter(Boolean).map((phrase, i) => (
            <span key={i} className="text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-md shadow-sm">
              🗣️ "{phrase}"
            </span>
          ))}
        </div>
      </div>

      {isListening && (
        <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl mb-4 flex flex-col items-center justify-center">
          {/* Wave animator blocks */}
          <div className="flex items-end justify-center gap-1 h-12 mb-2">
            {waveAnimation.map((h, idx) => (
              <div
                key={idx}
                style={{ height: `${h}%` }}
                className="w-1.5 bg-rose-500 rounded-full transition-all duration-150"
              />
            ))}
          </div>
          <span className="text-[10px] text-rose-700 font-bold tracking-widest uppercase text-center animate-pulse">
            🎤 {t.listeningActive}
          </span>
          {lastMatchText && (
            <p className="text-xs text-slate-700 mt-2 font-mono text-center">
              Last heard: <span className="font-bold text-slate-900 underline">"{lastMatchText}"</span>
            </p>
          )}
        </div>
      )}

      {/* FOOTER ACTION PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center pt-2">
        <button
          onClick={toggleListening}
          className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isListening
              ? 'bg-rose-600 border-rose-500 text-white hover:bg-rose-500'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isListening ? (lang==='hi'?'सुनना बंद करें':'Disable Mic Watch') : (lang==='hi'?'वॉयस मॉनिटर चालू करें':'Enable Background Mic')}</span>
        </button>

        {/* Simulated Trigger dispatch to bypass iframe microphone permissions blockers */}
        <div className="text-right">
          <span className="text-[9px] font-semibold text-slate-400 block mb-1">Distress Simulation Triggers:</span>
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => handleKeywordSimulatedScream('help help')}
              className="text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg whitespace-nowrap active:scale-95"
            >
              Simulate "HELP HELP"
            </button>
            <button
              onClick={() => handleKeywordSimulatedScream('बचाओ बचाओ')}
              className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg whitespace-nowrap active:scale-95"
            >
              Simulate "बचाओ"
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
