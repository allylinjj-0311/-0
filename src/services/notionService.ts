/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OutfitAnalysis, SensoryData, SimilarOutfitAnalysis, WeatherData } from '../types';

export type OutfitLogInput = {
  userName: string;
  weather: WeatherData;
  sensory: SensoryData;
  outfit?: OutfitAnalysis | null;
  userImage?: string | null;
  tops?: string;
  bottoms?: string;
};

export async function fetchSimilarOutfits(weather: WeatherData): Promise<SimilarOutfitAnalysis> {
  const query = new URLSearchParams({
    city: weather.location,
    temp: String(weather.temp),
    humidity: String(weather.humidity),
    condition: weather.condition,
  });

  const response = await fetch(`/api/notion/similar-outfits?${query.toString()}`);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to load similar outfit records.');
  }

  return body as SimilarOutfitAnalysis;
}

export async function saveOutfitLog({
  userName,
  weather,
  sensory,
  outfit,
  userImage,
  tops = '',
  bottoms = '',
}: OutfitLogInput) {
  const resolvedTops = outfit?.tops || tops;
  const resolvedBottoms = outfit?.bottoms || bottoms;
  const percentages = outfit?.items
    ?.map((item) => `${item.name} ${item.percentage}%`)
    .join(', ');

  const response = await fetch('/api/notion/create-outfit-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userName,
      city: weather.location,
      recordedAt: new Date().toISOString(),
      temp: weather.temp,
      humidity: weather.humidity,
      weatherCondition: weather.condition,
      tops: resolvedTops,
      bottoms: resolvedBottoms,
      percentages,
      userImage,
      weatherContext: `${weather.location} ${weather.condition} ${weather.temp}°C / ${weather.humidity}%`,
      breathability: sensory.windiness,
      wrapping: sensory.envelopment,
      stuffiness: sensory.stuffiness,
    }),
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.details?.message || body?.error || 'Unable to save outfit log.');
  }

  return body as { id: string; url: string };
}
