import { useState, useEffect } from 'react';

export function useOfflineAudio() {
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkDownloadedFiles();
  }, []);

  const checkDownloadedFiles = async () => {
    try {
      const cache = await caches.open('quran-audio');
      const keys = await cache.keys();
      setDownloadedFiles(keys.map(request => request.url));
    } catch (error) {
      console.error('Error checking downloaded files:', error);
    }
  };

  const downloadAudio = async (url: string) => {
    if (!url) return false;
    
    setIsDownloading(prev => ({ ...prev, [url]: true }));
    try {
      const cache = await caches.open('quran-audio');
      await cache.add(url);
      setDownloadedFiles(prev => [...prev, url]);
      return true;
    } catch (error) {
      console.error('Error downloading audio:', error);
      return false;
    } finally {
      setIsDownloading(prev => ({ ...prev, [url]: false }));
    }
  };

  const removeAudio = async (url: string) => {
    if (!url) return false;
    
    try {
      const cache = await caches.open('quran-audio');
      await cache.delete(url);
      setDownloadedFiles(prev => prev.filter(u => u !== url));
      return true;
    } catch (error) {
      console.error('Error removing audio:', error);
      return false;
    }
  };

  const isDownloaded = (url: string) => {
    return downloadedFiles.includes(url);
  };

  return {
    downloadedFiles,
    isDownloading,
    downloadAudio,
    removeAudio,
    isDownloaded
  };
}
