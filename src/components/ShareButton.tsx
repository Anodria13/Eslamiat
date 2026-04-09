import React from 'react';
import { Share2 } from 'lucide-react';
import { useToast } from './ToastContext';

interface ShareButtonProps {
  text: string;
  title?: string;
  isRtl: boolean;
}

export default function ShareButton({ text, title, isRtl }: ShareButtonProps) {
  const { showToast } = useToast();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'مشاركة',
          text: text,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(isRtl ? 'تم نسخ النص إلى الحافظة' : 'Text copied to clipboard', 'success');
    }).catch(() => {
      showToast(isRtl ? 'فشل في نسخ النص' : 'Failed to copy text', 'error');
    });
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-colors"
      title={isRtl ? 'مشاركة' : 'Share'}
    >
      <Share2 className="w-5 h-5" />
    </button>
  );
}
