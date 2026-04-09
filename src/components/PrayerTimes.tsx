import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Loader2, Navigation, Settings, ChevronDown, Compass, BookOpen, CalendarDays } from 'lucide-react';
import { fetchWithCache } from '../utils/network';
import { useToast } from './ToastContext';

interface PrayerData {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Sunset: string;
    Maghrib: string;
    Isha: string;
    Imsak: string;
    Midnight: string;
  };
  date: {
    readable: string;
    hijri: {
      date: string;
      month: { ar: string; en: string };
      year: string;
      weekday: { ar: string; en: string };
    };
  };
}

interface UmmahPrayerData {
  datetime: Array<{
    times: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Sunset: string;
      Maghrib: string;
      Isha: string;
      Imsak: string;
      Midnight: string;
    };
    date: {
      gregorian: string;
      hijri: string;
    };
  }>;
  location: {
    city: string;
    country: string;
  };
}

interface PrayerTimesProps {
  isRtl: boolean;
}

export default function PrayerTimes({ isRtl }: PrayerTimesProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [isUsingLocation, setIsUsingLocation] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [madhhab, setMadhhab] = useState<'hanafi' | 'shafi'>('shafi'); // Default to Shafi/Maliki/Hanbali
  const [activeTab, setActiveTab] = useState<'prayer' | 'names' | 'calendar' | 'qibla'>('prayer');

  // Asma Al-Husna State
  const [names, setNames] = useState<any[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);

  // Hijri Calendar State
  const [gregorianDate, setGregorianDate] = useState('');
  const [hijriResult, setHijriResult] = useState<any>(null);
  const [loadingHijri, setLoadingHijri] = useState(false);

  // Qibla State
  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [loadingQibla, setLoadingQibla] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [compassActive, setCompassActive] = useState(false);

  const normalizedHeading = ((deviceHeading % 360) + 360) % 360;
  let headingDiff = qiblaDirection !== null ? Math.abs(normalizedHeading - qiblaDirection) : 180;
  if (headingDiff > 180) headingDiff = 360 - headingDiff;
  const isFacingQibla = qiblaDirection !== null && headingDiff < 5;

  const fetchPrayerTimesByCoords = async (lat: number, lng: number, currentMadhhab: string = madhhab) => {
    setLoading(true);
    setError('');
    setCoords({ lat, lng });
    try {
      // Use Ummah API for prayer times
      const schoolParam = currentMadhhab === 'hanafi' ? 1 : 0; // 1 for Hanafi, 0 for Shafi/Maliki/Hanbali
      const result = await fetchWithCache(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=8&school=${schoolParam}`, `prayer_times_coords_${lat}_${lng}_${schoolParam}`);
      setData(result.data);
      setIsUsingLocation(true);
    } catch (err: any) {
      setError(err.message || (isRtl ? 'فشل في جلب مواقيت الصلاة' : 'Failed to fetch prayer times'));
      showToast(isRtl ? 'حدث خطأ أثناء جلب مواقيت الصلاة.' : 'An error occurred while fetching prayer times.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrayerTimes = async (c: string, co: string, currentMadhhab: string = madhhab) => {
    if (!c || !co) return;
    setLoading(true);
    setError('');
    try {
      const schoolParam = currentMadhhab === 'hanafi' ? 1 : 0;
      const result = await fetchWithCache(`https://api.aladhan.com/v1/timingsByCity?city=${c}&country=${co}&method=8&school=${schoolParam}`, `prayer_times_${c}_${co}_${schoolParam}`);
      setData(result.data);
      setIsUsingLocation(false);
    } catch (err: any) {
      setError(err.message || (isRtl ? 'فشل في جلب مواقيت الصلاة' : 'Failed to fetch prayer times'));
      showToast(isRtl ? 'حدث خطأ أثناء جلب مواقيت الصلاة.' : 'An error occurred while fetching prayer times.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (city && country) {
      fetchPrayerTimes(city, country);
    } else {
      showToast(isRtl ? 'يرجى إدخال المدينة والدولة.' : 'Please enter city and country.', 'warning');
    }
  };

  const handleMadhhabChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMadhhab = e.target.value as 'hanafi' | 'shafi';
    setMadhhab(newMadhhab);
    if (isUsingLocation && coords) {
      fetchPrayerTimesByCoords(coords.lat, coords.lng, newMadhhab);
    } else if (city && country) {
      fetchPrayerTimes(city, country, newMadhhab);
    }
  };

  const requestLocation = (currentMadhhab: string = madhhab) => {
    if (!navigator.geolocation) {
      showToast(isRtl ? 'متصفحك لا يدعم تحديد الموقع.' : 'Geolocation is not supported by your browser.', 'error');
      // Fallback to default city
      setCity('cairo');
      setCountry('egypt');
      fetchPrayerTimes('cairo', 'egypt', currentMadhhab);
      return;
    }

    setLoading(true);
    let timeoutId = setTimeout(() => {
      setLoading(false);
      showToast(isRtl ? 'انتهى وقت تحديد الموقع.' : 'Location request timed out.', 'error');
      setCity('cairo');
      setCountry('egypt');
      fetchPrayerTimes('cairo', 'egypt', currentMadhhab);
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        fetchPrayerTimesByCoords(position.coords.latitude, position.coords.longitude, currentMadhhab);
        if (activeTab === 'qibla') {
          fetchQibla(position.coords.latitude, position.coords.longitude);
        }
        showToast(isRtl ? 'تم تحديد الموقع بنجاح.' : 'Location detected successfully.', 'success');
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Geolocation error:', err);
        showToast(isRtl ? 'تم رفض إذن الموقع، يرجى إدخال المدينة يدوياً.' : 'Location permission denied, please enter city manually.', 'warning');
        setCity('cairo');
        setCountry('egypt');
        fetchPrayerTimes('cairo', 'egypt', currentMadhhab);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleOrientation = (event: any) => {
    let heading = null;
    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      heading = 360 - event.alpha;
    }

    if (heading !== null) {
      setDeviceHeading((prev) => {
        let diff = heading - (prev % 360);
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return prev + diff;
      });
    }
  };

  const startCompass = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation as any, true);
          setCompassActive(true);
        } else {
          showToast(isRtl ? 'تم رفض إذن البوصلة' : 'Compass permission denied', 'error');
        }
      } catch (error) {
        console.error(error);
        showToast(isRtl ? 'خطأ في تفعيل البوصلة' : 'Error activating compass', 'error');
      }
    } else {
      if ('ondeviceorientationabsolute' in window) {
        (window as any).addEventListener('deviceorientationabsolute', handleOrientation as any, true);
      } else {
        (window as any).addEventListener('deviceorientation', handleOrientation as any, true);
      }
      setCompassActive(true);
    }
  };

  useEffect(() => {
    requestLocation();
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation as any, true);
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'names' && names.length === 0) {
      fetchNames();
    }
    if (activeTab === 'qibla' && coords && qiblaDirection === null) {
      fetchQibla(coords.lat, coords.lng);
    }
  }, [activeTab]);

  const fetchNames = async () => {
    setLoadingNames(true);
    try {
      const res = await fetchWithCache('https://api.aladhan.com/v1/asmaAlHusna', 'asma_al_husna');
      setNames(res.data);
    } catch (err) {
      console.error(err);
      showToast(isRtl ? 'فشل في جلب أسماء الله الحسنى' : 'Failed to fetch Asma Al-Husna', 'error');
    } finally {
      setLoadingNames(false);
    }
  };

  const convertDate = async () => {
    if (!gregorianDate) return;
    setLoadingHijri(true);
    try {
      const [year, month, day] = gregorianDate.split('-');
      const formatted = `${day}-${month}-${year}`;
      const res = await fetchWithCache(`https://api.aladhan.com/v1/gToH?date=${formatted}`, `gToH_${formatted}`);
      setHijriResult(res.data);
    } catch (err) {
      console.error(err);
      showToast(isRtl ? 'فشل في تحويل التاريخ' : 'Failed to convert date', 'error');
    } finally {
      setLoadingHijri(false);
    }
  };

  const fetchQibla = async (lat: number, lng: number) => {
    setLoadingQibla(true);
    try {
      const res = await fetchWithCache(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`, `qibla_${lat}_${lng}`);
      setQiblaDirection(res.data.direction);
    } catch (err) {
      console.error(err);
      showToast(isRtl ? 'فشل في جلب اتجاه القبلة' : 'Failed to fetch Qibla direction', 'error');
    } finally {
      setLoadingQibla(false);
    }
  };

  const prayerNamesAr: Record<string, string> = {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء',
    Imsak: 'الإمساك',
    Midnight: 'منتصف الليل',
  };

  const prayerNamesEn: Record<string, string> = {
    Fajr: 'Fajr',
    Sunrise: 'Sunrise',
    Dhuhr: 'Dhuhr',
    Asr: 'Asr',
    Maghrib: 'Maghrib',
    Isha: 'Isha',
    Imsak: 'Imsak',
    Midnight: 'Midnight',
  };

  const prayerNames = isRtl ? prayerNamesAr : prayerNamesEn;

  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [time] = time24.split(' ');
    const [hoursStr, minutes] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? (isRtl ? 'م' : 'PM') : (isRtl ? 'ص' : 'AM');
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        <button
          onClick={() => setActiveTab('prayer')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors font-medium ${
            activeTab === 'prayer'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700'
          }`}
        >
          <Clock className="h-4 w-4" />
          {isRtl ? 'مواقيت الصلاة' : 'Prayer Times'}
        </button>
        <button
          onClick={() => setActiveTab('names')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors font-medium ${
            activeTab === 'names'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          {isRtl ? 'أسماء الله الحسنى' : 'Asma Al-Husna'}
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors font-medium ${
            activeTab === 'calendar'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          {isRtl ? 'التقويم الهجري' : 'Hijri Calendar'}
        </button>
        <button
          onClick={() => setActiveTab('qibla')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors font-medium ${
            activeTab === 'qibla'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-gray-700'
          }`}
        >
          <Compass className="h-4 w-4" />
          {isRtl ? 'اتجاه القبلة' : 'Qibla Direction'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 md:p-8 border border-emerald-100 dark:border-gray-700 transition-colors duration-300">
        
        {activeTab === 'prayer' && (
          <>
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                {isRtl ? 'مواقيت الصلاة' : 'Prayer Times'}
              </div>
              <div className="relative inline-block w-full sm:w-auto">
                <select
                  value={madhhab}
                  onChange={handleMadhhabChange}
                  className={`appearance-none w-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-4 py-2 ${isRtl ? 'pl-8 pr-4' : 'pr-8 pl-4'} rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium cursor-pointer border border-emerald-200 dark:border-emerald-800`}
                >
                  <option value="shafi">{isRtl ? 'شافعي / مالكي / حنبلي' : 'Shafi / Maliki / Hanbali'}</option>
                  <option value="hanafi">{isRtl ? 'المذهب الحنفي' : 'Hanafi'}</option>
                </select>
                <ChevronDown className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 dark:text-emerald-400 pointer-events-none`} />
              </div>
            </h2>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <MapPin className="h-5 w-5 text-emerald-400 dark:text-emerald-500" />
            </div>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`block w-full ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-emerald-200 dark:border-gray-600 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50 dark:bg-gray-700 dark:text-white transition-colors`}
              placeholder={isRtl ? 'المدينة (مثال: cairo)' : 'City (e.g. cairo)'}
              dir="ltr"
            />
          </div>
          <div className="flex-1 relative">
            <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
              <MapPin className="h-5 w-5 text-emerald-400 dark:text-emerald-500" />
            </div>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`block w-full ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'} py-3 border border-emerald-200 dark:border-gray-600 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50 dark:bg-gray-700 dark:text-white transition-colors`}
              placeholder={isRtl ? 'الدولة (مثال: egypt)' : 'Country (e.g. egypt)'}
              dir="ltr"
            />
          </div>
          <button
            type="button"
            onClick={requestLocation}
            className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors shadow-sm flex items-center justify-center"
            title={isRtl ? 'استخدام موقعي الحالي' : 'Use my current location'}
          >
            <Navigation className="h-5 w-5" />
          </button>
          <button
            type="submit"
            className="bg-emerald-600 dark:bg-emerald-700 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors font-medium shadow-sm"
          >
            {isRtl ? 'بحث' : 'Search'}
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 dark:text-red-400 text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">{error}</div>
        ) : data ? (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-50 dark:bg-gray-700/50 p-6 rounded-xl border border-emerald-100 dark:border-gray-600 transition-colors">
              <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-100 mb-4 sm:mb-0">
                <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <span className="text-lg font-medium">{data.date.readable}</span>
              </div>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-50">
                {isRtl ? data.date.hijri.weekday.ar : data.date.hijri.weekday.en}، {data.date.hijri.date} {isRtl ? data.date.hijri.month.ar : data.date.hijri.month.en} {data.date.hijri.year}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(data.timings).map(([key, time]) => {
                if (!prayerNames[key]) return null;
                const isMainPrayer = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(key);
                
                return (
                  <div
                    key={key}
                    className={`p-6 rounded-2xl border transition-all hover:shadow-md ${
                      isMainPrayer
                        ? 'bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-500 dark:border-emerald-600 shadow-sm transform hover:-translate-y-1'
                        : 'bg-white dark:bg-gray-800 text-emerald-900 dark:text-emerald-100 border-emerald-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-500'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-2 ${isMainPrayer ? 'text-emerald-100 dark:text-emerald-200' : 'text-emerald-500 dark:text-emerald-400'}`}>
                      {prayerNames[key]}
                    </div>
                    <div className="text-3xl font-bold tracking-tight" dir="ltr">
                      {formatTime12Hour(time as string)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
          </>
        )}

        {activeTab === 'names' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              {isRtl ? 'أسماء الله الحسنى' : 'Asma Al-Husna'}
            </h2>
            {loadingNames ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {names.map((name, index) => (
                  <div key={index} className="p-4 rounded-xl border border-emerald-100 dark:border-gray-700 bg-emerald-50/50 dark:bg-gray-700/50 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400">{name.number}</span>
                      <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 font-amiri">{name.name}</span>
                    </div>
                    <div className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-1">{name.transliteration}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{name.en.meaning}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 flex items-center justify-center gap-2">
              <CalendarDays className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              {isRtl ? 'التقويم الهجري' : 'Hijri Calendar'}
            </h2>
            <div className="flex flex-col items-center gap-4 max-w-xs mx-auto">
              <input
                type="date"
                value={gregorianDate}
                onChange={(e) => setGregorianDate(e.target.value)}
                className="w-full px-4 py-3 text-center rounded-xl border border-emerald-200 dark:border-gray-600 bg-emerald-50/50 dark:bg-gray-700 dark:text-white focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                style={{ textAlign: 'center', textAlignLast: 'center' }}
                dir="ltr"
              />
              <button
                onClick={convertDate}
                disabled={!gregorianDate || loadingHijri}
                className="w-full bg-emerald-600 dark:bg-emerald-700 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors font-medium shadow-sm disabled:opacity-50 flex items-center justify-center"
              >
                {loadingHijri ? <Loader2 className="h-5 w-5 animate-spin" /> : (isRtl ? 'تحويل' : 'Convert')}
              </button>
            </div>
            
            {hijriResult && (
              <div className="mt-8 p-6 bg-emerald-50 dark:bg-gray-700/50 rounded-xl border border-emerald-100 dark:border-gray-600">
                <div className="text-center">
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-2">{hijriResult.gregorian.date}</div>
                  <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-50 mb-4">
                    {hijriResult.hijri.day} {isRtl ? hijriResult.hijri.month.ar : hijriResult.hijri.month.en} {hijriResult.hijri.year}
                  </div>
                  <div className="text-lg text-emerald-800 dark:text-emerald-200">
                    {isRtl ? hijriResult.hijri.weekday.ar : hijriResult.hijri.weekday.en}
                  </div>
                  {hijriResult.hijri.holidays.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-gray-600">
                      <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">
                        {isRtl ? 'المناسبات الإسلامية:' : 'Islamic Events:'}
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {hijriResult.hijri.holidays.map((holiday: string, idx: number) => (
                          <span key={idx} className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-sm">
                            {holiday}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'qibla' && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-50 flex items-center justify-center gap-2">
              <Compass className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              {isRtl ? 'اتجاه القبلة' : 'Qibla Direction'}
            </h2>
            
            {!coords ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {isRtl ? 'يرجى السماح بالوصول إلى الموقع لتحديد اتجاه القبلة.' : 'Please allow location access to determine Qibla direction.'}
                </p>
                <button
                  onClick={() => requestLocation()}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  {isRtl ? 'تحديد الموقع' : 'Detect Location'}
                </button>
              </div>
            ) : loadingQibla ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400 animate-spin" />
              </div>
            ) : qiblaDirection !== null ? (
              <div className="flex flex-col items-center justify-center py-8">
                {!compassActive && (
                  <button 
                    onClick={startCompass}
                    className="mb-8 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm flex items-center gap-2"
                  >
                    <Compass className="h-5 w-5" />
                    {isRtl ? 'تفعيل البوصلة' : 'Activate Compass'}
                  </button>
                )}
                
                <div className="relative w-72 h-72 mb-8 mx-auto">
                  {/* Fixed Device Pointer (always points up) */}
                  <div className={`absolute top-[-20px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-r-[15px] border-b-[20px] border-l-transparent border-r-transparent z-40 drop-shadow-md transition-colors duration-300 ${isFacingQibla ? 'border-b-emerald-500' : 'border-b-red-500'}`}></div>
                  
                  {/* Compass Dial */}
                  <div 
                    className={`absolute inset-0 rounded-full border-8 bg-white dark:bg-gray-800 shadow-inner transition-all duration-150 ease-out ${isFacingQibla ? 'border-emerald-400 dark:border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'border-emerald-100 dark:border-gray-700'}`}
                    style={{ transform: `rotate(${-deviceHeading}deg)` }}
                  >
                    {/* Tick marks */}
                    {[...Array(24)].map((_, i) => (
                      <div key={i} className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${i * 15}deg)` }}>
                        <div className={`w-1 ${i % 6 === 0 ? 'h-4 bg-emerald-500' : 'h-2 bg-emerald-200 dark:bg-gray-600'} rounded-full mt-1`}></div>
                      </div>
                    ))}
                    
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xl font-bold text-red-500">N</div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xl font-bold text-gray-400">S</div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">E</div>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">W</div>
                    
                    {/* Qibla Pointer */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center transition-transform duration-1000 ease-out"
                      style={{ transform: `rotate(${qiblaDirection}deg)` }}
                    >
                      <div className="h-full w-1 flex flex-col items-center py-10">
                        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg -mt-5 z-20 border-2 border-white dark:border-gray-800">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L12 10M12 2L15 5M12 2L9 5" />
                          </svg>
                        </div>
                        <div className="w-1.5 flex-1 bg-gradient-to-b from-emerald-600 to-transparent dark:from-emerald-500"></div>
                      </div>
                    </div>
                  </div>
                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-600 rounded-full border-4 border-white dark:border-gray-800 z-30 shadow-md"></div>
                </div>
                
                <div className={`text-center px-6 py-4 rounded-2xl border transition-colors duration-300 ${isFacingQibla ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-500' : 'bg-emerald-50 dark:bg-gray-700/50 border-emerald-100 dark:border-gray-600'}`}>
                  <div className={`text-4xl font-bold mb-2 transition-colors duration-300 ${isFacingQibla ? 'text-emerald-700 dark:text-emerald-300' : 'text-emerald-900 dark:text-emerald-50'}`} dir="ltr">
                    {qiblaDirection.toFixed(1)}°
                  </div>
                  <div className={`text-sm font-medium transition-colors duration-300 ${isFacingQibla ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {isFacingQibla 
                      ? (isRtl ? 'أنت تواجه القبلة الآن!' : 'You are facing the Qibla!') 
                      : (isRtl ? 'درجة من الشمال الجغرافي' : 'Degrees from true North')}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}
