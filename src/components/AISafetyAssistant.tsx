import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, Send, Book, ShieldAlert, CornerDownRight, Volume2, Mic, HelpCircle } from 'lucide-react';

interface AISafetyAssistantProps {
  lang: 'en' | 'hi';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
}

export function AISafetyAssistant({ lang }: AISafetyAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        sender: 'gemini',
        text: lang === 'hi' 
          ? "नमस्ते! मैं रक्षिका एआई सवेरा प्रहरी हूँ। आप मुझसे अपने कानूनी अधिकारों (जैसे जीरो एफआईआर), आत्मरक्षा के उपायों, या आपातकालीन नंबरों के बारे में कुछ भी पूछ सकती हैं।" 
          : "Welcome! I am your Rakshika AI Safety Sentry. Ask me anything about women's legal rights in India, self-defense methodologies, emergency helplines, or transit escape procedures."
      }
    ];
  });
  const [inputText, setInputText] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const t = {
    en: {
      placeholder: "Ask about legal rights, Zero FIR, helplines, self defense...",
      btnSend: "Query",
      legalRights: "What are my legal rights during late-night transit in India?",
      zeroFIR: "How to file a Zero FIR?",
      stalkerTips: "Immediate physical tactics to escape an active stalker?",
      loadingText: "Consulting law codex & security models..."
    },
    hi: {
      placeholder: "कानूनी अधिकार, जीरो एफआईआर, आत्मरक्षा के बारे में पूछें...",
      btnSend: "पूछें",
      legalRights: "देर रात यात्रा के दौरान भारत में मेरे कानूनी अधिकार क्या हैं?",
      zeroFIR: "जीरो एफआईआर (Zero FIR) क्या है और इसे कैसे दर्ज कराएं?",
      stalkerTips: "पीछा करने वाले असामाजिक तत्वों से तुरंत कैसे बचें?",
      loadingText: "कानूनी धाराओं और सुरक्षा मॉडल्स की समीक्षा हो रही है..."
    }
  }[lang];

  // Auto-scroll chat area
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiLoading]);

  // Submit query handle
  const handleQuerySubmit = async (queryText: string) => {
    if (!queryText.trim() || aiLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setAiLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          lang: lang
        })
      });

      if (response.ok) {
        const data = await response.json();
        const geminiMsg: ChatMessage = {
          id: `gemini-${Date.now()}`,
          sender: 'gemini',
          text: data.response
        };
        setMessages(prev => [...prev, geminiMsg]);
      } else {
        throw new Error("API return exception");
      }
    } catch (err) {
      console.warn("AI helper error, fallback active: ", err);
      const fallbackMsg: ChatMessage = {
        id: `fail-${Date.now()}`,
        sender: 'gemini',
        text: lang === 'hi' 
          ? "[एआई बैकअप] नेटवर्क अस्थिरता। कृपया याद रखें: संकट में डायल करें *112* (आपातकालीन प्रतिक्रिया) या *1091* (महिला हेल्पलाइन)। भारतीय कानून की धारा 154 के तहत आप भारत के किसी भी राज्य/थाने में जीरो एफआईआर दर्ज कराने की पूर्ण अधिकारिणी हैं।"
          : "[Sentry offline fallback] Deep neural handshake unstable. Indian Law Reference: Section 154 of CrPC ensures you can file a 'Zero FIR' dynamically in any Indian jurisdiction. Speak up and ask for immediate dispatcher allocation!"
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setAiLoading(false);
    }
  };

  // Convert text to simulated TTS audio
  const handleTTSPlay = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        // Extract raw content bypassing bracket headings
        const cleanText = text.replace(/\[.*?\]|\*\*.*?\*\*/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn("Speech synthesis unavailable: ", e);
    }
  };

  return (
    <div id="ai-chat-assistant-container" className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-4 flex flex-col justify-between h-[520px]">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-sm">
            <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
              <span>{lang === 'hi' ? "ई-रक्षिका सुरक्षा सहायक" : "AI Law & Defense Assistant"}</span>
            </h3>
            <span className="text-[9px] font-mono font-bold text-red-600 tracking-wider block mt-0.5 uppercase">
              ⚡ LIVE COUNSEL & HELPLINES
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-lg text-slate-500 font-mono">
          <span>Gemini-3.5 Secure</span>
        </div>
      </div>

      {/* CHAT MESSAGES LOG PANEL */}
      <div className="flex-1 overflow-y-auto px-1 py-1 space-y-3.5 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              
              {!isUser && (
                <div className="w-7 h-7 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                  R
                </div>
              )}

              <div className={`p-3 max-w-[82%] text-xs rounded-2xl leading-relaxed shadow-sm relative group border ${
                isUser 
                  ? 'bg-red-600 text-white border-red-500 rounded-tr-none' 
                  : 'bg-slate-50 text-slate-750 border-slate-150 rounded-tl-none'
              }`}>
                {/* Message textual block */}
                <span className="whitespace-pre-line font-medium block">{msg.text}</span>
                
                {/* TTS control node */}
                {!isUser && (
                  <button 
                    onClick={() => handleTTSPlay(msg.text)}
                    className="absolute -bottom-3 right-3 bg-white p-1 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-550 hidden group-hover:block transition-all"
                    title="Play Audio"
                  >
                    <Volume2 className="w-3 h-3 text-red-600" />
                  </button>
                )}
              </div>

              {isUser && (
                <div className="w-7 h-7 bg-red-100 text-red-600 border border-red-200 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                  U
                </div>
              )}

            </div>
          );
        })}

        {/* AI LOADING BLOCK */}
        {aiLoading && (
          <div className="flex gap-2 items-center text-xs text-slate-400 font-mono animate-pulse">
            <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-red-600 animate-spin shrink-0"></div>
            <span>{t.loadingText}</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* QUICK PRE-SET QUESTION SUGGEST COMPONENT */}
      <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          {lang === 'hi' ? "त्वरित कानूनी और व्यावहारिक प्रश्न:" : "Suggested Legal & Defense Queries:"}
        </span>
        <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => handleQuerySubmit(t.legalRights)}
            className="w-full text-left text-[11px] px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-lg hover:border-red-200 text-slate-650 truncate transition-all cursor-pointer font-medium"
          >
            ⚖️ {t.legalRights}
          </button>
          <button
            type="button"
            onClick={() => handleQuerySubmit(t.zeroFIR)}
            className="w-full text-left text-[11px] px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-lg hover:border-red-200 text-slate-650 truncate transition-all cursor-pointer font-medium"
          >
            📋 {t.zeroFIR}
          </button>
          <button
            type="button"
            onClick={() => handleQuerySubmit(t.stalkerTips)}
            className="w-full text-left text-[11px] px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-lg hover:border-red-200 text-slate-650 truncate transition-all cursor-pointer font-medium"
          >
            🏃‍♂️ {t.stalkerTips}
          </button>
        </div>
      </div>

      {/* CHAT ENTRY INPUT FORM */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleQuerySubmit(inputText); }}
        className="flex gap-2 items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200"
      >
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t.placeholder}
          disabled={aiLoading}
          className="flex-1 bg-transparent px-3 py-1.5 text-xs outline-none text-slate-805 placeholder-slate-400"
        />

        <button 
          type="submit"
          disabled={aiLoading || !inputText.trim()}
          className="bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow disabled:opacity-50"
        >
          <span>{t.btnSend}</span>
          <Send className="w-3 REG-TEXT h-3" />
        </button>
      </form>

    </div>
  );
}
