import { useEffect, useState } from 'react';
import { getLibraryState, subscribeLibrary } from '@/lib/libraryPlayer';

export function useLibraryPlayer() {
  const [state, setState] = useState(getLibraryState);

  useEffect(() => subscribeLibrary(setState), []);

  return state;
}