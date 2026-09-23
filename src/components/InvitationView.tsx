import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  Heart,
  Navigation,
  Share2,
  Copy,
  Check,
  Music,
  User,
  Users,
  Info,
  Car,
  Phone,
  Image as ImageIcon,
  BookOpen
} from 'lucide-react';
import { WeddingSettings } from '../types';
import { CornerOrnament, FloralDivider, FloatingParticles } from './Ornaments';
import { Countdown } from './Countdown';
import { RSVPSection } from './RSVPSection';
import { WishesWall } from './WishesWall';
import { GallerySection } from './GallerySection';
import { MusicPlayer, MusicPlayerRef } from './MusicPlayer';

interface InvitationViewProps {
  settings: WeddingSettings;
  guestName: string;
  onOpenAdmin: () => void;
}

export const InvitationView: React.FC<InvitationViewProps> = ({
  settings,
  guestName,
  onOpenAdmin,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [musicTrigger, setMusicTrigger] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [activeTab, setActiveTab] = useState<'kapak' | 'cift' | 'etkinlik' | 'katilim'>('kapak');
  const musicPlayerRef = useRef<MusicPlayerRef | null>(null);

  const handleOpenInvitation = () => {
    setIsOpen(true);
    setMusicTrigger(true);
    musicPlayerRef.current?.play();
    setTimeout(() => {
      const el = document.getElementById('bismillah-bolumu');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 400);
  };

  const copyIban = () => {
    if (!settings.ibanInfo) return;
    navigator.clipboard.writeText(settings.ibanInfo.replace(/\s+/g, ''));
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2500);
  };

  const scrollToSection = (id: string, tab: any) => {
    setActiveTab(tab);
    if (!isOpen) setIsOpen(true);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Google Calendar Links for both events
  const hennaCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Minel+%26+Muhammed+K%C4%B1na+Merasimi&dates=20261028T103000Z/20261028T133000Z&details=Minel+%C5%9Eevval+G%C3%B6z%C3%BCkara+K%C4%B1na+Merasimi&location=H%C3%BCdaverdi+Mescidi%2C+Bah%C3%A7elievler%2C+%C4%B0stanbul`;
  const weddingCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Minel+%26+Muhammed+D%C3%BC%C4%9F%C3%BCn+Merasimi&dates=20261031T100000Z/20261031T140000Z&details=Minel+%C5%9Eevval+G%C3%B6z%C3%BCkara+%26+Muhammed+%C5%9Eamil+Ku%C5%9F+D%C3%BC%C4%9F%C3%BCn+Merasimi&location=Besa+Albatros+Davet+%26+Balo+Merkezi%2C+Kartal%2C+%C4%B0stanbul`;

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-[#2C2420] pb-24 overflow-x-hidden selection:bg-[#EBDDC4]">
      {/* Gentle ambient floating petals & stars */}
      <FloatingParticles />

      {/* Floating Rotating Vinyl Music Player Button */}
      <MusicPlayer
        ref={musicPlayerRef}
        musicUrl={settings.musicUrl}
        autoPlayTrigger={musicTrigger}
      />

      {/* -------------------------------------------------------------
          1. KAPAK EKRANI (Açılış Zarfı & Kapak)
      ------------------------------------------------------------- */}
      <section
        id="kapak-ekrani"
        className={`min-h-screen flex flex-col items-center justify-center relative p-4 transition-all duration-700 ${
          isOpen ? 'bg-[#FAF7F2]' : 'bg-[#FAF6EF]'
        }`}
      >
        {/* Ornate Corner Decorations */}
        <CornerOrnament className="absolute top-2 left-2 text-[#C59B27]" />
        <CornerOrnament className="absolute top-2 right-2 rotate-90 text-[#C59B27]" />
        <CornerOrnament className="absolute bottom-6 left-2 -rotate-90 text-[#C59B27]" />
        <CornerOrnament className="absolute bottom-6 right-2 rotate-180 text-[#C59B27]" />

        {/* Ornate Card Container */}
        <div className="w-full max-w-lg mx-auto text-center p-6 sm:p-10 rounded-3xl bg-white/80 backdrop-blur-md border border-[#DFCDB2] shadow-xl relative overflow-hidden">
          {/* Subtle gold floral watermark */}
          <div className="absolute inset-0 bg-gold-subtle pointer-events-none opacity-40" />

          {/* Subtitle / Header */}
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1 rounded-full border border-[#D4AF37]/50 bg-[#FAF5E8]/80 text-[#8C6B28] text-xs uppercase tracking-widest font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>{settings.invitationTitle || 'Düğün Davetiyesi'}</span>
              <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
            </div>

            {/* Couple Names: High contrast, distinct and beautifully legible */}
            <div className="py-2">
              <h1 className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-4 leading-none">
                <span className="font-script text-5xl sm:text-6xl md:text-7xl text-[#2B1607] font-semibold tracking-normal drop-shadow-[0_1px_2px_rgba(43,22,7,0.2)]">
                  {settings.brideName}
                </span>
                <span className="font-serif-title text-3xl sm:text-4xl text-[#B38728] font-bold italic drop-shadow-xs">
                  &
                </span>
                <span className="font-script text-5xl sm:text-6xl md:text-7xl text-[#2B1607] font-semibold tracking-normal drop-shadow-[0_1px_2px_rgba(43,22,7,0.2)]">
                  {settings.groomName}
                </span>
              </h1>
              <p className="font-serif-title text-xs sm:text-sm tracking-[0.2em] text-[#8C6524] uppercase font-semibold mt-3">
                {settings.brideFullName} • {settings.groomFullName}
              </p>
            </div>

            <FloralDivider />

            {/* Personalized Guest Greeting */}
            <div className="my-5 p-3 rounded-2xl bg-[#FDFBF7] border border-[#E9DDCA] shadow-inner max-w-sm mx-auto">
              <span className="text-[11px] text-[#A38E7E] uppercase tracking-wider block font-medium">
                Özel Davet
              </span>
              <h2 className="font-serif-title text-xl sm:text-2xl text-[#5C4533] font-semibold mt-0.5">
                Sayın {guestName || 'Değerli Misafirimiz'}
              </h2>
            </div>

            {/* Date Tag */}
            <p className="font-serif-title text-lg sm:text-xl text-[#755944] tracking-wider font-semibold">
              31 Ekim 2026 • Cumartesi
            </p>

            {/* "Davetiyeyi Aç" Button */}
            <div className="pt-4">
              {!isOpen ? (
                <button
                  onClick={handleOpenInvitation}
                  className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white font-semibold text-sm tracking-widest uppercase shadow-lg shadow-amber-300/30 hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[#FFF9E6] group-hover:rotate-12 transition-transform" />
                  <span>Davetiyeyi Aç</span>
                  <Sparkles className="w-4 h-4 text-[#FFF9E6] animate-pulse" />
                </button>
              ) : (
                <button
                  onClick={() => scrollToSection('bismillah-bolumu', 'kapak')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-[#D4AF37] bg-[#FAF5EC] text-[#7A5B20] text-xs font-semibold tracking-wide hover:bg-white transition-all"
                >
                  <span>Aşağı Kaydır</span>
                  <span className="animate-bounce">↓</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-[#A18F82] italic pt-2">
              (Davetiyeyi açtığınızda arka planda müzik eşlik edecektir)
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          2. BESMELE + AYET (Birebir)
      ------------------------------------------------------------- */}
      <section id="bismillah-bolumu" className="py-16 px-4 text-center max-w-2xl mx-auto">
        <FloralDivider title="Ayet-i Kerîme" />

        {/* Besmele Calligraphy */}
        <div className="my-6">
          <p className="font-arabic text-3xl sm:text-4xl md:text-5xl text-[#5C4533] leading-relaxed select-none">
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ
          </p>
        </div>

        {/* Ayet Metni */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white/70 backdrop-blur-sm border border-[#E8DCBF] shadow-sm relative my-4">
          <div className="absolute top-2 left-3 font-serif text-3xl text-[#D4AF37]/30">“</div>
          <p className="font-arabic text-2xl sm:text-3xl text-[#4A3324] leading-relaxed mb-4">
            وَأَلَّفَ بَيْنَ قُلُوبِهِمْ
          </p>
          <p className="font-serif-title italic text-lg sm:text-xl text-[#6E5544] leading-relaxed">
            "Allah onların kalplerini birbirine ısındırdı."
          </p>
          <span className="text-xs font-semibold tracking-widest text-[#9C7924] uppercase block mt-2">
            (Enfâl Sûresi, 8/63)
          </span>
          <div className="absolute bottom-2 right-3 font-serif text-3xl text-[#D4AF37]/30">”</div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          3. DAVET METNİ (Birebir)
      ------------------------------------------------------------- */}
      <section className="py-8 px-4 text-center max-w-2xl mx-auto">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-white/90 to-[#FAF5EC] border border-[#E5D7B7] shadow-md relative">
          <CornerOrnament className="absolute top-1 left-1 scale-75 text-[#C59B27]/60" />
          <CornerOrnament className="absolute bottom-1 right-1 rotate-180 scale-75 text-[#C59B27]/60" />

          <p className="font-serif-title text-lg sm:text-xl md:text-2xl text-[#4B3423] leading-relaxed sm:leading-loose">
            {settings.invitationText}
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------
          4. GELİN & DAMAT (Süslü Portre Çerçeveleri & Aileler)
      ------------------------------------------------------------- */}
      <section id="cift-bolumu" className="py-14 px-4 max-w-3xl mx-auto">
        <FloralDivider title="Gelin & Damat" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center mt-6">
          {/* Gelin Kartı */}
          <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-white/80 backdrop-blur-sm border border-[#E7D9BC] shadow-sm relative overflow-hidden group">
            {/* Ornate Circular Frame */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-gradient-to-tr from-[#B38728] via-[#FBF5B7] to-[#DAA520] shadow-md relative mb-4">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#FBF7F0] flex items-center justify-center">
                {settings.bridePhotoUrl ? (
                  <img
                    src={settings.bridePhotoUrl}
                    alt={settings.brideFullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#9E8268]">
                    <User className="w-12 h-12 text-[#C59B27] mb-1" />
                    <span className="font-script text-2xl text-[#8C6B28]">Gelin</span>
                  </div>
                )}
              </div>
            </div>

            <h3 className="font-serif-title text-2xl font-bold text-[#4B3423]">
              {settings.brideFullName}
            </h3>
            {settings.brideFamily && (
              <p className="text-xs sm:text-sm text-[#7D6657] mt-1 italic">
                {settings.brideFamily}
              </p>
            )}
          </div>

          {/* Damat Kartı */}
          <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-white/80 backdrop-blur-sm border border-[#E7D9BC] shadow-sm relative overflow-hidden group">
            {/* Ornate Circular Frame */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-gradient-to-tr from-[#B38728] via-[#FBF5B7] to-[#DAA520] shadow-md relative mb-4">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#FBF7F0] flex items-center justify-center">
                {settings.groomPhotoUrl ? (
                  <img
                    src={settings.groomPhotoUrl}
                    alt={settings.groomFullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#9E8268]">
                    <User className="w-12 h-12 text-[#C59B27] mb-1" />
                    <span className="font-script text-2xl text-[#8C6B28]">Damat</span>
                  </div>
                )}
              </div>
            </div>

            <h3 className="font-serif-title text-2xl font-bold text-[#4B3423]">
              {settings.groomFullName}
            </h3>
            {settings.groomFamily && (
              <p className="text-xs sm:text-sm text-[#7D6657] mt-1 italic">
                {settings.groomFamily}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          5. GERİ SAYIM & TAKVİME EKLE
      ------------------------------------------------------------- */}
      <section className="py-6">
        <Countdown targetDate={settings.weddingDate} />
      </section>

      {/* -------------------------------------------------------------
          6. ETKİNLİKLER (Kına & Düğün Süslü Kartları)
      ------------------------------------------------------------- */}
      <section id="etkinlik-bolumu" className="py-14 px-4 max-w-4xl mx-auto">
        <FloralDivider title="Merasim & Etkinlikler" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Kına Kartı 🌸 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/85 backdrop-blur-md border border-[#E7D6B8] shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-rose-200/40 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-rose-100/70 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-1.5">
                  <span>🌸</span> Kına Merasimi
                </span>
                <span className="text-xs font-semibold text-[#8C6B28]">28 Ekim 2026</span>
              </div>

              <h4 className="font-serif-title text-2xl text-[#4A3324] font-bold mb-2">
                {settings.hennaVenueName}
              </h4>

              <div className="space-y-2 text-xs sm:text-sm text-[#6C5443] mb-6">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                  <span>28 Ekim 2026 Çarşamba • 13:30</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                  <span>{settings.hennaVenueAddress}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4 border-t border-[#EFE5D4]">
              <a
                href={settings.hennaMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-sm hover:shadow active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Yol Tarifi</span>
              </a>
              <a
                href={hennaCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl border border-[#DECDB0] bg-white text-[#634C3C] text-xs font-semibold hover:bg-[#FAF7F2] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-[#B38728] shrink-0" />
                <span className="whitespace-nowrap">Takvime Ekle</span>
              </a>
            </div>
          </div>

          {/* Düğün Kartı 💍 */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/85 backdrop-blur-md border border-[#E7D6B8] shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-200/40 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full bg-amber-100/70 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                  <span>💍</span> Düğün Merasimi
                </span>
                <span className="text-xs font-semibold text-[#8C6B28]">31 Ekim 2026</span>
              </div>

              <h4 className="font-serif-title text-2xl text-[#4A3324] font-bold mb-2">
                {settings.weddingVenueName}
              </h4>

              <div className="space-y-2 text-xs sm:text-sm text-[#6C5443] mb-4">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                  <span>31 Ekim 2026 Cumartesi • 13:00 – 17:00</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                  <span>{settings.weddingVenueAddress}</span>
                </div>
              </div>

              {/* Konvoy saati ek satırı */}
              {settings.weddingConvoyTime && (
                <div className="my-3 p-2.5 rounded-xl bg-[#FAF5E8] border border-[#EADBBF] flex items-center gap-2 text-xs text-[#6B503B] font-medium">
                  <Car className="w-4 h-4 text-[#C59B27]" />
                  <span>
                    🚗 <strong>Konvoy hareket saati:</strong> {settings.weddingConvoyTime}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4 border-t border-[#EFE5D4]">
              <a
                href={settings.weddingMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-sm hover:shadow active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Yol Tarifi</span>
              </a>
              <a
                href={weddingCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl border border-[#DECDB0] bg-white text-[#634C3C] text-xs font-semibold hover:bg-[#FAF7F2] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5 text-[#B38728] shrink-0" />
                <span className="whitespace-nowrap">Takvime Ekle</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          7. GALERİ (Varsa görünür, yoksa gizlenir)
      ------------------------------------------------------------- */}
      <GallerySection images={settings.gallery} />

      {/* -------------------------------------------------------------
          8. HİKÂYEMİZ (Opsiyonel, admin metin girerse görünür)
      ------------------------------------------------------------- */}
      {settings.ourStory && (
        <section className="py-10 px-4 max-w-2xl mx-auto text-center">
          <FloralDivider title="Hikâyemiz" />
          <div className="p-8 rounded-3xl bg-white/75 backdrop-blur-sm border border-[#E6D7B7] shadow-sm relative my-4">
            <p className="text-sm sm:text-base text-[#5A4333] leading-relaxed whitespace-pre-line italic font-serif-title">
              {settings.ourStory}
            </p>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------
          9. HEDİYE / BİLGİ (Opsiyonel, varsayılan kapalı)
      ------------------------------------------------------------- */}
      {settings.showGiftSection && (
        <section className="py-8 px-4 max-w-xl mx-auto">
          <FloralDivider title="Bilgi & Hediye" />
          <div className="space-y-4">
            {/* Otopark Bilgisi */}
            {settings.parkingInfo && (
              <div className="p-4 rounded-2xl bg-white/80 border border-[#E6D8BC] flex items-start gap-3">
                <Car className="w-5 h-5 text-[#C59B27] shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-xs text-[#523A2A] uppercase tracking-wider">
                    Otopark & Vale
                  </h5>
                  <p className="text-xs text-[#705A4A] mt-0.5">{settings.parkingInfo}</p>
                </div>
              </div>
            )}

            {/* İletişim / WhatsApp */}
            {settings.contactPhone && (
              <div className="p-4 rounded-2xl bg-white/80 border border-[#E6D8BC] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-[#C59B27] shrink-0" />
                  <div>
                    <h5 className="font-semibold text-xs text-[#523A2A] uppercase tracking-wider">
                      İletişim
                    </h5>
                    <p className="text-xs text-[#705A4A]">{settings.contactPhone}</p>
                  </div>
                </div>
                {settings.contactWhatsapp && (
                  <a
                    href={`https://wa.me/${settings.contactWhatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            )}

            {/* IBAN Kartı */}
            {settings.ibanInfo && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-white/95 to-[#FAF5EC] border border-[#DECDB0] shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#8C6B28] uppercase tracking-wider">
                    Tebrik & Hediye Hesabı
                  </span>
                  <span className="text-xs font-medium text-[#7D6657]">
                    {settings.ibanName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#EADCBF]">
                  <code className="text-xs font-mono font-bold text-[#4B3423] select-all break-all">
                    {settings.ibanInfo}
                  </code>
                  <button
                    onClick={copyIban}
                    className="p-2 rounded-lg bg-[#FAF5E8] hover:bg-[#F2E8D2] text-[#7A5A1C] transition-all shrink-0 flex items-center gap-1 text-xs font-semibold"
                  >
                    {copiedIban ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------
          10. KATILIM (RSVP) ve TEBRİK FORMU
      ------------------------------------------------------------- */}
      <section id="katilim-bolumu" className="py-14">
        <FloralDivider title="Katılım Bildirimi (LCV)" />
        <RSVPSection settings={settings} guestNameFromUrl={guestName} />
        <WishesWall />
      </section>

      {/* -------------------------------------------------------------
          11. TEŞEKKÜR & WHATSAPP PAYLAŞ
      ------------------------------------------------------------- */}
      <section className="py-12 px-4 text-center max-w-xl mx-auto">
        <FloralDivider />
        <div className="space-y-4 my-4">
          <p className="font-serif-title text-xl sm:text-2xl text-[#4C3423] font-semibold">
            Varlığınızla onur vereceğiniz için şimdiden teşekkür ederiz.
          </p>
          <p className="font-script text-3xl sm:text-4xl text-[#C59B27]">
            Minel & Muhammed
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center">
          <button
            onClick={onOpenAdmin}
            className="text-[11px] text-[#A69485] hover:text-[#5C4533] underline transition-colors"
          >
            Yönetici Girişi (Admin)
          </button>
        </div>
      </section>

      {/* -------------------------------------------------------------
          12. ALT SABİT SEKME MENÜSÜ (İkonlu)
      ------------------------------------------------------------- */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#DECDB0] shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 py-2 px-2 text-center">
          <button
            onClick={() => scrollToSection('kapak-ekrani', 'kapak')}
            className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
              activeTab === 'kapak' ? 'text-[#AA771C] font-bold' : 'text-[#877263]'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Kapak</span>
          </button>

          <button
            onClick={() => scrollToSection('cift-bolumu', 'cift')}
            className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
              activeTab === 'cift' ? 'text-[#AA771C] font-bold' : 'text-[#877263]'
            }`}
          >
            <Heart className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Çift</span>
          </button>

          <button
            onClick={() => scrollToSection('etkinlik-bolumu', 'etkinlik')}
            className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
              activeTab === 'etkinlik' ? 'text-[#AA771C] font-bold' : 'text-[#877263]'
            }`}
          >
            <Calendar className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Etkinlik</span>
          </button>

          <button
            onClick={() => scrollToSection('katilim-bolumu', 'katilim')}
            className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
              activeTab === 'katilim' ? 'text-[#AA771C] font-bold' : 'text-[#877263]'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span className="text-[10px]">Katılım</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
