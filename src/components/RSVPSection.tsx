import React, { useState } from 'react';
import { Sparkles, Send, CheckCircle, Heart, User, Phone, Users, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { WeddingSettings } from '../types';

interface RSVPProps {
  settings: WeddingSettings;
  guestNameFromUrl: string;
}

export const RSVPSection: React.FC<RSVPProps> = ({ settings, guestNameFromUrl }) => {
  const [fullName, setFullName] = useState(guestNameFromUrl || '');
  const [attendance, setAttendance] = useState<'attending' | 'not_attending' | 'undecided'>('attending');
  const [eventChoice, setEventChoice] = useState<'both' | 'wedding' | 'henna'>('both');
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-bot honeypot field

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if deadline passed
  const isDeadlinePassed = settings.rsvpDeadline && new Date().toISOString().split('T')[0] > settings.rsvpDeadline;

  // Simple profanity / spam filter
  const cleanFilter = (text: string) => {
    const forbidden = ['casino', 'viagra', 'sex', 'crypto', 'kumar', 'bahis', 'porno'];
    const lower = text.toLowerCase();
    return forbidden.some(word => lower.includes(word));
  };

  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F472B6', '#FDE047', '#FAF7F2', '#AA771C']
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#D4AF37', '#F472B6', '#F59E0B']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#D4AF37', '#F472B6', '#F59E0B']
        });
      }, 250);
    } catch {
      // Fallback if canvas-confetti is not loaded
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Silent bot rejection
    setErrorMsg('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Lütfen adınızı ve soyadınızı belirtiniz.');
      return;
    }

    if (cleanFilter(fullName) || (message && cleanFilter(message))) {
      setErrorMsg('Lütfen saygılı ve uygun bir dil kullanınız.');
      return;
    }

    // Check rate limit in sessionStorage
    const lastSubmitTime = sessionStorage.getItem('last_rsvp_submission');
    if (lastSubmitTime && Date.now() - parseInt(lastSubmitTime, 10) < 15000) {
      setErrorMsg('Lütfen kısa süre arayla tekrar tekrar göndermeyiniz.');
      return;
    }

    setSubmitting(true);

    try {
      const nowIso = new Date().toISOString();

      // 1. Save RSVP record
      await addDoc(collection(db, 'rsvps'), {
        fullName: fullName.trim(),
        attendance,
        eventChoice: attendance === 'attending' ? eventChoice : 'both',
        adultCount: attendance === 'attending' ? Number(adultCount) : 0,
        childCount: attendance === 'attending' ? Number(childCount) : 0,
        phone: phone.trim() || '',
        message: message.trim() || '',
        createdAt: nowIso,
        guestSlug: guestNameFromUrl || '',
      });

      // 2. If guest left a blessing/congratulations message, post to messages collection
      if (message.trim()) {
        await addDoc(collection(db, 'messages'), {
          fullName: fullName.trim(),
          message: message.trim().slice(0, 500),
          status: settings.messagesRequireApproval ? 'pending' : 'approved',
          createdAt: nowIso,
        });
      }

      sessionStorage.setItem('last_rsvp_submission', Date.now().toString());
      setSubmitted(true);
      if (attendance === 'attending') {
        fireCelebration();
      }
    } catch (err: any) {
      console.error('RSVP submission error:', err);
      setErrorMsg('Bir aksilik meydana geldi. Lütfen tekrar deneyiniz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!settings.rsvpEnabled) {
    return (
      <div className="text-center p-8 bg-white/60 rounded-3xl border border-[#E8DCC4] max-w-lg mx-auto shadow-sm">
        <p className="text-[#6D5240] font-serif-title text-xl">
          Katılım bildirim süreci şu anda kapalıdır.
        </p>
      </div>
    );
  }

  if (isDeadlinePassed) {
    return (
      <div className="text-center p-8 bg-white/60 rounded-3xl border border-[#E8DCC4] max-w-lg mx-auto shadow-sm">
        <ShieldAlert className="w-10 h-10 mx-auto text-[#AA771C] mb-3" />
        <h4 className="font-serif-title text-xl text-[#4A3324] mb-1">Son Katılım Bildirim Tarihi Doldu</h4>
        <p className="text-sm text-[#7D6657]">
          Son bildirim tarihi olan {settings.rsvpDeadline} geride kalmıştır. Bilgi veya özel durum için bizimle doğrudan iletişime geçebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div id="katilim-formu" className="w-full max-w-xl mx-auto px-4">
      {submitted ? (
        <div className="p-8 rounded-3xl bg-gradient-to-b from-white/90 to-[#FAF7F2] border border-[#D4AF37] shadow-lg text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#C59B27] to-[#FBF5B7] text-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle className="w-9 h-9 text-[#45300B]" />
          </div>
          <h3 className="font-serif-title text-2xl sm:text-3xl text-[#4A3324] font-semibold">
            Cevabınız Alındı
          </h3>
          <p className="text-[#6E5544] text-sm sm:text-base leading-relaxed">
            {attendance === 'attending' ? (
              <>
                Sevgili <strong>{fullName}</strong>, bu en mutlu günümüzde sizleri yanımızda görmekten büyük onur ve mutluluk duyacağız!
              </>
            ) : attendance === 'not_attending' ? (
              <>
                Cevabınızı aldık. Yanımızda olamasanız da güzel dualarınızın bizimle olduğunu biliyoruz, teşekkür ederiz.
              </>
            ) : (
              <>
                Cevabınız kaydedildi. Durumunuz netleştiğinde tekrar bize haber verebilirsiniz.
              </>
            )}
          </p>
          {message.trim() && (
            <div className="mt-4 p-4 rounded-2xl bg-[#FAF4EA] border border-[#EADCC0] text-xs sm:text-sm text-[#5C4533] italic">
              "{message}"
            </div>
          )}
          <button
            onClick={() => setSubmitted(false)}
            className="text-xs text-[#9B7013] hover:underline font-semibold pt-2 inline-block"
          >
            Bilgileri Güncelle / Yeni Yanıt Ver
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-md border border-[#E7D6B8] shadow-xl relative overflow-hidden"
        >
          {/* Ornate corner highlight */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#DAA520]/15 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#F472B6]/10 to-transparent pointer-events-none" />

          {/* Honeypot field (hidden from real users, caught if bot fills) */}
          <div style={{ display: 'none' }}>
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="text-center mb-6">
            <span className="text-xs font-semibold tracking-widest text-[#B38728] uppercase">
              LCV / Katılım Durumu
            </span>
            <h3 className="font-serif-title text-2xl sm:text-3xl text-[#4A3324] mt-1 font-semibold">
              Katılımınızı Bildiriniz
            </h3>
            <p className="text-xs sm:text-sm text-[#7D6657] mt-1">
              Gerekli hazırlıkları kusursuz yapabilmemiz adına lütfen en geç{' '}
              <strong className="text-[#8C6212]">{settings.rsvpDeadline || '25 Ekim 2026'}</strong> tarihine kadar yanıtlayınız.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#5A4130] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#B38728]" />
              Adınız & Soyadınız <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Ayşe & Mehmet Yılmaz"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#DECDB0] bg-white/90 focus:outline-none focus:ring-2 focus:ring-[#C59B27] text-sm text-[#3E2B1E] placeholder:text-[#AFA297]"
            />
          </div>

          {/* Attendance choice */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#5A4130] uppercase tracking-wider mb-2">
              Katılım Durumunuz <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'attending', label: 'Katılacağım 🎉' },
                { id: 'not_attending', label: 'Katılamayacağım 💐' },
                { id: 'undecided', label: 'Kararsızım 🤔' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setAttendance(item.id as any)}
                  className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all text-center ${
                    attendance === item.id
                      ? 'bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#B38728] text-white border-transparent shadow-sm'
                      : 'bg-[#FAF8F5] border-[#E8DCC4] text-[#634E3E] hover:border-[#C59B27]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* If Attending, select Event and counts */}
          {attendance === 'attending' && (
            <div className="space-y-4 p-4 rounded-2xl bg-[#FAF5EC]/80 border border-[#E9DCB8] my-4 animate-in fade-in duration-300">
              {/* Which event */}
              <div>
                <label className="block text-xs font-semibold text-[#5A4130] uppercase tracking-wider mb-1.5">
                  Hangi Merasime Katılacaksınız?
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'both', label: 'İkisine de 🌸💍' },
                    { id: 'wedding', label: 'Sadece Düğün 💍' },
                    { id: 'henna', label: 'Sadece Kına 🌸' },
                  ].map((evt) => (
                    <button
                      type="button"
                      key={evt.id}
                      onClick={() => setEventChoice(evt.id as any)}
                      className={`py-2 px-1 rounded-lg border font-medium text-center ${
                        eventChoice === evt.id
                          ? 'bg-[#5C4533] text-white border-[#5C4533]'
                          : 'bg-white border-[#D6C4A6] text-[#6E5746]'
                      }`}
                    >
                      {evt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guest Counts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5A4130] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#B38728]" />
                    Yetişkin Sayısı
                  </label>
                  <select
                    value={adultCount}
                    onChange={(e) => setAdultCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#DECDB0] bg-white text-sm text-[#3E2B1E] focus:ring-2 focus:ring-[#C59B27]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} Kişi
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A4130] uppercase tracking-wider mb-1">
                    Çocuk Sayısı
                  </label>
                  <select
                    value={childCount}
                    onChange={(e) => setChildCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#DECDB0] bg-white text-sm text-[#3E2B1E] focus:ring-2 focus:ring-[#C59B27]"
                  >
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? 'Yok' : `${n} Çocuk`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Optional Phone */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#5A4130] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#B38728]" />
              Telefon Numarası <span className="text-[10px] text-[#9E8B7D] lowercase">(isteğe bağlı)</span>
            </label>
            <input
              type="tel"
              placeholder="05XX XXX XX XX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#DECDB0] bg-white/90 text-sm text-[#3E2B1E] placeholder:text-[#AFA297] focus:ring-2 focus:ring-[#C59B27]"
            />
          </div>

          {/* Congratulations / Prayers message */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-[#5A4130] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#E11D48]" />
                Tebrik & Dua Mesajınız
              </span>
              <span className="text-[10px] text-[#A69485]">
                {message.length}/500
              </span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Çiftimize iletmek istediğiniz güzel dilekleriniz ve dualarınız..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#DECDB0] bg-white/90 text-sm text-[#3E2B1E] placeholder:text-[#AFA297] focus:ring-2 focus:ring-[#C59B27]"
            />
            <p className="text-[11px] text-[#8C7768] mt-1">
              ✨ Mesajınız aşağıdaki hatıra ve tebrik duvarında yayınlanacaktır.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all transform active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                İletiliyor...
              </span>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#FFF9E6]" />
                <span>Yanıtı Paylaş</span>
              </>
            )}
          </button>

          {/* KVKK / Privacy notice */}
          <div className="mt-4 text-center">
            <p className="text-[10px] text-[#9A8778] leading-tight">
              Paylaştığınız iletişim bilgileri yalnızca davet organizasyonu ve hatırlatma amacıyla kullanılmakta olup üçüncü şahıslarla paylaşılmaz.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
