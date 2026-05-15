/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AppPhase {
  SETUP = 'setup',
  MORNING = 'morning',
  WARDROBE = 'wardrobe',
  EVENING = 'evening'
}

export interface WeatherData {
  temp: number;
  minTemp?: number;
  maxTemp?: number;
  humidity: number;
  condition: string;
  location: string;
}

export interface OutfitAnalysis {
  items: { name: string; percentage: number }[];
  suitabilityScore: number;
  recommendedRange: string;
  tops?: string;
  bottoms?: string;
}

export interface SensoryData {
  windiness: number; // 透風感
  envelopment: number; // 包裹感
  stuffiness: number; // 悶熱度
}

export interface SimilarOutfitReference {
  image: string;
  label: string;
  context: string;
}

export interface SimilarOutfitAnalysis {
  percentages: { label: string; val: number; color: string }[];
  references: SimilarOutfitReference[];
  matchedCount: number;
  summary: string;
}
