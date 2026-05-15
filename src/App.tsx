/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  Wind, 
  Thermometer, 
  Camera, 
  Moon, 
  Sun, 
  Tag, 
  Activity,
  ArrowRight,
  Upload,
  RefreshCw,
  Droplets,
  Layers,
  MapPin,
  CloudRain,
  CloudSun,
  CloudLightning
} from 'lucide-react';
import { AppPhase, WeatherData, OutfitAnalysis, SensoryData, SimilarOutfitAnalysis } from './types';
import { GoogleGenAI } from '@google/genai';
import { fetchWeather, TAIWAN_CITIES, getNearestCity } from './services/weatherService';
import { fetchSimilarOutfits, saveOutfitLog } from './services/notionService';

// --- Components ---

const ZineLayout = ({ children, phase, onNavigate, userName, weather }: { children: ReactNode, phase: AppPhase, onNavigate: (p: AppPhase) => void, userName?: string, weather: WeatherData }) => {
  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('雷')) return <CloudLightning size={24} className="text-zine-accent" />;
    if (c.includes('雨')) return <CloudRain size={24} className="text-zine-accent" />;
    if (c.includes('雲') && (c.includes('晴') || c.includes('日'))) return <CloudSun size={24} className="text-zine-yellow" />;
    if (c.includes('雲')) return <Cloud size={24} className="text-zinc-400" />;
    if (c.includes('晴')) return <Sun size={24} className="text-zine-yellow" />;
    return <Wind size={24} className="text-zinc-400" />;
  };

  return (
    <div className="min-h-screen bg-zine-paper flex flex-col p-0 md:p-4">
      <div className="flex-grow frame-border paper-texture relative flex flex-col max-w-5xl mx-auto w-full bg-zine-paper">
        {/* Masthead */}
        <header className="border-b-4 border-zine-ink p-6 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-end bg-white relative z-20">
          <div>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none font-display">衣氣象</h1>
            <p className="font-mono text-[10px] md:text-sm tracking-widest mt-2 italic uppercase opacity-60">
              {phase === AppPhase.SETUP ? 'Climate Canvas UI / Research Prototype v.01' : `OP: ${userName || 'ANONYMOUS'} / SESSION_0514`}
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex gap-6 items-center text-right">
            {phase !== AppPhase.SETUP && (
              <>
                <div className="flex items-center gap-3 pr-6 border-r-2 border-dashed border-zinc-200">
                  <div className="bg-zine-paper p-2 border-2 border-zine-ink">
                    {getWeatherIcon(weather.condition)}
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] font-mono font-black uppercase opacity-40 leading-none mb-1">CONDITION:</div>
                    <div className="text-sm font-black font-mono leading-none">{weather.condition}</div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                   <div className="text-3xl md:text-4xl font-black font-mono tracking-tighter leading-none">
                     {weather.temp}°C / {weather.humidity}%
                   </div>
                   <div className="text-[10px] font-mono uppercase bg-zine-ink text-white px-2 py-0.5 inline-block mt-1">
                     {weather.location}: {weather.minTemp}-{weather.maxTemp}°C
                   </div>
                </div>
                <div className="flex flex-col gap-1">
                  {Object.values(AppPhase).filter(p => p !== AppPhase.SETUP).map((p) => (
                    <button
                      key={p}
                      onClick={() => onNavigate(p)}
                      className={`px-3 py-1 border-2 font-mono text-[10px] uppercase font-bold transition-all ${phase === p ? 'bg-zine-ink text-white -translate-x-1' : 'bg-transparent border-zine-ink hover:bg-zinc-100'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-grow p-6 md:p-10 relative overflow-hidden">
          {children}
        </main>

        <footer className="bg-zine-ink text-white px-6 md:px-10 py-3 flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.2em] relative z-20">
          <span>DATA_SENSORS: ACTIVE</span>
          <span>© 2026 CLIMATE CANVAS RESEARCH LAB</span>
          <span>SYS_LATENCY: 12ms</span>
        </footer>
      </div>
    </div>
  );
};

// Phase 0: Setup
const SetupView = ({ onComplete }: { onComplete: (name: string, location: string, weather: WeatherData) => void }) => {
  const [name, setName] = useState('');
  const [selectedCity, setSelectedCity] = useState('臺北市');
  const [detecting, setDetecting] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDetect = () => {
    setDetecting(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nearest = getNearestCity(position.coords.latitude, position.coords.longitude);
          setSelectedCity(nearest);
          setDetecting(false);
        },
        (error) => {
          console.error("Error detecting location:", error);
          setDetecting(false);
        }
      );
    } else {
      setDetecting(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    const weatherData = await fetchWeather(selectedCity);
    onComplete(name, selectedCity, weatherData);
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto space-y-12 py-12"
    >
      <div className="space-y-4">
        <label className="block font-mono text-xs uppercase font-black tracking-widest opacity-40">[ ENTER_OPERATOR_NAME ]</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Researcher A" 
          className="w-full text-4xl font-black bg-transparent border-b-8 border-zine-ink focus:outline-none placeholder:opacity-10 font-display"
        />
      </div>

      <div className="space-y-4">
        <label className="block font-mono text-xs uppercase font-black tracking-widest opacity-40">[ SELECT_LOCATION ]</label>
        <div className="flex gap-4">
          <div className="relative group flex-grow">
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full p-4 border-4 border-zine-ink bg-white font-mono text-lg font-bold appearance-none cursor-pointer focus:outline-none"
            >
              {TAIWAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <MapPin size={24} />
            </div>
          </div>
          <button 
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="p-4 border-4 border-zine-ink bg-white hover:bg-zinc-100 transition-colors disabled:opacity-50"
            title="Detect nearest city"
          >
            {detecting ? <RefreshCw className="animate-spin w-6 h-6" /> : <RefreshCw className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <button 
        disabled={!name || loading}
        onClick={handleStart}
        className="w-full py-6 bg-zine-yellow border-4 border-zine-ink font-black uppercase text-2xl bold-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-display tracking-widest disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-4"
      >
        {loading ? <RefreshCw className="animate-spin" /> : 'INITIATE PROBE / 啟動儀式'}
      </button>
    </motion.div>
  );
};

// Phase 1: Morning Matching
const MorningView = ({ weather, onNext }: { weather: WeatherData, onNext: () => void }) => {
  const [similarOutfits, setSimilarOutfits] = useState<SimilarOutfitAnalysis | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [similarError, setSimilarError] = useState('');

  useEffect(() => {
    let cancelled = false;

    setLoadingSimilar(true);
    setSimilarError('');
    fetchSimilarOutfits(weather)
      .then((analysis) => {
        if (!cancelled) setSimilarOutfits(analysis);
      })
      .catch((error) => {
        if (!cancelled) {
          setSimilarError(error instanceof Error ? error.message : '資料庫比對失敗');
          setSimilarOutfits({
            percentages: [
              { label: '薄長袖 LIGHT_LONGSLEEVE', val: 55, color: 'bg-zine-ink' },
              { label: '長褲 PANTS', val: 45, color: 'bg-zine-ink' },
              { label: '短褲 SHORTS', val: 25, color: 'bg-zine-ink' },
            ],
            references: [],
            matchedCount: 0,
            summary: '暫時無法讀取 Notion，先使用備援建議',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSimilar(false);
      });

    return () => {
      cancelled = true;
    };
  }, [weather]);

  const percentages = similarOutfits?.percentages ?? [];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-12"
    >
      <section className="space-y-8 relative">
        <div className="absolute -top-4 -right-4 bg-zine-yellow px-4 py-1 text-xs font-bold border-2 border-zine-ink rotate-2 z-10">PHASE_01</div>
        <h2 className="text-4xl font-black uppercase wavy-underline mb-6 font-display">晨間匹配</h2>
        <p className="text-lg italic leading-tight max-w-md">檢索過往相似氣候下的路人穿搭數據。基於目前大氣壓力與濕度分佈...</p>
        
        <div className="bg-white p-6 border-4 border-zine-ink bold-shadow relative">
          <div className="text-xs font-mono mb-4 border-b-2 border-dashed border-zine-ink pb-2 uppercase tracking-widest opacity-60">
            SIMILARITY DATA % / {loadingSimilar ? '讀取資料庫中' : similarOutfits?.summary}
          </div>
          <div className="space-y-6">
            {percentages.map(item => (
              <div key={item.label}>
                <div className="flex justify-between font-mono text-xs mb-2 font-bold">
                  <span>{item.label}</span>
                  <span>{item.val}%</span>
                </div>
                <div className="w-full bg-zinc-100 h-6 border-2 border-zine-ink">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.val}%` }}
                    className="h-full bg-zine-ink"
                  />
                </div>
              </div>
            ))}
            {!loadingSimilar && percentages.length === 0 && (
              <p className="font-mono text-xs font-black uppercase opacity-50">NO_MATCHED_RECORDS</p>
            )}
          </div>
        </div>

        {similarOutfits && similarOutfits.references.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {similarOutfits.references.map((reference, index) => (
              <figure key={`${reference.context}-${index}`} className="bg-white border-2 border-zine-ink overflow-hidden">
                <img src={reference.image} alt={reference.label} className="aspect-square w-full object-cover grayscale" />
                <figcaption className="p-2 font-mono text-[8px] font-black uppercase leading-tight">
                  {reference.label}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {similarError && (
          <div className="bg-white border-2 border-zine-ink px-3 py-2 font-mono text-[10px] font-black uppercase text-zine-accent">
            {similarError}
          </div>
        )}
      </section>

      <section className="flex flex-col justify-end space-y-6">
        <div className="border-t-4 border-zine-ink pt-6">
          <span className="text-xs font-mono block mb-2 font-bold uppercase opacity-60">SYSTEM_RECO:</span>
          <p className="text-3xl font-black leading-tight font-display italic underline decoration-zine-yellow decoration-8 underline-offset-4 mb-8">
            建議：今日氣候【{weather.condition}】。選用透氣材質以應對 {weather.humidity}% 濕度環境。
          </p>
        </div>
        
        <button 
          onClick={onNext}
          className="w-full py-6 bg-zine-accent text-white border-4 border-zine-ink font-black uppercase text-2xl bold-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-display tracking-widest flex items-center justify-center gap-4 group"
        >
          GO TO WARDROBE / 前往衣櫥 <ArrowRight strokeWidth={3} className="group-hover:translate-x-2 transition-transform" />
        </button>

        <div className="font-mono text-[10px] uppercase font-black text-center tracking-[0.2em] opacity-30 mt-4 cursor-pointer hover:opacity-100 transition-opacity">
          OR RE-INITIALIZE CLIMATE SCAN
        </div>
      </section>
    </motion.div>
  );
};

async function createNotionImagePreview(imageData: string) {
  return new Promise<string>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxSize = 160;
      const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(imageData);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.42));
    };
    image.onerror = () => resolve(imageData);
    image.src = imageData;
  });
}

// Phase 2: Wardrobe Tagging
const WardrobeView = ({
  weather,
  onAnalysis,
}: {
  weather: WeatherData;
  onAnalysis: (analysis: OutfitAnalysis | null, image: string | null) => void;
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<OutfitAnalysis | null>(null);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setImage(imageData);
        createNotionImagePreview(imageData).then((preview) => onAnalysis(null, preview));
        analyzeWardrobe(imageData, file.type || 'image/png');
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeWardrobe = async (base64Data: string, mimeType: string) => {
    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze this outfit for a user in ${weather.location} where today is ${weather.temp}°C (${weather.minTemp}-${weather.maxTemp}°C) with ${weather.humidity}% humidity. Output a JSON object matching this schema: 
      { 
        items: Array<{name: string, percentage: number}>, 
        suitabilityScore: number (0-100),
        recommendedRange: string (Description of ideal conditions for this specific outfit),
        tops: string (what the upper-body clothing is, in Traditional Chinese plus a short English tag),
        bottoms: string (what the lower-body clothing is, in Traditional Chinese plus a short English tag)
      }. Focus on physical sensation (breathability, weight), and identify tops and bottoms clearly for a Notion clothing database. Output exactly valid JSON.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data.split(',')[1], mimeType } }
          ]
        },
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(response.text);
      setResult(parsed);
      const preview = await createNotionImagePreview(base64Data);
      onAnalysis(parsed, preview);
    } catch (e) {
      console.error(e);
      const fallback = {
        items: [{name: 'DENIM PIECE', percentage: 40}, {name: 'COTTON POCKET', percentage: 60}],
        suitabilityScore: 78,
        recommendedRange: 'MODERATE HUMIDITY',
        tops: '棉質上衣 COTTON_TOP',
        bottoms: '丹寧下著 DENIM_BOTTOM',
      };
      setResult(fallback);
      const preview = await createNotionImagePreview(base64Data);
      onAnalysis(fallback, preview);
    } finally {
      setAnalyzing(false);
    }
  };

  const displayRange = (weather.minTemp && weather.maxTemp) 
    ? `${weather.minTemp}° - ${weather.maxTemp}°C` 
    : `${weather.temp - 2}° - ${weather.temp + 3}°C`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <div className="relative">
        <div className="absolute -top-4 -right-4 bg-zine-accent px-4 py-1 text-xs font-bold border-2 border-zine-ink -rotate-3 z-30">PHASE_02</div>
        <h2 className="text-4xl font-black uppercase font-display mb-8">著裝標籤</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative">
          {!image ? (
            <label className="block border-4 border-dashed border-zine-ink bg-white p-20 text-center cursor-pointer hover:bg-zinc-50 transition-colors">
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
              <Upload className="mx-auto mb-6 w-12 h-12 opacity-80" />
              <p className="font-mono text-xs uppercase font-black tracking-widest">UPLOAD_RAW_IMAGE</p>
            </label>
          ) : (
            <div className="relative border-4 border-zine-ink bold-shadow bg-zinc-200 aspect-square overflow-hidden grayscale">
               <img src={image} alt="Outfit" className="w-full h-full object-cover" />
               <button 
                 className="absolute bottom-4 left-4 bg-zine-ink text-white px-4 py-1 font-mono text-[10px] uppercase font-black tracking-widest hover:bg-zine-accent transition-colors"
                 onClick={() => {setImage(null); setResult(null); onAnalysis(null, null);}}
               >
                 [ RESET_IMAGE ]
               </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {analyzing && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }}
               className="flex flex-col items-center gap-6"
             >
               <RefreshCw className="animate-spin w-10 h-10" strokeWidth={3} />
               <p className="font-mono text-xs font-black uppercase animate-pulse tracking-widest">DECODING_FIBERS...</p>
             </motion.div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 6 }}
              animate={{ opacity: 1, scale: 1, rotate: 4 }}
              className="bg-white p-8 border-2 border-zine-ink shadow-2xl relative"
              style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 90%, 80% 100%, 0% 100%)' }}
            >
              <div className="border-t-2 border-b-2 border-zine-ink py-2 mb-6">
                 <span className="text-xs font-mono uppercase font-black opacity-40">TODAY'S_RANGE / SYSTEM_LABEL</span>
              </div>
              
              <div className="text-center mb-8">
                 <div className="text-5xl font-black font-display leading-none">{displayRange}</div>
                 <div className="text-sm font-mono mt-2 font-black uppercase opacity-60 italic">SUITABILITY: {result.suitabilityScore}%</div>
              </div>

              <div className="space-y-4 pt-4 border-t-2 border-dashed border-zinc-300">
                <div className="font-mono text-[10px] mb-2 uppercase font-bold text-zine-accent">[ {result.recommendedRange} ]</div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] font-black uppercase">
                  <div className="border-2 border-zine-ink p-2">TOPS: {result.tops || '未辨識'}</div>
                  <div className="border-2 border-zine-ink p-2">BOTTOMS: {result.bottoms || '未辨識'}</div>
                </div>
                {result.items.map(i => (
                  <div key={i.name} className="flex justify-between items-center text-[10px] font-mono font-black uppercase">
                    <span>{i.name}</span>
                    <span className="bg-zine-ink text-white px-1">{i.percentage}%</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 font-mono text-[8px] opacity-40">
                #LINEN_MIX #TAIPEI_CLIMATE_LAB #{weather.humidity}H
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Phase 3: Evening Feedback
const EveningView = ({
  userName,
  weather,
  outfit,
  userImage,
}: {
  userName: string;
  weather: WeatherData;
  outfit: OutfitAnalysis | null;
  userImage: string | null;
}) => {
  const [sensory, setSensory] = useState<SensoryData>({
    windiness: 75,
    envelopment: 25,
    stuffiness: 90
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [savedPageUrl, setSavedPageUrl] = useState('');

  const probes = [
    { key: 'windiness' as const, label: '透風感 VENTILATION', min: '窒息 STIFLING', max: '空氣流通 AIRY', color: 'bg-zine-ink', val: '+2.4' },
    { key: 'envelopment' as const, label: '包裹感 ENVELOPMENT', min: '裸露 EXPOSED', max: '緊裹 SECURE', color: 'bg-zine-ink', val: '-1.2' },
    { key: 'stuffiness' as const, label: '悶熱度 STUFFINESS', min: '乾爽 CRISP', max: '濕悶 STICKY', color: 'bg-zine-accent', val: 'HIGH' }
  ];

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    setSavedPageUrl('');
    try {
      const savedPage = await saveOutfitLog({ userName, weather, sensory, outfit, userImage });
      setSaveMessage('已成功寫入 Notion');
      setSavedPageUrl(savedPage.url);
    } catch (error) {
      console.error(error);
      setSaveMessage(error instanceof Error ? error.message : '寫入 Notion 失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <div className="relative">
        <div className="absolute -top-4 -right-4 bg-zine-teal px-4 py-1 text-xs font-bold border-2 border-zine-ink rotate-1 z-10">PHASE_03</div>
        <h2 className="text-4xl font-black uppercase font-display mb-12">晚間回饋: 感官探針</h2>
      </div>

      <div className="space-y-20 max-w-2xl mx-auto py-10">
        {probes.map((item) => (
          <div key={item.key} className="relative group">
            <label className="text-sm font-black uppercase mb-8 flex justify-between tracking-widest font-sans">
              <span>{item.label}</span>
              <span className="font-mono bg-zine-ink text-white px-2 py-0.5">{item.val}</span>
            </label>
            
            <div className="relative h-[2px] bg-zine-ink">
              {/* Scale points */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-zine-ink rounded-full" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-zine-ink rounded-full" />
              
              <input
                type="range"
                className="absolute inset-0 w-full h-[60px] -top-[30px] opacity-0 cursor-pointer z-20"
                min="0"
                max="100"
                value={sensory[item.key]}
                onChange={(e) => setSensory({ ...sensory, [item.key]: parseInt(e.target.value) })}
              />
              
              {/* Custom Handle Visuals */}
              <motion.div 
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 ${item.color} border-2 border-zine-ink flex items-center justify-center rotate-45 bold-shadow z-10`}
                style={{ left: `${sensory[item.key]}%` }}
              >
                <div className="text-white font-mono text-xs -rotate-45">X</div>
              </motion.div>

              <div className="flex justify-between mt-8 text-[10px] font-mono font-black uppercase opacity-40 italic tracking-widest">
                 <span>{item.min}</span>
                 <span>{item.max}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {saveMessage && (
        <div className="border-4 border-zine-ink bg-white px-4 py-3 font-mono text-xs font-black uppercase text-center space-y-3">
          <div>{saveMessage}</div>
          {savedPageUrl && (
            <a
              href={savedPageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block border-2 border-zine-ink bg-zine-teal px-4 py-2 text-zine-ink hover:bg-zine-yellow transition-colors"
            >
              打開 Notion 頁面
            </a>
          )}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-6 bg-white border-4 border-zine-ink font-black uppercase text-2xl bold-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-display tracking-widest mt-12 disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0"
      >
        {saving ? '寫入 Notion 中...' : '儲存今日感官紀錄 ENTRY_0513'}
      </button>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [phase, setPhase] = useState<AppPhase>(AppPhase.SETUP);
  const [userName, setUserName] = useState('');
  const [outfitAnalysis, setOutfitAnalysis] = useState<OutfitAnalysis | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData>({
    temp: 22,
    minTemp: 21,
    maxTemp: 25,
    humidity: 90,
    condition: '陰短暫陣雨或雷雨',
    location: '臺北市'
  });

  return (
    <ZineLayout phase={phase} onNavigate={setPhase} userName={userName} weather={weather}>
      <AnimatePresence mode="wait">
        {phase === AppPhase.SETUP && (
          <SetupView 
            onComplete={(name, loc, weatherData) => {
              setUserName(name);
              setWeather(weatherData);
              setPhase(AppPhase.MORNING);
            }} 
          />
        )}
        {phase === AppPhase.MORNING && (
          <MorningView 
            weather={weather} 
            onNext={() => setPhase(AppPhase.WARDROBE)}
          />
        )}
        {phase === AppPhase.WARDROBE && (
          <WardrobeView
            weather={weather}
            onAnalysis={(analysis, image) => {
              setOutfitAnalysis(analysis);
              setUserImage(image);
            }}
          />
        )}
        {phase === AppPhase.EVENING && (
          <EveningView userName={userName} weather={weather} outfit={outfitAnalysis} userImage={userImage} />
        )}
      </AnimatePresence>
    </ZineLayout>
  );
}
