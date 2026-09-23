import React, { useEffect, useState } from 'react';
import { Heart, MessageSquareQuote, Sparkles } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { MessageItem } from '../types';

export const WishesWall: React.FC = () => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to live approved messages
    const q = query(
      collection(db, 'messages'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MessageItem[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        console.warn('WishesWall snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 my-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF3E5] border border-[#EADBBF] text-xs font-semibold text-[#8C6B28] mb-2">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>Dua & Tebrik Duvarı</span>
        </div>
        <h4 className="font-serif-title text-2xl sm:text-3xl text-[#4A3324] font-semibold">
          Misafirlerimizin Güzel Dilekleri
        </h4>
        <p className="text-xs sm:text-sm text-[#7D6657] mt-1">
          Siz de yukarıdaki formdan dualarınızı ve tebriklerinizi iletebilirsiniz.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center p-8 rounded-2xl bg-white/50 border border-dashed border-[#DECDB0] text-[#8C7665]">
          <MessageSquareQuote className="w-8 h-8 mx-auto text-[#C59B27]/60 mb-2" />
          <p className="text-sm font-serif-title text-base">
            Henüz tebrik mesajı bırakılmamış. İlk güzel duayı siz bırakın! ✨
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {messages.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white/85 backdrop-blur-sm border border-[#EADBBD] shadow-sm relative overflow-hidden group hover:border-[#D4AF37] transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-sm text-[#4E3727] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  {item.fullName}
                </span>
                <span className="text-[11px] text-[#A39182]">
                  {formatDate(item.createdAt)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#5E4736] leading-relaxed italic">
                "{item.message}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
