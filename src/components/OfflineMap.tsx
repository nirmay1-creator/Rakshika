/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Map, MapPin, Navigation, ShieldCheck, ShieldAlert, Flag, HelpCircle, Flame, Sparkles, Globe, Settings, Terminal, Map as MapIcon, HelpCircle as HelpIcon } from 'lucide-react';
import { TranslationLang, MapCity, MapMarkerNode, SafetyRating, SafetyRoutePath, IncidentReport } from '../types';
import { TRANSLATIONS } from '../lib/translations';
import { INDIAN_CITIES, OFFLINE_MARKERS, calculateOfflineSafePath } from '../lib/offlineMapDb';
import { decryptData } from '../lib/crypto';
import { APIProvider, Map as GoogleMapComp, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

interface OfflineMapProps {
  lang: TranslationLang;
  currentCityId: string;
  onCityChange: (id: string) => void;
  communityIncidents: IncidentReport[];
  offlineUserCoords: { lat: number; lng: number };
  liveLocations?: any[];
}

export function OfflineMap({
  lang,
  currentCityId,
  onCityChange,
  communityIncidents,
  offlineUserCoords,
  liveLocations = []
}: OfflineMapProps) {
  const t = TRANSLATIONS[lang];
  const activeCity = INDIAN_CITIES.find(c => c.id === currentCityId) || INDIAN_CITIES[0];
  const markers = OFFLINE_MARKERS[activeCity.id] || [];

  const [resolvedApiKey, setResolvedApiKey] = useState<string>(() => {
    return (Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '') ? API_KEY : '';
  });
  const [mapMode, setMapMode] = useState<'vector' | 'google'>(() => {
    return (Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '') ? 'google' : 'vector';
  });

  // Dynamic fetch of API Key if missing or built empty
  useEffect(() => {
    const fetchDynamicKey = async () => {
      try {
        const response = await fetch('/api/maps-key');
        if (response.ok) {
          const data = await response.json();
          if (data.apiKey && data.apiKey !== 'YOUR_API_KEY' && data.apiKey.trim() !== '') {
            setResolvedApiKey(data.apiKey);
            setMapMode('google');
          }
        }
      } catch (err) {
        console.warn("Could not retrieve Google Maps client key dynamically:", err);
      }
    };
    if (!resolvedApiKey) {
      fetchDynamicKey();
    }
  }, [resolvedApiKey]);

  const hasValidKey = Boolean(resolvedApiKey) && resolvedApiKey !== 'YOUR_API_KEY' && resolvedApiKey.trim() !== '';
  const [selectedStation, setSelectedStation] = useState<MapMarkerNode | null>(null);
  const [activePaths, setActivePaths] = useState<SafetyRoutePath[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string>('safe-recommendation');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    steps: string[];
    reason: string;
    isFallback: boolean;
  } | null>(null);

  // When selected station or user location changes, calculate local path
  useEffect(() => {
    if (selectedStation) {
      const paths = calculateOfflineSafePath(
        activeCity.id,
        offlineUserCoords.lat,
        offlineUserCoords.lng,
        selectedStation
      );
      setActivePaths(paths);
      // Select safe path by default
      setSelectedPathId('safe-recommendation');
      // Reset AI suggestion
      setAiAnalysis(null);
    } else {
      setActivePaths([]);
      setAiAnalysis(null);
    }
  }, [selectedStation, activeCity.id, offlineUserCoords.lat, offlineUserCoords.lng]);

  // Request high-fidelity AI suggestions from the Gemini proxy routing server
  const fetchAiRouteRecommendation = async () => {
    if (!selectedStation) return;
    setAiLoading(true);
    setAiAnalysis(null);

    try {
      const response = await fetch('/api/route-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          city: activeCity.name,
          userLat: offlineUserCoords.lat,
          userLng: offlineUserCoords.lng,
          destLat: selectedStation.lat,
          destLng: selectedStation.lng,
          destName: selectedStation.name
        })
      });

      if (response.ok) {
        const data = await response.json();
        const routeData = selectedPathId === 'safe-recommendation' ? data.recommendedRoute : data.unsecuredRoute;
        setAiAnalysis({
          steps: lang === 'hi' ? routeData.stepsHi || routeData.stepsEn : routeData.stepsEn,
          reason: lang === 'hi' ? routeData.reasonHi : routeData.reasonEn,
          isFallback: routeData.reasonEn?.includes('[AI Fallback')
        });
      }
    } catch (err) {
      console.warn("AI routing call encountered exception. Reverting to device-local path analysis.", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Convert lat/lng to local SVG coordinate space (800 x 500)
  // Latitude is inverted on screen coordinates
  const convertCoordsToSvg = (lat: number, lng: number) => {
    // Spatial mapping coefficients focused around selected city centers
    const latSpan = 0.3; // Approx local box size
    const lngSpan = 0.3;

    const x = ((lng - (activeCity.centerLng - lngSpan / 2)) / lngSpan) * 800;
    const y = (1 - (lat - (activeCity.centerLat - latSpan / 2)) / latSpan) * 500;

    // Safety clamps
    return {
      x: Math.max(20, Math.min(780, x)),
      y: Math.max(20, Math.min(480, y))
    };
  };

  const userSvgPt = convertCoordsToSvg(offlineUserCoords.lat, offlineUserCoords.lng);

  return (
    <div id="offline-map-dashboard-container" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-3">
      
      {/* MAP VIEWER PORT - column-span 2 */}
      <div className="lg:col-span-2 p-4 flex flex-col justify-between border-r border-slate-200 bg-slate-50 min-h-[350px] md:min-h-[500px] relative">
        
        {/* TOP HEADER CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 z-10">
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => setMapMode('vector')}
              className={`flex items-center gap-1 text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mapMode === 'vector' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-emerald-500" />
              <span>OFFLINE VECTOR</span>
            </button>
            <button
              type="button"
              onClick={() => setMapMode('google')}
              className={`flex items-center gap-1 text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mapMode === 'google' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>LIVE GOOGLE MAPS</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">{t.currentCity}:</span>
            <select
              value={currentCityId}
              onChange={(e) => {
                onCityChange(e.target.value);
                setSelectedStation(null);
              }}
              className="bg-white border border-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg text-slate-750 outline-none shadow-sm cursor-pointer focus:border-red-500 font-display"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'hi' ? c.hindiName : c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* METRO ROAD VECTOR PANEL AND SVG GRAPHICAL CANVAS */}
        {mapMode === 'vector' ? (
          <div className="flex-1 w-full relative my-3 bg-slate-100 rounded-xl border border-slate-200 shadow-inner overflow-hidden flex items-center justify-center min-h-[380px]">
            <svg className="absolute inset-0 w-full h-full pointer-events-auto" viewBox="0 0 800 500" preserveAspectRatio="none">
              {/* Base road networks mapping Delhi/Mumbai context grids */}
              <g stroke="#94a3b8" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,1">
                <line x1="100" y1="0" x2="100" y2="500" />
                <line x1="300" y1="0" x2="300" y2="500" />
                <line x1="500" y1="0" x2="500" y2="500" />
                <line x1="700" y1="0" x2="700" y2="500" />
                
                <line x1="0" y1="100" x2="800" y2="100" />
                <line x1="0" y1="250" x2="800" y2="250" />
                <line x1="0" y1="400" x2="800" y2="400" />
              </g>

              <g stroke="#64748b" strokeOpacity="0.3" strokeWidth="4">
                {/* Outer Ring Radial Express routes */}
                <circle cx="400" cy="250" r="180" fill="none" />
                <circle cx="400" cy="250" r="100" fill="none" />
              </g>

              {/* DRAW DYNAMIC OFFLINE ROUTE PATH COORDS */}
              {activePaths.map((pathItem) => {
                const isSelected = selectedPathId === pathItem.id;
                const pathColor = pathItem.id === 'safe-recommendation' ? '#10b981' : '#f59e0b';
                const pointsString = [
                  `${userSvgPt.x},${userSvgPt.y}`,
                  ...pathItem.points.map(pt => {
                    const s = convertCoordsToSvg(pt.lat, pt.lng);
                    return `${s.x},${s.y}`;
                  }),
                  selectedStation ? `${convertCoordsToSvg(selectedStation.lat, selectedStation.lng).x},${convertCoordsToSvg(selectedStation.lat, selectedStation.lng).y}` : ''
                ].filter(Boolean).join(' ');

                return (
                  <polyline
                    key={pathItem.id}
                    points={pointsString}
                    fill="none"
                    stroke={pathColor}
                    strokeWidth={isSelected ? "6" : "3"}
                    strokeDasharray={pathItem.id !== 'safe-recommendation' ? "8,5" : undefined}
                    className={`transition-all duration-350 cursor-pointer ${isSelected ? 'stroke-[8px] animate-[dash_2s_linear_infinite]' : 'opacity-60'}`}
                    onClick={() => setSelectedPathId(pathItem.id)}
                  />
                );
              })}

              {/* ACTIVE MARKER SHAPES - REFRESHED ON CITY SELECTION */}
              {markers.map((item) => {
                const pt = convertCoordsToSvg(item.lat, item.lng);
                const isSelected = selectedStation?.id === item.id;
                
                let markerColor = "#ef4444"; // default hazard red
                if (item.type === 'police' ? true : false) markerColor = "#3b82f6"; // police blue
                else if (item.type === 'hospital') markerColor = "#10b981"; // clinic green
                else if (item.type === 'womens_center') markerColor = "#ec4899"; // pink center
                else if (item.type === 'safe_haven') markerColor = "#a855f7"; // purple lights
                
                if (item.type === 'hotspot') {
                  return (
                    <g key={item.id} className="cursor-pointer group animate-pulse" onClick={() => setSelectedStation(item)}>
                      <circle cx={pt.x} cy={pt.y} r="18" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="1" />
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#ef4444" />
                      <text x={pt.x} y={pt.y - 12} fontSize="10" fontWeight="bold" fill="#b91c1c" textAnchor="middle" className="bg-white px-1">
                        ⚠️ {lang === 'hi' ? item.hindiName.substring(0, 10) : item.name.substring(0, 15)}...
                      </text>
                    </g>
                  );
                }

                return (
                  <g key={item.id} className="cursor-pointer group" onClick={() => setSelectedStation(item)}>
                    {/* Glowing background circle if selected */}
                    {isSelected && (
                      <circle cx={pt.x} cy={pt.y} r="25" fill={markerColor} opacity="0.25" className="animate-ping animate-[fadeIn_0.15s_ease]" />
                    )}
                    {/* Pin Circle Pin head */}
                    <circle cx={pt.x} cy={pt.y} r="10" fill={markerColor} stroke="#ffffff" strokeWidth="2.5" className="shadow" />
                    <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" />
                    
                    {/* Anchor tag text label for clear, recognizable icon indicators */}
                    <text x={pt.x} y={pt.y + 22} fontSize="11" fontWeight="extrabold" fill="#0f172a" textAnchor="middle" className="bg-white p-0.5 rounded shadow-sm opacity-90 font-display">
                      {item.type === 'police' ? '👮 Police' : item.type === 'hospital' ? '🏥 Hosp' : '🌸 Safe Hub'}
                    </text>
                  </g>
                );
              })}

              {/* LIVE COMMUNITY REPORTS PLOTTED FROM CLOUD FIREBASE SYNC OVERLAYS */}
              {communityIncidents
                .filter(inc => inc.cityName.toLowerCase() === activeCity.id.toLowerCase())
                .map((inc) => {
                  const pt = convertCoordsToSvg(inc.lat, inc.lng);
                  return (
                    <g key={inc.id} className="cursor-pointer">
                      <circle cx={pt.x} cy={pt.y} r="14" fill="#ca8a04" opacity="0.2" />
                      <circle cx={pt.x} cy={pt.y} r="6" fill="#ca8a04" stroke="#ffffff" strokeWidth="1.5" />
                      <path d={`M ${pt.x - 3} ${pt.y - 3} L ${pt.x + 3} ${pt.y + 3} M ${pt.x + 3} ${pt.y - 3} L ${pt.x - 3} ${pt.y + 3}`} stroke="#ffffff" strokeWidth="1.5" />
                      <text x={pt.x} y={pt.y - 10} fontSize="8" fontWeight="bold" fill="#854d0e" textAnchor="middle" className="font-display">
                        🚨 HAZARD
                      </text>
                    </g>
                  );
                }
              )}

              {/* LIVE GUARDIAN TRACKING COORDINATES */}
              {liveLocations && liveLocations.map((loc) => {
                try {
                  const decryptedJSON = decryptData(loc.encryptedCoords);
                  const coordsObj = JSON.parse(decryptedJSON);
                  if (typeof coordsObj.lat === 'number' && typeof coordsObj.lng === 'number') {
                    const pt = convertCoordsToSvg(coordsObj.lat, coordsObj.lng);
                    return (
                      <g key={loc.userId} className="animate-pulse cursor-pointer">
                        <circle cx={pt.x} cy={pt.y} r="18" fill="rgba(236, 72, 153, 0.2)" stroke="#ec4899" strokeWidth="1" />
                        <circle cx={pt.x} cy={pt.y} r="6" fill="#ec4899" stroke="#ffffff" strokeWidth="1.5" />
                        <text x={pt.x} y={pt.y - 12} fontSize="9" fontWeight="black" fill="#db2777" textAnchor="middle" className="uppercase font-mono bg-white/80 px-1 rounded shadow-sm font-display">
                          🌸 {loc.userName.substring(0, 10)}
                        </text>
                      </g>
                    );
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
                return null;
              })}

              {/* LOCAL USER BLUE GEOLOCATION RING TARGET */}
              <g className="animate-pulse">
                <circle cx={userSvgPt.x} cy={userSvgPt.y} r="20" fill="rgba(37, 99, 235, 0.15)" stroke="#2563eb" strokeWidth="1" />
                <circle cx={userSvgPt.x} cy={userSvgPt.y} r="7" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <circle cx={userSvgPt.x} cy={userSvgPt.y} r="2" fill="#ffffff" />
                <text x={userSvgPt.x} y={userSvgPt.y - 14} fontSize="10" fontWeight="black" fill="#1e3a8a" textAnchor="middle" className="uppercase font-mono">
                  📍 {lang === 'hi' ? 'आपकी स्थिति' : 'YOU'}
                </text>
              </g>
            </svg>

            {/* BACKGROUND TEXT FOR ACCESSIBILITY SCREEN READERS */}
            <div className="sr-only">
              Interactive safety map for {activeCity.name}. User location is at latitude {offlineUserCoords.lat}, longitude {offlineUserCoords.lng}. There are {markers.length} assistance points available.
            </div>

            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1 font-mono">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block"></span>
                <span>{lang === 'hi' ? 'पुलिस स्टेशन' : 'Police'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                <span>{lang === 'hi' ? 'चिकित्सालय' : 'Hospital'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-pink-500 rounded-full inline-block"></span>
                <span>{lang === 'hi' ? 'महिला केंद्र' : 'Women Cell'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span>
                <span>{lang === 'hi' ? 'अंधेरा / खतरा क्षेत्र' : 'Hotspots'}</span>
              </div>
            </div>
          </div>
        ) : (
          /* LIVE GOOGLE MAPS BLOCK AS FORCED BY ARCHITECTURE BLUEPRINTS */
          <div className="flex-1 w-full relative my-3 bg-slate-100 rounded-xl border border-slate-200 shadow-inner overflow-hidden min-h-[390px] flex flex-col justify-between">
            {!hasValidKey ? (
              <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-4 max-w-lg mx-auto font-sans">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-150 shadow-sm">
                  <Globe className="w-5 h-5 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Google Maps Activation Required</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    A valid API key is needed to render high-resolution topography maps, dynamic transit navigation buffers, and live geolocated pins.
                  </p>
                </div>

                {/* STEPS PANEL FOR USER SETUP CONVENIENCE */}
                <div className="bg-white/80 text-left border border-slate-200 p-4 rounded-xl space-y-2 text-xs w-full shadow-sm">
                  <p className="font-bold text-slate-705 border-b pb-1.5 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                    <span>How to set your Key:</span>
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 font-medium text-slate-600">
                    <li>Get your key: <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-red-650 hover:underline inline-block font-bold">console.cloud.google.com</a></li>
                    <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right corner)</li>
                    <li>Select <strong>Secrets</strong></li>
                    <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret key name</li>
                    <li>Paste your key and press <strong>Enter</strong> to auto-rebuild.</li>
                  </ol>
                </div>

                {/* TEMPORARY TEST LAB FEEDBACK BOX ON THE FLY */}
                <div className="text-[10px] text-slate-400 font-semibold p-2 border border-slate-100 rounded bg-white">
                  🔒 Rakshika offline fallback mode is currently fully active. Swap back to <strong>Offline Vector</strong> to interact with the device-local secure mapping layout.
                </div>
              </div>
            ) : (
              /* REAL-TIME HIGH COMPLEXITY INTERACTIVE GOOGLE MAP */
              <div className="w-full h-[400px] relative overflow-hidden rounded-xl">
                <APIProvider apiKey={resolvedApiKey} version="weekly">
                  <GoogleMapComp
                    defaultCenter={{ lat: activeCity.centerLat, lng: activeCity.centerLng }}
                    defaultZoom={12}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    {/* User Pin */}
                    <AdvancedMarker position={{ lat: offlineUserCoords.lat, lng: offlineUserCoords.lng }}>
                      <Pin background="#3b82f6" glyphColor="#fff" scale={1.15} />
                    </AdvancedMarker>

                    {/* Regional stations & centers */}
                    {markers.map((item) => (
                      <AdvancedMarker
                        key={item.id}
                        position={{ lat: item.lat, lng: item.lng }}
                        onClick={() => setSelectedStation(item)}
                      >
                        <Pin 
                          background={item.type === 'police' ? '#1d4ed8' : item.type === 'hospital' ? '#059669' : '#db2777'} 
                          glyphColor="#fff" 
                        />
                      </AdvancedMarker>
                    ))}

                    {/* Community report hazard warnings */}
                    {communityIncidents
                      .filter(inc => inc.cityName.toLowerCase() === activeCity.id.toLowerCase())
                      .map((inc) => (
                        <AdvancedMarker key={inc.id} position={{ lat: inc.lat, lng: inc.lng }}>
                          <Pin background="#d97706" glyphColor="#fff" />
                        </AdvancedMarker>
                      ))}
                  </GoogleMapComp>
                </APIProvider>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM METRIC */}
        <p className="text-[10px] text-slate-400 font-mono text-center">
          * {lang === 'hi' 
            ? "बिना वेब नेटवर्क के भी काम करता है। जीपीएस आपके डिवाइस के हार्डवेयर से ऑटो-सिंक हो जाता है।" 
            : "No internet vector tracking active. Coordinates derived from native device-level telemetry."}
        </p>
      </div>

      {/* DYNAMIC PATH-ROUTING DRAWER & INFO BAR - columns 1 */}
      <div className="p-5 flex flex-col justify-between h-full bg-white select-none">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2 font-display">
            <Navigation className="w-4 h-4 text-red-600" />
            <span>{t.safestRoute}</span>
          </h3>

          <div className="bg-slate-55 border border-slate-200 p-3 rounded-xl mb-4">
            <p className="text-xs text-slate-600 leading-snug font-semibold">
              {t.selectStation}
            </p>
            
            <div className="mt-3 flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1 font-display">
              {markers.filter(m => m.type !== 'hotspot').map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedStation(item)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                    selectedStation?.id === item.id
                      ? 'bg-red-50 border-red-200 font-bold text-red-850'
                      : 'bg-white border-slate-200 hover:border-red-300 text-slate-705 shadow-sm'
                  }`}
                >
                  <span className="truncate">{lang === 'hi' ? item.hindiName : item.name}</span>
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
                </button>
              ))}
            </div>
          </div>

          {selectedStation ? (
            <div className="space-y-4">
              {/* STATION INFO */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[9px] font-extrabold tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">
                  ACTIVE GOAL DESTINATION
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1 font-display">
                  {lang === 'hi' ? selectedStation.hindiName : selectedStation.name}
                </h4>
                {selectedStation.phone && (
                  <p className="text-[11px] text-blue-600 font-mono font-bold mt-1">
                    📞 {selectedStation.phone}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 leading-snug mt-1">
                  {lang === 'hi' ? selectedStation.detailsHindi : selectedStation.details}
                </p>
              </div>

              {/* ROUTE TOGGLE PATHS */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Compare Paths:
                </span>

                {activePaths.map((pathItem) => {
                  const isSelected = selectedPathId === pathItem.id;
                  const isSafe = pathItem.id === 'safe-recommendation';

                  return (
                    <button
                      key={pathItem.id}
                      onClick={() => {
                        setSelectedPathId(pathItem.id);
                        setAiAnalysis(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? isSafe
                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300'
                            : 'bg-amber-50 border-amber-200 ring-1 ring-amber-200'
                          : 'bg-white border-slate-200 hover:border-red-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 font-display">
                          {lang === 'hi' ? pathItem.nameHindi : pathItem.name}
                        </span>
                        {isSafe ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-1 line-clamp-2">
                        {lang === 'hi' ? pathItem.reasonHi : pathItem.reasonEn}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* ACTION: COMPOSE SERVER-SIDE AI RECOMMENDATIONS FROM GEMINI */}
              <button
                onClick={fetchAiRouteRecommendation}
                disabled={aiLoading}
                className="w-full bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span>
                  {aiLoading ? (lang==='hi'?'वॉयस एआई लोड हो रहा है...':'Consulting Gemini AI Guardian...') : t.routeRecommendation}
                </span>
              </button>

              {/* RENDER DYNAMIC AI ANALYSIS STEPS */}
              {aiAnalysis && (
                <div className="p-3.5 bg-gradient-to-br from-slate-50 to-red-50/20 rounded-xl border border-red-100 text-xs text-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-[10px] text-red-700 tracking-wider font-mono">
                      {aiAnalysis.isFallback ? "⚡ DEVICE SAFE-GRID BACKUP" : "✨ GEMINI REAL-TIME SMART REPORT"}
                    </span>
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                  </div>
                  <p className="font-medium mb-2 leading-relaxed text-slate-600 italic">
                    "{aiAnalysis.reason}"
                  </p>
                  <div className="space-y-1 mt-2 border-t border-slate-150 pt-2 font-mono text-[11px]">
                    {aiAnalysis.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <span className="text-red-600 font-bold">{idx + 1}.</span>
                        <span className="leading-snug">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400 animate-bounce" />
              <p className="text-xs px-2">{lang === 'hi' ? 'मार्गदर्शन और सुरक्षित दिशा देखने के लिए नक्शे से गंतव्य चुनें' : 'Select a safety hub / shelter station from the menu to test optimal routing.'}</p>
            </div>
          )}

        </div>

        <div className="mt-5 border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{t.endToEndActive}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
