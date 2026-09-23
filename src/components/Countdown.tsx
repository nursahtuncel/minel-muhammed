import React, { useState, useEffect } from 'react';
import { Calendar, Heart, Clock } from 'lucide-react';

interface CountdownProps {
  targetDate: string; // ISO string e.g. 2026-10-31T13:00:00
}

export const Countdown: React.FC<CountdownProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculate = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Google Calendar link for 31 October 2026 13:00 - 17:00 (Istanbul Time UTC+3)
  // Format: YYYYMMDDTHHMMSSZ (13:00 Istanbul = 10:00 UTC)
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Minel+%26+Muhammed+D%C3%BC%C4%9F%C3%BCn+Merasimi&dates=20261031T100000Z/20261031T140000Z&details=Minel+%C5%9Eevval+G%C3%B6z%C3%BCkara+%26+Muhammed+%C5%9Eamil+Ku%C5%9F+D%C3%BC%C4%9F%C3%BCn+Merasimi.+Mutlulu%C4%9Fumuza+ortak+olman%C4%B1z+dile%C4%9Fiyle.&location=Besa+Albatros+Davet+%26+Balo+Merkezi%2C+%C3%87avu%C5%9Fo%C4%9Flu%2C+Yakac%C4%B1k+Cd.+No%3A+131%2F1%2C+34873+Kartal%2F%C4%B0stanbul`;

  return (
    <div className="w-full max-w-md mx-auto my-6 px-4">
      <div className="flex items-center justify-center gap-2 mb-3 text-xs tracking-widest uppercase font-semibold text-[#8C6B28]">
        <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
        <span>Büyük Güne Kalan Süre</span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {[
          { label: 'Gün', value: timeLeft.days },
          { label: 'Saat', value: timeLeft.hours },
          { label: 'Dakika', value: timeLeft.minutes },
          { label: 'Saniye', value: timeLeft.seconds },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#E5D7B7] shadow-sm relative overflow-hidden"
          >
            {/* Top gold line shine */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#DAA520] to-transparent" />
            <span className="font-serif-title text-2xl sm:text-3xl font-bold text-[#5A3E2B]">
              {String(item.value).padStart(2, '0')}
            </span>
            <span className="text-[11px] font-medium tracking-wider text-[#8A7568] uppercase mt-0.5">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="text-center mt-5">
        <a
          href={googleCalendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95"
        >
          <Calendar className="w-4 h-4 text-[#FFF9E6]" />
          <span>Google Takvime Ekle</span>
        </a>
      </div>
    </div>
  );
};
