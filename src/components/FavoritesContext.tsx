import React, { createContext, useContext, useState, useEffect } from 'react';

interface FavoritesContextType {
  favoriteRadios: string[];
  toggleFavoriteRadio: (id: string) => void;
  favoriteSurahs: number[];
  toggleFavoriteSurah: (id: number) => void;
  favoriteReciters: string[];
  toggleFavoriteReciter: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteRadios, setFavoriteRadios] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('favRadios') || '[]'); } catch { return []; }
  });
  const [favoriteSurahs, setFavoriteSurahs] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('favSurahs') || '[]'); } catch { return []; }
  });
  const [favoriteReciters, setFavoriteReciters] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('favReciters') || '[]'); } catch { return []; }
  });

  useEffect(() => localStorage.setItem('favRadios', JSON.stringify(favoriteRadios)), [favoriteRadios]);
  useEffect(() => localStorage.setItem('favSurahs', JSON.stringify(favoriteSurahs)), [favoriteSurahs]);
  useEffect(() => localStorage.setItem('favReciters', JSON.stringify(favoriteReciters)), [favoriteReciters]);

  const toggleFavoriteRadio = (id: string) => setFavoriteRadios(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleFavoriteSurah = (id: number) => setFavoriteSurahs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleFavoriteReciter = (id: string) => setFavoriteReciters(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <FavoritesContext.Provider value={{ 
      favoriteRadios, toggleFavoriteRadio, 
      favoriteSurahs, toggleFavoriteSurah, 
      favoriteReciters, toggleFavoriteReciter 
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within a FavoritesProvider');
  return context;
};
