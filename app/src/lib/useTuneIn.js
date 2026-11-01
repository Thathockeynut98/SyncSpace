import { useEffect, useState } from 'react';
import { getTuneInState, subscribeTuneIn } from '@/lib/tuneinPlayer';
import { getFavorites, subscribeFavorites } from '@/lib/stationFavorites';

export function useTuneInPlayer() {
  const [state, setState] = useState(getTuneInState);

  useEffect(() => subscribeTuneIn(setState), []);

  return state;
}

export function useStationFavorites() {
  const [favorites, setFavorites] = useState(getFavorites);

  useEffect(() => subscribeFavorites(setFavorites), []);

  return favorites;
}