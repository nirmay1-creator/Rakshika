/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TranslationLang = 'en' | 'hi';

export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
}

export enum SafetyRating {
  SAFE = 'safe',
  CAUTION = 'caution',
  HAZARD = 'hazard',
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: 'police' | 'family' | 'ambulance' | 'other';
  isDefault: boolean;
}

export interface IncidentReport {
  id: string;
  userId: string;
  type: 'harassment' | 'unsafe_area' | 'low_lighting' | 'no_police' | 'other';
  encryptedDetails: string;
  cityName: string;
  lat: number;
  lng: number;
  upvotes: number;
  createdAt: string; // ISO String
}

export interface LiveLocationData {
  userId: string;
  userName: string;
  encryptedCoords: string; // Encrypted "{lat, lng}"
  isActive: boolean;
  updatedAt: string; // ISO String;
}

export interface MapCity {
  id: string;
  name: string;
  hindiName: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
}

export interface MapMarkerNode {
  id: string;
  name: string;
  hindiName: string;
  type: 'police' | 'hospital' | 'womens_center' | 'safe_haven' | 'hotspot';
  lat: number;
  lng: number;
  phone?: string;
  rating?: SafetyRating;
  details?: string;
  detailsHindi?: string;
}

export interface RouteSegment {
  lat: number;
  lng: number;
  safetyRating: SafetyRating;
  isWellLit: boolean;
  notes?: string;
  notesHindi?: string;
}

export interface SafetyRoutePath {
  id: string;
  name: string;
  nameHindi: string;
  points: RouteSegment[];
  overallRating: SafetyRating;
  reasonEn: string;
  reasonHi: string;
}

export interface LocalAudioRecord {
  id: string;
  timestamp: string;
  durationSec: number;
  blobUrl?: string;
  sizeMb: number;
  isSynced: boolean;
}
