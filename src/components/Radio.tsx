import React, { useState, useEffect, useRef } from 'react';
import { Radio as RadioIcon, Play, Pause, Loader2, Volume2, VolumeX, Search, Heart, Plus, Check, Maximize2 } from 'lucide-react';
import { useAudio } from './AudioContext';
import { useFavorites } from './FavoritesContext';
import { fetchWithCache, fetchWithRetry } from '../utils/network';
import { motion, useScroll, useTransform } from "motion/react";
import AudioPlayer from './AudioPlayer';
import AudioPlaybackScreen from './AudioPlaybackScreen';

interface RadioStation {
  id: string | number;
  name: string;
  url: string;
  img: string;
  category?: string;
}

interface RadioProps {
  isRtl: boolean;
  activeTab: string;
}

function RadioCard({ station, isActive, isFavorite, isPlaying, isBuffering, handlePlay, toggleFavoriteRadio, isRtl, onOpenVisualizer }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.05, 0.9]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0.5, 1, 1, 1, 0.5]);

  return (
    <motion.div
      ref={ref}
      style={{ scale, rotateX, opacity, transformPerspective: 1000 }}
      className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border transition-all group hover:shadow-md relative ${
        isActive ? 'border-emerald-500 dark:border-emerald-400 shadow-sm ring-1 ring-emerald-500 dark:ring-emerald-400' : 'border-emerald-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-500'
      }`}
    >
      <div className="h-40 overflow-hidden relative cursor-pointer" onClick={() => handlePlay(station)}>
        <img
          src={station.img || `https://picsum.photos/seed/radio_${station.id}/400/300?blur=2`}
          alt={station.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenVisualizer(station);
            }}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
            title={isRtl ? 'عرض تفاعلي' : 'Visualizer'}
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavoriteRadio(station.id.toString());
            }}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          >
            {isFavorite ? <Check className="h-5 w-5 text-emerald-400" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>
      
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isActive && (isPlaying || isBuffering) ? (
            <div className="flex overflow-hidden mask-image-linear-gradient mb-1">
              <h3 className={`font-bold text-emerald-900 dark:text-emerald-50 text-lg whitespace-nowrap ${isRtl ? 'animate-marquee-rtl' : 'animate-marquee-ltr'}`}>
                {station.name}
              </h3>
            </div>
          ) : (
            <h3 className="font-bold text-emerald-900 dark:text-emerald-50 text-lg mb-1 line-clamp-1" title={station.name}>
              {station.name}
            </h3>
          )}
          <p className="text-emerald-500 dark:text-emerald-400 text-sm flex items-center gap-1">
            <RadioIcon className={`h-3 w-3 ${isActive && (isPlaying || isBuffering) ? 'animate-glow text-emerald-600 dark:text-emerald-300' : ''}`} /> {isRtl ? 'بث مباشر' : 'Live'}
          </p>
        </div>
        
        <button
          onClick={() => handlePlay(station)}
          disabled={isActive && isBuffering}
          className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${
            isActive && (isPlaying || isBuffering)
              ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none'
              : 'bg-emerald-50 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-gray-600 hover:scale-105'
          }`}
        >
          {isActive && isBuffering ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isActive && isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className={`h-5 w-5 ${isRtl ? 'mr-1' : 'ml-1'}`} />
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default function Radio({ isRtl, activeTab }: RadioProps) {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [radioTab, setRadioTab] = useState<'reciter' | 'channel'>('reciter');
  const [miscTab, setMiscTab] = useState<'translated' | 'azkar' | 'stories' | 'tafsir' | 'others'>('translated');
  const { stopQuran, radioAudioRef: audioRef, isPlayingRadio: isPlaying, setIsPlayingRadio: setIsPlaying, isRadioUserPaused: userPausedRef } = useAudio();
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [visualizerStation, setVisualizerStation] = useState<RadioStation | null>(null);
  const { favoriteRadios, toggleFavoriteRadio } = useFavorites();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const activeStationRef = useRef<RadioStation | null>(null);
  const MAX_RETRIES = 5;

  useEffect(() => {
    const fetchRadios = async () => {
      try {
        const lang = isRtl ? 'ar' : 'eng';
        
        // Fetch new API
        const dataNew = await fetchWithCache(`https://mp3quran.net/api/v3/radios?language=${lang}`, `radios_new_${lang}`);
        const newRadios = dataNew.radios || [];

        // Fetch old API
        const dataOld = await fetchWithCache('https://data-rosy.vercel.app/radio.json', 'radios_old');
        const oldRadios = dataOld.radios || [];

        // Process old radios
        const processedOldRadios = oldRadios.map((radio: any) => {
          let category = 'reciter';
          if (radio.id >= 19) {
            if (radio.id === 19 || radio.id === 20) category = 'channel';
            else if (radio.id === 24) category = 'tafsir';
            else if (radio.id === 22) category = 'azkar';
            else category = 'others';
          }
          
          let url = radio.url;
          if (url && url.startsWith('http://')) {
            url = url.replace('http://', 'https://');
          }
          let name = radio.name;
          let img = radio.img;
          if (radio.id === 19) {
            url = 'https://stream.radiojar.com/8s5u5tpdtwzuv';
            img = 'https://k.top4top.io/p_3738fgsvo0.png';
          }
          if (radio.id === 20) {
            name = 'إذاعة القرآن الكريم (السعودية)';
            url = 'https://stream.radiojar.com/0tpy1h0kxtzuv';
          }

          return {
            id: `old_${radio.id}`,
            name,
            url,
            img,
            category
          };
        });

        // Process new radios
        const processedNewRadios = newRadios.map((radio: any) => {
          const name = radio.name || '';
          const nameLower = name.toLowerCase();
          const id = radio.id;
          
          let category = 'reciter';
          
          const channels = [109082];
          const translated = [109039, 109040, 109041, 109042, 109043, 109044, 109045, 109046, 109047, 109048, 109049, 109050, 109051, 109052, 109053, 109054, 109055, 109056, 109057, 109058, 109059, 109062];
          const tafsir = [113, 116, 10904, 21116, 21117, 109076];
          const azkar = [114, 10906, 10907];
          const stories = [10903, 21114, 21115, 109066, 109067, 109069, 109073];
          const others = [108, 109, 110, 115, 123, 10902, 109060, 109061];

          if (channels.includes(id)) category = 'channel';
          else if (translated.includes(id)) category = 'translated';
          else if (tafsir.includes(id)) category = 'tafsir';
          else if (azkar.includes(id)) category = 'azkar';
          else if (stories.includes(id)) category = 'stories';
          else if (others.includes(id)) category = 'others';
          else {
            if (name.includes('ترجمة') || nameLower.includes('translation') || nameLower.includes('translated')) category = 'translated';
            else if (name.includes('تفسير') || name.includes('فتاوى') || name.includes('المختصر') || nameLower.includes('tafsir') || nameLower.includes('fatwa') || nameLower.includes('explanation') || nameLower.includes('jurisprudential')) category = 'tafsir';
            else if (name.includes('أذكار') || name.includes('رقية') || nameLower.includes('azkar') || nameLower.includes('adhkar') || nameLower.includes('roqya') || nameLower.includes('ruqyah') || nameLower.includes('remembrance')) category = 'azkar';
            else if (name.includes('قصص') || name.includes('سيرة') || name.includes('صور من حياة') || name.includes('رياض الصالحين') || name.includes('صحيح') || nameLower.includes('stories') || nameLower.includes('seerah') || nameLower.includes('biography') || nameLower.includes('hadith') || nameLower.includes('sahih')) category = 'stories';
            else if (name.includes('إذاعة القرآن الكريم - السعودية') || nameLower.includes('saudi') || nameLower.includes('quran station')) category = 'channel';
            else if (name.includes('تكبيرات') || name.includes('تلاوات خاشعة') || name.includes('آيات السكينة') || name.includes('سورة الملك') || name.includes('فضل شهر رمضان') || name.includes('الإذاعة العامة') || nameLower.includes('recitations') || nameLower.includes('general') || nameLower.includes('ramadan') || nameLower.includes('takbeer') || nameLower.includes('verses of serenity') || nameLower.includes('surah')) category = 'others';
          }
          
          let img = `https://picsum.photos/seed/radio_new_${radio.id}/400/300?blur=2`;
          if (category === 'reciter') {
            img = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff&size=400&bold=true`;
          }
          if (name.includes('إذاعة القرآن الكريم من القاهرة') || name.includes('إذاعة القرآن الكريم - القاهرة') || name === 'إذاعة القرآن الكريم') {
            img = 'https://k.top4top.io/p_3738fgsvo0.png';
          }

          let url = radio.url;
          if (url && url.startsWith('http://')) {
            url = url.replace('http://', 'https://');
          }
          
          return {
            id: `new_${radio.id}`,
            name: radio.name,
            url: url,
            img,
            category
          };
        });

        const allRadios = [...processedOldRadios, ...processedNewRadios];
        // Filter out stations with invalid or missing URLs
        const validRadios = allRadios.filter(r => {
          if (!r.url) return false;
          try {
            new URL(r.url);
            return true;
          } catch (e) {
            return false;
          }
        });
        const uniqueRadios = Array.from(new Map(validRadios.map(item => [item.url, item])).values());
        
        setStations(uniqueRadios);
      } catch (error) {
        console.error('Error fetching Radio:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRadios();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (stallTimeoutRef.current) {
        clearTimeout(stallTimeoutRef.current);
      }
    };
  }, [isRtl]);

  const attemptReconnect = async () => {
    const currentStation = activeStationRef.current;
    if (!audioRef.current || !currentStation || isReconnectingRef.current) return;

    if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);

    if (retryCountRef.current < MAX_RETRIES) {
      isReconnectingRef.current = true;
      retryCountRef.current += 1;
      console.log(`Attempting to reconnect... (Attempt ${retryCountRef.current}/${MAX_RETRIES})`);
      setIsBuffering(true);
      
      // Force reload by appending a timestamp to bypass cache if needed, 
      // but for streams, just calling load() again usually works.
      // We re-assign src to force the browser to drop the old connection.
      const currentUrl = currentStation.url;
      const currentStationId = currentStation.id;
      audioRef.current.removeAttribute('src');
      
      setTimeout(async () => {
        // If user switched stations during the timeout, abort reconnect
        if (!audioRef.current || activeStationRef.current?.id !== currentStationId) {
          isReconnectingRef.current = false;
          return;
        }
        if (currentUrl) {
          audioRef.current.src = currentUrl;
          console.log('Setting radio src:', currentUrl);
          audioRef.current.load();
          try {
            await audioRef.current.play();
            setIsPlaying(true);
            setIsBuffering(false);
            isReconnectingRef.current = false;
            // Don't reset retry count here, reset it on successful playing for a while
          } catch (err: any) {
            if (err.name !== 'AbortError' && !err.message?.includes('interrupted by a call to pause')) {
              isReconnectingRef.current = false;
              if (err.name === 'NotSupportedError' || err.message?.includes('supported source')) {
                console.error('Stream is offline or format not supported.');
                setIsPlaying(false);
                setIsBuffering(false);
                retryCountRef.current = MAX_RETRIES; // Stop retrying
              } else {
                console.error('Reconnect failed:', err.message || err);
                // Schedule another retry
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(attemptReconnect, 3000);
              }
            }
          }
        } else {
          console.error('Invalid radio URL');
          isReconnectingRef.current = false;
        }
      }, 500);
    } else {
      console.error('Max retries reached. Stream might be offline.');
      setIsPlaying(false);
      setIsBuffering(false);
      retryCountRef.current = 0; // Reset for manual play attempts
      isReconnectingRef.current = false;
    }
  };

  const handlePlay = async (station: RadioStation) => {
    stopQuran();
    if (!audioRef.current) return;

    // Clear any pending retries and stalls
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (stallTimeoutRef.current) {
      clearTimeout(stallTimeoutRef.current);
    }
    retryCountRef.current = 0;
    isReconnectingRef.current = false;

    if (activeStation?.id === station.id) {
      if (isPlaying) {
        userPausedRef.current = true;
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        userPausedRef.current = false;
        setIsBuffering(true);
        
        if (station.url) {
          try {
            new URL(station.url);
            audioRef.current.src = station.url;
            audioRef.current.load();
            try {
              await audioRef.current.play();
              setIsPlaying(true);
            } catch (err: any) {
              if (err.name !== 'AbortError' && !err.message?.includes('interrupted by a call to pause')) {
                if (err.name === 'NotSupportedError' || err.message?.includes('supported source')) {
                  console.error('Stream is offline or format not supported.', { url: station.url });
                  setIsPlaying(false);
                  setIsBuffering(false);
                } else {
                  console.error('Playback failed:', err.message || err, { url: station.url });
                  attemptReconnect();
                }
              }
            }
          } catch (e) {
            console.error("Invalid radio URL:", station.url);
            setIsBuffering(false);
          }
        } else {
          console.error('Invalid radio URL');
          setIsBuffering(false);
        }
      }
    } else {
      userPausedRef.current = false;
      setActiveStation(station);
      activeStationRef.current = station;
      setIsBuffering(true);
      setIsPlaying(false);
      
      if (station.url) {
        try {
          new URL(station.url);
          audioRef.current.src = station.url;
          audioRef.current.load();
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (err: any) {
            if (err.name !== 'AbortError' && !err.message?.includes('interrupted by a call to pause')) {
              if (err.name === 'NotSupportedError' || err.message?.includes('supported source')) {
                console.error('Stream is offline or format not supported.', { url: station.url });
                setIsPlaying(false);
                setIsBuffering(false);
              } else {
                console.error('Playback failed:', err.message || err, { url: station.url });
                attemptReconnect();
              }
            }
          }
        } catch (e) {
          console.error("Invalid radio URL:", station.url);
          setIsBuffering(false);
        } finally {
          setIsBuffering(false);
        }
      } else {
        console.error('Invalid radio URL');
        setIsBuffering(false);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const isVisible = activeTab === 'radio' || activeTab === 'misc_radio';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className={isVisible ? "animate-in fade-in duration-500" : "hidden"}>
      {isVisible && (
        <div className="mb-8 bg-emerald-800 dark:bg-emerald-950 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg relative overflow-hidden transition-colors">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-emerald-700/50 dark:bg-emerald-800/50 p-4 rounded-2xl backdrop-blur-sm border border-emerald-600/50 dark:border-emerald-700/50 transition-colors">
              <RadioIcon className={`h-8 w-8 text-emerald-300 dark:text-emerald-400 ${isPlaying ? 'animate-glow' : ''}`} />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">
                {activeTab === 'radio' 
                  ? (isRtl ? 'الراديو الإسلامي' : 'Islamic Radio')
                  : (isRtl ? 'إذاعات متنوعة' : 'Miscellaneous Radios')}
              </h2>
              <p className="text-emerald-200 dark:text-emerald-300">
                {activeTab === 'radio'
                  ? (isRtl ? 'بث مباشر للإذاعات الإسلامية' : 'Live broadcast of Islamic radios')
                  : (isRtl ? 'محتوى إسلامي متنوع على مدار الساعة' : 'Various Islamic content around the clock')}
              </p>
            </div>
          </div>

          {activeStation && (
            <div className="relative z-10 bg-emerald-900/50 dark:bg-emerald-900/80 backdrop-blur-md border border-emerald-700/50 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center gap-6 shadow-inner w-full md:w-auto transition-colors">
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <img 
                  src={activeStation.img || `https://picsum.photos/seed/radio_${activeStation.id}/100/100?blur=2`} 
                  alt={activeStation.name} 
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500/30 dark:border-emerald-600/30 shrink-0"
                />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-sm text-emerald-300 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                    <RadioIcon className={`h-4 w-4 ${isPlaying || isBuffering ? 'animate-glow text-emerald-400' : ''}`} />
                    {isRtl ? 'يتم التشغيل الآن' : 'Now Playing'}
                  </div>
                  <div className="relative h-6 w-full overflow-hidden mask-image-linear-gradient flex">
                    <div className={`whitespace-nowrap font-bold shrink-0 min-w-full ${isRtl ? 'animate-marquee-rtl' : 'animate-marquee-ltr'}`}>
                      {activeStation.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-4 shrink-0 ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                <div className="hidden sm:flex items-center gap-2">
                  <button 
                    onClick={toggleMute} 
                    className="text-emerald-300 hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
                
                {isBuffering ? (
                  <div className="bg-emerald-500 dark:bg-emerald-600 text-emerald-950 dark:text-emerald-50 p-4 rounded-full shadow-lg flex items-center justify-center w-14 h-14">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => handlePlay(activeStation)}
                    className="flex items-center justify-center w-14 h-14 bg-emerald-500 dark:bg-emerald-600 text-white rounded-full hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                  </button>
                )}
              </div>
            </div>
          )}
          
        </div>
      )}

      <audio 
        ref={audioRef} 
        crossOrigin="anonymous"
        preload="none"
        onEnded={() => {
          if (!userPausedRef.current) {
            console.log('Stream ended unexpectedly, attempting to reconnect...');
            attemptReconnect();
          } else {
            setIsPlaying(false);
          }
        }}
        onPause={() => {
          if (userPausedRef.current) {
            setIsPlaying(false);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onWaiting={() => {
          setIsBuffering(true);
          if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
          stallTimeoutRef.current = setTimeout(() => {
            if (isPlaying && !userPausedRef.current) {
              console.log('Stream stalled for too long, attempting to reconnect...');
              attemptReconnect();
            }
          }, 10000); // 10 seconds timeout for buffering
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
          retryCountRef.current = 0; // Reset retries on successful play
          if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
        }}
        onStalled={() => {
          if (isPlaying && !userPausedRef.current) {
            if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
            stallTimeoutRef.current = setTimeout(() => {
              console.log('Stream stalled, attempting to reconnect...');
              attemptReconnect();
            }, 10000);
          }
        }}
        onError={(e) => {
          const target = e.target as HTMLAudioElement;
          console.error('Audio error occurred. Code:', target.error?.code, 'Message:', target.error?.message);
          if (!userPausedRef.current) {
            attemptReconnect();
          } else {
            setIsPlaying(false);
            setIsBuffering(false);
          }
        }}
      />

      {isVisible && (
        <div className="space-y-12">
          {activeTab === 'radio' && (
            <div className="relative z-10 flex bg-emerald-900/50 dark:bg-emerald-900/80 rounded-2xl p-1 mb-8">
              <button
                onClick={() => setRadioTab('reciter')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${radioTab === 'reciter' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-200 hover:text-white'}`}
              >
                {isRtl ? 'إذاعات القراء' : 'Reciters Radios'}
              </button>
              <button
                onClick={() => setRadioTab('channel')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${radioTab === 'channel' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-200 hover:text-white'}`}
              >
                {isRtl ? 'قنوات الراديو' : 'Radio Channels'}
              </button>
            </div>
          )}

          {activeTab === 'misc_radio' && (
            <div className="relative z-10 flex flex-wrap bg-emerald-900/50 dark:bg-emerald-900/80 rounded-2xl p-1 mb-8 gap-1">
              {[
                { id: 'translated', labelAr: 'القرآن المترجم', labelEn: 'Translated Quran' },
                { id: 'azkar', labelAr: 'الأذكار والرقية', labelEn: 'Azkar & Roqya' },
                { id: 'stories', labelAr: 'قصص وبرامج', labelEn: 'Stories & Programs' },
                { id: 'tafsir', labelAr: 'التفاسير والفتاوى', labelEn: 'Tafsir & Fatawa' },
                { id: 'others', labelAr: 'أخرى', labelEn: 'Others' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMiscTab(tab.id as any)}
                  className={`flex-1 min-w-[100px] py-3 px-2 rounded-xl font-bold text-sm md:text-base transition-all ${miscTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-200 hover:text-white'}`}
                >
                  {isRtl ? tab.labelAr : tab.labelEn}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                <Search className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <input
                type="text"
                placeholder={isRtl ? 'ابحث عن إذاعة...' : 'Search for a radio...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-gray-700 rounded-2xl py-3 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors text-emerald-900 dark:text-emerald-50 placeholder-emerald-300 dark:placeholder-gray-500`}
              />
            </div>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border-2 ${
                showFavoritesOnly 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-800 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500'
              }`}
            >
              <Heart className={`h-5 w-5 ${showFavoritesOnly ? 'fill-white' : ''}`} />
              {isRtl ? 'المفضلة' : 'Favorites'}
            </button>
          </div>

          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stations
                .filter(s => activeTab === 'radio' ? s.category === radioTab : s.category === miscTab)
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(s => showFavoritesOnly ? favoriteRadios.includes(s.id.toString()) : true)
                .map((station) => {
                const isActive = activeStation?.id === station.id;
                const isFavorite = favoriteRadios.includes(station.id.toString());
                
                return (
                  <RadioCard
                    key={station.id}
                    station={station}
                    isActive={isActive}
                    isFavorite={isFavorite}
                    isPlaying={isPlaying}
                    isBuffering={isBuffering}
                    handlePlay={handlePlay}
                    toggleFavoriteRadio={toggleFavoriteRadio}
                    isRtl={isRtl}
                    onOpenVisualizer={setVisualizerStation}
                  />
                );
              })}
            </div>
          </section>
        </div>
      )}
      {visualizerStation && (
        <AudioPlaybackScreen
          audioUrl={visualizerStation.url}
          title={visualizerStation.name}
          image={visualizerStation.img || `https://picsum.photos/seed/radio_${visualizerStation.id}/400/300?blur=2`}
          onClose={() => setVisualizerStation(null)}
          isRtl={isRtl}
          audioElement={audioRef.current}
        />
      )}
    </div>
  );
}
