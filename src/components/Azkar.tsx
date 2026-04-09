import React, { useState, useEffect, useRef } from 'react';
import { Heart, Loader2, RefreshCw } from 'lucide-react';
import { motion, useScroll, useTransform } from "motion/react";
import { fetchWithCache } from '../utils/network';
import ShareButton from './ShareButton';

interface Zikr {
  category: string;
  count: string;
  description: string;
  reference: string;
  content: string;
}

interface AzkarProps {
  isRtl: boolean;
}

function AzkarCard({ zikr, index, counters, handleCount, resetCount, isRtl }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.05, 0.9]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0.5, 1, 1, 1, 0.5]);

  const targetCount = parseInt(zikr.count) || 1;
  const currentCount = counters[index] || 0;
  const isCompleted = currentCount >= targetCount;

  return (
    <motion.div 
      ref={ref}
      style={{ scale, rotateX, opacity, transformPerspective: 1000 }}
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border shadow-sm transition-all flex flex-col ${
        isCompleted ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/20' : 'border-emerald-100 dark:border-gray-700'
      }`}
    >
      <div className="flex-1 overflow-y-auto pr-2">
        <p className={`text-xl md:text-2xl leading-loose font-quran text-emerald-900 dark:text-emerald-50 ${isRtl ? 'text-right' : 'text-left'} mb-6`} style={{ lineHeight: '2' }} dir="rtl">
          {zikr.content}
        </p>
        
        {zikr.description && (
          <p className={`text-emerald-600 dark:text-emerald-400 text-sm mb-6 bg-emerald-50 dark:bg-gray-700 p-4 rounded-xl ${isRtl ? 'text-right' : 'text-left'}`} dir="rtl">
            {zikr.description}
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-emerald-50 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleCount(index, targetCount)}
            disabled={isCompleted}
            className={`flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold transition-all shadow-sm ${
              isCompleted 
                ? 'bg-emerald-100 dark:bg-gray-700 text-emerald-400 dark:text-gray-500 cursor-not-allowed' 
                : 'bg-emerald-600 dark:bg-emerald-700 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:scale-105 active:scale-95'
            }`}
          >
            {currentCount}
          </button>
          <div className="text-emerald-800 dark:text-emerald-200 font-medium">
            {isRtl ? 'من' : 'of'} <span className="text-xl font-bold mx-1">{targetCount}</span> {isRtl ? 'مرات' : 'times'}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentCount > 0 && (
            <button
              onClick={() => resetCount(index)}
              className="p-2 text-emerald-400 dark:text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={isRtl ? 'إعادة التكرار' : 'Reset'}
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
          <ShareButton 
            isRtl={isRtl} 
            text={`${zikr.content}\n\n[${zikr.category}]`} 
            title={isRtl ? 'مشاركة ذكر' : 'Share Zikr'} 
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function Azkar({ isRtl }: AzkarProps) {
  const [azkarData, setAzkarData] = useState<Record<string, Zikr[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchAzkar = async () => {
      try {
        const data = await fetchWithCache('https://raw.githubusercontent.com/nawafalqari/azkar-api/56df51279ab6eb86dc2f6202c7de26c8948331c1/azkar.json', 'azkar_data');
        
        // Flatten arrays since some categories have nested arrays
        const processedData: Record<string, Zikr[]> = {};
        Object.keys(data).forEach(key => {
          processedData[key] = data[key].flat();
        });

        setAzkarData(processedData);
        const cats = Object.keys(processedData);
        setCategories(cats);
        if (cats.length > 0) {
          setActiveCategory(cats[0]);
        }
      } catch (error) {
        console.error('Error fetching Azkar:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAzkar();
  }, []);

  const handleCount = (index: number, targetCount: number) => {
    setCounters(prev => {
      const current = prev[index] || 0;
      if (current < targetCount) {
        return { ...prev, [index]: current + 1 };
      }
      return prev;
    });
  };

  const resetCount = (index: number) => {
    setCounters(prev => ({ ...prev, [index]: 0 }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  const currentAzkar = azkarData[activeCategory] || [];

  const categoryTranslations: Record<string, string> = {
    'أذكار الصباح': 'Morning Azkar',
    'أذكار المساء': 'Evening Azkar',
    'أذكار النوم': 'Sleep Azkar',
    'أذكار الاستيقاظ': 'Waking Up Azkar',
    'أذكار الصلاة': 'Prayer Azkar',
    'أذكار بعد الصلاة': 'Post-Prayer Azkar',
    'تسابيح': 'Tasbeeh',
    'أدعية نبوية': 'Prophetic Supplications',
    'أدعية قرآنية': 'Quranic Supplications',
    'أذكار المسلم': 'Muslim Azkar',
    'أذكار متفرقة': 'Miscellaneous Azkar',
  };

  const getCategoryName = (cat: string) => {
    if (isRtl) return cat;
    return categoryTranslations[cat] || cat;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Categories */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-100 dark:border-gray-700 p-4 shadow-sm sticky top-24 transition-colors">
            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-50 mb-4 flex items-center gap-2 px-2">
              <Heart className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              {isRtl ? 'أقسام الأذكار' : 'Azkar Categories'}
            </h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setCounters({}); // Reset all counters when changing category
                  }}
                  className={`w-full ${isRtl ? 'text-right' : 'text-left'} px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
                    activeCategory === cat
                      ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-sm'
                      : 'text-emerald-700 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {getCategoryName(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Azkar List */}
        <div className="flex-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-emerald-100 dark:border-gray-700 shadow-sm mb-6 transition-colors">
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">{getCategoryName(activeCategory)}</h2>
          </div>

          {currentAzkar.map((zikr, index) => (
            <AzkarCard 
              key={index} 
              zikr={zikr} 
              index={index} 
              counters={counters} 
              handleCount={handleCount} 
              resetCount={resetCount} 
              isRtl={isRtl} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}
