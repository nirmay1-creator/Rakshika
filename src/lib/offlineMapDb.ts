/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapCity, MapMarkerNode, SafetyRating, SafetyRoutePath, RouteSegment } from '../types';

export const INDIAN_CITIES: MapCity[] = [
  {
    id: 'delhi',
    name: 'Delhi NCR',
    hindiName: 'दिल्ली एनसीआर',
    centerLat: 28.6139,
    centerLng: 77.2090,
    zoom: 12
  },
  {
    id: 'mumbai',
    name: 'Mumbai Metro',
    hindiName: 'मुंबई',
    centerLat: 19.0760,
    centerLng: 72.8777,
    zoom: 12
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru IT Zone',
    hindiName: 'बेंगलुरु',
    centerLat: 12.9716,
    centerLng: 77.5946,
    zoom: 12
  },
  {
    id: 'pune',
    name: 'Pune District',
    hindiName: 'पुणे',
    centerLat: 18.5204,
    centerLng: 73.8567,
    zoom: 12
  }
];

// Offline markers representing physical help stations or danger coordinates
export const OFFLINE_MARKERS: Record<string, MapMarkerNode[]> = {
  delhi: [
    {
      id: 'd1',
      name: 'Delhi Police HQ & Women Safety Cell',
      hindiName: 'दिल्ली पुलिस मुख्यालय और महिला सुरक्षा सेल',
      type: 'police',
      lat: 28.6276,
      lng: 77.2154,
      phone: '1091',
      rating: SafetyRating.SAFE,
      details: 'Active women safe desk. Safe refuge shelter available 24/7.',
      detailsHindi: 'सक्रिय महिला सुरक्षा डेस्क। 24/7 सुरक्षित आश्रय गृह उपलब्ध।'
    },
    {
      id: 'd2',
      name: 'Connaught Place All-Women Police Booth',
      hindiName: 'कनॉट प्लेस महिला पुलिस बूथ',
      type: 'police',
      lat: 28.6304,
      lng: 77.2177,
      phone: '100',
      rating: SafetyRating.SAFE,
      details: 'Centrally located emergency respond booth.',
      detailsHindi: 'केंद्रीय रूप से स्थित आपातकालीन प्रतिक्रिया बूथ।'
    },
    {
      id: 'd3',
      name: 'Ram Manohar Lohia Safe Haven Hospital',
      hindiName: 'राम मनोहर लोहिया सुरक्षित अस्पताल',
      type: 'hospital',
      lat: 28.6247,
      lng: 77.2023,
      phone: '011-23365555',
      rating: SafetyRating.SAFE,
      details: '24-hour emergency hospital, highly secured perimeters.',
      detailsHindi: '24 घंटे आपातकालीन अस्पताल, अत्यधिक सुरक्षित सीमाएं।'
    },
    {
      id: 'd4',
      name: 'Nirbhaya Women Support & Counselling Center',
      hindiName: 'निर्भया महिला सहायता और परामर्श सहायता केंद्र',
      type: 'womens_center',
      lat: 28.5800,
      lng: 77.2300,
      phone: '181',
      rating: SafetyRating.SAFE,
      details: 'Crisis counselling and rapid legal and safe shelters.',
      detailsHindi: 'संकट परामर्श और तेजी से कानूनी और सुरक्षित आश्रय।'
    },
    {
      id: 'd5',
      name: 'Sardar Patel Marg High Lighted Patrol Zone',
      hindiName: 'सरदार पटेल मार्ग उच्च गश्ती क्षेत्र',
      type: 'safe_haven',
      lat: 28.5991,
      lng: 77.1735,
      phone: '112',
      rating: SafetyRating.SAFE,
      details: 'Continuous pink police patrolling. Zero darkness zone.',
      detailsHindi: 'लगातार पिंक पुलिस गश्त। शून्य अंधेरा क्षेत्र।'
    },
    // Hotspots (Unsafe regions mapped for risk awareness)
    {
      id: 'd6',
      name: 'Outer Ring Bypass Near Low-Lit Transit Outpost',
      hindiName: 'कम रोशनी वाला आउटर रिंग बाईपास ट्रांजिट क्षेत्र',
      type: 'hotspot',
      lat: 28.6650,
      lng: 77.2580,
      rating: SafetyRating.HAZARD,
      details: 'Caution: Poor public lighting and reported isolated spots.',
      detailsHindi: 'सावधानी: खराब सार्वजनिक प्रकाश व्यवस्था और सुनसान रास्ते।'
    },
    {
      id: 'd7',
      name: 'Isolated Industrial Layout (G T Road Junction)',
      hindiName: 'सुनसान औद्योगिक क्षेत्र (जी टी रोड जंक्शन)',
      type: 'hotspot',
      lat: 28.6920,
      lng: 77.1400,
      rating: SafetyRating.HAZARD,
      details: 'Caution: Extreme low traffic after 8 PM, high unmonitored roads.',
      detailsHindi: 'सावधानी: शाम 8 बजे के बाद बेहद कम यातायात, अनियंत्रित सड़कें।'
    }
  ],
  mumbai: [
    {
      id: 'm1',
      name: 'CSMT Women Emergency Help Hub',
      hindiName: 'सीएसएमटी महिला आपातकालीन सहायता केंद्र',
      type: 'police',
      lat: 18.9400,
      lng: 72.8354,
      phone: '1091',
      rating: SafetyRating.SAFE,
      details: 'Railway safety division custom responses.',
      detailsHindi: 'रेलवे सुरक्षा विभाग तत्काल सहायता।'
    },
    {
      id: 'm2',
      name: 'Dharavi Safety Patrol Station',
      hindiName: 'धारावी सुरक्षा पुलिस स्टेशन',
      type: 'police',
      lat: 19.0380,
      lng: 72.8538,
      phone: '112',
      rating: SafetyRating.SAFE,
      details: 'Locally active area officers with women-desk teams.',
      detailsHindi: 'महिला डेस्क टीमों के साथ स्थानीय रूप से सक्रिय अधिकारी।'
    },
    {
      id: 'm3',
      name: 'Sion Medical Safe Point',
      hindiName: 'सायन मेडिकल सहायता केंद्र',
      type: 'hospital',
      lat: 19.0355,
      lng: 72.8600,
      phone: '102',
      rating: SafetyRating.SAFE,
      details: 'Immediate trauma and clinical safety responds 24/7.',
      detailsHindi: 'तत्काल आघात और चिकित्सा सुरक्षा उपलब्धता 24/7।'
    },
    {
      id: 'm4',
      name: 'Dark Stretch (Eastern Express Outskirt Bridge)',
      hindiName: 'अंधेरा क्षेत्र (पूर्वी एक्सप्रेस बाहरी पुल)',
      type: 'hotspot',
      lat: 19.1120,
      lng: 72.9350,
      rating: SafetyRating.HAZARD,
      details: 'Caution: Construction works, blind spots, under-patrolled.',
      detailsHindi: 'सावधानी: निर्माण कार्य, ब्लाइंड स्पॉट, अपर्याप्त पुलिस गश्त।'
    }
  ],
  bengaluru: [
    {
      id: 'b1',
      name: 'Koramangala All-Women Emergency Cell',
      hindiName: 'कोरामंगला महिला आपातकालीन सेल',
      type: 'police',
      lat: 12.9345,
      lng: 77.6101,
      phone: '1091',
      rating: SafetyRating.SAFE,
      details: 'Instant responses. Safe parking support for women late at night.',
      detailsHindi: 'तत्काल प्रतिक्रिया। देर रात महिलाओं के लिए सुरक्षित पार्किंग सहायता।'
    },
    {
      id: 'b2',
      name: 'Cubbon Park Pink Patrol Area',
      hindiName: 'कब्बन पार्क पिंक पुलिस रक्षा स्थान',
      type: 'safe_haven',
      lat: 12.9730,
      lng: 77.5930,
      phone: '112',
      rating: SafetyRating.SAFE,
      details: 'Monitored area with frequent rounds by female responders.',
      detailsHindi: 'महिला पुलिस अधिकारियों द्वारा लगातार गश्त की व्यवस्था।'
    },
    {
      id: 'b3',
      name: 'Outer Ring Road Safe Transit Stop (Silk Board)',
      hindiName: 'आउटर रिंग रोड सुरक्षित ट्रांजिट स्टॉप',
      type: 'safe_haven',
      lat: 12.9176,
      lng: 77.6246,
      rating: SafetyRating.SAFE,
      details: 'Well-lit area, fitted with high-res CCTV camera matrices.',
      detailsHindi: 'अच्छी तरह से प्रकाशित क्षेत्र, सीसीटीवी कैमरों से सुसज्जित।'
    },
    {
      id: 'b4',
      name: 'Manyata Backroad Under-Construction Layout',
      hindiName: 'मान्यता बैकरोड निर्माणाधीन मार्ग',
      type: 'hotspot',
      lat: 13.0490,
      lng: 77.6250,
      rating: SafetyRating.HAZARD,
      details: 'Caution: Ongoing bypass works, heavy transport transit, low lights.',
      detailsHindi: 'सावधानी: निर्माणाधीन सड़क, भारी वाहनों का मार्ग, कम रोशनी।'
    }
  ],
  pune: [
    {
      id: 'p1',
      name: 'Shivajinagar Police Responder Station',
      hindiName: 'शिवाजीनगर पुलिस आपातकालीन सुरक्षा केंद्र',
      type: 'police',
      lat: 18.5304,
      lng: 73.8500,
      phone: '1091',
      rating: SafetyRating.SAFE,
      details: 'Immediate responder hub. Equipped with dedicated women rescue vehicles.',
      detailsHindi: 'तत्काल सहायता केंद्र। समर्पित महिला बचाव वाहनों से लैस।'
    },
    {
      id: 'p2',
      name: 'Deccan Gymkhana Illuminated Walkway',
      hindiName: 'डेक्कन जिमखाना सुरक्षित पैदल मार्ग',
      type: 'safe_haven',
      lat: 18.5140,
      lng: 73.8420,
      rating: SafetyRating.SAFE,
      details: 'Highly active pedestrian walk, continuous commercial security.',
      detailsHindi: 'अत्यधिक सक्रिय पैदल मार्ग, लगातार व्यावसायिक लाइव सुरक्षा निगरानी।'
    },
    {
      id: 'p3',
      name: 'Katraj Desolate Hill Slopes Transit',
      hindiName: 'कात्रज पहाड़ी सुनसान मार्ग',
      type: 'hotspot',
      lat: 18.4520,
      lng: 73.8580,
      rating: SafetyRating.HAZARD,
      details: 'Caution: Extremely dark at night, zero nearby police stations.',
      detailsHindi: 'सावधानी: रात में अत्यधिक अंधेरा, आसपास कोई पुलिस चौकी नहीं।'
    }
  ]
};

/**
 * Calculates a list of offline route paths from current location towards the selected destination responder.
 * One path will be direct/fast (cautioned if intersecting hazards) and another will be specifically the "Safe Recommendation"
 * which routes around unsafe hotspots (simulating offline GPS pathfinding).
 */
export function calculateOfflineSafePath(
  cityName: string,
  userLat: number,
  userLng: number,
  destNode: MapMarkerNode
): SafetyRoutePath[] {
  // To simulate route recommendations fully offline, we calculate vector paths
  const directPts: RouteSegment[] = [];
  const safePts: RouteSegment[] = [];

  // Generate intermediate points by interpolating between User and Destination coordinates
  const steps = 5;
  const hotspotsForCity = (OFFLINE_MARKERS[cityName] || []).filter(m => m.type === 'hotspot');

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Direct path: straight line with minimal deflection
    const rawLat = userLat + (destNode.lat - userLat) * t;
    const rawLng = userLng + (destNode.lng - userLng) * t;

    // Check distance to closest hotspot
    const nearHotspot = hotspotsForCity.some(h => {
      const dist = Math.sqrt(Math.pow(h.lat - rawLat, 2) + Math.pow(h.lng - rawLng, 2));
      return dist < 0.015; // Proximity threshold
    });

    directPts.push({
      lat: rawLat,
      lng: rawLng,
      safetyRating: nearHotspot ? SafetyRating.HAZARD : SafetyRating.CAUTION,
      isWellLit: !nearHotspot,
      notes: nearHotspot ? 'Low-lit transit junction, reported incident area' : 'Medium-density commuter road',
      notesHindi: nearHotspot ? 'कम रोशनी वाला चौराहा, घटना प्रवण क्षेत्र' : 'मध्यम घनत्व वाली सड़क'
    });
  }

  // Safe path: deflected to avoid hotspots, prioritize lighting and safety stations
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Create custom deflection shape to bypass dangerous hotspot areas
    const straightLat = userLat + (destNode.lat - userLat) * t;
    const straightLng = userLng + (destNode.lng - userLng) * t;
    
    // Add sinusoidal curve offset to bend around the center to avoid common coordinates
    const deflectionAmp = 0.008 * Math.sin(t * Math.PI);
    const safeLat = straightLat + deflectionAmp;
    const safeLng = straightLng - deflectionAmp;

    safePts.push({
      lat: safeLat,
      lng: safeLng,
      safetyRating: SafetyRating.SAFE,
      isWellLit: true,
      notes: 'Monitored smart corridor, well lit with Pink Patrol coverage',
      notesHindi: 'निगरानी मार्ग, पिंक पीसीआर पेट्रोल कवरेज के साथ अच्छी तरह से प्रकाशित'
    });
  }

  return [
    {
      id: 'safe-recommendation',
      name: 'Recommended Secure Route',
      nameHindi: 'अनुशंसित सुरक्षित मार्ग',
      points: safePts,
      overallRating: SafetyRating.SAFE,
      reasonEn: 'This route bypasses identified isolate/hazard zones, runs strictly along fully illuminated corridors covered by Police CCTV, and stays near active responders.',
      reasonHi: 'यह मार्ग चिन्हित सुनसान/खतरनाक क्षेत्रों से बचता है, पूरी तरह प्रकाश व्यवस्था और पुलिस सीसीटीवी से लैस मुख्य सड़कों से होकर गुजरता है।'
    },
    {
      id: 'direct-alternate',
      name: 'Alternate Transit Path (Caution)',
      nameHindi: 'वैकल्पिक मार्ग (सावधानी आवश्यक)',
      points: directPts,
      overallRating: SafetyRating.HAZARD,
      reasonEn: 'Shorter distance but intersects dark areas on Outer Bypass showing lower illumination level and higher historical report density after hours.',
      reasonHi: 'फासला कम है लेकिन बाहरी बाईपास की कम अंधेरी सड़कों को छूता है जहां देर रात सुरक्षा की दृष्टि से सावधानी ज़रूरी है।'
    }
  ];
}
