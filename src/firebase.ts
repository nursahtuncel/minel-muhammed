/**
 * Minel & Muhammed Düğün Davetiyesi - Firebase Entegrasyonu
 * 
 * -------------------------------------------------------------
 * 🛠️ KURULUM & YÖNETİCİ TALİMATLARI:
 * 1. ADMIN EMAIL:
 *    Aşağıda `ADMIN_EMAIL` sabiti yer almaktadır. Varsayılan olarak
 *    "nursahtuncell@gmail.com" olarak ayarlanmıştır. Farklı bir Google
 *    hesabıyla admin olmak isterseniz aşağıdaki ADMIN_EMAIL değerini ve
 *    /firestore.rules dosyasındaki ilgili e-posta satırını değiştirip
 *    Firebase kurallarını tekrar yayınlayabilirsiniz.
 * 
 * 2. FIRESTORE GÜVENLİK KURALLARI:
 *    `/firestore.rules` dosyası kuralları içerir. Kurallar hazır olarak
 *    deploy edilmiştir. RSVP ve tebrik mesajlarını herkes ekleyebilir;
 *    onaylı tebrikler ve ayarlar herkesçe okunabilir; tüm yönetim ve silme
 *    işlemleri yalnızca ADMIN_EMAIL'e aittir.
 * 
 * 3. VERİLERİ YEDEKLEME:
 *    - Admin panelinde (/admin) yer alan "Katılım Listesi" sekmesinden
 *      "CSV Olarak İndir" butonuna tıklayarak tüm RSVP verilerini anında
 *      Excel/CSV formatında bilgisayarınıza yedekleyebilirsiniz.
 *    - "Tebrik Mesajları" sekmesinden "Hatıra Defterini İndir" ile
 *      gelen tüm güzel duaları ve mesajları metin/JSON olarak arşivleyebilirsiniz.
 *    - Firebase konsolundan (Cloud Firestore > İçe/Dışa Aktarma) Google Cloud
 *      Storage üzerine otomatik tam veritabanı yedeği alabilirsiniz.
 * -------------------------------------------------------------
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import configData from '../firebase-applet-config.json';

// Admin e-postası (Bunu dilediğiniz Google hesabıyla güncelleyebilirsiniz)
export const ADMIN_EMAIL = 'nursahtuncell@gmail.com';

const firebaseConfig = {
  apiKey: configData.apiKey,
  authDomain: configData.authDomain,
  projectId: configData.projectId,
  storageBucket: configData.storageBucket,
  messagingSenderId: configData.messagingSenderId,
  appId: configData.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// AI Studio custom firestore databaseId handling
export const db = configData.firestoreDatabaseId && configData.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, configData.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
