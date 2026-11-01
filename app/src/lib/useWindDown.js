import { useEffect, useState } from 'react';

// Which stage of the night it is, by this device's own local clock.
export function windDownStage(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 23 * 60 || minutes < 5 * 60) return 'deep';
  if (minutes >= 21 * 60 + 30 || minutes < 7 * 60) return 'dusk';
  return 'off';
}

// Dims and warms the whole interface late at night, on each person's own clock.
export default function useWindDown() {
  const [stage, setStage] = useState(() => windDownStage());

  useEffect(() => {
    const tick = () => setStage(windDownStage());
    const id = window.setInterval(tick, 60000);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (stage === 'off') root.removeAttribute('data-wind-down');
    else root.setAttribute('data-wind-down', stage);
    return () => root.removeAttribute('data-wind-down');
  }, [stage]);

  return stage;
}