import React, { useState, useEffect } from 'react';
import { Book, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from "motion/react";
import { fetchWithCache } from '../utils/network';
import ShareButton from './ShareButton';

interface HadithData {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades: { name: string; grade: string }[];
  reference: { book: number; hadith: number };
}

interface HadithProps {
  isRtl: boolean;
}

export default function Hadith({ isRtl }: HadithProps) {
  const [hadiths, setHadiths] = useState<HadithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(1.5); // Initial font size in rem

  useEffect(() => {
    const fetchHadith = async () => {
      try {
        const data = await fetchWithCache('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-nawawi.json', 'hadith_nawawi');
        setHadiths(data.hadiths);
      } catch (error) {
        console.error('Error fetching Hadith:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHadith();
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % hadiths.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + hadiths.length) % hadiths.length);
  };

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 0.2, 3));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 0.2, 1));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (hadiths.length === 0) return null;

  const currentHadith = hadiths[currentIndex];

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
      <motion.div 
        whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 border border-emerald-100 dark:border-gray-700 shadow-sm relative overflow-hidden transition-colors"
      >
        {/* Decorative background element */}
        <div className={`absolute top-0 ${isRtl ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'} w-64 h-64 bg-emerald-50 dark:bg-emerald-900/20 rounded-full -translate-y-1/2 opacity-50 pointer-events-none transition-colors`}></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 transition-colors">
                <Book className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50">{isRtl ? 'الأربعون النووية' : 'An-Nawawi\'s Forty Hadith'}</h2>
            </div>
            <div className="bg-emerald-50 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full font-bold text-lg border border-emerald-100 dark:border-gray-600 transition-colors">
              {isRtl ? 'الحديث' : 'Hadith'} {currentHadith.hadithnumber}
            </div>
          </div>

          <div className="flex justify-end mb-4 gap-2">
            <ShareButton 
              isRtl={isRtl} 
              text={`${currentHadith.text}\n\n[الأربعون النووية - حديث رقم ${currentHadith.hadithnumber}]`} 
              title={isRtl ? 'مشاركة حديث' : 'Share Hadith'} 
            />
            <button 
              onClick={increaseFontSize}
              className="p-2 bg-emerald-50 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-gray-600 transition-colors"
              title={isRtl ? 'تكبير الخط' : 'Increase Font Size'}
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button 
              onClick={decreaseFontSize}
              className="p-2 bg-emerald-50 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-gray-600 transition-colors"
              title={isRtl ? 'تصغير الخط' : 'Decrease Font Size'}
            >
              <ZoomOut className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-[300px] flex flex-col justify-center mb-12">
            <p className={`leading-loose font-quran text-emerald-900 dark:text-emerald-50 ${isRtl ? 'text-right' : 'text-left'}`} style={{ fontSize: `${fontSize}rem`, lineHeight: '2.2' }} dir="rtl">
              {currentHadith.text}
            </p>
          </div>

          <div className="flex items-center justify-between pt-8 border-t border-emerald-50 dark:border-gray-700 transition-colors">
            <button
              onClick={handlePrev}
              className={`flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700 px-6 py-3 rounded-xl transition-colors font-medium ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}
            >
              {isRtl ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              {isRtl ? 'السابق' : 'Previous'}
            </button>
            
            <div className="text-emerald-400 dark:text-emerald-500 font-medium text-sm">
              {currentIndex + 1} / {hadiths.length}
            </div>

            <button
              onClick={handleNext}
              className={`flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700 px-6 py-3 rounded-xl transition-colors font-medium ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}
            >
              {isRtl ? 'التالي' : 'Next'}
              {isRtl ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
