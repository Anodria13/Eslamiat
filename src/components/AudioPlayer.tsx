import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isRtl: boolean;
  isLive?: boolean;
  onOpenVisualizer?: () => void;
}

export default function AudioPlayer({ audioRef, isPlaying, onTogglePlay, isRtl, isLive = false, onOpenVisualizer }: AudioPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const animationRef = useRef<number>();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
    };
  }, [audioRef]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Number(e.target.value);
      setCurrentTime(audio.currentTime);
    }
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(audio.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(audio.currentTime - 10, 0);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const newVolume = Number(e.target.value);
      audio.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
        audio.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        audio.muted = false;
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {!isLive && (
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium w-10 text-center">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-emerald-100 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            dir="ltr"
          />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium w-10 text-center">
            {formatTime(duration)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-24">
          <button onClick={toggleMute} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1.5 bg-emerald-100 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hidden sm:block"
            dir="ltr"
          />
        </div>

        <div className="flex items-center gap-4">
          {!isLive && (
            <button
              onClick={skipBackward}
              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={isRtl ? 'تأخير 10 ثواني' : 'Rewind 10 seconds'}
            >
              <SkipBack className="w-6 h-6" />
            </button>
          )}
          
          <button
            onClick={onTogglePlay}
            className="flex items-center justify-center w-14 h-14 bg-emerald-600 dark:bg-emerald-700 text-white rounded-full hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
          </button>

          {!isLive && (
            <button
              onClick={skipForward}
              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={isRtl ? 'تقديم 10 ثواني' : 'Forward 10 seconds'}
            >
              <SkipForward className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="w-24 flex justify-end">
          {onOpenVisualizer && (
            <button
              onClick={onOpenVisualizer}
              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-full transition-colors"
              title={isRtl ? 'عرض تفاعلي' : 'Visualizer'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
