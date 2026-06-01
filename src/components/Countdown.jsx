import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation.jsx';

// Дата дедлайна — поменяйте здесь и она поменяется везде
const DEADLINE = new Date('2027-03-31T23:59:00Z');

function calcTimeLeft() {
  const now = new Date();
  const diff = DEADLINE - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

export default function Countdown() {
  const { t } = useTranslation();
  const [time, setTime] = useState(calcTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="countdown" aria-live="polite">
      <div className="count-item">
        <span className="count-num">{time.days}</span>
        <span className="count-label">{t('opencall.days')}</span>
      </div>
      <div className="count-item">
        <span className="count-num">{pad(time.hours)}</span>
        <span className="count-label">{t('opencall.hours')}</span>
      </div>
      <div className="count-item">
        <span className="count-num">{pad(time.minutes)}</span>
        <span className="count-label">{t('opencall.minutes')}</span>
      </div>
      <div className="count-item">
        <span className="count-num">{pad(time.seconds)}</span>
        <span className="count-label">{t('opencall.seconds')}</span>
      </div>
    </div>
  );
}
