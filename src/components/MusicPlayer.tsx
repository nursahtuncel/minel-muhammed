import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, Music2, AlertCircle } from 'lucide-react';
import { DEFAULT_WEDDING_MUSIC, normalizeAudioUrl } from '../utils/musicHelper';

export { DEFAULT_WEDDING_MUSIC };

export interface MusicPlayerRef {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  isPlaying: boolean;
}

interface MusicPlayerProps {
  musicUrl?: string;
  autoPlayTrigger?: boolean;
}

export const MusicPlayer = forwardRef<MusicPlayerRef, MusicPlayerProps>(
  ({ musicUrl, autoPlayTrigger }, ref) => {
    const initialUrl = normalizeAudioUrl(musicUrl);
    const [currentAudioUrl, setCurrentAudioUrl] = useState<string>(initialUrl);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [audioReady, setAudioReady] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initial gentle ambient volume
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = 0.45;
      }
    }, []);

    // Update active URL when prop changes
    useEffect(() => {
      const normalized = normalizeAudioUrl(musicUrl);
      setCurrentAudioUrl(normalized);
      setHasError(false);
      setAudioReady(false);

      if (audioRef.current) {
        const wasPlaying = isPlaying;
        audioRef.current.src = normalized;
        audioRef.current.load();
        if (wasPlaying) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }
    }, [musicUrl]);

    // Handle autoPlayTrigger (e.g. from "Davetiyeyi Aç" button click)
    useEffect(() => {
      if (autoPlayTrigger && audioRef.current && !isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setHasError(false);
            })
            .catch((err) => {
              console.log('Autoplay blocked by browser or format issue:', err);
              // Fallback to default if current audio was custom and failed
              if (currentAudioUrl !== DEFAULT_WEDDING_MUSIC) {
                console.warn('Falling back to default wedding music...');
                setCurrentAudioUrl(DEFAULT_WEDDING_MUSIC);
                if (audioRef.current) {
                  audioRef.current.src = DEFAULT_WEDDING_MUSIC;
                  audioRef.current.load();
                  audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                }
              }
            });
        }
      }
    }, [autoPlayTrigger]);

    // Audio error handler: if custom URL fails (e.g. invalid format or webpage link), fall back safely!
    const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      console.warn('Audio playback error on source:', currentAudioUrl, e);
      if (currentAudioUrl !== DEFAULT_WEDDING_MUSIC) {
        console.info('Switching to default wedding music fallback so player never fails.');
        setHasError(false);
        setCurrentAudioUrl(DEFAULT_WEDDING_MUSIC);
        if (audioRef.current) {
          audioRef.current.src = DEFAULT_WEDDING_MUSIC;
          audioRef.current.load();
          if (isPlaying || autoPlayTrigger) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }
      } else {
        setHasError(true);
        setIsPlaying(false);
      }
    };

    const playMusic = () => {
      if (!audioRef.current) return;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.warn('Audio play request error:', err);
          if (currentAudioUrl !== DEFAULT_WEDDING_MUSIC) {
            setCurrentAudioUrl(DEFAULT_WEDDING_MUSIC);
            if (audioRef.current) {
              audioRef.current.src = DEFAULT_WEDDING_MUSIC;
              audioRef.current.load();
              audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          }
        });
    };

    const pauseMusic = () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      setIsPlaying(false);
    };

    const toggleMusic = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
        pauseMusic();
      } else {
        playMusic();
      }
    };

    useImperativeHandle(ref, () => ({
      play: playMusic,
      pause: pauseMusic,
      toggle: toggleMusic,
      isPlaying,
    }));

    return (
      <div className="fixed bottom-24 right-4 sm:bottom-24 sm:right-6 z-[70] flex items-center gap-2 select-none">
        {/* Continuous loop audio element with robust fallback */}
        <audio
          ref={audioRef}
          src={currentAudioUrl}
          loop
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onCanPlay={() => setAudioReady(true)}
          onError={handleAudioError}
        />

        {/* Floating Music Notes Animation when playing */}
        {isPlaying && (
          <div className="pointer-events-none absolute -top-8 right-3 flex gap-2">
            <span
              className="text-sm text-[#C59B27] animate-bounce"
              style={{ animationDuration: '2s' }}
            >
              ♪
            </span>
            <span
              className="text-base text-[#DFBA52] animate-bounce"
              style={{ animationDuration: '1.4s', animationDelay: '0.3s' }}
            >
              ♫
            </span>
          </div>
        )}

        {/* Bilgilendirici Mini Etiket (Müziği Durdur / Müziği Çal) */}
        <button
          onClick={toggleMusic}
          type="button"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/85 hover:bg-neutral-900 text-[#FAF5E8] text-xs font-medium backdrop-blur-md shadow-lg border border-[#D4AF37]/40 transition-all hover:scale-105 cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
              <span>Müziği Durdur</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
              <span>Müziği Çal</span>
            </>
          )}
        </button>

        {/* Plak Butonu (Dönen Plak & Oynat/Durdur) */}
        <button
          onClick={toggleMusic}
          type="button"
          aria-label={isPlaying ? 'Müziği Durdur' : 'Müziği Başlat'}
          title={isPlaying ? 'Müziği Durdurmak İçin Tıklayın' : 'Müziği Başlatmak İçin Tıklayın'}
          className={`relative group flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 transform active:scale-95 shadow-2xl border-2 border-[#D4AF37] cursor-pointer ${
            isPlaying
              ? 'shadow-amber-400/50 ring-2 ring-[#E5C158] ring-offset-2 ring-offset-[#FAF7F2]'
              : 'hover:border-[#AA771C]'
          }`}
          style={{
            background: 'radial-gradient(circle, #2A2A2A 0%, #171717 65%, #0F0F0F 100%)',
          }}
        >
          {/* Dönen Plak Gövdesi */}
          <div
            className={`w-full h-full rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-700 ${
              isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
            }`}
          >
            {/* Vinil Çizgileri */}
            <div className="absolute inset-1 rounded-full border border-neutral-700/60 pointer-events-none" />
            <div className="absolute inset-2.5 rounded-full border border-neutral-700/80 pointer-events-none" />
            <div className="absolute inset-4 rounded-full border border-neutral-600/70 pointer-events-none" />

            {/* Vinil Işık Yansıması */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none opacity-25"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, rgba(255,255,255,0.1) 60%, transparent 100%)',
              }}
            />

            {/* Altın Orta Göbek Etiketi */}
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#8A6318] via-[#FBF5B7] to-[#C59B27] flex items-center justify-center shadow-inner relative z-10">
              {/* Plak Mil Deliği */}
              <div className="w-1.5 h-1.5 rounded-full bg-[#171717]" />
            </div>
          </div>

          {/* Duraklatılmışsa Play İkonu; Çalıyorsa Üzerine Gelindiğinde veya Tıklamada Pause İkonu */}
          {!isPlaying ? (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-[1px] transition-opacity">
              <Play className="w-5 h-5 text-[#FAF5E8] fill-[#FAF5E8] translate-x-0.5 drop-shadow-md" />
            </div>
          ) : (
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[0.5px]">
              <Pause className="w-5 h-5 text-white fill-white drop-shadow-md" />
            </div>
          )}

          {/* Mini Durum Rozeti (Sağ Alt Köşe) - Çalıyorsa Durdurma İkonu, Duruyorsa Müzik Notası */}
          <div
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border flex items-center justify-center shadow-md transition-all ${
              isPlaying
                ? 'bg-amber-600 border-[#FBF5B7] animate-pulse'
                : 'bg-[#8C6524] border-[#FBF5B7]'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-2.5 h-2.5 text-white fill-white" />
            ) : (
              <Music2 className="w-2.5 h-2.5 text-white" />
            )}
          </div>
        </button>
      </div>
    );
  }
);
