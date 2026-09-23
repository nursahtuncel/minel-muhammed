import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, ADMIN_EMAIL } from './firebase';
import { WeddingSettings, DEFAULT_SETTINGS } from './types';
import { InvitationView } from './components/InvitationView';
import { AdminPanel } from './components/AdminPanel';
import { Lock, Sparkles, AlertCircle, ShieldAlert, LogOut } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<WeddingSettings>(DEFAULT_SETTINGS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>('');

  // 1. URL search params parsing (?to=... or ?davetli=...)
  const [guestName, setGuestName] = useState<string>('Değerli Misafirimiz');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toParam = params.get('to') || params.get('davetli');
    if (toParam) {
      setGuestName(toParam.trim());
    }

    // Check if initial URL is /admin or ?admin=true or hash #admin
    if (
      window.location.pathname.includes('/admin') ||
      params.get('admin') === 'true' ||
      window.location.hash === '#admin'
    ) {
      setIsAdminRoute(true);
    }
  }, []);

  // 2. Fetch site settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'general');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as WeddingSettings) });
        } else {
          // If first time initialization, write default settings
          try {
            await setDoc(settingsRef, DEFAULT_SETTINGS);
          } catch {
            // Unauthenticated users might not have write access yet, which is safe
          }
        }
      } catch (err) {
        console.warn('Could not fetch settings from Firestore, using defaults:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 3. Monitor Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // 4. Update settings handler
  const handleUpdateSettings = async (newSettings: WeddingSettings) => {
    const settingsRef = doc(db, 'settings', 'general');
    await setDoc(settingsRef, newSettings, { merge: true });
    setSettings(newSettings);
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== ADMIN_EMAIL) {
        setAuthError(
          `Yetkisiz hesap (${result.user.email}). Yalnızca yönetici ${ADMIN_EMAIL} erişebilir.`
        );
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setAuthError('Giriş işlemi tamamlanamadı veya iptal edildi.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <p className="font-serif-title text-[#5C4533] text-lg font-semibold tracking-wider">
          Davetiye Hazırlanıyor...
        </p>
      </div>
    );
  }

  // If in admin mode
  if (isAdminRoute) {
    const isAuthorizedAdmin =
      currentUser && currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // 1. If not logged in at all, show login screen
    if (!currentUser) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-md p-8 rounded-3xl border border-[#E7D6B8] shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#FAF3E5] border border-[#E9DCBF] text-[#AA771C] flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-semibold tracking-widest text-[#B38728] uppercase">
                Yönetici Girişi
              </span>
              <h2 className="font-serif-title text-2xl sm:text-3xl text-[#4A3324] font-bold mt-1">
                Gelin & Damat Paneli
              </h2>
              <p className="text-xs text-[#7D6657] mt-1.5 leading-relaxed">
                Katılım cevaplarını (LCV), davetli listesini ve davetiye ayarlarını yönetmek için Google hesabınızla giriş yapınız.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-4 rounded-2xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google ile Giriş Yap</span>
            </button>

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsAdminRoute(false);
                  window.history.pushState({}, '', window.location.pathname.replace('/admin', '') || '/');
                }}
                className="text-xs text-[#8C6B28] hover:underline cursor-pointer"
              >
                ← Davetiye Görünümüne Geri Dön
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. If logged in with an unauthorized Google account, block access completely!
    if (!isAuthorizedAdmin) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-md p-8 rounded-3xl border border-rose-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-semibold tracking-widest text-rose-600 uppercase">
                Erişim Reddedildi
              </span>
              <h2 className="font-serif-title text-2xl sm:text-3xl text-[#4A3324] font-bold mt-1">
                Yetkisiz Hesap
              </h2>
              <p className="text-xs text-[#7D6657] mt-2 leading-relaxed">
                Şu anda <strong className="text-rose-700">{currentUser.email}</strong> hesabıyla giriş yaptınız. Bu admin paneli yalnızca yetkili yönetici (<strong className="text-[#8C6212]">{ADMIN_EMAIL}</strong>) erişimine açıktır.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF5E8] border border-[#EBDCBF] text-xs text-[#6B503B] text-left space-y-1">
              <p className="font-semibold text-[#8C6212]">🛡️ Güvenlik Koruması:</p>
              <p>Yalnızca düğün sahibinin Google hesabı katılım verilerini ve ayarları görebilir ve düzenleyebilir.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={async () => {
                  await signOut(auth);
                  handleGoogleSignIn();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#8C6212] hover:bg-[#724F0D] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Farklı Google Hesabı ile Giriş Yap</span>
              </button>

              <button
                onClick={() => {
                  setIsAdminRoute(false);
                  window.history.pushState({}, '', window.location.pathname.replace('/admin', '') || '/');
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all cursor-pointer"
              >
                Davetiye Görünümüne Geri Dön
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 3. Authorized Admin: Render panel
    return (
      <AdminPanel
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        currentUser={currentUser}
        onBackToInvitation={() => {
          setIsAdminRoute(false);
          window.history.pushState({}, '', window.location.pathname.replace('/admin', '') || '/');
        }}
      />
    );
  }

  // Public Invitation View
  return (
    <InvitationView
      settings={settings}
      guestName={guestName}
      onOpenAdmin={() => {
        setIsAdminRoute(true);
        window.history.pushState({}, '', '#admin');
      }}
    />
  );
}
