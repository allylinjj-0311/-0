/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeatherData } from '../types';

const FORECAST_DATA_URL = '/weather-forecast.json';
const CURRENT_OBSERVATION_URL =
  'https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=CWA-D7240770-EF63-4430-99B0-F8119AFA888E&format=JSON';

type ForecastTime = {
  startTime: string;
  endTime: string;
  parameter: {
    parameterName: string;
    parameterUnit?: string;
  };
};

type ForecastLocation = {
  locationName: string;
  weatherElement: {
    elementName: string;
    time: ForecastTime[];
  }[];
};

type ForecastResponse = {
  records?: {
    location?: ForecastLocation[];
  };
};

type CurrentStation = {
  StationName?: string;
  WeatherElement?: {
    Weather?: string;
    AirTemperature?: string;
    RelativeHumidity?: string;
  };
  GeoInfo?: {
    CountyName?: string;
    TownName?: string;
  };
};

type CurrentObservationResponse = {
  records?: {
    Station?: CurrentStation[];
  };
};

export async function fetchWeather(locationName: string): Promise<WeatherData> {
  const [forecast, currentObservation] = await Promise.all([
    fetchTemperatureRange(locationName),
    fetchCurrentObservation(locationName),
  ]);

  const minTemp = forecast?.minTemp ?? 22;
  const maxTemp = forecast?.maxTemp ?? 27;
  const currentTemp = currentObservation?.temp ?? Math.round((minTemp + maxTemp) / 2);

  return {
    temp: currentTemp,
    minTemp,
    maxTemp,
    humidity: currentObservation?.humidity ?? 50,
    condition: currentObservation?.condition ?? forecast?.condition ?? '多雲',
    location: locationName,
  };
}

async function fetchTemperatureRange(locationName: string) {
  try {
    const response = await fetch(FORECAST_DATA_URL);
    if (!response.ok) {
      throw new Error(`Forecast request failed: ${response.status}`);
    }

    const data = (await response.json()) as ForecastResponse;
    const location = data.records?.location?.find((item) => item.locationName === locationName);

    if (!location) return null;

    const minTemp = readFirstNumericElement(location, 'MinT');
    const maxTemp = readFirstNumericElement(location, 'MaxT');
    const condition = readFirstTextElement(location, 'Wx');

    if (minTemp === null || maxTemp === null) return null;

    return { minTemp, maxTemp, condition };
  } catch (error) {
    console.error('Unable to load forecast temperature range:', error);
    return null;
  }
}

async function fetchCurrentObservation(locationName: string) {
  try {
    const response = await fetch(CURRENT_OBSERVATION_URL);
    if (!response.ok) {
      throw new Error(`Current observation request failed: ${response.status}`);
    }

    const data = (await response.json()) as CurrentObservationResponse;
    const stations = data.records?.Station ?? [];
    const station = findBestStation(stations, locationName);
    const weatherElement = station?.WeatherElement;

    if (!weatherElement) return null;

    const humidity = toNumber(weatherElement.RelativeHumidity);
    const temp = toNumber(weatherElement.AirTemperature);
    const condition = normalizeObservationText(weatherElement.Weather);

    return {
      temp: temp ?? undefined,
      humidity: humidity ?? undefined,
      condition: condition || undefined,
    };
  } catch (error) {
    console.error('Unable to load current weather observation:', error);
    return null;
  }
}

function findBestStation(stations: CurrentStation[], locationName: string) {
  const countyStations = stations.filter((station) => station.GeoInfo?.CountyName === locationName);
  const directStations = stations.filter((station) => station.StationName === locationName);
  const candidates = countyStations.length > 0 ? countyStations : directStations;

  return (
    candidates.find(hasCompleteObservation) ??
    candidates.find(hasHumidityAndWeather) ??
    candidates[0] ??
    stations.find(hasCompleteObservation) ??
    null
  );
}

function hasCompleteObservation(station: CurrentStation) {
  const element = station.WeatherElement;
  return Boolean(
    normalizeObservationText(element?.Weather) &&
      toNumber(element?.RelativeHumidity) !== null &&
      toNumber(element?.AirTemperature) !== null
  );
}

function hasHumidityAndWeather(station: CurrentStation) {
  const element = station.WeatherElement;
  return Boolean(normalizeObservationText(element?.Weather) && toNumber(element?.RelativeHumidity) !== null);
}

function readFirstNumericElement(location: ForecastLocation, elementName: string) {
  const value = readFirstTextElement(location, elementName);
  return toNumber(value);
}

function readFirstTextElement(location: ForecastLocation, elementName: string) {
  const element = location.weatherElement.find((item) => item.elementName === elementName);
  return element?.time[0]?.parameter.parameterName ?? null;
}

function normalizeObservationText(value?: string) {
  if (!value || value === '-' || value.toLowerCase() === 'null') return null;
  return value;
}

function toNumber(value?: string | null) {
  if (!value || value === '-' || value.toLowerCase() === 'null') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const TAIWAN_CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "高雄市": { lat: 22.6203348, lon: 120.3120375 },
  "臺北市": { lat: 25.0375198, lon: 121.5636796 },
  "新北市": { lat: 25.011997, lon: 121.4656619 },
  "桃園市": { lat: 24.9929995, lon: 121.3010003 },
  "臺中市": { lat: 24.163162, lon: 120.6478282 },
  "臺南市": { lat: 22.9912348, lon: 120.184982 },
};

export function getNearestCity(lat: number, lon: number): string {
  let nearestCity = "臺北市";
  let minDistance = Infinity;

  const cities = Object.keys(TAIWAN_CITY_COORDS);
  for (const city of cities) {
    const coords = TAIWAN_CITY_COORDS[city];
    const distance = Math.sqrt(Math.pow(lat - coords.lat, 2) + Math.pow(lon - coords.lon, 2));
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }
  return nearestCity;
}

export const TAIWAN_CITIES = [
  "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
  "基隆市", "新竹市", "新竹縣", "苗栗縣", "彰化縣", "南投縣",
  "雲林縣", "嘉義市", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "臺東縣", "澎湖縣", "金門縣", "連江縣"
];
