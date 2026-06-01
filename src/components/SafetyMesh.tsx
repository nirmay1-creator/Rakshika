import React, { useState, useEffect, useRef } from 'react';
import { Share2, WifiOff, ShieldOff, Heart, Radio, Send, Zap } from 'lucide-react';

interface SafetyMeshProps {
  lang: 'en' | 'hi';
}

interface MeshNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'user' | 'peer' | 'gateway' | 'guardianName';
  active: boolean;
  pulseRadius: number;
}

export function SafetyMesh({ lang }: SafetyMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [propagationState, setPropagationState] = useState<'IDLE' | 'SENDING' | 'RELAYED' | 'RECEIVED'>('IDLE');
  const [meshNodes, setMeshNodes] = useState<MeshNode[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const t = {
    en: {
      title: "Bluetooth SOS Mesh Network",
      desc: "Zero-Internet Emergency Relay. When cellular network or GPS fails, Rakshika propagates short E2EE packets over Bluetooth Low Energy (BLE) hopping. Nearby Rakshika devices securely relay the pack till it hits an internet gateway.",
      relaybtn: "Trigger Mesh Broadcast Test",
      meshStatus: "MESH MATRIX: ONLINE",
      peersCount: "Active BLE Peers Nearby: 5 Units",
      logHeader: "MESH PEER RECEPTIONS"
    },
    hi: {
      title: "ब्लूटूथ एसओएस मेश नेटवर्क",
      desc: "शून्य इंटरनेट आपातकालीन रिले। मोबाइल टावर या इंटरनेट न होने पर भी, रक्षिका ब्लूटूथ लो एनर्जी (BLE) हॉपिंग द्वारा अल्पावधि पैकेट भेजती है। आस-पास की रक्षिका ऐप्स इसे तब तक सुरक्षित रूप से रिले करती हैं जब तक यह इंटरनेट गेटवे तक न पहुँच जाए।",
      relaybtn: "मेश प्रसारण परीक्षण शुरू करें",
      meshStatus: "मेश संपर्क: सुरक्षित लाइव",
      peersCount: "सक्रिय ब्लूटूथ भागीदार: 5 डिवाइस",
      logHeader: "मेश रिले संचरण लाग"
    }
  }[lang];

  // Initialize visual canvas mesh node coordinates
  useEffect(() => {
    const defaultNodes: MeshNode[] = [
      { id: '1', x: 45, y: 155, label: lang === 'hi' ? 'आपका मोबाइल (स्रोत्र)' : 'Your Mobile (Source)', type: 'user', active: true, pulseRadius: 0 },
      { id: '2', x: 135, y: 75, label: 'Peer: Asha App (BLE)', type: 'peer', active: false, pulseRadius: 0 },
      { id: '3', x: 145, y: 225, label: 'Peer: Rahul Device (BLE)', type: 'peer', active: false, pulseRadius: 0 },
      { id: '4', x: 235, y: 135, label: 'Peer: Pink Kiosk Portal', type: 'peer', active: false, pulseRadius: 0 },
      { id: '5', x: 335, y: 155, label: lang === 'hi' ? 'प्रहरी गेटवे (अभिग्राही)' : 'Security Gateway (Sink)', type: 'gateway', active: false, pulseRadius: 0 }
    ];
    setMeshNodes(defaultNodes);
    setLogs([lang === 'hi' ? "[सिस्टम] मेश संचार स्कैन सक्रिय किया गया है।" : "[System] P2P local beacon scanning active."]);
  }, [lang]);

  // Render & Animate mesh canvas network grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Mesh links
      ctx.lineWidth = 1.5;
      meshNodes.forEach((nodeA) => {
        meshNodes.forEach((nodeB) => {
          if (nodeA.id !== nodeB.id) {
            const distance = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
            // Draw connector if within distance range
            if (distance < 140) {
              const isActiveLink = nodeA.active && nodeB.active;
              ctx.strokeStyle = isActiveLink 
                ? 'rgba(239, 68, 68, 0.7)' 
                : 'rgba(148, 163, 184, 0.2)';
              ctx.setLineDash(isActiveLink ? [4, 4] : []);
              ctx.beginPath();
              ctx.moveTo(nodeA.x, nodeA.y);
              ctx.lineTo(nodeB.x, nodeB.y);
              ctx.stroke();
            }
          }
        });
      });
      ctx.setLineDash([]); // Reset line style

      // 2. Draw Nodes
      meshNodes.forEach((node) => {
        // Pulse ring if active
        if (node.active) {
          ctx.strokeStyle = node.type === 'user' ? 'rgba(239, 68, 68, 0.4)' : node.type === 'gateway' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          node.pulseRadius += 0.5;
          if (node.pulseRadius > 25) node.pulseRadius = 6;
        }

        // Draw center solid node circle
        ctx.fillStyle = node.type === 'user'
          ? 'rgb(239, 68, 68)'
          : node.type === 'gateway'
            ? 'rgb(16, 185, 129)'
            : node.active 
              ? 'rgb(245, 158, 11)' 
              : 'rgb(148, 163, 184)';
              
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Node text label descriptions
        ctx.font = 'bold 8.5px monospace';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(node.label, node.x - 45, node.y - 12);
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [meshNodes]);

  // Execute stage propagation sequence simulation
  const handlePropagateTest = () => {
    if (propagationState !== 'IDLE') return;

    setPropagationState('SENDING');
    setLogs(prev => [
      ...prev,
      lang === 'hi' 
        ? "📡 [प्रसारण] BLE Sentry बीकन उत्सर्जित किया गया (पैकेट: E2EE::P2P::distress)" 
        : "📡 [BROADCAST] Beacon emitted E2EE packets from source client."
    ]);

    // Step 2: Peer 2 and Peer 3 pick up distress and broadcast
    setTimeout(() => {
      setMeshNodes(prev => prev.map(n => n.type === 'peer' && n.id !== '4' ? { ...n, active: true } : n));
      setPropagationState('RELAYED');
      setLogs(prev => [
        ...prev,
        lang === 'hi'
          ? "🔗 [रिले] 'Asha APP' और 'Rahul Device' ने SOS पैकेट कैप्चर कर रिले किया।"
          : "🔗 [RELAY] Peers 'Asha App' and 'Rahul Device' securely mapped & re-relayed BLE packet."
      ]);
    }, 1500);

    // Step 3: Peer 4 handles and forwards to Gateway
    setTimeout(() => {
      setMeshNodes(prev => prev.map(n => n.id === '4' ? { ...n, active: true } : n));
      setLogs(prev => [
        ...prev,
        lang === 'hi'
          ? "🔗 [रिले] 'Pink Kiosk' रिले स्टेशन तक हॉपिंग पूर्ण।"
          : "🔗 [RELAY] Sentry Hopped to public security 'Pink Kiosk' point."
      ]);
    }, 2800);

    // Step 4: Gateway receives and dispatches to internet cloud node
    setTimeout(() => {
      setMeshNodes(prev => prev.map(n => n.type === 'gateway' ? { ...n, active: true } : n));
      setPropagationState('RECEIVED');
      setLogs(prev => [
        ...prev,
        lang === 'hi'
          ? "✓ [सफल] प्रहरी गेटवे ने पैकेट डिक्रिप्ट कर क्लाउड में SOS पोस्ट किया!"
          : "✓ [SUCCESS] Gateway point received packet, decrypted payload & established central internet SOS dispatch!"
      ]);
    }, 4000);
  };

  const resetMeshDemo = () => {
    setPropagationState('IDLE');
    setMeshNodes(prev => prev.map(n => n.type !== 'user' ? { ...n, active: false } : n));
    setLogs([lang === 'hi' ? "[सिस्टम] P2P लोकल बीकन स्कैन पुनः आरंभ।" : "[System] P2P local beacon scan restarted."]);
  };

  return (
    <div id="safety-mesh-panel" className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-xs grid grid-cols-1 md:grid-cols-12 gap-5 leading-normal">
      
      {/* CANVAS ELEMENT FOR RENDER */}
      <div className="md:col-span-7 bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
        <canvas ref={canvasRef} width={380} height={280} className="w-full max-w-[380px] h-[280px]" />
        
        {/* Absolute floating indicators */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900 text-emerald-400 text-[8.5px] font-mono px-2 py-0.5 rounded-full border border-slate-950 font-bold">
          <WifiOff className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>{t.meshStatus}</span>
        </div>
      </div>

      {/* RECEPTIONS LOGS AND CONTROL PANEL */}
      <div className="md:col-span-5 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-650 animate-ping" />
            <h3 className="text-sm font-bold text-slate-900 font-display">{t.title}</h3>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            {t.desc}
          </p>
        </div>

        {/* CONTROLS */}
        <div>
          {propagationState === 'IDLE' ? (
            <button
              onClick={handlePropagateTest}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-3.5 h-3.5 text-red-500" />
              <span>{t.relaybtn}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="p-2.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-center font-bold animate-pulse text-[10px] uppercase font-mono tracking-wider">
                {propagationState === 'SENDING' && "📡 Broadcasting P2P BLE Alerts..."}
                {propagationState === 'RELAYED' && "🔗 Relaying Packet Hopping..."}
                {propagationState === 'RECEIVED' && "✓ Sentry Gateway Decrypted & Active!"}
              </div>
              {propagationState === 'RECEIVED' && (
                <button
                  onClick={resetMeshDemo}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-705 border border-slate-200 font-bold py-1.5 rounded-lg"
                >
                  Clear Mesh Run
                </button>
              )}
            </div>
          )}
        </div>

        {/* MESH TRANSACTION REAL TIME LOGS */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{t.logHeader}</span>
          <div className="bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-950 font-mono text-[9px] h-[90px] overflow-y-auto space-y-1">
            {logs.map((log, index) => (
              <p key={index} className="leading-tight border-b border-slate-800/40 pb-1">
                {log}
              </p>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
