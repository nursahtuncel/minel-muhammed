import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  Download,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Trash2,
  Save,
  Music,
  Heart,
  Send,
  ExternalLink,
  Filter,
  Check,
  Eye,
  EyeOff,
  Copy,
  Share2,
  FileText,
  AlertCircle,
  Edit3,
  MessageCircle,
  Sparkles as SparklesIcon,
  Upload,
  Play,
  Pause,
  Loader2,
  Link2,
  Globe
} from 'lucide-react';
import {
  DEFAULT_WEDDING_MUSIC,
  PRESET_WEDDING_TRACKS,
  checkNonDirectAudioService,
  normalizeAudioUrl
} from '../utils/musicHelper';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { db, auth, ADMIN_EMAIL } from '../firebase';
import { WeddingSettings, RSVPItem, GuestItem, MessageItem, DEFAULT_SETTINGS } from '../types';

export const normalizeWhatsAppPhone = (rawPhone?: string): string => {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0090')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = '90' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('5')) {
    digits = '90' + digits;
  }
  return digits;
};

export const formatTemplate = (template: string, guestName: string, guestLink: string) => {
  return template
    .replace(/\{davetli\}/gi, guestName)
    .replace(/\{link\}/gi, guestLink);
};

interface AdminPanelProps {
  settings: WeddingSettings;
  onUpdateSettings: (newSettings: WeddingSettings) => Promise<void>;
  currentUser: User;
  onBackToInvitation: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  onUpdateSettings,
  currentUser,
  onBackToInvitation,
}) => {
  const [activeTab, setActiveTab] = useState<'ozet' | 'whatsapp' | 'davetliler' | 'katilim' | 'mesajlar' | 'ayarlar'>('ozet');

  // Firestore Data Collections
  const [rsvps, setRsvps] = useState<RSVPItem[]>([]);
  const [guestList, setGuestList] = useState<GuestItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings form local state
  const [formData, setFormData] = useState<WeddingSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Filters and search for RSVPs
  const [rsvpSearch, setRsvpSearch] = useState('');
  const [rsvpFilterStatus, setRsvpFilterStatus] = useState<string>('all');
  const [rsvpFilterEvent, setRsvpFilterEvent] = useState<string>('all');

  // Davetli listesi dialog & bulk import state
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestCategory, setNewGuestCategory] = useState('Genel');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [bulkGuestText, setBulkGuestText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Message filter tab
  const [messageTab, setMessageTab] = useState<'approved' | 'pending' | 'hidden'>('approved');

  // Gallery URL input
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  // Audio upload & live test state
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [testAudioPlaying, setTestAudioPlaying] = useState(false);
  const [testAudioError, setTestAudioError] = useState<string | null>(null);
  const testAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const musicFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Modals & Toast State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'rsvp' | 'guest' | 'message';
    id: string;
    name: string;
  } | null>(null);

  const [editingGuest, setEditingGuest] = useState<GuestItem | null>(null);
  const [editingRsvp, setEditingRsvp] = useState<RSVPItem | null>(null);

  const [whatsappPreviewModal, setWhatsappPreviewModal] = useState<{
    isOpen: boolean;
    guestName: string;
    phone: string;
    messageText: string;
    type: 'invite' | 'reminder';
  } | null>(null);

  // WhatsApp Paylaşım Merkezi State
  const [whatsappShareMode, setWhatsappShareMode] = useState<'general' | 'personalized'>('general');
  const [generalShareText, setGeneralShareText] = useState(
    `Birlikte bir ömre "Evet" derken siz değerli dostlarımızı da aramızda görmekten onur ve mutluluk duyarız. 🤍\n\nMinel & Muhammed\n📅 31 Ekim 2026 Cumartesi\n📍 Besa Albatros Davet & Balo Merkezi, Kartal / İstanbul\n\nDavetiyemizi görüntülemek ve katılım durumunuzu bildirmek için lütfen bağlantıya tıklayınız:\n{link}`
  );
  const [selectedShareGuestId, setSelectedShareGuestId] = useState<string>('custom');
  const [personalGuestName, setPersonalGuestName] = useState<string>('');
  const [personalGuestPhone, setPersonalGuestPhone] = useState<string>('');
  const [personalShareTemplate, setPersonalShareTemplate] = useState<string>(
    `Sayın {isim},\n\nBu mutlu günümüzde sizleri de aramızda görmekten büyük onur ve mutluluk duyarız. 🌸\n\nMinel & Muhammed\n📅 31 Ekim 2026 Cumartesi\n📍 Besa Albatros Davet & Balo Merkezi, Kartal / İstanbul\n\nSize özel hazırladığımız davetiyeyi görüntülemek ve katılım durumunuzu iletmek için lütfen linke tıklayınız:\n{link}`
  );

  // Kısa Link & Özel Alan Adı State
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isGeneratingShortUrl, setIsGeneratingShortUrl] = useState<boolean>(false);
  const [showDomainHelp, setShowDomainHelp] = useState<boolean>(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // 1. Subscribe to Firestore collections
  useEffect(() => {
    // Check if current user is indeed admin
    if (currentUser.email !== ADMIN_EMAIL) {
      setLoading(false);
      return;
    }

    const unsubRsvps = onSnapshot(
      query(collection(db, 'rsvps'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: RSVPItem[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setRsvps(list);
      }
    );

    const unsubGuests = onSnapshot(
      query(collection(db, 'guestList'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: GuestItem[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setGuestList(list);
      }
    );

    const unsubMessages = onSnapshot(
      query(collection(db, 'messages'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const list: MessageItem[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setMessages(list);
        setLoading(false);
      }
    );

    return () => {
      unsubRsvps();
      unsubGuests();
      unsubMessages();
    };
  }, [currentUser]);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalReplies = rsvps.length;
    const attendingList = rsvps.filter((r) => r.attendance === 'attending');
    const notAttendingList = rsvps.filter((r) => r.attendance === 'not_attending');
    const undecidedList = rsvps.filter((r) => r.attendance === 'undecided');

    const totalAttendingGuests = attendingList.reduce(
      (sum, r) => sum + (Number(r.adultCount) || 0) + (Number(r.childCount) || 0),
      0
    );
    const totalAdults = attendingList.reduce((sum, r) => sum + (Number(r.adultCount) || 0), 0);
    const totalChildren = attendingList.reduce((sum, r) => sum + (Number(r.childCount) || 0), 0);

    // Henna & Wedding headcounts
    const hennaGuests = attendingList
      .filter((r) => r.eventChoice === 'both' || r.eventChoice === 'henna')
      .reduce((sum, r) => sum + (Number(r.adultCount) || 0) + (Number(r.childCount) || 0), 0);

    const weddingGuests = attendingList
      .filter((r) => r.eventChoice === 'both' || r.eventChoice === 'wedding')
      .reduce((sum, r) => sum + (Number(r.adultCount) || 0) + (Number(r.childCount) || 0), 0);

    const approvedMessages = messages.filter((m) => m.status === 'approved').length;
    const pendingMessages = messages.filter((m) => m.status === 'pending').length;

    // Unresponded guest list count
    const respondedGuestNames = new Set(rsvps.map((r) => r.fullName.toLowerCase().trim()));
    const unrespondedGuests = guestList.filter(
      (g) => !respondedGuestNames.has(g.name.toLowerCase().trim()) && !g.hasResponded
    );

    return {
      totalReplies,
      attendingCount: attendingList.length,
      notAttendingCount: notAttendingList.length,
      undecidedCount: undecidedList.length,
      totalAttendingGuests,
      totalAdults,
      totalChildren,
      hennaGuests,
      weddingGuests,
      approvedMessages,
      pendingMessages,
      unrespondedCount: unrespondedGuests.length,
    };
  }, [rsvps, messages, guestList]);

  // Filtered RSVPs
  const filteredRsvps = useMemo(() => {
    return rsvps.filter((item) => {
      const matchSearch =
        item.fullName.toLowerCase().includes(rsvpSearch.toLowerCase()) ||
        (item.phone && item.phone.includes(rsvpSearch));
      const matchStatus = rsvpFilterStatus === 'all' || item.attendance === rsvpFilterStatus;
      const matchEvent =
        rsvpFilterEvent === 'all' ||
        item.eventChoice === rsvpFilterEvent ||
        (item.eventChoice === 'both' && (rsvpFilterEvent === 'wedding' || rsvpFilterEvent === 'henna'));
      return matchSearch && matchStatus && matchEvent;
    });
  }, [rsvps, rsvpSearch, rsvpFilterStatus, rsvpFilterEvent]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Ad Soyad', 'Katılım Durumu', 'Merasim', 'Yetişkin', 'Çocuk', 'Telefon', 'Mesaj', 'Tarih'];
    const rows = rsvps.map((r) => [
      `"${r.fullName}"`,
      r.attendance === 'attending' ? 'Katılacak' : r.attendance === 'not_attending' ? 'Katılamayacak' : 'Kararsız',
      r.eventChoice === 'both' ? 'İkisi de' : r.eventChoice === 'wedding' ? 'Düğün' : 'Kına',
      r.adultCount || 0,
      r.childCount || 0,
      `"${r.phone || ''}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${r.createdAt || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `davetiye_katilim_listesi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Memory Book (Tebrikler)
  const handleExportGuestbook = () => {
    const content = messages
      .filter((m) => m.status === 'approved')
      .map((m) => `Kimden: ${m.fullName}\nTarih: ${m.createdAt}\nMesaj:\n${m.message}\n-----------------------------------\n`)
      .join('\n');

    const blob = new Blob([`MINEL & MUHAMMED DÜĞÜN HATIRA VE TEBRİK DEFTERİ\n\n${content}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tebrik_ve_hatira_defteri_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print Guest List
  const handlePrint = () => {
    window.print();
  };

  // Davetli Ekleme
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    try {
      await addDoc(collection(db, 'guestList'), {
        name: newGuestName.trim(),
        category: newGuestCategory,
        phone: newGuestPhone.trim(),
        hasResponded: false,
        createdAt: new Date().toISOString(),
      });
      setNewGuestName('');
      setNewGuestPhone('');
    } catch (err) {
      console.error(err);
    }
  };

  // Toplu Davetli İçe Aktar (Bulk)
  const handleBulkImport = async () => {
    if (!bulkGuestText.trim()) return;
    const lines = bulkGuestText.split('\n');
    for (const line of lines) {
      const clean = line.trim();
      if (clean) {
        // format could be: "Ad Soyad" or "Ad Soyad, Telefon, Kategori"
        const parts = clean.split(',').map((p) => p.trim());
        const name = parts[0];
        const phone = parts[1] || '';
        const category = parts[2] || 'Genel';
        if (name) {
          await addDoc(collection(db, 'guestList'), {
            name,
            phone,
            category,
            hasResponded: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    setBulkGuestText('');
    setShowBulkModal(false);
  };

  // Delete confirmation action
  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    try {
      if (deleteModal.type === 'rsvp') {
        await deleteDoc(doc(db, 'rsvps', deleteModal.id));
        showToast('Katılım kaydı başarıyla silindi.');
      } else if (deleteModal.type === 'guest') {
        await deleteDoc(doc(db, 'guestList', deleteModal.id));
        showToast('Davetli başarıyla silindi.');
      } else if (deleteModal.type === 'message') {
        await deleteDoc(doc(db, 'messages', deleteModal.id));
        showToast('Tebrik mesajı başarıyla silindi.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Silme işlemi gerçekleştirilemedi.', 'error');
    } finally {
      setDeleteModal(null);
    }
  };

  // Edit Guest Action
  const handleSaveEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !editingGuest.id) return;
    try {
      await updateDoc(doc(db, 'guestList', editingGuest.id), {
        name: editingGuest.name.trim(),
        phone: editingGuest.phone?.trim() || '',
        category: editingGuest.category || 'Genel',
        notes: editingGuest.notes || '',
      });
      showToast('Davetli bilgileri güncellendi.');
      setEditingGuest(null);
    } catch (err) {
      console.error('Update guest error:', err);
      showToast('Davetli bilgisi güncellenirken hata oluştu.', 'error');
    }
  };

  // Edit RSVP Action
  const handleSaveEditRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRsvp || !editingRsvp.id) return;
    try {
      await updateDoc(doc(db, 'rsvps', editingRsvp.id), {
        fullName: editingRsvp.fullName.trim(),
        attendance: editingRsvp.attendance,
        eventChoice: editingRsvp.eventChoice,
        adultCount: Number(editingRsvp.adultCount) || 1,
        childCount: Number(editingRsvp.childCount) || 0,
        phone: editingRsvp.phone?.trim() || '',
        message: editingRsvp.message || '',
      });
      showToast('Katılım cevabı güncellendi.');
      setEditingRsvp(null);
    } catch (err) {
      console.error('Update rsvp error:', err);
      showToast('Katılım kaydı güncellenirken hata oluştu.', 'error');
    }
  };

  // Update Message Status
  const handleUpdateMessageStatus = async (id?: string, status?: 'approved' | 'hidden') => {
    if (!id || !status) return;
    try {
      await updateDoc(doc(db, 'messages', id), { status });
      showToast('Mesaj durumu güncellendi.');
    } catch (err) {
      console.error('Message status update error:', err);
      showToast('Mesaj durumu güncellenemedi.', 'error');
    }
  };

  // Save Settings to Firestore
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await onUpdateSettings(formData);
      setSettingsSuccess(true);
      showToast('Tüm ayarlar başarıyla kaydedildi.');
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Settings save error:', err);
      showToast('Ayarlar kaydedilirken bir hata oluştu.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Generate Personalized URL for Guest
  const getGuestInvitationUrl = (guestName: string) => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?to=${encodeURIComponent(guestName)}`;
  };

  // Get Custom or Default Invite Text
  const getGuestInviteText = (guestName: string) => {
    const link = getGuestInvitationUrl(guestName);
    const template =
      formData.whatsappInviteTemplate || DEFAULT_SETTINGS.whatsappInviteTemplate || '';
    return formatTemplate(template, guestName, link);
  };

  // Get Custom or Default Reminder Text
  const getGuestReminderText = (guestName: string) => {
    const link = getGuestInvitationUrl(guestName);
    const template =
      formData.whatsappReminderTemplate || DEFAULT_SETTINGS.whatsappReminderTemplate || '';
    return formatTemplate(template, guestName, link);
  };

  // Generate WhatsApp Share Link for a Guest
  const getGuestWhatsAppLink = (guest: GuestItem) => {
    const msg = getGuestInviteText(guest.name);
    const phone = normalizeWhatsAppPhone(guest.phone);
    return phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  const getReminderWhatsAppLink = (guest: GuestItem) => {
    const msg = getGuestReminderText(guest.name);
    const phone = normalizeWhatsAppPhone(guest.phone);
    return phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Mesaj metni panoya kopyalandı! WhatsApp sohbetine yapıştırabilirsiniz.');
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Add Gallery image url
  const handleAddGalleryImage = () => {
    if (!newGalleryUrl.trim()) return;
    const current = formData.gallery || [];
    setFormData({ ...formData, gallery: [...current, newGalleryUrl.trim()] });
    setNewGalleryUrl('');
  };

  // Remove Gallery image
  const handleRemoveGalleryImage = (index: number) => {
    const updated = (formData.gallery || []).filter((_, i) => i !== index);
    setFormData({ ...formData, gallery: updated });
  };

  // Handle direct file upload for background music
  const handleMusicFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast('Ses dosyası boyutu 50MB altında olmalıdır.', 'error');
      return;
    }

    setUploadingMusic(true);
    setTestAudioError(null);

    try {
      const res = await fetch('/api/upload-music', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
          'x-filename': encodeURIComponent(file.name),
        },
        body: file,
      });

      if (!res.ok) {
        throw new Error(`Yükleme başarısız (${res.status})`);
      }

      const data = await res.json();
      if (data.url) {
        setFormData((prev) => ({ ...prev, musicUrl: data.url }));
        showToast(`"${file.name}" müziği başarıyla yüklendi!`, 'success');
        if (testAudioRef.current) {
          testAudioRef.current.src = data.url;
          testAudioRef.current.load();
        }
      } else {
        throw new Error(data.error || 'Yükleme tamamlanamadı.');
      }
    } catch (err: any) {
      console.warn('Direct upload error, trying base64 fallback:', err);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Str = reader.result as string;
            const res2 = await fetch('/api/upload-music', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: base64Str, filename: file.name }),
            });
            const data2 = await res2.json();
            if (data2.url) {
              setFormData((prev) => ({ ...prev, musicUrl: data2.url }));
              showToast(`"${file.name}" müziği başarıyla yüklendi!`, 'success');
              if (testAudioRef.current) {
                testAudioRef.current.src = data2.url;
                testAudioRef.current.load();
              }
            } else {
              throw new Error(data2.error || 'Yükleme başarısız.');
            }
          } catch (e2: any) {
            showToast('Müzik dosyası yüklenemedi: ' + (e2?.message || 'Hata'), 'error');
          } finally {
            setUploadingMusic(false);
          }
        };
        reader.readAsDataURL(file);
        return;
      } catch (fbErr) {
        showToast('Müzik yüklenirken bir hata oluştu.', 'error');
      }
    } finally {
      setUploadingMusic(false);
      if (musicFileInputRef.current) {
        musicFileInputRef.current.value = '';
      }
    }
  };

  // Toggle live test audio player in admin panel
  const toggleTestAudio = () => {
    if (!testAudioRef.current) return;
    const url = normalizeAudioUrl(formData.musicUrl);

    if (testAudioPlaying) {
      testAudioRef.current.pause();
      setTestAudioPlaying(false);
    } else {
      setTestAudioError(null);
      testAudioRef.current.src = url;
      testAudioRef.current.load();
      testAudioRef.current
        .play()
        .then(() => {
          setTestAudioPlaying(true);
        })
        .catch((err) => {
          console.warn('Test audio error:', err);
          setTestAudioPlaying(false);
          setTestAudioError(
            'Bu ses dosyası doğrudan çalınamadı. Audiomack veya web sayfaları yerine lütfen "Cihazından MP3 Yükle" butonunu kullanınız.'
          );
        });
    }
  };

  // WhatsApp Share Hub Memos & Handlers
  const cleanInvitationUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const cleanPath = window.location.pathname.replace(/\/admin.*$/, '').replace(/\/$/, '');
    return `${window.location.origin}${cleanPath || ''}`;
  }, []);

  // Sync custom URL input with settings when loaded
  useEffect(() => {
    if (formData.customDomainUrl) {
      setCustomUrlInput(formData.customDomainUrl);
    }
  }, [formData.customDomainUrl]);

  // Effective base URL used for sharing: custom domain/short link if set, otherwise clean system URL
  const effectiveShareBaseUrl = useMemo(() => {
    const raw = formData.customDomainUrl || customUrlInput;
    if (raw && raw.trim()) {
      let url = raw.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      return url.replace(/\/$/, '');
    }
    return cleanInvitationUrl;
  }, [formData.customDomainUrl, customUrlInput, cleanInvitationUrl]);

  const computedGeneralMessage = useMemo(() => {
    let text = generalShareText;
    if (!text.includes('{link}')) {
      return `${text}\n\n${effectiveShareBaseUrl}`;
    }
    return text.replace(/{link}/g, effectiveShareBaseUrl);
  }, [generalShareText, effectiveShareBaseUrl]);

  const computedPersonalUrl = useMemo(() => {
    const name = personalGuestName.trim() || 'Değerli Misafirimiz';
    return `${effectiveShareBaseUrl}/?to=${encodeURIComponent(name)}`;
  }, [effectiveShareBaseUrl, personalGuestName]);

  const computedPersonalMessage = useMemo(() => {
    const name = personalGuestName.trim() || 'Değerli Misafirimiz';
    let text = personalShareTemplate;
    text = text.replace(/{isim}/g, name);
    if (!text.includes('{link}')) {
      return `${text}\n\n${computedPersonalUrl}`;
    }
    return text.replace(/{link}/g, computedPersonalUrl);
  }, [personalShareTemplate, personalGuestName, computedPersonalUrl]);

  const handleSaveCustomUrl = async (newUrl: string) => {
    try {
      let formatted = newUrl.trim();
      if (formatted && !formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = 'https://' + formatted;
      }
      const updated = { ...formData, customDomainUrl: formatted };
      setFormData(updated);
      setCustomUrlInput(formatted);
      await setDoc(doc(db, 'settings', 'general'), updated, { merge: true });
      if (formatted) {
        showToast('Özel link / alan adı başarıyla kaydedildi ve tüm davetiyelere uygulandı!', 'success');
      } else {
        showToast('Özel link temizlendi, varsayılan sistem adresine dönüldü.', 'success');
      }
    } catch (e: any) {
      showToast('Kaydedilemedi: ' + (e?.message || 'Hata'), 'error');
    }
  };

  const handleGenerateQuickShortUrl = async () => {
    setIsGeneratingShortUrl(true);
    try {
      const res = await fetch('/api/create-short-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanInvitationUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.shortUrl) {
        throw new Error(data.error || 'Kısa link oluşturulamadı');
      }
      await handleSaveCustomUrl(data.shortUrl);
      showToast('Kısa link başarıyla üretildi: ' + data.shortUrl, 'success');
    } catch (err: any) {
      showToast(err.message || 'Kısa link servisine bağlanılamadı', 'error');
    } finally {
      setIsGeneratingShortUrl(false);
    }
  };

  const handleSelectGuestForShare = (guestId: string) => {
    setSelectedShareGuestId(guestId);
    if (guestId === 'custom') {
      setPersonalGuestName('');
      setPersonalGuestPhone('');
    } else {
      const g = guestList.find((item) => item.id === guestId);
      if (g) {
        setPersonalGuestName(g.name);
        setPersonalGuestPhone(g.phone || '');
      }
    }
  };

  const handleShareGeneralWhatsApp = () => {
    const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(computedGeneralMessage);
    window.open(url, '_blank');
  };

  const handleSharePersonalWhatsApp = () => {
    const text = encodeURIComponent(computedPersonalMessage);
    let url = 'https://api.whatsapp.com/send?text=' + text;
    if (personalGuestPhone.trim()) {
      const digits = normalizeWhatsAppPhone(personalGuestPhone);
      if (digits) {
        url = `https://api.whatsapp.com/send?phone=${digits}&text=${text}`;
      }
    }
    window.open(url, '_blank');
  };

  const handleSaveGeneralTemplateAsDefault = async () => {
    try {
      const updated = { ...formData, whatsappInviteTemplate: generalShareText };
      setFormData(updated);
      await setDoc(doc(db, 'settings', 'general'), updated, { merge: true });
      showToast('Genel davetiye metni varsayılan şablon olarak kaydedildi!', 'success');
    } catch (e: any) {
      showToast('Şablon kaydedilemedi: ' + (e?.message || 'Hata'), 'error');
    }
  };

  const handleAddGuestFromWhatsAppHub = async () => {
    if (!personalGuestName.trim()) {
      showToast('Lütfen önce bir davetli adı giriniz.', 'error');
      return;
    }
    const exists = guestList.some(
      (g) => g.name.toLowerCase() === personalGuestName.trim().toLowerCase()
    );
    if (exists) {
      showToast('Bu davetli zaten listenizde mevcut.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'guestList'), {
        name: personalGuestName.trim(),
        category: 'Genel',
        phone: personalGuestPhone.trim(),
        invitedCount: 1,
        whatsappSent: true,
        createdAt: new Date().toISOString(),
      });
      showToast(`"${personalGuestName.trim()}" davetli listesine eklendi!`, 'success');
    } catch (e: any) {
      showToast('Davetli eklenirken hata oluştu.', 'error');
    }
  };

  // Access check
  if (currentUser.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-serif-title font-bold text-gray-800">Erişim Yetkiniz Yok</h2>
          <p className="text-sm text-gray-600">
            Giriş yaptığınız hesap (<strong>{currentUser.email}</strong>) admin yetkisine sahip değildir. Admin paneline yalnızca <strong>{ADMIN_EMAIL}</strong> hesabı erişebilir.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={() => signOut(auth)}
              className="py-2.5 px-4 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-black transition-all"
            >
              Farklı Hesapla Giriş Yap
            </button>
            <button
              onClick={onBackToInvitation}
              className="py-2.5 px-4 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Davetiyeye Geri Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#33251A] pb-16">
      {/* Top Admin Header */}
      <header className="bg-white border-b border-[#E7D6B8] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToInvitation}
              className="text-xs text-[#8C6B28] font-semibold hover:underline flex items-center gap-1"
            >
              ← Davetiyeye Dön
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="font-serif-title text-xl font-bold text-[#483323] flex items-center gap-2">
              <span>Yönetici Paneli</span>
              <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full bg-[#FAF3E5] text-[#AA771C] border border-[#E9DCBF]">
                Minel & Muhammed
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">
              {currentUser.email}
            </span>
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 p-2 rounded-lg border border-red-200"
              title="Çıkış Yap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 sm:space-x-4 overflow-x-auto text-xs sm:text-sm font-semibold border-t border-gray-100">
          {[
            { id: 'ozet', label: 'Genel Özet' },
            { id: 'whatsapp', label: '💬 WhatsApp Paylaşım' },
            { id: 'davetliler', label: `Davetli Listesi (${guestList.length})` },
            { id: 'katilim', label: `Katılım Cevapları (${rsvps.length})` },
            { id: 'mesajlar', label: `Tebrik Duvarı (${messages.length})` },
            { id: 'ayarlar', label: 'Site & Merasim Ayarları' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-[#C59B27] text-[#916B15]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* =========================================================================
            TAB 1: ÖZET
        ========================================================================= */}
        {activeTab === 'ozet' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-[#E9DDC2] shadow-xs">
                <span className="text-xs text-gray-500 font-medium">Toplam Cevap Veren</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif-title text-[#463222] mt-1">
                  {stats.totalReplies}
                </p>
                <div className="text-[11px] text-gray-400 mt-1">
                  {stats.unrespondedCount} davetli henüz yanıt vermedi
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-xs">
                <span className="text-xs text-emerald-800 font-medium">Katılacak Kişi Sayısı</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif-title text-emerald-900 mt-1">
                  {stats.totalAttendingGuests}{' '}
                  <span className="text-xs font-sans font-normal text-emerald-700">Kişi</span>
                </p>
                <div className="text-[11px] text-emerald-700 mt-1">
                  {stats.totalAdults} Yetişkin + {stats.totalChildren} Çocuk
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-xs">
                <span className="text-xs text-rose-800 font-medium">🌸 Kına Merasimi Toplamı</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif-title text-rose-900 mt-1">
                  {stats.hennaGuests}{' '}
                  <span className="text-xs font-sans font-normal text-rose-700">Kişi</span>
                </p>
                <div className="text-[11px] text-rose-700 mt-1">28 Ekim 2026 Çarşamba</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-xs">
                <span className="text-xs text-amber-800 font-medium">💍 Düğün Merasimi Toplamı</span>
                <p className="text-2xl sm:text-3xl font-bold font-serif-title text-amber-900 mt-1">
                  {stats.weddingGuests}{' '}
                  <span className="text-xs font-sans font-normal text-amber-700">Kişi</span>
                </p>
                <div className="text-[11px] text-amber-700 mt-1">31 Ekim 2026 Cumartesi</div>
              </div>
            </div>

            {/* Attendance Breakdown Progress */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
              <h3 className="font-serif-title text-lg font-bold text-[#4B3423]">
                Katılım Durumu Dağılımı
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#F0FDF4] border border-emerald-200">
                  <div className="flex justify-between text-xs font-semibold text-emerald-900 mb-1">
                    <span>Katılacak</span>
                    <span>{stats.attendingCount} Form</span>
                  </div>
                  <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{
                        width: stats.totalReplies ? `${(stats.attendingCount / stats.totalReplies) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-rose-200">
                  <div className="flex justify-between text-xs font-semibold text-rose-900 mb-1">
                    <span>Katılamayacak</span>
                    <span>{stats.notAttendingCount} Form</span>
                  </div>
                  <div className="w-full bg-rose-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{
                        width: stats.totalReplies ? `${(stats.notAttendingCount / stats.totalReplies) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FFFBEB] border border-amber-200">
                  <div className="flex justify-between text-xs font-semibold text-amber-900 mb-1">
                    <span>Kararsız</span>
                    <span>{stats.undecidedCount} Form</span>
                  </div>
                  <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: stats.totalReplies ? `${(stats.undecidedCount / stats.totalReplies) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Short lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Son Gelen Katılım Cevapları */}
              <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-serif-title text-base font-bold text-[#4B3423]">
                    Son Katılım Bildirimleri
                  </h4>
                  <button
                    onClick={() => setActiveTab('katilim')}
                    className="text-xs text-[#AA771C] font-semibold hover:underline"
                  >
                    Tümünü Gör →
                  </button>
                </div>
                {rsvps.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="py-2.5 border-b border-gray-100 last:border-0 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#3E2B1E] block">{r.fullName}</span>
                      <span className="text-gray-500 text-[11px]">
                        {r.attendance === 'attending'
                          ? `Katılacak (${(r.adultCount || 1) + (r.childCount || 0)} Kişi)`
                          : r.attendance === 'not_attending'
                          ? 'Katılamayacak'
                          : 'Kararsız'}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : ''}
                    </span>
                  </div>
                ))}
                {rsvps.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">Henüz katılım cevabı yok.</p>
                )}
              </div>

              {/* Son Gelen Tebrik Mesajları */}
              <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-serif-title text-base font-bold text-[#4B3423]">
                    Son Tebrik Mesajları
                  </h4>
                  <button
                    onClick={() => setActiveTab('mesajlar')}
                    className="text-xs text-[#AA771C] font-semibold hover:underline"
                  >
                    Tümünü Gör →
                  </button>
                </div>
                {messages.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="py-2.5 border-b border-gray-100 last:border-0 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#3E2B1E]">{m.fullName}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          m.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {m.status === 'approved' ? 'Yayında' : m.status === 'pending' ? 'Beklemede' : 'Gizli'}
                      </span>
                    </div>
                    <p className="text-gray-600 italic text-[11px] line-clamp-2">"{m.message}"</p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">Henüz tebrik mesajı gelmedi.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: WHATSAPP DAVETİYE & PAYLAŞIM MERKEZİ
        ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 max-w-2xl space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-semibold">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                  <span>WhatsApp Davetiye & Paylaşım Merkezi</span>
                </div>
                <h3 className="font-serif-title text-2xl sm:text-3xl font-bold text-white">
                  Davetiyenizi WhatsApp'ta Kolayca Paylaşın
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                  Davetiyenizi ister tüm gruplarınız ve rehberinizle tek tıkla genel olarak paylaşın, ister her misafirinizin adına özel isimli link ve samimi mesaj oluşturup gönderin.
                </p>
              </div>

              {/* Mod Değiştirme Butonları (Sekmeler) */}
              <div className="mt-6 flex flex-wrap gap-2.5 relative z-10">
                <button
                  type="button"
                  onClick={() => setWhatsappShareMode('general')}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs ${
                    whatsappShareMode === 'general'
                      ? 'bg-white text-emerald-900 shadow-md scale-102 ring-2 ring-emerald-300'
                      : 'bg-emerald-900/60 text-emerald-100 hover:bg-emerald-900/90'
                  }`}
                >
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>1. Genel Davetiye Paylaşımı (Toplu / Gruplar / Durum)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWhatsappShareMode('personalized')}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs ${
                    whatsappShareMode === 'personalized'
                      ? 'bg-white text-emerald-900 shadow-md scale-102 ring-2 ring-emerald-300'
                      : 'bg-emerald-900/60 text-emerald-100 hover:bg-emerald-900/90'
                  }`}
                >
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>2. Kişiye Özel Davetiye Oluşturucu (İsme Özel Link)</span>
                </button>
              </div>
            </div>

            {/* Özel Kısa Bağlantı (URL) & Alan Adı (Domain) Yönetim Kartı */}
            <div className="p-6 rounded-3xl bg-white border border-[#E0D5BE] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-bold text-[#553E2E]">
                      Düğün Web Bağlantısı (Kısa Link / Özel Alan Adı)
                    </h4>
                    {formData.customDomainUrl ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        ✓ Özel Link Aktif
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                        Sistem Bağlantısı (Varsayılan)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    WhatsApp'ta paylaşılan davetiye linkinde gelin ve damadın isminin yer alması için özel kısa link veya kendi alan adınızı kullanabilirsiniz.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDomainHelp(!showDomainHelp)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                  <span>{showDomainHelp ? 'Rehberi Gizle' : 'İsimli Özel Link Nasıl Yapılır?'}</span>
                </button>
              </div>

              {/* Aktif URL Gösterimi & Kopyalama */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-xs font-medium text-gray-500 shrink-0">Şu Anki Paylaşım Linki:</span>
                  <span className="text-xs font-mono font-semibold text-gray-800 truncate select-all">
                    {effectiveShareBaseUrl}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(effectiveShareBaseUrl);
                      showToast('Bağlantı panoya kopyalandı!');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-semibold text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-gray-500" />
                    <span>Kopyala</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(effectiveShareBaseUrl, '_blank')}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-semibold text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                    <span>Aç</span>
                  </button>
                </div>
              </div>

              {/* Özel Link Girişi & Kayıt Butonları */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                <div className="lg:col-span-8">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Özel Kısa Link veya Web Alan Adı Girin (Gelin & Damat İsimli):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const sample = 'aurioncore.com/davetiye/minelmuhammed';
                        setCustomUrlInput(sample);
                        handleSaveCustomUrl(sample);
                      }}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      + aurioncore.com/davetiye/minelmuhammed kullan
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="Örn: aurioncore.com/davetiye/minelmuhammed"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm font-sans focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                  />
                </div>

                <div className="lg:col-span-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveCustomUrl(customUrlInput)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex-1 flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Kaydet & Aktif Et</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingShortUrl}
                    onClick={handleGenerateQuickShortUrl}
                    className="px-3 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold border border-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="TinyURL üzerinden otomatik kısa link oluşturur"
                  >
                    {isGeneratingShortUrl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                    ) : (
                      <SparklesIcon className="w-3.5 h-3.5 text-amber-700" />
                    )}
                    <span>{isGeneratingShortUrl ? 'Oluşturuluyor...' : '⚡ Otomatik Kısalt'}</span>
                  </button>

                  {formData.customDomainUrl && (
                    <button
                      type="button"
                      onClick={() => handleSaveCustomUrl('')}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition-colors cursor-pointer"
                      title="Varsayılan orijinal linke dön"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
              </div>

              {/* Katlanabilir Rehber / Bilgilendirme Kartı */}
              {showDomainHelp && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-[#553E2E] space-y-3 animate-in fade-in">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-amber-600" />
                    Gelin & Damat İsimli Kısa ve Zarif Bağlantı Nasıl Oluşturulur?
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Yöntem 1: Ücretsiz İsimli Kısa Link */}
                    <div className="p-3 rounded-xl bg-white border border-amber-200/80 space-y-2">
                      <span className="font-bold text-emerald-800 flex items-center gap-1">
                        ✨ 1. Yöntem: Ücretsiz İsimli Kısa Link (1 Dakika)
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600 text-[11px] leading-relaxed">
                        <li>
                          <a
                            href="https://tinyurl.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
                          >
                            tinyurl.com <ExternalLink className="w-2.5 h-2.5" />
                          </a>{' '}
                          sitesine gidin.
                        </li>
                        <li>Yukarıdaki sistem bağlantınızı kopyalayıp oraya yapıştırın.</li>
                        <li>
                          <strong>"Customize your link"</strong> kutusuna{' '}
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-emerald-700 font-bold">
                            minelvemuhammed
                          </code>{' '}
                          veya{' '}
                          <code className="bg-gray-100 px-1 py-0.5 rounded text-emerald-700 font-bold">
                            minel-muhammed-dugun
                          </code>{' '}
                          yazın.
                        </li>
                        <li>
                          Oluşan{' '}
                          <span className="font-mono text-emerald-800 font-bold">
                            tinyurl.com/minelvemuhammed
                          </span>{' '}
                          linkini kopyalayıp yukarıdaki kutucuğa yapıştırın ve <strong>"Kaydet"</strong>e basın.
                        </li>
                      </ol>
                    </div>

                    {/* Yöntem 2: Kendi Alan Adınız (minelvemuhammed.com) */}
                    <div className="p-3 rounded-xl bg-white border border-amber-200/80 space-y-2">
                      <span className="font-bold text-amber-800 flex items-center gap-1">
                        🌐 2. Yöntem: Kendi Web Alan Adınız (.com)
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600 text-[11px] leading-relaxed">
                        <li>
                          Turhost, İsimtescil, GoDaddy veya Natro'dan{' '}
                          <strong>minelvemuhammed.com</strong> alan adını satın alabilirsiniz (~150 TL).
                        </li>
                        <li>
                          Alan adı panelindeki <strong>"URL Yönlendirme (URL Forwarding)"</strong> bölümüne yukarıdaki sistem bağlantınızı yazın.
                        </li>
                        <li>
                          Buradaki kutucuğa{' '}
                          <span className="font-mono text-amber-900 font-bold">
                            minelvemuhammed.com
                          </span>{' '}
                          yazıp kaydedin. Artık tüm WhatsApp mesajlarınız doğrudan bu adresi kullanacaktır.
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------------
                MOD 1: GENEL DAVETİYE PAYLAŞIMI
            ------------------------------------------------------------- */}
            {whatsappShareMode === 'general' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sol Taraf: Metin Editörü & Hazır Şablonlar */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-[#553E2E] flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-[#C59B27]" />
                          Genel Paylaşım Mesaj Metni
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Metni dilediğiniz gibi düzenleyebilir veya aşağıdaki hazır şablonlardan birini seçebilirsiniz.
                        </p>
                      </div>
                    </div>

                    {/* Hızlı Şablon Seçiciler */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-gray-700 block">
                        Hazır Metin Şablonları:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGeneralShareText(
                              `Birlikte bir ömre "Evet" derken siz değerli dostlarımızı da aramızda görmekten onur ve mutluluk duyarız. 🤍\n\nMinel & Muhammed\n📅 31 Ekim 2026 Cumartesi\n📍 Besa Albatros Davet & Balo Merkezi, Kartal / İstanbul\n\nDavetiyemizi görüntülemek ve katılım durumunuzu bildirmek için lütfen bağlantıya tıklayınız:\n{link}`
                            );
                            showToast('Zarif & Romantik şablon yüklendi.');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-medium text-gray-700 transition-all cursor-pointer"
                        >
                          🌸 Zarif & Romantik
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setGeneralShareText(
                              `Saygıdeğer Dostlarımız ve Akrabalarımız,\n\nEvlatlarımız Minel Şevval & Muhammed Şamil'in düğün ve kına merasimlerinde sizleri de aramızda görmekten kıvanç duyarız.\n\n📅 Kına: 28 Ekim 2026 Çarşamba (Hüdaverdi Mescidi)\n📅 Düğün: 31 Ekim 2026 Cumartesi (Besa Albatros Davet Salonu)\n\nDavetiye Detayları & LCV Katılım Bildirimi:\n{link}`
                            );
                            showToast('Resmi (Kına + Düğün) şablon yüklendi.');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-medium text-gray-700 transition-all cursor-pointer"
                        >
                          💍 Resmi & Klasik (Kına + Düğün)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setGeneralShareText(
                              `Minel & Muhammed Düğün Davetiyesi 💍\n\n31 Ekim 2026 Cumartesi günü mutluluğumuza ortak olmanız dileğiyle... Davetiyemizi görüntülemek ve katılım durumunuzu iletmek için tıklayın:\n{link}`
                            );
                            showToast('Kısa & Net şablon yüklendi.');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-medium text-gray-700 transition-all cursor-pointer"
                        >
                          ⚡ Kısa & Net
                        </button>
                      </div>
                    </div>

                    {/* Textarea */}
                    <div>
                      <textarea
                        rows={7}
                        value={generalShareText}
                        onChange={(e) => setGeneralShareText(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-gray-200 text-xs sm:text-sm font-sans text-gray-800 leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-gray-50/50"
                        placeholder="Davetiye mesajınızı buraya yazınız..."
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>
                          İpucu: Metin içindeki <strong>{'{link}'}</strong> alanı otomatik olarak davetiyenizin adresiyle değiştirilir.
                        </span>
                        <span>{generalShareText.length} karakter</span>
                      </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={handleShareGeneralWhatsApp}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>WhatsApp'ta Paylaş (Sohbet / Grup / Durum)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(computedGeneralMessage);
                          showToast('Mesaj metni bağlantısıyla birlikte panoya kopyalandı!');
                        }}
                        className="px-4 py-3 rounded-2xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                        <span>Metni Kopyala</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(effectiveShareBaseUrl);
                          showToast('Davetiye linki panoya kopyalandı!');
                        }}
                        className="px-4 py-3 rounded-2xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                        <span>Sadece Linki Kopyala</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveGeneralTemplateAsDefault}
                        className="px-4 py-3 rounded-2xl bg-[#FAF5E8] border border-[#E9DCBF] text-[#8A6318] hover:bg-[#F5ECD5] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
                      >
                        <Save className="w-4 h-4" />
                        <span>Bu Metni Şablon Olarak Kaydet</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf: Canlı WhatsApp Önizlemesi */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="rounded-3xl border border-[#D5E3D8] shadow-md overflow-hidden bg-[#EFEAE2]">
                    {/* WhatsApp Header */}
                    <div className="bg-[#075E54] text-white p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center font-serif-title font-bold text-sm text-white shadow-inner">
                        M&M
                      </div>
                      <div className="leading-tight">
                        <span className="font-bold text-xs sm:text-sm block">
                          Minel & Muhammed • Düğün Davetiyesi
                        </span>
                        <span className="text-[10px] text-emerald-200">çevrimiçi</span>
                      </div>
                    </div>

                    {/* WhatsApp Chat Body */}
                    <div
                      className="p-4 space-y-3 min-h-[280px] flex flex-col justify-end"
                      style={{
                        backgroundImage: `radial-gradient(#D6D1C7 1px, transparent 1px)`,
                        backgroundSize: '16px 16px',
                      }}
                    >
                      {/* Tarih Rozeti */}
                      <div className="self-center px-3 py-1 rounded-lg bg-white/70 backdrop-blur-xs text-[10px] text-gray-600 font-medium shadow-2xs">
                        Bugün
                      </div>

                      {/* Giden Mesaj Balonu */}
                      <div className="self-end max-w-[88%] bg-[#DCF8C6] p-3 rounded-2xl rounded-tr-xs shadow-xs text-xs text-gray-800 space-y-2 relative">
                        <p className="whitespace-pre-line leading-relaxed font-sans">
                          {computedGeneralMessage}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 pt-1">
                          <span>14:30</span>
                          <span className="text-emerald-600 font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bilgilendirme Notu */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E9DDC2] text-xs text-gray-600 space-y-1">
                    <p className="font-bold text-[#553E2E] flex items-center gap-1.5">
                      <SparklesIcon className="w-4 h-4 text-[#C59B27]" />
                      WhatsApp Durumunda veya Gruplarda Paylaşım İpuçları
                    </p>
                    <p className="text-[11px] leading-relaxed text-gray-500">
                      <strong>"WhatsApp'ta Paylaş"</strong> butonuna bastığınızda telefonunuzda veya bilgisayarınızda WhatsApp doğrudan açılır. Açılan listeden ister birden fazla sohbeti, ister aile gruplarınızı seçip tek seferde gönderebilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                MOD 2: KİŞİYE ÖZEL DAVETİYE OLUŞTURUCU
            ------------------------------------------------------------- */}
            {whatsappShareMode === 'personalized' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sol Taraf: Kişi Seçimi & Özel Link Üretici */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Adım 1: Davetli Seçimi */}
                  <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
                    <div className="border-b border-gray-100 pb-3">
                      <h4 className="text-sm font-bold text-[#553E2E] flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        1. Davetli Seçin veya Yeni İsim Yazın
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Mevcut davetli listenizden birini seçebilir ya da aşağıya doğrudan istediğiniz adı yazabilirsiniz.
                      </p>
                    </div>

                    {/* Davetli Listesinden Hızlı Seçim Dropdown */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Kayıtlı Davetlilerden Seç:
                      </label>
                      <select
                        value={selectedShareGuestId}
                        onChange={(e) => handleSelectGuestForShare(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white text-gray-800"
                      >
                        <option value="custom">✍️ Yeni / Listede Olmayan İsim Yaz</option>
                        {guestList.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.category}) {g.phone ? `• ${g.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Manuel İsim & Telefon Girişi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Davetli İsmi / Aile Hitabı *
                        </label>
                        <input
                          type="text"
                          value={personalGuestName}
                          onChange={(e) => setPersonalGuestName(e.target.value)}
                          placeholder="Örn: Hasan Amca & Ailesi"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          WhatsApp Telefon No (İsteğe Bağlı)
                        </label>
                        <input
                          type="tel"
                          value={personalGuestPhone}
                          onChange={(e) => setPersonalGuestPhone(e.target.value)}
                          placeholder="0532 123 45 67"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500">
                      💡 Telefon numarası yazarsanız buton doğrudan o kişinin sohbetini açar. Numara yazmazsanız WhatsApp rehberinizden kişiyi siz seçersiniz.
                    </p>
                  </div>

                  {/* Adım 2: Kişiye Özel Üretilen Link */}
                  <div className="p-6 rounded-3xl bg-[#FAF5E8] border border-[#E9DCBF] shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#8A6318] flex items-center gap-1.5">
                        <SparklesIcon className="w-3.5 h-3.5 text-[#C59B27]" />
                        Kişiye Özel Hazırlanan Davetiye Linki:
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-emerald-800 font-bold border border-emerald-200">
                        İsimli Karşılama Aktif
                      </span>
                    </div>

                    {/* URL Görüntüleme */}
                    <div className="p-3 rounded-xl bg-white border border-[#E9DCBF] font-mono text-xs text-gray-700 break-all select-all flex items-center justify-between gap-2">
                      <span>{computedPersonalUrl}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-[11px] text-[#8C6B28]">
                        ✨ Misafir bu linke tıkladığında davetiyenin kapağında <strong>"Sayın {personalGuestName.trim() || 'Değerli Misafirimiz'}"</strong> yazısı görünecektir.
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(computedPersonalUrl);
                            showToast('Kişiye özel link kopyalandı!');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-gray-500" />
                          <span>Linki Kopyala</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => window.open(computedPersonalUrl, '_blank')}
                          className="px-3 py-1.5 rounded-lg bg-[#8A6318] text-white hover:bg-[#704F11] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Misafir Olarak Gör</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Adım 3: Kişiye Özel Mesaj Metni */}
                  <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <h4 className="text-sm font-bold text-[#553E2E] flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-[#C59B27]" />
                        Kişiye Özel Mesaj Şablonu
                      </h4>
                      <span className="text-[11px] text-gray-500">
                        {'{isim}'} ve {'{link}'} otomatik eklenir
                      </span>
                    </div>

                    <textarea
                      rows={6}
                      value={personalShareTemplate}
                      onChange={(e) => setPersonalShareTemplate(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-gray-200 text-xs sm:text-sm font-sans text-gray-800 leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-hidden bg-gray-50/50"
                      placeholder="Kişiye özel mesaj şablonunuz..."
                    />

                    {/* Aksiyon Butonları */}
                    <div className="pt-2 flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={handleSharePersonalWhatsApp}
                        className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>
                          {personalGuestPhone.trim()
                            ? `WhatsApp ile ${personalGuestName.trim() || 'Kişiye'} Gönder`
                            : 'WhatsApp ile Gönder (Kişiyi Rehberden Seç)'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(computedPersonalMessage);
                          showToast('Kişiye özel mesaj metni kopyalandı!');
                        }}
                        className="px-4 py-3 rounded-2xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                        <span>Mesajı Kopyala</span>
                      </button>

                      {personalGuestName.trim() &&
                        !guestList.some(
                          (g) => g.name.toLowerCase() === personalGuestName.trim().toLowerCase()
                        ) && (
                          <button
                            type="button"
                            onClick={handleAddGuestFromWhatsAppHub}
                            className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4 text-emerald-600" />
                            <span>Bu Kişiyi Davetli Listesine de Ekle</span>
                          </button>
                        )}
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf: Canlı Kişiye Özel WhatsApp Önizlemesi */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="rounded-3xl border border-[#D5E3D8] shadow-md overflow-hidden bg-[#EFEAE2]">
                    {/* WhatsApp Header */}
                    <div className="bg-[#075E54] text-white p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs text-white">
                        {personalGuestName.trim()
                          ? personalGuestName.trim().slice(0, 2).toUpperCase()
                          : 'DM'}
                      </div>
                      <div className="leading-tight">
                        <span className="font-bold text-xs sm:text-sm block truncate max-w-[200px]">
                          {personalGuestName.trim() || 'Değerli Misafirimiz'}
                        </span>
                        <span className="text-[10px] text-emerald-200">
                          {personalGuestPhone.trim() || 'çevrimiçi'}
                        </span>
                      </div>
                    </div>

                    {/* WhatsApp Chat Body */}
                    <div
                      className="p-4 space-y-3 min-h-[300px] flex flex-col justify-end"
                      style={{
                        backgroundImage: `radial-gradient(#D6D1C7 1px, transparent 1px)`,
                        backgroundSize: '16px 16px',
                      }}
                    >
                      <div className="self-center px-3 py-1 rounded-lg bg-white/70 backdrop-blur-xs text-[10px] text-gray-600 font-medium shadow-2xs">
                        Bugün
                      </div>

                      {/* Giden Kişiye Özel Mesaj Balonu */}
                      <div className="self-end max-w-[90%] bg-[#DCF8C6] p-3 rounded-2xl rounded-tr-xs shadow-xs text-xs text-gray-800 space-y-2 relative">
                        <p className="whitespace-pre-line leading-relaxed font-sans">
                          {computedPersonalMessage}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 pt-1">
                          <span>14:32</span>
                          <span className="text-emerald-600 font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kolaylık Kartı */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E9DDC2] text-xs text-gray-600 space-y-1.5">
                    <p className="font-bold text-[#553E2E] flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-rose-500" />
                      Neden Kişiye Özel Link?
                    </p>
                    <p className="text-[11px] leading-relaxed text-gray-500">
                      Misafiriniz kendisine özel gönderdiğiniz bu linke tıkladığında, davetiyenin zarfında ve kapağında doğrudan kendi adı (örn: <em>"Sayın {personalGuestName.trim() || 'Ahmet Bey & Ailesi'}"</em>) yazar. Bu hem davetinize özel bir zarafet katar hem de katılım bildirirken ismini tekrar yazmak zorunda kalmaz.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'katilim' && (
          <div className="space-y-4">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E9DDC2]">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="İsim veya telefon ara..."
                    value={rsvpSearch}
                    onChange={(e) => setRsvpSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C59B27]"
                  />
                </div>

                <select
                  value={rsvpFilterStatus}
                  onChange={(e) => setRsvpFilterStatus(e.target.value)}
                  className="text-xs py-2 px-2.5 rounded-xl border border-gray-200 bg-white"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="attending">Katılacak</option>
                  <option value="not_attending">Katılamayacak</option>
                  <option value="undecided">Kararsız</option>
                </select>

                <select
                  value={rsvpFilterEvent}
                  onChange={(e) => setRsvpFilterEvent(e.target.value)}
                  className="text-xs py-2 px-2.5 rounded-xl border border-gray-200 bg-white"
                >
                  <option value="all">Tüm Merasimler</option>
                  <option value="wedding">Düğün</option>
                  <option value="henna">Kına</option>
                  <option value="both">İkisi de</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel / CSV İndir</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Yazdır</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-[#E9DDC2] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF6EF] text-[#614937] uppercase tracking-wider font-semibold border-b border-[#E9DDC2]">
                    <tr>
                      <th className="p-3.5">Misafir Adı</th>
                      <th className="p-3.5">Durum</th>
                      <th className="p-3.5">Merasim</th>
                      <th className="p-3.5 text-center">Kişi</th>
                      <th className="p-3.5">Telefon</th>
                      <th className="p-3.5">Mesaj / Not</th>
                      <th className="p-3.5">Tarih</th>
                      <th className="p-3.5 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRsvps.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-[#3B291D]">
                          {r.fullName}
                          {r.guestSlug && (
                            <span className="block text-[10px] font-normal text-gray-400">
                              Slug: {r.guestSlug}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {r.attendance === 'attending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Katılacak
                            </span>
                          ) : r.attendance === 'not_attending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-semibold text-[11px]">
                              <XCircle className="w-3 h-3" /> Katılamayacak
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                              <HelpCircle className="w-3 h-3" /> Kararsız
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-[#5C4533]">
                          {r.attendance === 'attending' ? (
                            r.eventChoice === 'both' ? (
                              'İkisi de (Kına + Düğün)'
                            ) : r.eventChoice === 'wedding' ? (
                              'Sadece Düğün 💍'
                            ) : (
                              'Sadece Kına 🌸'
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3.5 text-center font-semibold">
                          {r.attendance === 'attending' ? (
                            <span>
                              {Number(r.adultCount) || 1} Y {Number(r.childCount) > 0 ? `+ ${r.childCount} Ç` : ''}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3.5 text-gray-600">
                          {r.phone ? (
                            <a
                              href={`tel:${r.phone}`}
                              className="text-[#9A741E] hover:underline"
                            >
                              {r.phone}
                            </a>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-gray-600 italic">
                          {r.message || '-'}
                        </td>
                        <td className="p-3.5 text-gray-400 whitespace-nowrap">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('tr-TR') : ''}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingRsvp(r)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-[#AA771C] hover:bg-amber-50 transition-colors"
                              title="Kaydı Düzenle"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'rsvp',
                                  id: r.id!,
                                  name: r.fullName,
                                })
                              }
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Kaydı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRsvps.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-xs">
                  Aradığınız kriterlere uygun kayıt bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: DAVETLİ LİSTESİ & KİŞİYE ÖZEL LİNKLER
        ========================================================================= */}
        {activeTab === 'davetliler' && (
          <div className="space-y-6">
            {/* Top Add Bar */}
            <div className="p-5 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs">
              <h3 className="font-serif-title text-lg font-bold text-[#4B3423] mb-3">
                Yeni Davetli Ekle & Kişiselleştirilmiş Bağlantı Üret
              </h3>
              <form onSubmit={handleAddGuest} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Davetli Adı Soyadı (Örn: Teyzem Fatma)"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#C59B27]"
                  required
                />
                <input
                  type="tel"
                  placeholder="Telefon (WhatsApp için)"
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#C59B27]"
                />
                <select
                  value={newGuestCategory}
                  onChange={(e) => setNewGuestCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
                >
                  <option value="Genel">Genel</option>
                  <option value="Gelin Tarafı">Gelin Tarafı</option>
                  <option value="Damat Tarafı">Damat Tarafı</option>
                  <option value="Akraba">Akraba</option>
                  <option value="Arkadaşlar">Arkadaşlar</option>
                  <option value="İş / Meslektaş">İş / Meslektaş</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white font-semibold text-xs shadow-xs hover:shadow"
                  >
                    + Davetli Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(true)}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold hover:bg-gray-50 text-gray-700 whitespace-nowrap"
                  >
                    Toplu İçe Aktar
                  </button>
                </div>
              </form>
            </div>

            {/* Bulk Import Modal */}
            {showBulkModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                  <h4 className="font-serif-title text-xl font-bold text-[#4B3423]">
                    Toplu Davetli Listesi Yapıştır
                  </h4>
                  <p className="text-xs text-gray-500">
                    Her satıra bir davetli gelecek şekilde yapıştırabilirsiniz. Format:<br />
                    <code>Ad Soyad</code> veya <code>Ad Soyad, 05XXXXXXXXX, Gelin Tarafı</code>
                  </p>
                  <textarea
                    rows={8}
                    value={bulkGuestText}
                    onChange={(e) => setBulkGuestText(e.target.value)}
                    placeholder="Ahmet Yılmaz&#10;Ayşe Demir, 05321234567, Akraba&#10;Mehmet Kuş, 05429876543, Damat Tarafı"
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-mono"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowBulkModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleBulkImport}
                      className="px-5 py-2 rounded-xl bg-[#C59B27] text-white text-xs font-semibold hover:bg-[#AA771C]"
                    >
                      İçe Aktar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Template Customization Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border border-emerald-200/80 shadow-xs gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    WhatsApp Davetiye & Hatırlatma Mesajı
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                      Gelin İçin Özel Şablon
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5">
                    "Davet Et" ve "Hatırlat" butonlarıyla gönderilen WhatsApp metnini istediğiniz gibi düzenleyebilirsiniz.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ayarlar')}
                className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-900 text-xs font-bold shadow-xs whitespace-nowrap flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mesaj Şablonunu Düzenle</span>
              </button>
            </div>

            {/* Guests Table */}
            <div className="bg-white rounded-3xl border border-[#E9DDC2] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF6EF] text-[#614937] uppercase tracking-wider font-semibold border-b border-[#E9DDC2]">
                    <tr>
                      <th className="p-3.5">Davetli</th>
                      <th className="p-3.5">Kategori</th>
                      <th className="p-3.5">Telefon</th>
                      <th className="p-3.5">Özel Bağlantı (?to=)</th>
                      <th className="p-3.5 text-right">WhatsApp & İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {guestList.map((g) => {
                      const personalUrl = getGuestInvitationUrl(g.name);
                      const inviteText = getGuestInviteText(g.name);
                      const reminderText = getGuestReminderText(g.name);

                      return (
                        <tr key={g.id} className="hover:bg-gray-50/90 transition-colors">
                          <td className="p-3.5">
                            <span className="font-bold text-[#3E2B1E] block">{g.name}</span>
                            {g.notes && (
                              <span className="text-[10px] text-gray-500 italic block mt-0.5">
                                Not: {g.notes}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                              {g.category || 'Genel'}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-gray-700">
                            {g.phone ? (
                              <a
                                href={`tel:${g.phone}`}
                                className="text-[#9A741E] hover:underline"
                              >
                                {g.phone}
                              </a>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1 max-w-xs">
                              <span className="truncate text-gray-400 text-[11px] select-all bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                {personalUrl}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(personalUrl);
                                  showToast('Kişisel davetiye bağlantısı panoya kopyalandı!');
                                }}
                                className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                                title="Linki Kopyala"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* WhatsApp Davet Et button */}
                              <a
                                href={getGuestWhatsAppLink(g)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                                title="Davetiyeyi WhatsApp'ta Gönder"
                              >
                                <Send className="w-3 h-3" />
                                <span>Davet Et</span>
                              </a>

                              {/* WhatsApp Hatırlat button */}
                              <a
                                href={getReminderWhatsAppLink(g)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                title="Cevap vermeyen davetliye hatırlatma gönder"
                              >
                                <span>Hatırlat</span>
                              </a>

                              {/* Mesajı Önizle / Kopyala */}
                              <button
                                type="button"
                                onClick={() =>
                                  setWhatsappPreviewModal({
                                    isOpen: true,
                                    guestName: g.name,
                                    phone: g.phone || '',
                                    messageText: inviteText,
                                    type: 'invite',
                                  })
                                }
                                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Mesajı Önizle, Düzenle veya Kopyala"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>

                              {/* Düzenle button */}
                              <button
                                type="button"
                                onClick={() => setEditingGuest(g)}
                                className="p-1.5 rounded-lg text-gray-600 hover:text-[#AA771C] hover:bg-amber-50 transition-colors"
                                title="Davetliyi Düzenle"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Sil button */}
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteModal({
                                    isOpen: true,
                                    type: 'guest',
                                    id: g.id!,
                                    name: g.name,
                                  })
                                }
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Davetliyi Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {guestList.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-xs">
                  Henüz davetli listesi oluşturulmadı. Yukarıdan ekleyebilir veya toplu yapıştırabilirsiniz.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: MESAJLAR & TEBRİK DUVARI YÖNETİMİ
        ========================================================================= */}
        {activeTab === 'mesajlar' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E9DDC2]">
              <div className="flex space-x-2">
                {[
                  { id: 'approved', label: 'Yayında Olanlar' },
                  { id: 'pending', label: 'Onay Bekleyenler' },
                  { id: 'hidden', label: 'Gizlenenler' },
                ].map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => setMessageTab(mt.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      messageTab === mt.id
                        ? 'bg-[#C59B27] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExportGuestbook}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white text-xs font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Hatıra Defteri Olarak İndir (TXT)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {messages
                .filter((m) => m.status === messageTab)
                .map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-2xl bg-white border border-[#EADBBD] shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-[#463121]">{msg.fullName}</span>
                        <span className="text-[11px] text-gray-400">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('tr-TR') : ''}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 italic">"{msg.message}"</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      {msg.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateMessageStatus(msg.id, 'approved')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Yayınla</span>
                        </button>
                      )}
                      {msg.status !== 'hidden' && (
                        <button
                          onClick={() => handleUpdateMessageStatus(msg.id, 'hidden')}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold flex items-center gap-1"
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>Gizle</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            type: 'message',
                            id: msg.id!,
                            name: msg.fullName,
                          })
                        }
                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Mesajı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {messages.filter((m) => m.status === messageTab).length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-[#E9DDC2] text-gray-400 text-xs">
                Bu sekmede mesaj bulunmuyor.
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: AYARLAR (Firestore'a kaydedilir, kod değiştirmeden anında yansır)
        ========================================================================= */}
        {activeTab === 'ayarlar' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-title text-xl font-bold text-[#4B3423]">
                Davetiye İçerik ve Site Ayarları
              </h3>
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
              </button>
            </div>

            {settingsSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center animate-in fade-in">
                Ayarlar başarıyla Firestore veritabanına kaydedildi ve canlıya alındı! ✨
              </div>
            )}

            {/* Çift Bilgileri */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#553E2E] uppercase tracking-wider">
                1. Gelin & Damat Bilgileri
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gelin Adı (Kısa)</label>
                  <input
                    type="text"
                    value={formData.brideName}
                    onChange={(e) => setFormData({ ...formData, brideName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gelin Tam Adı</label>
                  <input
                    type="text"
                    value={formData.brideFullName}
                    onChange={(e) => setFormData({ ...formData, brideFullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gelin Aile Satırı</label>
                  <input
                    type="text"
                    value={formData.brideFamily}
                    onChange={(e) => setFormData({ ...formData, brideFamily: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                    placeholder="Örn: Fatma & Ahmet Gözükara'nın kızı"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gelin Fotoğraf URL'si</label>
                  <input
                    type="url"
                    value={formData.bridePhotoUrl}
                    onChange={(e) => setFormData({ ...formData, bridePhotoUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Damat Adı (Kısa)</label>
                  <input
                    type="text"
                    value={formData.groomName}
                    onChange={(e) => setFormData({ ...formData, groomName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Damat Tam Adı</label>
                  <input
                    type="text"
                    value={formData.groomFullName}
                    onChange={(e) => setFormData({ ...formData, groomFullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Damat Aile Satırı</label>
                  <input
                    type="text"
                    value={formData.groomFamily}
                    onChange={(e) => setFormData({ ...formData, groomFamily: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                    placeholder="Örn: Ayşe & Mehmet Kuş'un oğlu"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Damat Fotoğraf URL'si</label>
                  <input
                    type="url"
                    value={formData.groomPhotoUrl}
                    onChange={(e) => setFormData({ ...formData, groomPhotoUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Özel Kısa Bağlantı / Alan Adı (URL) - İsteğe Bağlı
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.customDomainUrl || ''}
                      onChange={(e) => setFormData({ ...formData, customDomainUrl: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs"
                      placeholder="Örn: aurioncore.com/davetiye/minelmuhammed veya minelvemuhammed.com"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Buraya bir değer girdiğinizde WhatsApp Paylaşım Merkezi ve davetiye linkleri otomatik olarak bu zarif adresi kullanır.
                  </p>
                </div>
              </div>
            </div>

            {/* Davet Metni */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#553E2E] uppercase tracking-wider">
                2. Davet Metni & Başlık
              </h4>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Davetiye Başlığı</label>
                <input
                  type="text"
                  value={formData.invitationTitle}
                  onChange={(e) => setFormData({ ...formData, invitationTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ana Davet Metni</label>
                <textarea
                  rows={4}
                  value={formData.invitationText}
                  onChange={(e) => setFormData({ ...formData, invitationText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hikâyemiz Bölümü (Doldurulursa görünür, boşsa gizlenir)
                </label>
                <textarea
                  rows={3}
                  value={formData.ourStory}
                  onChange={(e) => setFormData({ ...formData, ourStory: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  placeholder="İsteğe bağlı..."
                />
              </div>
            </div>

            {/* Merasimler & Konvoy */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#553E2E] uppercase tracking-wider">
                3. Merasim Mekân & Harita Bilgileri
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kına */}
                <div className="space-y-3 p-4 rounded-2xl bg-rose-50/40 border border-rose-200">
                  <span className="font-bold text-xs text-rose-800">🌸 Kına Merasimi Bilgileri</span>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Mekân Adı</label>
                    <input
                      type="text"
                      value={formData.hennaVenueName}
                      onChange={(e) => setFormData({ ...formData, hennaVenueName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Açık Adres</label>
                    <textarea
                      rows={2}
                      value={formData.hennaVenueAddress}
                      onChange={(e) => setFormData({ ...formData, hennaVenueAddress: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Google Harita Linki</label>
                    <input
                      type="url"
                      value={formData.hennaMapUrl}
                      onChange={(e) => setFormData({ ...formData, hennaMapUrl: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Düğün */}
                <div className="space-y-3 p-4 rounded-2xl bg-amber-50/40 border border-amber-200">
                  <span className="font-bold text-xs text-amber-800">💍 Düğün Merasimi Bilgileri</span>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Mekân Adı</label>
                    <input
                      type="text"
                      value={formData.weddingVenueName}
                      onChange={(e) => setFormData({ ...formData, weddingVenueName: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Açık Adres</label>
                    <textarea
                      rows={2}
                      value={formData.weddingVenueAddress}
                      onChange={(e) => setFormData({ ...formData, weddingVenueAddress: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">Google Harita Linki</label>
                    <input
                      type="url"
                      value={formData.weddingMapUrl}
                      onChange={(e) => setFormData({ ...formData, weddingMapUrl: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">🚗 Konvoy Hareket Saati</label>
                    <input
                      type="text"
                      value={formData.weddingConvoyTime}
                      onChange={(e) => setFormData({ ...formData, weddingConvoyTime: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
                      placeholder="11:30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Müzik, LCV ve Form Ayarları */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[#553E2E] uppercase tracking-wider flex items-center gap-2">
                    <Music className="w-4 h-4 text-[#C59B27]" />
                    4. Arka Plan Müziği & Katılım (LCV) Kuralları
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Davetiye açıldığında misafirlerinize çalacak müziği buradan yönetebilirsiniz.
                  </p>
                </div>

                {/* Live Test Audio Player Hidden Element */}
                <audio
                  ref={testAudioRef}
                  onEnded={() => setTestAudioPlaying(false)}
                  onPause={() => setTestAudioPlaying(false)}
                  onPlay={() => setTestAudioPlaying(true)}
                  onError={() => {
                    setTestAudioPlaying(false);
                    setTestAudioError(
                      'Bu ses dosyası doğrudan çalınamadı. Web sayfası (Audiomack/YouTube vb.) yerine doğrudan MP3 dosyası yükleyiniz.'
                    );
                  }}
                />
              </div>

              {/* Uyumsuz Bağlantı Uyarısı (Örn: Audiomack / Web sayfası girilmişse) */}
              {checkNonDirectAudioService(formData.musicUrl) && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950">
                      ⚠️ Uyumsuz Müzik Bağlantısı Tespit Edildi
                    </p>
                    <p className="text-amber-900">
                      {checkNonDirectAudioService(formData.musicUrl)}
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Web sayfaları (Audiomack, YouTube vb.) arka plan müziği olarak çalınamaz. Lütfen hemen aşağıdaki <strong>"Cihazından MP3 Yükle"</strong> butonuna tıklayarak telefonunuzdan veya bilgisayarınızdan MP3 dosyasını doğrudan yükleyin.
                    </p>
                  </div>
                </div>
              )}

              {/* Hata Bildirimi */}
              {testAudioError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{testAudioError}</span>
                </div>
              )}

              {/* Müzik Yükleme & Kontrol Paneli */}
              <div className="p-5 rounded-2xl bg-[#FCFAF6] border border-[#EBDDC3] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#553E2E] block">
                      1. Adım: Kendi Müziğinizi Cihazınızdan Yükleyin
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Telefonunuzdan veya bilgisayarınızdan indirdiğiniz "Maşallah" veya istediğiniz MP3 dosyasını seçin.
                    </span>
                  </div>

                  {/* Gizli Dosya Girişi */}
                  <input
                    type="file"
                    ref={musicFileInputRef}
                    accept="audio/*,.mp3,.m4a,.wav,.ogg"
                    className="hidden"
                    onChange={handleMusicFileUpload}
                  />

                  {/* Yükleme ve Dinleme Butonları */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => musicFileInputRef.current?.click()}
                      disabled={uploadingMusic}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#916B15] to-[#C59B27] text-white font-semibold text-xs flex items-center gap-2 shadow-sm hover:from-[#7A570F] hover:to-[#AA771C] transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {uploadingMusic ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Yükleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Cihazından MP3 Yükle</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={toggleTestAudio}
                      title={testAudioPlaying ? 'Müziği Durdur' : 'Müziği Dinle'}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        testAudioPlaying
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm animate-pulse'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {testAudioPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-white" />
                          <span>Durdur</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Canlı Dinle & Test Et</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Geçerli Müzik Durum Rozeti */}
                <div className="pt-2 border-t border-[#EBDDC3]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Mevcut Çalan Müzik:</span>
                    <span className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 truncate max-w-[280px] sm:max-w-md">
                      {formData.musicUrl || DEFAULT_WEDDING_MUSIC}
                    </span>
                  </div>
                  {formData.musicUrl.startsWith('/uploads/') && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3" /> Cihazınızdan Yüklendi
                    </span>
                  )}
                </div>
              </div>

              {/* Alternatif: Hazır Önerilen Müzikler */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#553E2E]">
                  Veya Hazır Önerilen Fon Müziklerinden Birini Seçin:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRESET_WEDDING_TRACKS.map((track) => {
                    const isSelected = formData.musicUrl === track.url;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, musicUrl: track.url });
                          setTestAudioError(null);
                          showToast(`"${track.name}" seçildi!`);
                          if (testAudioRef.current) {
                            testAudioRef.current.src = track.url;
                            testAudioRef.current.load();
                          }
                        }}
                        className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FAF3E5] border-[#C59B27] shadow-xs ring-1 ring-[#C59B27]'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 line-clamp-1">
                            {track.name}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#AA771C] shrink-0 ml-1" />}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                          {track.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Müzik MP3 Doğrudan Bağlantı (URL) Alanı */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <span>Özel Ses Dosyası Bağlantısı (MP3 / Google Drive / Dropbox URL)</span>
                </label>
                <input
                  type="text"
                  value={formData.musicUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, musicUrl: val });
                    setTestAudioError(null);
                  }}
                  placeholder="https://.../muzik.mp3"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#C59B27] focus:border-[#C59B27]"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Doğrudan bir MP3 linkiniz veya Google Drive bağlantınız varsa buraya yapıştırabilirsiniz. Google Drive bağlantıları otomatik olarak çalınabilir ses akışına dönüştürülür.
                </p>
              </div>

              {/* Son Cevap Tarihi, LCV Açık/Kapalı ve Onay Şartı */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Son LCV Cevap Tarihi
                  </label>
                  <input
                    type="date"
                    value={formData.rsvpDeadline}
                    onChange={(e) => setFormData({ ...formData, rsvpDeadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="rsvpEnabled"
                    checked={formData.rsvpEnabled}
                    onChange={(e) => setFormData({ ...formData, rsvpEnabled: e.target.checked })}
                    className="rounded text-[#C59B27] focus:ring-[#C59B27] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="rsvpEnabled" className="text-xs font-semibold text-gray-700 cursor-pointer">
                    Katılım Formu Açık (Aktif)
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="messagesRequireApproval"
                    checked={formData.messagesRequireApproval}
                    onChange={(e) =>
                      setFormData({ ...formData, messagesRequireApproval: e.target.checked })
                    }
                    className="rounded text-[#C59B27] focus:ring-[#C59B27] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="messagesRequireApproval" className="text-xs font-semibold text-gray-700 cursor-pointer">
                    Tebriklerde Yönetici Onayı Şartı
                  </label>
                </div>
              </div>
            </div>

            {/* WhatsApp Davetiye & Hatırlatma Mesajı Şablonları */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[#553E2E] uppercase tracking-wider flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    5. WhatsApp Davet & Hatırlatma Mesajı Şablonları
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Gelin ve damat olarak WhatsApp üzerinden tek tıkla giden mesajların içeriğini dilediğiniz gibi özelleştirebilirsiniz.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                  Otomatik İsim & Link Entegreli
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Davet Mesajı */}
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      İlk Davetiye Gönderme Mesajı ("Davet Et" Butonu)
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Davetli listesindeki <strong>"Davet Et"</strong> butonuna basıldığında açılacak metin:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-medium text-gray-500">Etiket Ekle:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          whatsappInviteTemplate: (formData.whatsappInviteTemplate || DEFAULT_SETTINGS.whatsappInviteTemplate || '') + ' {davetli}',
                        })
                      }
                      className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
                    >
                      + {'{davetli}'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          whatsappInviteTemplate: (formData.whatsappInviteTemplate || DEFAULT_SETTINGS.whatsappInviteTemplate || '') + ' {link}',
                        })
                      }
                      className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
                    >
                      + {'{link}'}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={formData.whatsappInviteTemplate ?? DEFAULT_SETTINGS.whatsappInviteTemplate}
                    onChange={(e) => setFormData({ ...formData, whatsappInviteTemplate: e.target.value })}
                    className="w-full p-3 rounded-xl border border-emerald-200 bg-white text-xs leading-relaxed focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
                    placeholder="Sayın {davetli}, düğünümüze davetlisiniz... {link}"
                  />
                  <div className="bg-white/90 p-3 rounded-xl border border-emerald-100 text-[11px] space-y-1">
                    <span className="font-bold text-emerald-900 block">Canlı WhatsApp Önizlemesi:</span>
                    <div className="whitespace-pre-wrap font-sans text-gray-700 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100 text-[11px] leading-relaxed">
                      {formatTemplate(
                        formData.whatsappInviteTemplate || DEFAULT_SETTINGS.whatsappInviteTemplate || '',
                        'Ayşe & Ahmet Yılmaz',
                        `${window.location.origin}?to=Ayse%20Ahmet%20Yilmaz`
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Hatırlatma Mesajı */}
                <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      LCV Hatırlatma Mesajı ("Hatırlat" Butonu)
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Henüz yanıt vermeyen davetlilere giden <strong>"Hatırlat"</strong> butonu metni:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-medium text-gray-500">Etiket Ekle:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          whatsappReminderTemplate: (formData.whatsappReminderTemplate || DEFAULT_SETTINGS.whatsappReminderTemplate || '') + ' {davetli}',
                        })
                      }
                      className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors shadow-2xs"
                    >
                      + {'{davetli}'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          whatsappReminderTemplate: (formData.whatsappReminderTemplate || DEFAULT_SETTINGS.whatsappReminderTemplate || '') + ' {link}',
                        })
                      }
                      className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors shadow-2xs"
                    >
                      + {'{link}'}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={formData.whatsappReminderTemplate ?? DEFAULT_SETTINGS.whatsappReminderTemplate}
                    onChange={(e) => setFormData({ ...formData, whatsappReminderTemplate: e.target.value })}
                    className="w-full p-3 rounded-xl border border-amber-200 bg-white text-xs leading-relaxed focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                    placeholder="Sayın {davetli}, hazırlıklarımızı tamamlamak üzereyiz... {link}"
                  />
                  <div className="bg-white/90 p-3 rounded-xl border border-amber-100 text-[11px] space-y-1">
                    <span className="font-bold text-amber-900 block">Canlı WhatsApp Önizlemesi:</span>
                    <div className="whitespace-pre-wrap font-sans text-gray-700 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100 text-[11px] leading-relaxed">
                      {formatTemplate(
                        formData.whatsappReminderTemplate || DEFAULT_SETTINGS.whatsappReminderTemplate || '',
                        'Ayşe & Ahmet Yılmaz',
                        `${window.location.origin}?to=Ayse%20Ahmet%20Yilmaz`
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fotoğraf Galerisi */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#553E2E] uppercase tracking-wider">
                6. Fotoğraf Galerisi
              </h4>
              <p className="text-xs text-gray-500">
                Galeride sergilenmesini istediğiniz fotoğrafların doğrudan URL bağlantılarını ekleyebilirsiniz. Liste boş bırakılırsa davetiyedeki galeri bölümü otomatik olarak gizlenir.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://.../foto1.jpg"
                  value={newGalleryUrl}
                  onChange={(e) => setNewGalleryUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddGalleryImage}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-black"
                >
                  + Fotoğraf Ekle
                </button>
              </div>

              {formData.gallery && formData.gallery.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-2">
                  {formData.gallery.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Kaldır"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bilgi & Hediye & İletişim */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9DDC2] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#553E2E] uppercase tracking-wider">
                  6. İletişim, IBAN & Hediye Bilgileri
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showGiftSection"
                    checked={formData.showGiftSection}
                    onChange={(e) => setFormData({ ...formData, showGiftSection: e.target.checked })}
                    className="rounded text-[#C59B27] focus:ring-[#C59B27] w-4 h-4"
                  />
                  <label htmlFor="showGiftSection" className="text-xs font-semibold text-gray-700">
                    Bölümü Göster
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">İletişim Telefon</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp Numarası</label>
                  <input
                    type="text"
                    value={formData.contactWhatsapp}
                    onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                    placeholder="905550000000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Otopark & Vale Bilgisi</label>
                  <input
                    type="text"
                    value={formData.parkingInfo}
                    onChange={(e) => setFormData({ ...formData, parkingInfo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">IBAN Numarası</label>
                  <input
                    type="text"
                    value={formData.ibanInfo}
                    onChange={(e) => setFormData({ ...formData, ibanInfo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hesap Sahibi</label>
                  <input
                    type="text"
                    value={formData.ibanName}
                    onChange={(e) => setFormData({ ...formData, ibanName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save bar */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{savingSettings ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}</span>
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            MODAL 1: SİLME ONAY MODALI (Tarayıcı confirm engeline takılmaz!)
        ========================================================================= */}
        {deleteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#4B3423] text-base">Kaydı Sil</h4>
                <p className="text-xs text-gray-600 mt-1">
                  <strong>"{deleteModal.name}"</strong> kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: DAVETLİ DÜZENLEME MODALI
        ========================================================================= */}
        {editingGuest && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E9DDC2] space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-bold text-[#4B3423] text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#C59B27]" />
                  Davetliyi Düzenle
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingGuest(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditGuest} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Davetli Adı</label>
                  <input
                    type="text"
                    required
                    value={editingGuest.name}
                    onChange={(e) => setEditingGuest({ ...editingGuest, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefon Numarası</label>
                  <input
                    type="tel"
                    value={editingGuest.phone || ''}
                    onChange={(e) => setEditingGuest({ ...editingGuest, phone: e.target.value })}
                    placeholder="0532 123 45 67"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    WhatsApp gönderimi için 05XX... veya +90... olarak yazabilirsiniz.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori / Yakınlık</label>
                  <select
                    value={editingGuest.category || 'Genel'}
                    onChange={(e) => setEditingGuest({ ...editingGuest, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                  >
                    <option value="Genel">Genel</option>
                    <option value="Gelin Tarafı">Gelin Tarafı</option>
                    <option value="Damat Tarafı">Damat Tarafı</option>
                    <option value="Akraba">Akraba</option>
                    <option value="Arkadaşlar">Arkadaşlar</option>
                    <option value="İş / Meslektaş">İş / Meslektaş</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Özel Not (Masa, Kişi vb.)</label>
                  <textarea
                    rows={2}
                    value={editingGuest.notes || ''}
                    onChange={(e) => setEditingGuest({ ...editingGuest, notes: e.target.value })}
                    placeholder="Örn: 2 kişi gelecekler, Masa 4..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingGuest(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white text-xs font-bold shadow-xs hover:shadow"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: KATILIM (RSVP) CEVABI DÜZENLEME MODALI
        ========================================================================= */}
        {editingRsvp && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#E9DDC2] space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="font-bold text-[#4B3423] text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#C59B27]" />
                  Katılım (LCV) Kaydını Düzenle
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingRsvp(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditRsvp} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Misafir Adı Soyadı</label>
                    <input
                      type="text"
                      required
                      value={editingRsvp.fullName}
                      onChange={(e) => setEditingRsvp({ ...editingRsvp, fullName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Katılım Durumu</label>
                    <select
                      value={editingRsvp.attendance}
                      onChange={(e) =>
                        setEditingRsvp({
                          ...editingRsvp,
                          attendance: e.target.value as 'attending' | 'not_attending' | 'undecided',
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                    >
                      <option value="attending">Katılacak</option>
                      <option value="not_attending">Katılamayacak</option>
                      <option value="undecided">Kararsız</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Merasim Tercihi</label>
                    <select
                      value={editingRsvp.eventChoice}
                      onChange={(e) =>
                        setEditingRsvp({
                          ...editingRsvp,
                          eventChoice: e.target.value as 'both' | 'wedding' | 'henna',
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                    >
                      <option value="both">İkisi de (Kına + Düğün)</option>
                      <option value="wedding">Sadece Düğün</option>
                      <option value="henna">Sadece Kına</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Yetişkin Sayısı</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={editingRsvp.adultCount}
                      onChange={(e) =>
                        setEditingRsvp({ ...editingRsvp, adultCount: Number(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Çocuk Sayısı</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={editingRsvp.childCount}
                      onChange={(e) =>
                        setEditingRsvp({ ...editingRsvp, childCount: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={editingRsvp.phone || ''}
                    onChange={(e) => setEditingRsvp({ ...editingRsvp, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mesaj / Not</label>
                  <textarea
                    rows={2}
                    value={editingRsvp.message || ''}
                    onChange={(e) => setEditingRsvp({ ...editingRsvp, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#C59B27] focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingRsvp(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#DFBA52] via-[#C59B27] to-[#AA771C] text-white text-xs font-bold shadow-xs hover:shadow"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 4: WHATSAPP MESAJI ÖNİZLE & DÜZENLE & GÖNDER MODALI
        ========================================================================= */}
        {whatsappPreviewModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-emerald-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#4B3423] text-sm">
                      WhatsApp Mesajını Önizle & Gönder
                    </h4>
                    <span className="text-[11px] text-gray-500">
                      Alıcı: <strong>{whatsappPreviewModal.guestName}</strong>
                      {whatsappPreviewModal.phone && ` (${whatsappPreviewModal.phone})`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsappPreviewModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Gönderilecek Metin (İsterseniz bu kişiye özel ekleme yapabilirsiniz):
                </label>
                <textarea
                  rows={7}
                  value={whatsappPreviewModal.messageText}
                  onChange={(e) =>
                    setWhatsappPreviewModal({
                      ...whatsappPreviewModal,
                      messageText: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-2xl border border-emerald-200 bg-[#F0FDF4]/30 text-xs leading-relaxed font-sans focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappPreviewModal.messageText);
                    showToast('Mesaj metni panoya kopyalandı! Dilediğiniz yere yapıştırabilirsiniz.');
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Mesajı Kopyala</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setWhatsappPreviewModal(null)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100"
                  >
                    Kapat
                  </button>
                  <a
                    href={
                      whatsappPreviewModal.phone
                        ? `https://api.whatsapp.com/send?phone=${normalizeWhatsAppPhone(
                            whatsappPreviewModal.phone
                          )}&text=${encodeURIComponent(whatsappPreviewModal.messageText)}`
                        : `https://api.whatsapp.com/send?text=${encodeURIComponent(
                            whatsappPreviewModal.messageText
                          )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setWhatsappPreviewModal(null)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp'ta Aç ve Gönder</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TOAST BİLDİRİMİ (Güvenli bildirim balonu)
        ========================================================================= */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${
                toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-white border-emerald-300 text-emerald-950 shadow-emerald-500/10'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
