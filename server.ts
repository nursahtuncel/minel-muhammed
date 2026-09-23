import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Ensure upload directory exists
const UPLOAD_DIR = path.resolve(__dirname, 'public/uploads/audio');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '50mb' }));

// Static audio files serving with explicit Range and MIME support
app.use('/uploads/audio', express.static(UPLOAD_DIR, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (filePath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (filePath.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (filePath.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/ogg');
    }
    res.setHeader('Accept-Ranges', 'bytes');
  }
}));

// API: Direct Music Upload Endpoint
app.post('/api/upload-music', (req, res) => {
  try {
    let fileBuffer: Buffer | null = null;
    let originalName = 'wedding-music.mp3';

    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      fileBuffer = req.body;
      const headerName = req.headers['x-filename'];
      if (typeof headerName === 'string') {
        originalName = decodeURIComponent(headerName);
      }
    } else if (req.body && req.body.data) {
      // Base64 fallback payload: { data: 'data:audio/mp3;base64,...', filename: 'song.mp3' }
      const base64Data = req.body.data.replace(/^data:audio\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      if (req.body.filename) {
        originalName = req.body.filename;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'Geçersiz veya boş ses dosyası.' });
    }

    // Sanitize extension
    const ext = path.extname(originalName).toLowerCase() || '.mp3';
    const safeExt = ['.mp3', '.m4a', '.wav', '.ogg', '.aac'].includes(ext) ? ext : '.mp3';
    const targetFilename = `wedding-music${safeExt}`;
    const targetPath = path.join(UPLOAD_DIR, targetFilename);

    fs.writeFileSync(targetPath, fileBuffer);

    // Also write a timestamped version for cache busting
    const timestampFilename = `wedding-music-${Date.now()}${safeExt}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, timestampFilename), fileBuffer);

    const publicUrl = `/uploads/audio/${timestampFilename}`;

    return res.json({
      success: true,
      url: publicUrl,
      filename: originalName,
      size: fileBuffer.length,
      message: 'Müzik dosyası başarıyla sunucuya yüklendi.',
    });
  } catch (err: any) {
    console.error('Audio upload error:', err);
    return res.status(500).json({ error: 'Müzik yüklenirken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata') });
  }
});

// API: Create short URL endpoint via TinyURL
app.post('/api/create-short-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Geçerli bir URL giriniz.' });
    }

    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`TinyURL servisi yanıt vermedi (${response.status})`);
    }
    const shortUrl = await response.text();
    if (!shortUrl || shortUrl.startsWith('Error')) {
      throw new Error(shortUrl || 'Kısa link üretilemedi');
    }

    return res.json({
      success: true,
      shortUrl: shortUrl.trim(),
    });
  } catch (err: any) {
    console.error('Short URL creation error:', err);
    return res.status(500).json({
      error: 'Kısa link oluşturulamadı: ' + (err?.message || 'Servis hatası'),
    });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
});
