export interface WeddingSettings {
  brideName: string;
  brideFullName: string;
  groomName: string;
  groomFullName: string;
  brideFamily: string; // "...'ın kızı"
  groomFamily: string; // "...'ın oğlu"
  weddingDate: string; // ISO or human string e.g. "2026-10-31T13:00:00"
  hennaDate: string;   // "2026-10-28T13:30:00"
  invitationTitle: string;
  invitationText: string;
  musicUrl: string;
  rsvpDeadline: string; // "2026-10-20"
  rsvpEnabled: boolean;
  messagesRequireApproval: boolean;
  contactPhone: string;
  contactWhatsapp: string;
  parkingInfo: string;
  ibanInfo: string;
  ibanName: string;
  showGiftSection: boolean;
  ourStory: string;
  bridePhotoUrl: string;
  groomPhotoUrl: string;
  couplePhotoUrl: string;
  gallery: string[];
  hennaVenueName: string;
  hennaVenueAddress: string;
  hennaMapUrl: string;
  weddingVenueName: string;
  weddingVenueAddress: string;
  weddingMapUrl: string;
  weddingConvoyTime: string;
  whatsappInviteTemplate?: string;
  whatsappReminderTemplate?: string;
  customDomainUrl?: string; // Örn: "https://minelvemuhammed.com" veya "https://tinyurl.com/minelvemuhammed"
}

export interface RSVPItem {
  id?: string;
  fullName: string;
  attendance: 'attending' | 'not_attending' | 'undecided';
  eventChoice: 'both' | 'wedding' | 'henna';
  adultCount: number;
  childCount: number;
  phone?: string;
  message?: string;
  createdAt: string;
  guestSlug?: string;
}

export interface GuestItem {
  id?: string;
  name: string;
  phone?: string;
  category?: string; // "Gelin Ailesi", "Damat Ailesi", "Arkadaşlar", vb.
  hasResponded?: boolean;
  responseStatus?: string;
  notes?: string;
  createdAt: string;
}

export interface MessageItem {
  id?: string;
  fullName: string;
  message: string;
  status: 'approved' | 'pending' | 'hidden';
  createdAt: string;
}

export const DEFAULT_SETTINGS: WeddingSettings = {
  brideName: "Minel",
  brideFullName: "Minel Şevval Gözükara",
  groomName: "Muhammed",
  groomFullName: "Muhammed Şamil Kuş",
  brideFamily: "Fatma & Ahmet Gözükara'nın kızı",
  groomFamily: "Ayşe & Mehmet Kuş'un oğlu",
  weddingDate: "2026-10-31T13:00:00",
  hennaDate: "2026-10-28T13:30:00",
  invitationTitle: "Düğün Davetiyesi",
  invitationText: "Kalpleri birleştirenin Allah olduğuna inanarak, bir ömür aynı yolda yürümeye, aynı duaya \"Âmin\" demeye niyet ettik. Bu niyetimizi bir yuva ile taçlandıracağımız bu güzel günümüzde mutluluğumuzu paylaşmanız ve dualarınızla bizlere eşlik etmeniz dileğiyle… Minel & Muhammed",
  musicUrl: "", // Kullanıcı admin panelinden Maşallah mp3 linkini veya dosyasını girecektir
  rsvpDeadline: "2026-10-25",
  rsvpEnabled: true,
  messagesRequireApproval: false, // Varsayılan otomatik yayın
  contactPhone: "+90 555 000 00 00",
  contactWhatsapp: "905550000000",
  parkingInfo: "Mekân bünyesinde ücretsiz açık ve kapalı vale/otopark hizmeti mevcuttur.",
  ibanInfo: "TR00 0000 0000 0000 0000 0000 00",
  ibanName: "Minel Şevval & Muhammed Şamil",
  showGiftSection: false,
  ourStory: "",
  bridePhotoUrl: "",
  groomPhotoUrl: "",
  couplePhotoUrl: "",
  gallery: [],
  hennaVenueName: "Hüdaverdi Mescidi (Bodrum Mescid, yeşil kapı)",
  hennaVenueAddress: "Bahçelievler / Soğanlı Mahallesi, Hüdaverdi Sokak, Fettahoğlu Apt. No:28",
  hennaMapUrl: "https://maps.google.com/?q=41.009342,28.853327",
  weddingVenueName: "Besa Albatros Davet & Balo Merkezi",
  weddingVenueAddress: "Çavuşoğlu, Yakacık Cd. No: 131/1, 34873 Kartal / İstanbul",
  weddingMapUrl: "https://maps.app.goo.gl/cCL8LALS6rrJLCHH6?g_st=ic",
  weddingConvoyTime: "11:30",
  whatsappInviteTemplate: "Sayın {davetli},\n\nMinel Şevval & Muhammed Şamil çiftimizin düğün ve kına merasimine davetlisiniz. Bu mutlu günümüzde sizleri de aramızda görmekten onur duyarız.\n\nDavetiyenizi görüntülemek ve katılım durumunuzu (LCV) bildirmek için lütfen bağlantıya tıklayınız:\n{link}",
  whatsappReminderTemplate: "Sayın {davetli},\n\n31 Ekim 2026 tarihindeki düğün merasimimiz için hazırlıklarımızı tamamlamak üzereyiz. Katılım durumunuzu (LCV) henüz bildirmediyseniz lütfen aşağıdaki bağlantı üzerinden yanıtlayınız:\n{link}",
  customDomainUrl: ""
};
