import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, X, Volume2, VolumeX, SkipBack, SkipForward, Cast } from 'lucide-react';
import { useAudio } from './AudioContext';
import AudioVisualizer from './AudioVisualizer';

interface AudioPlaybackScreenProps {
  audioUrl: string;
  title: string;
  image?: string;
  onClose: () => void;
  isRtl: boolean;
  audioElement?: HTMLAudioElement | null;
}

export default function AudioPlaybackScreen({ audioUrl, title, image, onClose, isRtl, audioElement }: AudioPlaybackScreenProps) {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const { stopQuran, stopRadio } = useAudio();

  useEffect(() => {
    let audio = audioElement;
    let createdLocal = false;
    
    if (!audio) {
      audio = new Audio(audioUrl);
      audio.crossOrigin = "anonymous";
      createdLocal = true;
    }
    
    activeAudioRef.current = audio;

    setIsReady(audio.readyState >= 2);
    setDuration(audio.duration || 0);
    setIsPlaying(!audio.paused);
    setCurrentTime(audio.currentTime);
    setVolume(audio.volume);
    setIsMuted(audio.muted);

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleCanPlay = () => setIsReady(true);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('canplay', handleCanPlay);

    if (createdLocal) {
      audio.play().catch(e => console.error(e));
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('canplay', handleCanPlay);
      if (createdLocal) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audioUrl, audioElement]);

  const togglePlayPause = () => {
    const audio = activeAudioRef.current;
    if (audio) {
      if (audio.paused) {
        audio.play().catch((err: any) => {
          const msg = err ? (typeof err === 'string' ? err : (err.message || err.toString() || '')) : '';
          if (msg.includes('interrupted by a call to pause')) return;
          console.error(err);
        });
      } else {
        audio.pause();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (activeAudioRef.current) {
      activeAudioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (activeAudioRef.current) {
      activeAudioRef.current.muted = newMutedState;
    }
  };

  const skipForward = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.currentTime += 10;
    }
  };

  const skipBackward = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.currentTime -= 10;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (activeAudioRef.current) {
      activeAudioRef.current.currentTime = time;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCast = async () => {
    const audio = activeAudioRef.current;
    if (!audio) {
      alert(isRtl ? 'لا يوجد مقطع صوتي للبث.' : 'No audio to cast.');
      return;
    }

    try {
      if ((audio as any).remote) {
        await (audio as any).remote.prompt();
      } else {
        alert(isRtl ? 'ميزة البث غير مدعومة في هذا المتصفح.' : 'Casting is not supported in this browser.');
      }
    } catch (error: any) {
      if (error.name !== 'NotAllowedError' && error.name !== 'NotFoundError' && error.name !== 'AbortError') {
        console.error('Cast error:', error);
      } else if (error.name === 'NotFoundError') {
        alert(isRtl ? 'لم يتم العثور على أجهزة بث قريبة.' : 'No cast devices found nearby.');
      }
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-3xl flex flex-col items-center gap-8">
        {/* Content Image */}
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/50 relative group">
          <img 
            src={image || `https://picsum.photos/seed/${encodeURIComponent(title)}/400/400?blur=2`} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md" style={{ fontFamily: isRtl ? "'Amiri', serif" : "inherit" }}>
            {title}
          </h2>
          <p className="text-emerald-400 text-sm sm:text-base font-medium tracking-wide">
            {isRtl ? 'يتم التشغيل الآن' : 'Now Playing'}
          </p>
        </div>

        {/* Audio Visualizer */}
        {activeAudioRef.current && (
          <div className="w-full mb-2">
            <AudioVisualizer audioElement={activeAudioRef.current} isRtl={isRtl} />
          </div>
        )}

        {/* Unified Player Controls */}
        <div className="w-full bg-black/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col gap-8">
          {/* Progress Bar */}
          <div className="w-full flex flex-col gap-3">
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              step="0.1" 
              value={currentTime} 
              onChange={handleSeek}
              className="w-full h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
            />
            <div className="flex justify-between text-xs text-gray-400 font-mono px-1">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Volume Control */}
            <div className="flex items-center gap-3 w-full sm:w-1/3">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={isMuted ? 0 : volume} 
                onChange={handleVolumeChange}
                className="w-full h-1.5 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-6 w-full sm:w-1/3">
              <button 
                onClick={skipBackward}
                className="text-gray-400 hover:text-white transition-colors"
                title={isRtl ? 'تأخير 10 ثواني' : 'Rewind 10s'}
              >
                <SkipBack className="w-6 h-6" />
              </button>
              
              <button 
                onClick={togglePlayPause}
                disabled={!isReady}
                className="w-16 h-16 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className={`w-8 h-8 ${isRtl ? 'mr-1' : 'ml-1'}`} />}
              </button>
              
              <button 
                onClick={skipForward}
                className="text-gray-400 hover:text-white transition-colors"
                title={isRtl ? 'تقديم 10 ثواني' : 'Forward 10s'}
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            {/* Cast Control */}
            <div className="flex items-center justify-end w-full sm:w-1/3">
              <button 
                onClick={handleCast}
                className="text-gray-400 hover:text-white transition-colors p-3 rounded-full hover:bg-white/10"
                title={isRtl ? 'بث إلى شاشة' : 'Cast to screen'}
              >
                <Cast className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
