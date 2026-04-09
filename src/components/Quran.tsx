import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Play, Pause, Search, ChevronRight, ChevronLeft, Loader2, Heart, ChevronDown, Plus, Check, Download, FileAudio, ListMusic, Mic, List, Maximize } from 'lucide-react';
import { useAudio } from './AudioContext';
import { useFavorites } from './FavoritesContext';
import { fetchWithCache, fetchWithRetry } from '../utils/network';
import { useToast } from './ToastContext';
import ShareButton from './ShareButton';
import QuranSearch from './QuranSearch';
import AudioPlayer from './AudioPlayer';
import AudioPlaybackScreen from './AudioPlaybackScreen';
import { useOfflineAudio } from '../hooks/useOfflineAudio';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  id: string;
  sura: string;
  aya: string;
  arabic_text: string;
  translation: string;
}

interface Reciter {
  id: string;
  name: string;
  server: string;
  surahList: string;
  isQuranCom?: boolean;
  qdcId?: number;
}

interface QuranProps {
  isRtl: boolean;
}

const getNationalityPriority = (name: string): number => {
  const n = name.toLowerCase();
  
  // 1: Egyptian
  if (n.includes('عبد الباسط') || n.includes('المنشاوي') || n.includes('الحصري') || 
      n.includes('مصطفى إسماعيل') || n.includes('الطبلاوي') || n.includes('البنا') || 
      n.includes('الشعشاعي') || n.includes('شعيشع') || n.includes('محمد رفعت') || 
      n.includes('الفشني') || n.includes('البهتيمي') || n.includes('نعينع') || 
      n.includes('إسلام صبحي') || n.includes('عبد الرحمن مسعد') || n.includes('حسن صالح') || 
      n.includes('محمد جبريل') || n.includes('الشحات') || n.includes('صابر عبد الحكم') || 
      n.includes('محمود خليل') || n.includes('عبدالباسط')) {
    return 1;
  }
  
  // 2: Saudi
  if (n.includes('السديس') || n.includes('الشريم') || n.includes('المعيقلي') || 
      n.includes('الجهني') || n.includes('بليلة') || n.includes('الدوسري') || 
      n.includes('العجمي') || n.includes('القطامي') || n.includes('إدريس أبكر') || 
      n.includes('خالد الجليل') || n.includes('منصور السالمي') || n.includes('محمد أيوب') || 
      n.includes('علي جابر') || n.includes('اللحيدان') || n.includes('القاسم') || 
      n.includes('الثبيتي') || n.includes('البدير') || n.includes('آل الشيخ') || 
      n.includes('خياط') || n.includes('الحذيفي') || n.includes('الشاطري') || 
      n.includes('المطرود') || n.includes('بصفر') || n.includes('توفيق الصايغ') || 
      n.includes('داغستاني') || n.includes('سهل ياسين') || n.includes('عادل ريان') || 
      n.includes('الغامدي') || n.includes('عبدالرحمن السديس') || n.includes('سعود الشريم')) {
    return 2;
  }
  
  // 3: Kuwaiti
  if (n.includes('العفاسي') || n.includes('البراك') || n.includes('الكندري') || 
      n.includes('صلاح الهاشم')) {
    return 3;
  }
  
  // 4: UAE
  if (n.includes('الطنيجي') || n.includes('بو خاطر') || n.includes('بوخاطر')) {
    return 4;
  }
  
  // 5: Sudanese
  if (n.includes('نورين') || n.includes('الزين محمد') || n.includes('محمد عبد الكريم') || 
      n.includes('الفاتح') || n.includes('الزبير')) {
    return 5;
  }
  
  // 6: Yemeni
  if (n.includes('وديع اليمني') || n.includes('فارس عباد')) {
    return 6;
  }
  
  // 7: Omani
  if (n.includes('هزاع البلوشي')) {
    return 7;
  }
  
  // 8: Iraqi
  if (n.includes('رعد محمد الكردي') || n.includes('شيرزاد')) {
    return 8;
  }
  
  // 9: Somali/Qatari
  if (n.includes('عبد الرشيد صوفي') || n.includes('عبدالرشيد صوفي')) {
    return 9;
  }
  
  return 99; // Others
};

export default function Quran({ isRtl }: QuranProps) {
  const { showToast } = useToast();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<string>('');
  const [isReciterDropdownOpen, setIsReciterDropdownOpen] = useState(false);
  const [reciterSearchQuery, setReciterSearchQuery] = useState('');
  const [showFavoriteSurahsOnly, setShowFavoriteSurahsOnly] = useState(false);
  const { favoriteSurahs, toggleFavoriteSurah, favoriteReciters, toggleFavoriteReciter } = useFavorites();
  const { quranAudioRef, isPlayingQuran, setIsPlayingQuran, stopRadio, stopQuran } = useAudio();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [playingAyahId, setPlayingAyahId] = useState<number | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [activeAyahNumber, setActiveAyahNumber] = useState<number | null>(null);
  const [verseTimings, setVerseTimings] = useState<any[]>([]);
  const [timingsDuration, setTimingsDuration] = useState<number>(0);
  const [isExactTimings, setIsExactTimings] = useState<boolean>(true);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);
  const { downloadAudio, removeAudio, isDownloaded, isDownloading: offlineDownloading } = useOfflineAudio();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const lang = isRtl ? 'ar' : 'eng';
        
        // Fetch Surahs with cache
        const surahsData = await fetchWithCache('https://api.alquran.cloud/v1/surah', 'quran_surahs');
        setSurahs(surahsData.data);

        // Fetch Reciters with cache
        const recitersData = await fetchWithCache(`https://mp3quran.net/api/v3/reciters?language=${lang}`, `quran_reciters_${lang}`);
        
        const formattedReciters: Reciter[] = [];
        
        // Add Mishary Rashid from quran.com API (High Quality)
        formattedReciters.push({
          id: 'quran-com-mishary',
          name: isRtl ? 'مشاري راشد العفاسي (جودة عالية)' : 'Mishary Rashid Alafasy (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 7
        });

        // Add Maher Al-Muaiqly from quran.com API (High Quality)
        formattedReciters.push({
          id: 'quran-com-maher',
          name: isRtl ? 'ماهر المعيقلي (جودة عالية)' : 'Maher Al-Muaiqly (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/maher_al_muaiqly/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true
        });

        // Add Mohamed Refaat explicitly
        formattedReciters.push({
          id: 'mp3quran-refat',
          name: isRtl ? 'محمد رفعت (تلاوات نادرة)' : 'Mohamed Refaat (Rare Recitations)',
          server: 'https://server14.mp3quran.net/refat/',
          surahList: '1,10,11,12,17,18,19,20,48,54,55,56,69,72,73,75,76,77,78,79,81,82,83,85,86,87,88,89,96,98,100',
          isQuranCom: false
        });

        // Add AbdulBaset AbdulSamad (High Quality)
        formattedReciters.push({
          id: 'quran-com-abdulbaset',
          name: isRtl ? 'عبد الباسط عبد الصمد (جودة عالية)' : 'AbdulBaset AbdulSamad (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/abdul_baset/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 2
        });

        // Add Mahmoud Khalil Al-Husary (High Quality)
        formattedReciters.push({
          id: 'quran-com-husary',
          name: isRtl ? 'محمود خليل الحصري (جودة عالية)' : 'Mahmoud Khalil Al-Husary (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 6
        });

        // Add Mohamed Siddiq El-Minshawi (High Quality)
        formattedReciters.push({
          id: 'quran-com-minshawi',
          name: isRtl ? 'محمد صديق المنشاوي (جودة عالية)' : 'Mohamed Siddiq El-Minshawi (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/siddiq_minshawi/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 9
        });

        // Add Abu Bakr Al Shatri (High Quality)
        formattedReciters.push({
          id: 'quran-com-shatri',
          name: isRtl ? 'أبو بكر الشاطري (جودة عالية)' : 'Abu Bakr Al Shatri (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/abu_bakr_shatri/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 4
        });

        recitersData.reciters.forEach((r: any) => {
          if (r.id === 241) return; // Skip Mohamed Refaat as we added him explicitly
          if (r.moshaf && r.moshaf.length > 0) {
            r.moshaf.forEach((m: any) => {
              formattedReciters.push({
                id: `${r.id}-${m.id}`,
                name: `${r.name} (${m.name})`,
                server: m.server,
                surahList: m.surah_list
              });
            });
          }
        });
        
        formattedReciters.sort((a, b) => {
          const priorityA = getNationalityPriority(a.name);
          const priorityB = getNationalityPriority(b.name);
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return a.name.localeCompare(b.name, 'ar');
        });
        
        setReciters(formattedReciters);
        if (formattedReciters.length > 0) {
          // Try to find Mishary Alafasy as default, or fallback to first
          const defaultReciter = formattedReciters.find(r => r.id === 'quran-com-mishary') || formattedReciters[0];
          setSelectedReciter(defaultReciter.id);
        }
        
      } catch (error) {
        console.error('Error fetching Quran data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isRtl]);

  const handleReciterChange = (id: string) => {
    setSelectedReciter(id);
    setIsReciterDropdownOpen(false);
    stopQuran();
  };

  const handleSurahClick = async (surah: Surah) => {
    setSelectedSurah(surah);
    setLoadingAyahs(true);
    stopQuran();
    
    try {
      const data = await fetchWithCache(`https://quranenc.com/api/v1/translation/sura/arabic_moyassar/${surah.number}`, `ayahs_${surah.number}`);
      setAyahs(data.result);
    } catch (error) {
      console.error('Error fetching ayahs:', error);
    } finally {
      setLoadingAyahs(false);
    }
  };

  const handleDownloadSurah = async () => {
    if (!selectedSurah || !currentReciterObj || !currentAudioUrl) return;
    setIsDownloading(true);
    showToast(isRtl ? 'جاري تجهيز الملف للتحميل...' : 'Preparing file for download...', 'info');
    try {
      const response = await fetch(currentAudioUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${selectedSurah.englishName}_${currentReciterObj.name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast(isRtl ? 'تم بدء التحميل بنجاح' : 'Download started successfully', 'success');
    } catch (e) {
      // Fallback to opening in new tab if CORS blocks blob download
      window.open(currentAudioUrl, '_blank');
      showToast(isRtl ? 'تم فتح الملف في نافذة جديدة للتحميل' : 'File opened in a new tab for download', 'info');
    } finally {
      setIsDownloading(false);
      setIsDownloadDropdownOpen(false);
    }
  };

  const handleDownloadFullQuran = () => {
    if (!currentReciterObj) return;
    
    let m3uContent = "#EXTM3U\n";
    const availableSurahs = currentReciterObj.surahList ? currentReciterObj.surahList.split(',').map(Number) : Array.from({length: 114}, (_, i) => i + 1);
    
    for (const surahNum of availableSurahs) {
      const url = currentReciterObj.isQuranCom 
        ? `${currentReciterObj.server}${surahNum}.mp3`
        : `${currentReciterObj.server}${surahNum.toString().padStart(3, '0')}.mp3`;
      m3uContent += `#EXTINF:-1, Surah ${surahNum} - ${currentReciterObj.name}\n${url}\n`;
    }
    
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Full_Quran_${currentReciterObj.name}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    
    setIsDownloadDropdownOpen(false);
    showToast(isRtl ? 'تم تحميل قائمة التشغيل بنجاح' : 'Playlist downloaded successfully', 'success');
  };

  const toggleAudio = async () => {
    if (!quranAudioRef.current) return;
    
    if (isPlayingQuran) {
      quranAudioRef.current.pause();
      setIsPlayingQuran(false);
    } else {
      stopRadio(); // Stop radio when playing Quran
      if (ayahAudioRef.current) {
        ayahAudioRef.current.pause();
        setPlayingAyahId(null);
      }
      
      if (!currentAudioUrl) {
        console.error("No audio URL available for current selection");
        return;
      }

      try {
        // Always ensure src is correct before playing
        // We use a temporary variable to avoid multiple ref accesses
        const audio = quranAudioRef.current;
        
        // If src is different or invalid, update it
        if (audio.src !== currentAudioUrl) {
          console.log("Setting Quran audio src:", currentAudioUrl);
          audio.src = currentAudioUrl;
          audio.load();
        }
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlayingQuran(true);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && !e.message?.includes('interrupted by a call to pause')) {
          console.error("Error playing Quran audio:", e.message || "Unknown error", { url: currentAudioUrl });
          setIsPlayingQuran(false);
          
          // If it's a source error, try to reload once
          if (e.message?.includes('supported source') || e.name === 'NotSupportedError') {
            console.error("Audio source not supported or failed to load:", currentAudioUrl);
            
            // Try fallback URL if available
            if (selectedSurah && currentReciterObj) {
              console.log("Trying fallback audio source...");
              let fallbackUrl = '';
              
              // Simple fallback mapping for common reciters
              if (currentReciterObj.name.includes('العفاسي')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${selectedSurah.number}.mp3`;
              } else if (currentReciterObj.name.includes('المعيقلي')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.mahermuaiqly/${selectedSurah.number}.mp3`;
              } else if (currentReciterObj.name.includes('عبدالباسط')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.abdulbasitmurattal/${selectedSurah.number}.mp3`;
              } else if (currentReciterObj.name.includes('السديس')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.abdurrahmaansudais/${selectedSurah.number}.mp3`;
              } else if (currentReciterObj.name.includes('الشريم')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.saudshuraim/${selectedSurah.number}.mp3`;
              }
              
              if (fallbackUrl && fallbackUrl !== currentAudioUrl) {
                try {
                  quranAudioRef.current.src = fallbackUrl;
                  quranAudioRef.current.load();
                  await quranAudioRef.current.play();
                  setIsPlayingQuran(true);
                  showToast(isRtl ? 'تم استخدام رابط بديل لتشغيل التلاوة' : 'Using fallback link to play recitation', 'info');
                  return;
                } catch (fallbackErr: any) {
                  if (!fallbackErr?.message?.includes('interrupted by a call to pause')) {
                    console.error("Fallback failed:", fallbackErr);
                  }
                }
              }
            }
            
            showToast(isRtl ? 'عذراً، لا يمكن تشغيل هذه التلاوة حالياً. يرجى تجربة قارئ آخر.' : 'Sorry, this recitation cannot be played right now. Please try another reciter.', 'error');
          } else {
            try {
              console.log("Retrying Quran audio playback...");
              quranAudioRef.current.load();
              await quranAudioRef.current.play();
              setIsPlayingQuran(true);
            } catch (retryErr: any) {
              if (!retryErr?.message?.includes('interrupted by a call to pause')) {
                console.error("Retry failed:\n" + (retryErr.message || retryErr));
                showToast(isRtl ? 'حدث خطأ أثناء تشغيل التلاوة. يرجى المحاولة مرة أخرى.' : 'An error occurred while playing the recitation. Please try again.', 'error');
              }
            }
          }
        }
      }
    }
  };

  const toggleAyahAudio = (ayahId: number) => {
    if (playingAyahId === ayahId) {
      if (ayahAudioRef.current) {
        ayahAudioRef.current.pause();
        setPlayingAyahId(null);
      }
    } else {
      stopQuran();
      stopRadio();
      
      if (ayahAudioRef.current) {
        ayahAudioRef.current.pause();
      }
      
      const audio = new Audio(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahId}.mp3`);
      ayahAudioRef.current = audio;
      
      audio.onended = () => setPlayingAyahId(null);
      audio.onerror = () => {
        setPlayingAyahId(null);
        showToast(isRtl ? 'فشل تشغيل الآية' : 'Failed to play Ayah', 'error');
      };
      
      audio.play().then(() => {
        setPlayingAyahId(ayahId);
      }).catch(err => {
        const msg = err ? (typeof err === 'string' ? err : (err.message || err.toString() || '')) : '';
        if (msg.includes('interrupted by a call to pause') || msg.includes('aborted')) return;
        console.error('Error playing ayah:', err);
        setPlayingAyahId(null);
        showToast(isRtl ? 'فشل تشغيل الآية' : 'Failed to play Ayah', 'error');
      });
    }
  };

  const filteredSurahs = surahs
    .filter((s) => s.name.includes(searchQuery) || s.englishName.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(s => showFavoriteSurahsOnly ? favoriteSurahs.includes(s.number) : true);

  const filteredReciters = reciters
    .filter(r => r.name.toLowerCase().includes(reciterSearchQuery.toLowerCase()))
    .sort((a, b) => {
      const aFav = favoriteReciters.includes(a.id);
      const bFav = favoriteReciters.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

  const currentReciterObj = reciters.find(r => r.id === selectedReciter);
  useEffect(() => {
    if (selectedSurah && currentReciterObj && currentReciterObj.server) {
      // Check if the surah is available for this reciter
      const availableSurahs = currentReciterObj.surahList ? currentReciterObj.surahList.split(',').map(Number) : [];
      if (availableSurahs.length > 0 && !availableSurahs.includes(selectedSurah.number)) {
        setCurrentAudioUrl(null);
        if (quranAudioRef.current) {
          quranAudioRef.current.removeAttribute('src');
        }
        return;
      }

      const serverUrl = currentReciterObj.server.endsWith('/') ? currentReciterObj.server : `${currentReciterObj.server}/`;
      let url = '';
      if (currentReciterObj.isQuranCom) {
        url = `${serverUrl}${selectedSurah.number}.mp3`;
      } else {
        url = `${serverUrl}${selectedSurah.number.toString().padStart(3, '0')}.mp3`;
      }
      
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }
      
      // Basic URL validation
      try {
        new URL(url);
        setCurrentAudioUrl(url);
        if (quranAudioRef.current) {
          quranAudioRef.current.src = url;
          quranAudioRef.current.load();
        }
      } catch (e) {
        console.error("Invalid Quran audio URL generated:", url);
        setCurrentAudioUrl(null);
      }
    } else {
      setCurrentAudioUrl(null);
      if (quranAudioRef.current) {
        quranAudioRef.current.removeAttribute('src');
      }
    }
  }, [selectedSurah, currentReciterObj, quranAudioRef]);

  // Fetch verse timings for auto-scroll if supported, else fallback to Mishary
  useEffect(() => {
    const fetchTimings = async () => {
      if (!selectedSurah) {
        setVerseTimings([]);
        return;
      }
      
      try {
        // Try specific reciter first
        if (currentReciterObj?.qdcId) {
          const res = await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/${currentReciterObj.qdcId}/audio_files?chapter=${selectedSurah.number}&segments=true`);
          const data = await res.json();
          if (data.audio_files && data.audio_files[0] && data.audio_files[0].verse_timings) {
            const timings = data.audio_files[0].verse_timings;
            setVerseTimings(timings);
            const lastTiming = timings[timings.length - 1];
            setTimingsDuration(lastTiming ? lastTiming.timestamp_to : 0);
            setIsExactTimings(true);
            return;
          }
        }
        
        // Fallback to Mishary (qdcId: 7)
        const fallbackRes = await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/7/audio_files?chapter=${selectedSurah.number}&segments=true`);
        const fallbackData = await fallbackRes.json();
        if (fallbackData.audio_files && fallbackData.audio_files[0] && fallbackData.audio_files[0].verse_timings) {
          const timings = fallbackData.audio_files[0].verse_timings;
          setVerseTimings(timings);
          const lastTiming = timings[timings.length - 1];
          setTimingsDuration(lastTiming ? lastTiming.timestamp_to : 0);
          setIsExactTimings(false);
        } else {
          setVerseTimings([]);
        }
      } catch (err) {
        console.error("Failed to fetch verse timings:", err);
        setVerseTimings([]);
      }
    };
    fetchTimings();
  }, [selectedSurah, currentReciterObj]);

  // Handle auto-scroll logic
  useEffect(() => {
    const audio = quranAudioRef.current;
    if (!audio || !autoScrollEnabled || verseTimings.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTimeMs = audio.currentTime * 1000;
      let searchTimeMs = currentTimeMs;
      
      if (!isExactTimings && timingsDuration > 0 && audio.duration) {
        const audioDurationMs = audio.duration * 1000;
        const scale = timingsDuration / audioDurationMs;
        searchTimeMs = currentTimeMs * scale;
      }

      const activeTiming = verseTimings.find(
        t => searchTimeMs >= t.timestamp_from && searchTimeMs <= t.timestamp_to
      );

      if (activeTiming) {
        const verseNumber = parseInt(activeTiming.verse_key.split(':')[1], 10);
        if (activeAyahNumber !== verseNumber) {
          setActiveAyahNumber(verseNumber);
          
          if (focusMode) {
            // Scroll to top to ensure the active ayah is visible below the sticky header
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            // Scroll to the active ayah in list mode
            const ayahElement = document.getElementById(`ayah-${verseNumber}`);
            if (ayahElement) {
              ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [autoScrollEnabled, focusMode, verseTimings, activeAyahNumber, quranAudioRef, isExactTimings, timingsDuration]);

  useEffect(() => {
    if (scrollContainerRef.current && !selectedSurah) {
      // Trigger a scroll event to initialize the card scales
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.dispatchEvent(new Event('scroll'));
        }
      });
    }
  }, [filteredSurahs, selectedSurah]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {!selectedSurah ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 sticky top-16 z-40 bg-emerald-50 dark:bg-gray-900 py-4 transition-colors">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                  <Search className="h-5 w-5 text-emerald-400 dark:text-emerald-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`block w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 border-2 border-emerald-100 dark:border-gray-700 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-800 dark:text-white shadow-sm text-lg transition-colors`}
                  placeholder={isRtl ? 'ابحث عن سورة...' : 'Search for a Surah...'}
                />
              </div>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center justify-center px-4 rounded-2xl border-2 bg-white dark:bg-gray-800 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500 transition-all"
                title={isRtl ? 'بحث متقدم في الآيات' : 'Advanced Verse Search'}
              >
                <Search className="h-6 w-6" />
              </button>
              <button
                onClick={() => setShowFavoriteSurahsOnly(!showFavoriteSurahsOnly)}
                className={`flex items-center justify-center px-4 rounded-2xl border-2 transition-all ${
                  showFavoriteSurahsOnly 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                    : 'bg-white dark:bg-gray-800 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500'
                }`}
                title={isRtl ? 'السور المفضلة' : 'Favorite Surahs'}
              >
                <Heart className={`h-6 w-6 ${showFavoriteSurahsOnly ? 'fill-white' : ''}`} />
              </button>
            </div>
            
            <div className="md:w-80 shrink-0 relative">
              <button
                onClick={() => setIsReciterDropdownOpen(!isReciterDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-4 border-2 border-emerald-100 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 dark:text-white shadow-sm text-lg transition-colors hover:border-emerald-300 dark:hover:border-emerald-500"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentReciterObj?.name || 'Reciter')}&background=059669&color=fff&rounded=true&bold=true`} 
                    alt={currentReciterObj?.name} 
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="truncate">{currentReciterObj?.name || (isRtl ? 'اختر القارئ' : 'Select Reciter')}</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-emerald-500 transition-transform ${isReciterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isReciterDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-gray-700 rounded-2xl shadow-xl z-50 max-h-96 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-emerald-100 dark:border-gray-700">
                    <div className="relative">
                      <Search className={`absolute inset-y-0 ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400`} />
                      <input
                        type="text"
                        value={reciterSearchQuery}
                        onChange={(e) => setReciterSearchQuery(e.target.value)}
                        placeholder={isRtl ? 'ابحث عن قارئ...' : 'Search for a reciter...'}
                        className={`w-full bg-emerald-50 dark:bg-gray-900 border-none rounded-xl py-2 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:ring-2 focus:ring-emerald-500 dark:text-white text-sm`}
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {filteredReciters.map((reciter) => {
                      const isFav = favoriteReciters.includes(reciter.id);
                      return (
                        <div key={reciter.id} className="flex items-center gap-2">
                          <button
                            onClick={() => handleReciterChange(reciter.id)}
                            className={`flex-1 flex items-center gap-3 p-2 rounded-xl transition-colors text-right ${
                              selectedReciter === reciter.id 
                                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-50 font-bold' 
                                : 'hover:bg-emerald-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <img 
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(reciter.name)}&background=059669&color=fff&rounded=true&bold=true`} 
                              alt={reciter.name} 
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="truncate">{reciter.name}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavoriteReciter(reciter.id);
                            }}
                            className="p-2 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
                          >
                            {isFav ? <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <Plus className="h-5 w-5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            className="h-[60vh] overflow-y-auto snap-y snap-mandatory scroll-smooth hide-scrollbar relative px-4"
            onScroll={(e) => {
              const container = e.currentTarget;
              const center = container.scrollTop + container.clientHeight / 2;
              const cards = container.getElementsByClassName('surah-card');
              
              Array.from(cards).forEach((card) => {
                const htmlCard = card as HTMLElement;
                const cardCenter = htmlCard.offsetTop + htmlCard.clientHeight / 2;
                const distance = Math.abs(center - cardCenter);
                const maxDistance = container.clientHeight / 2;
                
                // Calculate scale: 1 at center, smaller as it gets further away
                let scale = 1 - (distance / maxDistance) * 0.2;
                scale = Math.max(0.8, Math.min(1, scale)); // Clamp between 0.8 and 1
                
                // Calculate opacity
                let opacity = 1 - (distance / maxDistance) * 0.5;
                opacity = Math.max(0.4, Math.min(1, opacity));
                
                htmlCard.style.transform = `scale(${scale})`;
                htmlCard.style.opacity = opacity.toString();
              });
            }}
          >
            <div className="py-4 space-y-4">
              {filteredSurahs.map((surah) => {
                const isFav = favoriteSurahs.includes(surah.number);
                return (
                <div
                  key={surah.number}
                  onClick={() => handleSurahClick(surah)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSurahClick(surah);
                    }
                  }}
                  className={`surah-card snap-center w-full max-w-2xl mx-auto flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-3xl border border-emerald-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-500 shadow-sm transition-all duration-200 group cursor-pointer ${isRtl ? 'text-right' : 'text-left'}`}
                  style={{ transform: 'scale(0.8)', opacity: 0.4 }} // Initial state
                >
                  <div className="flex items-center gap-4 sm:gap-6 flex-1">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-emerald-100 dark:border-gray-600 group-hover:border-emerald-500 transition-colors shrink-0 shadow-sm">
                      <img 
                        src={`https://picsum.photos/seed/surah_${surah.number}/100/100?blur=1`} 
                        alt={surah.englishName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-white font-bold text-lg sm:text-xl drop-shadow-md">{surah.number}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-50 mb-1">{isRtl ? surah.name : surah.englishName}</h3>
                      <p className="text-emerald-500 dark:text-emerald-400 font-medium text-sm sm:text-base">
                        {surah.revelationType === 'Meccan' ? (isRtl ? 'مكية' : 'Meccan') : (isRtl ? 'مدنية' : 'Medinan')} • {surah.numberOfAyahs} {isRtl ? 'آية' : 'Ayahs'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 ml-2 rtl:mr-2 rtl:ml-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteSurah(surah.number);
                      }}
                      className={`p-3 rounded-full transition-all shadow-sm hover:shadow-md flex items-center justify-center ${isFav ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none' : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'}`}
                      title={isRtl ? 'المفضلة' : 'Favorites'}
                    >
                      {isFav ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </button>
                    
                    <div className="p-3 rounded-full bg-emerald-50 dark:bg-gray-700/50 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:bg-emerald-600 transition-all shadow-sm group-hover:shadow-md border border-emerald-100 dark:border-gray-600 group-hover:border-transparent flex items-center justify-center">
                      {isRtl ? (
                        <ChevronLeft className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-emerald-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-16 z-40 transition-colors">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedSurah(null);
                  stopQuran();
                }}
                className="p-2 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-full transition-colors text-emerald-600 dark:text-emerald-400"
              >
                {isRtl ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
              </button>
              <div>
                <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">{isRtl ? selectedSurah.name : selectedSurah.englishName}</h2>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-emerald-500 dark:text-emerald-400 text-sm">{isRtl ? 'التفسير الميسر' : 'Al-Muyassar Translation'}</p>
                  {currentReciterObj && (
                    <p className="text-emerald-600 dark:text-emerald-300 text-sm font-medium flex items-center gap-1.5">
                      <Mic className="w-4 h-4" />
                      {currentReciterObj.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {currentAudioUrl ? (
              <div className="flex flex-col w-full gap-4">
                <div className="flex items-center justify-between w-full">
                  <div className="relative flex items-center gap-2">
                    <button
                      onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                      className={`flex items-center gap-2 border-2 px-4 py-2.5 rounded-full transition-colors shadow-sm ${
                        autoScrollEnabled 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'bg-white dark:bg-gray-800 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500'
                      }`}
                      title={isRtl ? 'تتبع الآيات' : 'Auto-scroll Ayahs'}
                    >
                      <BookOpen className="h-5 w-5" />
                      <span className="font-medium hidden sm:inline">{isRtl ? 'تتبع' : 'Follow'}</span>
                    </button>

                    {autoScrollEnabled && (
                      <button
                        onClick={() => setFocusMode(!focusMode)}
                        className="flex items-center gap-2 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 px-4 py-2.5 rounded-full hover:border-emerald-300 dark:hover:border-emerald-500 transition-colors shadow-sm"
                        title={isRtl ? (focusMode ? 'إظهار كل الآيات' : 'التركيز على الآية') : (focusMode ? 'Show all ayahs' : 'Focus single ayah')}
                      >
                        {focusMode ? <List className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        <span className="font-medium hidden sm:inline">{isRtl ? (focusMode ? 'قائمة' : 'تركيز') : (focusMode ? 'List' : 'Focus')}</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                      disabled={isDownloading}
                      className="flex items-center gap-2 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 px-4 py-2.5 rounded-full hover:border-emerald-300 dark:hover:border-emerald-500 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                      <span className="font-medium hidden sm:inline">{isRtl ? 'تحميل' : 'Download'}</span>
                    </button>
                    
                    {isDownloadDropdownOpen && (
                      <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 ${isRtl ? 'sm:left-0 sm:right-auto sm:translate-x-0' : 'sm:right-0 sm:left-auto sm:translate-x-0'} w-64 max-w-[90vw] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-emerald-100 dark:border-gray-700 overflow-hidden z-50`}>
                        <button
                          onClick={async () => {
                            if (currentAudioUrl) {
                              if (isDownloaded(currentAudioUrl)) {
                                await removeAudio(currentAudioUrl);
                                showToast(isRtl ? 'تم إزالة السورة من التخزين المؤقت' : 'Surah removed from offline storage', 'info');
                              } else {
                                showToast(isRtl ? 'جاري حفظ السورة للعمل بدون إنترنت...' : 'Saving surah for offline use...', 'info');
                                const success = await downloadAudio(currentAudioUrl);
                                if (success) {
                                  showToast(isRtl ? 'تم حفظ السورة للعمل بدون إنترنت' : 'Surah saved for offline use', 'success');
                                } else {
                                  showToast(isRtl ? 'فشل حفظ السورة' : 'Failed to save surah', 'error');
                                }
                              }
                            }
                            setIsDownloadDropdownOpen(false);
                          }}
                          disabled={offlineDownloading[currentAudioUrl || '']}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors text-emerald-900 dark:text-emerald-50 text-right disabled:opacity-50"
                        >
                          {offlineDownloading[currentAudioUrl || ''] ? (
                            <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                          ) : isDownloaded(currentAudioUrl || '') ? (
                            <Heart className="h-5 w-5 text-emerald-500 fill-emerald-500" />
                          ) : (
                            <Download className="h-5 w-5 text-emerald-500" />
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-sm">{isDownloaded(currentAudioUrl || '') ? (isRtl ? 'إزالة من التخزين المؤقت' : 'Remove from offline storage') : (isRtl ? 'حفظ للعمل بدون إنترنت' : 'Save for offline use')}</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 opacity-80">Cache ({currentReciterObj?.name})</div>
                          </div>
                        </button>
                        <div className="h-px bg-emerald-50 dark:bg-gray-700 w-full" />
                        <button
                          onClick={handleDownloadSurah}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors text-emerald-900 dark:text-emerald-50 text-right"
                        >
                          <FileAudio className="h-5 w-5 text-emerald-500" />
                          <div className="flex-1">
                            <div className="font-bold text-sm">{isRtl ? 'تحميل كملف MP3' : 'Download as MP3 file'}</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 opacity-80">MP3 ({currentReciterObj?.name})</div>
                          </div>
                        </button>
                        <div className="h-px bg-emerald-50 dark:bg-gray-700 w-full" />
                        <button
                          onClick={handleDownloadFullQuran}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors text-emerald-900 dark:text-emerald-50 text-right"
                        >
                          <ListMusic className="h-5 w-5 text-emerald-500" />
                          <div className="flex-1">
                            <div className="font-bold text-sm">{isRtl ? 'تحميل المصحف كاملاً' : 'Download Full Quran'}</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 opacity-80">M3U Playlist</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <AudioPlayer 
                  audioRef={quranAudioRef} 
                  isPlaying={isPlayingQuran} 
                  onTogglePlay={toggleAudio} 
                  isRtl={isRtl} 
                  onOpenVisualizer={() => setIsVisualizerOpen(true)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-4 py-2 rounded-full">
                  {isRtl ? 'التلاوة غير متوفرة لهذا القارئ' : 'Audio not available for this reciter'}
                </span>
              </div>
            )}
          </div>

          {loadingAyahs ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {(autoScrollEnabled && focusMode ? ayahs.filter(ayah => parseInt(ayah.aya, 10) === (activeAyahNumber || 1)) : ayahs).map((ayah) => {
                const isAyahActive = autoScrollEnabled && activeAyahNumber === parseInt(ayah.aya, 10);
                return (
                <div id={`ayah-${ayah.aya}`} key={ayah.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border shadow-sm transition-all duration-500 ${isAyahActive ? 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 dark:ring-emerald-400/20 scale-[1.02]' : 'border-emerald-100 dark:border-gray-700'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border shrink-0 transition-colors ${isAyahActive ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-gray-600'}`}>
                      {ayah.aya}
                    </span>
                    <p className={`text-2xl md:text-3xl leading-loose font-quran text-right flex-1 transition-colors ${isRtl ? 'mr-6' : 'ml-6'} ${isAyahActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-emerald-900 dark:text-emerald-50'}`} style={{ lineHeight: '2.5' }} dir="rtl">
                      {ayah.arabic_text}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-emerald-50 dark:border-gray-700 flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">{isRtl ? 'التفسير:' : 'Translation:'}</h4>
                      <p className={`leading-relaxed text-lg transition-colors ${isAyahActive ? 'text-emerald-900 dark:text-emerald-100' : 'text-emerald-800 dark:text-emerald-200'}`}>
                        {ayah.translation}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => toggleAyahAudio(parseInt(ayah.id, 10))}
                        className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                          playingAyahId === parseInt(ayah.id, 10) 
                            ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400' 
                            : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-gray-700'
                        }`}
                        title={isRtl ? 'استماع للآية' : 'Listen to Ayah'}
                      >
                        {playingAyahId === parseInt(ayah.id, 10) ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <ShareButton 
                        isRtl={isRtl} 
                        text={`${ayah.arabic_text}\n\n[سورة ${selectedSurah.name} - آية ${ayah.aya}]`} 
                        title={isRtl ? 'مشاركة آية' : 'Share Ayah'} 
                      />
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      )}

      {isSearchOpen && (
        <QuranSearch
          isRtl={isRtl}
          onClose={() => setIsSearchOpen(false)}
          onSelectAyah={async (surahNumber, ayahNumber) => {
            const surah = surahs.find(s => s.number === surahNumber);
            if (surah) {
              await handleSurahClick(surah);
              // Small delay to allow rendering before scrolling
              setTimeout(() => {
                const element = document.getElementById(`ayah-${ayahNumber}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  element.classList.add('bg-emerald-50', 'dark:bg-emerald-900/20');
                  setTimeout(() => {
                    element.classList.remove('bg-emerald-50', 'dark:bg-emerald-900/20');
                  }, 3000);
                }
              }, 500);
            }
          }}
        />
      )}
      {isVisualizerOpen && currentAudioUrl && selectedSurah && currentReciterObj && (
        <AudioPlaybackScreen
          audioUrl={currentAudioUrl}
          title={`${isRtl ? selectedSurah.name : selectedSurah.englishName} - ${currentReciterObj.name}`}
          image={`https://picsum.photos/seed/surah_${selectedSurah.number}/400/400?blur=2`}
          onClose={() => setIsVisualizerOpen(false)}
          isRtl={isRtl}
          audioElement={quranAudioRef.current}
        />
      )}
    </div>
  );
}
