# Minel & Muhammed Düğün Davetiyesi & Admin Paneli

Türkçe, mobil öncelikli, zarif ve süslü online nikâh ve düğün davetiyesi web uygulaması.

---

## 🛠️ 1. Yönetici (Admin) Hesabı ve Değiştirme
- Admin paneline Google hesabı ile giriş yapılır.
- Varsayılan olarak yetkili e-posta adresi: **`nursahtuncell@gmail.com`** olarak yapılandırılmıştır.
- Bu adresi değiştirmek istediğinizde yalnızca iki yerde güncellemeniz yeterlidir:
  1. `src/firebase.ts` dosyasında `ADMIN_EMAIL = 'yeni-eposta@gmail.com'` satırı.
  2. `firestore.rules` dosyasında `request.auth.token.email == "yeni-eposta@gmail.com"` satırı.

---

## 🔒 2. Firestore Güvenlik Kuralları
Kurallar projenizde yayına alınmıştır (`firestore.rules`):
- **RSVP (Katılım) & Tebrikler:** Herkes yeni katılım formu ve tebrik gönderebilir (ad, katılım seçimi ve karakter sınırı doğrulanır).
- **Tebrik Duvarı:** Ziyaretçiler sadece `approved` (onaylı) durumundaki mesajları görebilir; diğer mesajlar yalnızca admin tarafından okunabilir.
- **Yönetim & Ayarlar:** Davetli listesi, tüm RSVP detayları ve ayar değişiklikleri yalnızca yetkili admin hesabı tarafından okunabilir ve güncellenebilir.

---

## 💾 3. Verilerin Yedeklenmesi (Backup)
Davetiye ve LCV verilerinizi 3 farklı yolla güvenle yedekleyebilirsiniz:

1. **Excel / CSV Yedeklemesi:**
   - Admin panelinde (`/admin` veya sağ alttaki "Yönetici Girişi") **Katılım Cevapları** sekmesine gidin.
   - **"Excel / CSV İndir"** butonuna basın. Tüm davetlilerin adları, kişi sayıları, tercih ettikleri merasim ve telefonları tek tıkla cihazınıza iner.

2. **Hatıra Defteri Yedeği (TXT):**
   - Admin panelinde **Tebrik Duvarı** sekmesinden **"Hatıra Defteri Olarak İndir (TXT)"** butonuna tıklayarak misafirlerin yazdığı tüm duaları ve tebrikleri metin dosyası olarak arşivleyebilirsiniz.

3. **Firebase Firestore Otomatik Bulut Yedekleme:**
   - Google Cloud / Firebase konsoluna girip *Cloud Firestore* > *İçe / Dışa Aktarma (Export)* özelliğini kullanarak Google Cloud Storage kovasına tam otomatik JSON/Firestore snapshot yedeği alabilirsiniz.

---

## 🎵 4. Arka Plan Müziği Eklemek
- Tarayıcıların otomatik ses çalma kısıtlamalarına tam uyumlu olarak, misafir kapaktaki **"Davetiyeyi Aç"** butonuna tıkladığı anda müzik çalmaya başlar.
- Admin panelindeki **"Site & Merasim Ayarları"** sekmesinden kendi `"Maşallah"` veya tercih ettiğiniz MP3 dosyanızın doğrudan URL bağlantısını girebilirsiniz. Müzik sağ alttaki dönen plak butonuyla misafirler tarafından kolayca durdurulup tekrar açılabilir.

---

## 💌 5. Kişiye Özel Davetiye Bağlantıları
- Misafirinize özel isim yazan davetiye göndermek için: `https://site-adresiniz.com/?to=Ayşe ve Mehmet` veya `?davetli=Ali Yılmaz` bağlantısını paylaşabilirsiniz.
- Admin panelindeki **Davetli Listesi** sekmesinden tek tıkla WhatsApp üzerinden kişiselleştirilmiş hazır davetiye metni gönderebilirsiniz.
