import React, { useState } from 'react';
import { Sparkles, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface GalleryProps {
  images?: string[];
}

export const GallerySection: React.FC<GalleryProps> = ({ images = [] }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return null; // As per brief: "Fotoğraf yoksa bölüm gizlensin."
  }

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);

  const prevImage = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
  };

  const nextImage = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % images.length);
  };

  return (
    <div id="galeri-bolumu" className="w-full max-w-4xl mx-auto px-4 my-12">
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-widest text-[#B38728] uppercase">
          Anılar & Kareler
        </span>
        <h3 className="font-serif-title text-2xl sm:text-3xl text-[#4A3324] mt-1 font-semibold">
          Fotoğraf Galerisi
        </h3>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((url, idx) => (
          <div
            key={idx}
            onClick={() => openLightbox(idx)}
            className="group relative aspect-square rounded-2xl overflow-hidden border border-[#E8DCBF] shadow-sm cursor-pointer bg-[#F5EFE6]"
          >
            <img
              src={url}
              alt={`Galeri Fotoğrafı ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="p-2 rounded-full bg-white/80 text-[#5A3E2B]">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 p-3 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
            <img
              src={images[selectedIndex]}
              alt={`Fotoğraf ${selectedIndex + 1}`}
              className="max-h-[80vh] w-auto object-contain mx-auto"
            />
          </div>

          <button
            onClick={nextImage}
            className="absolute right-4 p-3 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
