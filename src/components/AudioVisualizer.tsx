import React, { useEffect, useRef, useState } from 'react';

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  words?: WordTiming[];
  isRtl?: boolean;
}

const defaultWords: WordTiming[] = [
  {"word": "بِسْمِ", "start": 0.0, "end": 0.8},
  {"word": "اللَّهِ", "start": 0.8, "end": 1.5},
  {"word": "الرَّحْمَٰنِ", "start": 1.5, "end": 2.5},
  {"word": "الرَّحِيمِ", "start": 2.5, "end": 3.5}
];

export default function AudioVisualizer({ audioElement, words = defaultWords, isRtl = true }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    let audioCtx: AudioContext;
    let analyser: AnalyserNode;
    let source: MediaElementAudioSourceNode;

    try {
      // Check if context already exists on the window or element to avoid InvalidStateError
      if (!(audioElement as any).__audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        source = audioCtx.createMediaElementSource(audioElement);
        analyser = audioCtx.createAnalyser();
        
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        (audioElement as any).__audioCtx = audioCtx;
        (audioElement as any).__analyser = analyser;
      } else {
        audioCtx = (audioElement as any).__audioCtx;
        analyser = (audioElement as any).__analyser;
      }
      
      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Resume context if suspended
      if (audioCtx.state === 'suspended') {
        const resumeCtx = () => {
          audioCtx.resume();
          audioElement.removeEventListener('play', resumeCtx);
        };
        audioElement.addEventListener('play', resumeCtx);
      }

    } catch (err) {
      console.error("Error setting up audio visualizer:", err);
    }

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      
      // Top visualizer height (e.g., 40% of total height)
      const visualizerHeight = height * 0.4;
      // Spectrogram height (e.g., 60% of total height)
      const spectrogramHeight = height * 0.6;
      const spectrogramY = visualizerHeight;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // 1. Draw Top Visualizer (Glowing Waves)
      ctx.clearRect(0, 0, width, visualizerHeight);
      
      const barWidth = (width / dataArrayRef.current.length) * 2.5;
      let x = 0;

      for (let i = 0; i < dataArrayRef.current.length; i++) {
        const barHeight = (dataArrayRef.current[i] / 255) * visualizerHeight;
        
        // Fire colors: orange/yellow
        const r = 255;
        const g = Math.min(255, dataArrayRef.current[i] + 50);
        const b = Math.max(0, 50 - dataArrayRef.current[i]);
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${r},${g},${b}, 0.8)`;
        
        // Draw main bar
        ctx.fillRect(x, visualizerHeight - barHeight, barWidth, barHeight);
        
        // Reflection
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, visualizerHeight, barWidth, barHeight * 0.3);
        ctx.globalAlpha = 1.0;
        
        x += barWidth + 1;
      }
      
      ctx.shadowBlur = 0; // Reset shadow

      // 2. Draw Spectrogram (Optimized: shift left and draw new column)
      if (!audioElement.paused) {
        const sliceWidth = 2; // Width of each column
        
        // Shift existing spectrogram left
        ctx.drawImage(
          canvas, 
          sliceWidth, spectrogramY, width - sliceWidth, spectrogramHeight, // Source
          0, spectrogramY, width - sliceWidth, spectrogramHeight // Destination
        );

        // Draw new column on the right
        const xPos = width - sliceWidth;
        const data = dataArrayRef.current;
        
        for (let j = 0; j < data.length; j++) {
          const value = data[j];
          const yPos = spectrogramY + spectrogramHeight - (j / data.length) * spectrogramHeight;
          const h = spectrogramHeight / data.length;
          
          // Inferno colormap approximation (purple -> orange -> yellow)
          const ratio = value / 255;
          let r = 0, g = 0, b = 0;
          if (ratio < 0.33) {
            r = ratio * 3 * 128; // Dark purple
            b = ratio * 3 * 128;
          } else if (ratio < 0.66) {
            r = 128 + (ratio - 0.33) * 3 * 127; // Purple to Orange
            g = (ratio - 0.33) * 3 * 128;
            b = 128 - (ratio - 0.33) * 3 * 128;
          } else {
            r = 255;
            g = 128 + (ratio - 0.66) * 3 * 127; // Orange to Yellow
            b = 0;
          }
          
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          // Add 1 to height to prevent gaps
          ctx.fillRect(xPos, yPos - h, sliceWidth, h + 1);
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioElement]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = 250; // Fixed height or responsive
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Word Sync
  useEffect(() => {
    if (!audioElement) return;

    const handleTimeUpdate = () => {
      const time = audioElement.currentTime;
      const index = words.findIndex(w => time >= w.start && time <= w.end);
      setCurrentWordIndex(index);
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    return () => audioElement.removeEventListener('timeupdate', handleTimeUpdate);
  }, [audioElement, words]);

  const handleWordClick = (start: number) => {
    if (audioElement) {
      audioElement.currentTime = start;
      audioElement.play().catch(e => console.error("Play error after seek:", e));
    }
  };

  return (
    <div className="w-full flex flex-col gap-4" ref={containerRef}>
      {/* Canvas for Visualizer and Spectrogram */}
      <div className="w-full rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-inner">
        <canvas ref={canvasRef} className="w-full block" style={{ height: '250px' }} />
      </div>

      {/* Word Sync UI */}
      <div 
        className="w-full flex flex-wrap gap-2 justify-center p-4 bg-black/30 rounded-2xl border border-white/5"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {words.map((word, index) => {
          const isActive = index === currentWordIndex;
          return (
            <button
              key={index}
              onClick={() => handleWordClick(word.start)}
              className={`
                px-4 py-2 rounded-lg text-lg font-bold transition-all duration-300
                ${isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.6)] scale-110' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}
              `}
              style={{ fontFamily: isRtl ? "'Amiri', serif" : "inherit" }}
            >
              {word.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}
