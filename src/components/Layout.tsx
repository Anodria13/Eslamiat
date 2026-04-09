import React, { useState, useEffect } from 'react';
import { Moon, BookOpen, Clock, Radio as RadioIcon, Heart, Sun, Monitor, Globe, Settings, Plus, Minus, X, ListMusic } from 'lucide-react';
import PrayerTimes from './PrayerTimes';
import Quran from './Quran';
import Azkar from './Azkar';
import Hadith from './Hadith';
import Radio from './Radio';
import { AudioProvider } from './AudioContext';
import { FavoritesProvider } from './FavoritesContext';

const tabs = [
  { id: 'prayer', name: 'مواقيت الصلاة', nameEn: 'Prayer Times', icon: Clock },
  { id: 'quran', name: 'القرآن الكريم', nameEn: 'Quran', icon: BookOpen },
  { id: 'azkar', name: 'الأذكار', nameEn: 'Azkar', icon: Heart },
  { id: 'hadith', name: 'الأحاديث', nameEn: 'Hadith', icon: Moon },
  { id: 'radio', name: 'الراديو', nameEn: 'Radio', icon: RadioIcon },
  { id: 'misc_radio', name: 'إذاعات متنوعة', nameEn: 'Misc Radios', icon: ListMusic },
];

type Theme = 'light' | 'dark' | 'system';
type Language = 'ar' | 'en';

export default function Layout() {
  const [activeTab, setActiveTab] = useState('prayer');
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>('ar');
  const [showSettings, setShowSettings] = useState(false);
  const [globalScale, setGlobalScale] = useState(1);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: Theme) => {
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (systemTheme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      } else if (t === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * globalScale}px`;
  }, [globalScale]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const increaseScale = () => setGlobalScale(prev => Math.min(prev + 0.1, 1.5));
  const decreaseScale = () => setGlobalScale(prev => Math.max(prev - 0.1, 0.8));
  const resetScale = () => setGlobalScale(1);

  const isRtl = language === 'ar';

  return (
    <FavoritesProvider>
      <AudioProvider>
        <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 text-emerald-900 dark:text-emerald-50 font-sans pb-20 md:pb-0 transition-colors duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <header className="bg-emerald-800 dark:bg-emerald-950 text-white shadow-md sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <Moon className="h-8 w-8 text-emerald-300" />
                <span className="text-2xl font-bold tracking-tight">{isRtl ? 'إسلاميات' : 'Islamiat'}</span>
              </div>
              
              {/* Desktop Navigation */}
              <nav className={`hidden lg:flex space-x-1 ${isRtl ? 'space-x-reverse' : ''}`}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-emerald-700 dark:bg-emerald-800 text-white'
                          : 'text-emerald-100 hover:bg-emerald-700/50 dark:hover:bg-emerald-800/50 hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{isRtl ? tab.name : tab.nameEn}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Settings */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-lg text-emerald-100 hover:bg-emerald-700/50 dark:hover:bg-emerald-800/50 transition-colors"
                  title={isRtl ? 'الإعدادات' : 'Settings'}
                >
                  <Settings className="h-5 w-5" />
                </button>

                <button
                  onClick={toggleLanguage}
                  className="p-2 rounded-lg text-emerald-100 hover:bg-emerald-700/50 dark:hover:bg-emerald-800/50 transition-colors flex items-center gap-1"
                  title={isRtl ? 'Switch to English' : 'التبديل للعربية'}
                >
                  <Globe className="h-5 w-5" />
                  <span className="text-sm font-bold hidden sm:inline">{isRtl ? 'EN' : 'عربي'}</span>
                </button>
                
                <div className="flex bg-emerald-900/50 dark:bg-emerald-900/80 rounded-lg p-1">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-200 hover:text-white'}`}
                    title={isRtl ? 'الوضع الفاتح' : 'Light Mode'}
                  >
                    <Sun className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`p-1.5 rounded-md transition-colors ${theme === 'system' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-200 hover:text-white'}`}
                    title={isRtl ? 'وضع النظام' : 'System Mode'}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-200 hover:text-white'}`}
                    title={isRtl ? 'الوضع الداكن' : 'Dark Mode'}
                  >
                    <Moon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
              <button 
                onClick={() => setShowSettings(false)}
                className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} text-gray-400 hover:text-gray-600 dark:hover:text-gray-200`}
              >
                <X className="h-5 w-5" />
              </button>
              
              <h3 className="text-xl font-bold mb-6 text-emerald-900 dark:text-emerald-50">
                {isRtl ? 'الإعدادات' : 'Settings'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {isRtl ? 'حجم الخط والأيقونات' : 'Font & Icon Size'}
                  </label>
                  <div className="flex items-center gap-4 bg-emerald-50 dark:bg-gray-700 p-2 rounded-xl">
                    <button 
                      onClick={decreaseScale}
                      className="p-2 bg-white dark:bg-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Minus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </button>
                    <div className="flex-1 text-center font-bold text-emerald-900 dark:text-emerald-50">
                      {Math.round(globalScale * 100)}%
                    </div>
                    <button 
                      onClick={increaseScale}
                      className="p-2 bg-white dark:bg-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </button>
                  </div>
                  <button 
                    onClick={resetScale}
                    className="mt-2 w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    {isRtl ? 'إعادة الضبط الافتراضي' : 'Reset to Default'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'prayer' && <PrayerTimes isRtl={isRtl} />}
          {activeTab === 'quran' && <Quran isRtl={isRtl} />}
          {activeTab === 'azkar' && <Azkar isRtl={isRtl} />}
          {activeTab === 'hadith' && <Hadith isRtl={isRtl} />}
          <div className={(activeTab === 'radio' || activeTab === 'misc_radio') ? '' : 'hidden'}>
            <Radio isRtl={isRtl} activeTab={activeTab} />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-emerald-100 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 transition-colors duration-300">
          <div className="flex justify-around items-center h-16">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-400 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-300'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isActive ? 'fill-emerald-50 dark:fill-emerald-900/30' : ''}`} />
                  <span className="text-[10px] font-medium">{isRtl ? tab.name : tab.nameEn}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
      </AudioProvider>
    </FavoritesProvider>
  );
}
