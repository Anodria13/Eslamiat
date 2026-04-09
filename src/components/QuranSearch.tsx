import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, X, BookOpen } from 'lucide-react';
import { fetchWithCache } from '../utils/network';

interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  surah: {
    number: number;
    name: string;
    englishName: string;
  };
}

interface QuranSearchProps {
  isRtl: boolean;
  onSelectAyah: (surahNumber: number, ayahNumber: number) => void;
  onClose: () => void;
}

export default function QuranSearch({ isRtl, onSelectAyah, onClose }: QuranSearchProps) {
  const [query, setQuery] = useState('');
  const [allAyahs, setAllAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullQuran = async () => {
      try {
        const data = await fetchWithCache('https://api.alquran.cloud/v1/quran/quran-uthmani', 'full_quran_uthmani');
        const ayahs: Ayah[] = [];
        data.data.surahs.forEach((surah: any) => {
          surah.ayahs.forEach((ayah: any) => {
            ayahs.push({
              number: ayah.number,
              text: ayah.text,
              numberInSurah: ayah.numberInSurah,
              surah: {
                number: surah.number,
                name: surah.name,
                englishName: surah.englishName,
              }
            });
          });
        });
        setAllAyahs(ayahs);
      } catch (error) {
        console.error('Error fetching full Quran:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFullQuran();
  }, []);

  const normalizeArabic = (text: string) => {
    return text
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove diacritics
      .replace(/[أإآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي');
  };

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    const normalizedQuery = normalizeArabic(query);
    
    return allAyahs.filter(ayah => {
      const normalizedAyah = normalizeArabic(ayah.text);
      return normalizedAyah.includes(normalizedQuery);
    }).slice(0, 50); // Limit to 50 results
  }, [query, allAyahs]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || query.length < 2) return <>{text}</>;
    
    const normalizedQuery = normalizeArabic(query);
    const normalizedText = normalizeArabic(text);
    
    const index = normalizedText.indexOf(normalizedQuery);
    if (index === -1) return <>{text}</>;

    // We need to find the actual start and end indices in the original text
    // Since diacritics are removed, the indices in normalizedText don't match text
    let originalStart = 0;
    let normalizedIndex = 0;
    
    while (normalizedIndex < index && originalStart < text.length) {
      if (normalizeArabic(text[originalStart]) !== '') {
        normalizedIndex++;
      }
      originalStart++;
    }

    let originalEnd = originalStart;
    let matchLength = 0;
    while (matchLength < normalizedQuery.length && originalEnd < text.length) {
      if (normalizeArabic(text[originalEnd]) !== '') {
        matchLength++;
      }
      originalEnd++;
    }

    return (
      <>
        {text.substring(0, originalStart)}
        <span className="bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-50 rounded px-1">
          {text.substring(originalStart, originalEnd)}
        </span>
        {text.substring(originalEnd)}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-emerald-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-emerald-100 dark:border-gray-700 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRtl ? "ابحث في القرآن الكريم..." : "Search in the Quran..."}
            className="flex-1 bg-transparent border-none outline-none text-lg text-emerald-900 dark:text-emerald-50 placeholder-emerald-300 dark:placeholder-gray-500"
            dir={isRtl ? "rtl" : "ltr"}
            autoFocus
          />
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : query.length > 0 && query.length < 2 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              {isRtl ? "أدخل حرفين على الأقل للبحث" : "Enter at least 2 characters to search"}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {results.map((ayah) => (
                <button
                  key={ayah.number}
                  onClick={() => {
                    onSelectAyah(ayah.surah.number, ayah.numberInSurah);
                    onClose();
                  }}
                  className="w-full text-right p-4 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-gray-600 flex flex-col gap-2"
                >
                  <p className="text-xl font-quran text-emerald-900 dark:text-emerald-50 leading-loose" dir="rtl">
                    {highlightMatch(ayah.text, query)}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="w-4 h-4" />
                    <span>{isRtl ? ayah.surah.name : ayah.surah.englishName}</span>
                    <span>•</span>
                    <span>{isRtl ? 'آية' : 'Ayah'} {ayah.numberInSurah}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              {isRtl ? "لم يتم العثور على نتائج" : "No results found"}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              {isRtl ? "اكتب للبحث في آيات القرآن الكريم" : "Type to search in Quran verses"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
