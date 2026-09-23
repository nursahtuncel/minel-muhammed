/**
 * Music URL helper and stream normalizer
 */

export const DEFAULT_WEDDING_MUSIC =
  'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3';

export const PRESET_WEDDING_TRACKS = [
  {
    id: 'romantic-piano',
    name: '🌸 Zarif Piyano & Keman (Romantik Düğün Fon Müziği)',
    url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    description: 'Yumuşak, duygusal ve asil piyano ezgileri (Telif sorunu olmayan güvenli yayın).',
  },
  {
    id: 'acoustic-wedding',
    name: '💍 Huzur Veren Akustik Gitar & Melodi',
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3',
    description: 'Sıcak, neşeli ve davetkâr akustik düğün melodisi.',
  },
  {
    id: 'oriental-ney',
    name: '🌿 Ney & Kanun Klasik Nikâh Fon Müziği',
    url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3',
    description: 'Geleneksel, manevi ve huzur dolu nikâh tınıları.',
  },
];

/**
 * Detects if a URL is a known web page that cannot be directly played as HTML5 audio
 */
export const checkNonDirectAudioService = (url: string): string | null => {
  if (!url) return null;
  const lower = url.toLowerCase().trim();

  if (lower.includes('audiomack.com')) {
    return 'Audiomack bir web sayfası bağlantısıdır. Tarayıcılar web sayfalarını ses olarak çalamaz. Lütfen şarkının MP3 dosyasını doğrudan cihazınızdan yükleyiniz.';
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return 'YouTube bağlantıları doğrudan HTML5 ses dosyası olarak çalınamaz. Lütfen şarkının MP3 dosyasını cihazınızdan yükleyiniz.';
  }
  if (lower.includes('spotify.com')) {
    return 'Spotify bağlantıları harici oynatıcı gerektirir. Lütfen MP3 dosyasını cihazınızdan yükleyiniz.';
  }
  if (lower.includes('soundcloud.com') && !lower.includes('.mp3')) {
    return 'SoundCloud web sayfası linki doğrudan ses akışı değildir. Lütfen MP3 dosyasını cihazınızdan yükleyiniz.';
  }

  return null;
};

/**
 * Normalizes cloud storage links (Google Drive, Dropbox, OneDrive) to direct streaming URLs
 */
export const normalizeAudioUrl = (rawUrl?: string): string => {
  if (!rawUrl || rawUrl.trim() === '') {
    return DEFAULT_WEDDING_MUSIC;
  }

  let clean = rawUrl.trim();

  // If local upload path
  if (clean.startsWith('/uploads/') || clean.startsWith('uploads/')) {
    return clean.startsWith('/') ? clean : `/${clean}`;
  }

  // Google Drive: /file/d/ID/view -> uc?export=download&id=ID
  const gdriveMatch = clean.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://docs.google.com/uc?export=download&id=${gdriveMatch[1]}`;
  }

  // Dropbox: replace dl=0 with dl=1 or raw=1
  if (clean.includes('dropbox.com')) {
    clean = clean.replace(/[?&]dl=0/, '');
    const separator = clean.includes('?') ? '&' : '?';
    return `${clean}${separator}raw=1`;
  }

  // OneDrive
  if (clean.includes('1drv.ms') || clean.includes('onedrive.live.com')) {
    if (!clean.includes('download=1')) {
      const separator = clean.includes('?') ? '&' : '?';
      return `${clean}${separator}download=1`;
    }
  }

  return clean;
};
