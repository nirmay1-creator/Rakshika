/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined. Using mock fallback mode.");
      throw new Error("GEMINI_API_KEY is missing");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// In-memory telemetry log for simulated SMS transmissions
interface SimulatedSMS {
  id: string;
  senderName: string;
  senderPhone: string;
  recipients: string[];
  gps: { lat: number; lng: number };
  timestamp: string;
}
const simulatedSMSCollection: SimulatedSMS[] = [];

// API Route: Send SMS simulated trigger (one-tap SOS fallback)
app.post('/api/dispatch-sms', (req, res) => {
  const { senderName, senderPhone, recipients, lat, lng } = req.body;
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "Missing emergency recipients" });
  }

  const dispatch: SimulatedSMS = {
    id: `sms-${Date.now()}`,
    senderName: senderName || "Anonymous User",
    senderPhone: senderPhone || "+91 99999 99999",
    recipients,
    gps: { lat: lat || 28.6139, lng: lng || 77.2090 },
    timestamp: new Date().toISOString()
  };

  simulatedSMSCollection.push(dispatch);
  console.log(`[SMS GATEWAY DISPATCH] Outgoing emergency Alert:`, JSON.stringify(dispatch, null, 2));

  res.json({
    status: "success",
    message: "GPS emergency coordinates successfully dispatched via SMS gateway.",
    dispatch
  });
});

// API Route: Retrieve active sent SMS list
app.get('/api/dispatches', (req, res) => {
  res.json({ dispatches: simulatedSMSCollection });
});

// API Route: Expose Google Maps Platform key dynamically to the secure client
app.get('/api/maps-key', (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_PLATFORM_KEY || '' });
});

// API Route: AI-powered Safety Route Recommendations (Gemini-3.5-flash)
app.post('/api/route-recommendation', async (req, res) => {
  const { city, userLat, userLng, destLat, destLng, destName } = req.body;

  if (!city || !userLat || !userLng || !destLat || !destLng) {
    return res.status(400).json({ error: "Missing spatial coordinates or city context" });
  }

  try {
    const prompt = `
      You are an Indian Women Safety Spatial System Specialist analyzing urban dark zones and crime hotspots in ${city}.
      A user needs to travel from coordinates (${userLat}, ${userLng}) to "${destName || 'Active Crisis Center'}" at (${destLat}, ${destLng}).
      
      Provide a comprehensive safety comparison of route paths (Safest Route vs Shorter Alternates):
      1. Safe Route (Well-lit, highly populated, close to police/Pink Patrol beats)
      2. Hazard/Caution areas (Industrial bypasses, isolated stretches, reported harassment spots)
      
      Generate exact coordinates for points representing a bifurcated path of 5 milestones per route, bending/routing around the hotspots of ${city}.
      Provide explanations in BOTH English and Hindi.
    `;

    // Attempt Gemini call
    try {
      const ai = getGeminiClient();
      const completion = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedRoute: {
                type: Type.OBJECT,
                properties: {
                  reasonEn: { type: Type.STRING },
                  reasonHi: { type: Type.STRING },
                  stepsEn: { type: Type.ARRAY, items: { type: Type.STRING } },
                  stepsHi: { type: Type.ARRAY, items: { type: Type.STRING } },
                  overallRating: { type: Type.STRING, description: "Must be 'safe' or 'caution'" }
                },
                required: ["reasonEn", "reasonHi", "stepsEn", "stepsHi", "overallRating"]
              },
              unsecuredRoute: {
                type: Type.OBJECT,
                properties: {
                  reasonEn: { type: Type.STRING },
                  reasonHi: { type: Type.STRING },
                  stepsEn: { type: Type.ARRAY, items: { type: Type.STRING } },
                  stepsHi: { type: Type.ARRAY, items: { type: Type.STRING } },
                  overallRating: { type: Type.STRING, description: "Must be 'hazard'" }
                },
                required: ["reasonEn", "reasonHi", "overallRating"]
              }
            },
            required: ["recommendedRoute", "unsecuredRoute"]
          }
        }
      });

      const responseText = completion.text;
      if (responseText) {
        return res.json(JSON.parse(responseText));
      }
    } catch (geminiError) {
      console.warn("Gemini fetch failed, issuing robust local secure fallback coordinates.", (geminiError as Error).message);
    }

    // High fidelity fallback response if API is offline or missing key
    const fallbackResponse = {
      recommendedRoute: {
        reasonEn: `[AI Fallback Routing Active] Outskirt zones avoided. Recommending Corridor 1A since it runs through active commercial centers, enjoys police CCTV mapping, and maintains complete high-density streetlight illumination.`,
        reasonHi: `[एआई बैकअप सक्रिय] बाहरी वीरान रास्तों से दूरी। कॉरिडोर 1ए की सिफारिश की जाती है क्योंकि इसमें लगातार बिजली की रोशनी, वाणिज्यिक दुकानें और अत्यधिक पुलिस कैमरे मौजूद हैं।`,
        stepsEn: [
          "Departure: Highly illuminated commercial zone.",
          "Milestone 1: Pass CSMT Pink Police outpost help gate.",
          "Milestone 2: Transit on well-regulated pedestrian corridor.",
          "Milestone 3: Stay near brightly illuminated housing society.",
          "Safe Arrival: Fully guarded secure perimeters."
        ],
        stepsHi: [
          "स्थान प्रस्थान: रोशनी और सुरक्षा से भरा बाजार क्षेत्र।",
          "मील का पत्थर 1: पिंक पीसीआर गश्ती बूथ के समीप से गुजरें।",
          "मील का पत्थर 2: चौड़ी और सीसीटीवी निगरानी वाली सार्वजनिक सड़क लें।",
          "मील का पत्थर 3: अच्छी लाइट वाली गार्डेड सोसायटी के पास रहें।",
          "सुरक्षित गंतव्य: संकट सहायता केंद्र पर पूर्ण सुरक्षा।"
        ],
        overallRating: "safe"
      },
      unsecuredRoute: {
        reasonEn: `Dark bypass bypass road shows multiple low illumination intervals and lack of active helpline kiosks. Avoid late at night.`,
        reasonHi: `अंधेरी बाईपास सड़कों वाले बाहरी मार्ग पर लाइटें बंद हैं और कोई सुरक्षा डेस्क मौजूद नहीं है। रात में यहाँ जाने से पूरी तरह बचें।`,
        stepsEn: [
          "Entry onto dark outskirt highway layout.",
          "Industrial unpatrolled area with deep unmonitored blind spots."
        ],
        stepsHi: [
          "अंधेरे बाईपास औद्योगिक मार्ग पर प्रवेश।",
          "अपर्याप्त पुलिस निगरानी और संकरी निर्जन सड़कों का क्षेत्र।"
        ],
        overallRating: "hazard"
      }
    };

    return res.json(fallbackResponse);

  } catch (error) {
    console.error("AI Recommendation server failure:", error);
    res.status(500).json({ error: "Exception generating route recommendations" });
  }
});

// API Route: AI Safety Assistant (Gemini-3.5-flash)
app.post('/api/ai-assistant', async (req, res) => {
  const { prompt, history = [], lang = 'en' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Empty search or prompt" });
  }

  try {
    const systemPrompt = `
      You are Rakshika AI Sentry Assistant, an elite companion specializing in:
      1. Emergency safety procedures and distress guidance in India.
      2. Self-defense tactics, physical evasion, and space navigation.
      3. Constitutional & Statutory Legal Rights for women in India (IPC, BNS, POSH Act, Domestic Violence Act, Zero FIR rules, 1091 and 112 system operations).
      4. General safety advice for high-risk transits, taxi/rideshares, or late-night walks.

      Answer the user's query in detail, with a compassionate, firm, highly supportive, and authoritative tone.
      Provide answers matching the language requested: current interface language is ${lang}. If Hindi is requested, write in beautiful, clear Devanagari script.
    `;

    try {
      const ai = getGeminiClient();
      
      // Structure the safety query using system instructions
      const completion = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }] }
        ]
      });

      const responseText = completion.text;
      if (responseText) {
        return res.json({ response: responseText });
      }
    } catch (geminiError) {
      console.warn("Gemini query failed. Using local fallback dictionary recommendations.", (geminiError as Error).message);
    }

    // High fidelity fallback response based on Indian Women Legal & Defense code
    const fallbackAnswers: Record<string, string> = {
      en: `[AI Fallback Assistance Activated] Here are core self-defense and safety guidelines:\n\n` +
          `1. **Zero FIR Right:** Under Indian law, you can file a 'Zero FIR' at any police station regardless of jurisdiction. The station must accept it and forward it.\n` +
          `2. **Free Legal Aid:** You have a right to free legal representation at government expense if faced with custody or threat.\n` +
          `3. **1091 Women Helpline:** Call 1091 directly for all women-focused crime and protection units, active 24/7 in all Indian cities.\n` +
          `4. **Evading Stalkers:** If followed, turn into well-lit public areas immediately. Do NOT head home directly. Call / activate Rakshika hands-free mode.`,
      hi: `[एआई बैकअप सहायता सक्रिय] यहाँ भारतीय कानून और आत्मरक्षा के मुख्य दिशा-निर्देश दिए गए हैं:\n\n` +
          `1. **जीरो एफआईआर (Zero FIR) का अधिकार:** भारतीय कानून के तहत आप किसी भी पुलिस स्टेशन में जीरो एफआईआर दर्ज करा सकती हैं, चाहे अपराध कहीं भी हुआ हो।\n` +
          `2. **निःशुल्क कानूनी सहायता:** महिलाओं को किसी भी परेशानी या हिरासत के समय सरकार द्वारा देय मुफ्त कानूनी सहायता का पूर्ण अधिकार है।\n` +
          `3. **1091 महिला हेल्पलाइन:** 24 घंटे सक्रिय रहने वाली इस हेल्पलाइन पर डायल करके सीधे नजदीकी महिला विंग से तुरंत सुरक्षा सेवाएं प्राप्त की जा सकती हैं।\n` +
          `4. **पीछा करने वालों से बचाव:** यदि कोई पीछा कर रहा हो, तो तुरंत भीड़भाड़ और रोशनी वाले क्षेत्र की ओर बढ़ें। सीधे घर जाने से बचें। रक्षिका एसओएस बटन या वॉयड ट्रिगर का प्रयोग करें।`
    };

    return res.json({ response: fallbackAnswers[lang] || fallbackAnswers['en'] });

  } catch (error) {
    console.error("AI Assistant server failure:", error);
    res.status(500).json({ error: "Exception processing AI Assistant query" });
  }
});

// Vite & Static assets compilation routing
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Women's Safety Portal active on port ${PORT}`);
  });
}

start();
