import React from 'react';
import { Crown, MessageCircle, X, Sparkles, Zap } from 'lucide-react';
import { useLicense } from './FeatureContext';
import { sanitizeHtml } from '../utils/sanitizeHtml';

export const UpgradePopup: React.FC = () => {
  const { popup, closePopup, plan } = useLicense();
  if (!popup) return null;
  const ctaUrl = safeHttpsUrl(popup.cta_url);
  const whatsappNumber = popup.whatsapp_number?.replace(/[^\d]/g, '');

  const goToPricing = () => {
    closePopup();
    window.location.hash = '#/langganan';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={closePopup}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 sm:p-7 text-white space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closePopup}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg mb-1">
            <Crown className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {popup.title || 'Fitur Premium Terkunci'}
          </h2>
          {popup.description && (
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {popup.description}
            </p>
          )}
        </div>

        {/* Current Plan Badge */}
        {plan && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <span className="text-slate-400">Paket Toko Saat Ini:</span>
            <span className="font-bold text-amber-400">{plan.name}</span>
          </div>
        )}

        {/* Custom Pricing HTML if present */}
        {popup.pricing_html && (
          <div
            className="rounded-2xl bg-white/5 border border-white/10 p-3.5 text-xs text-slate-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(popup.pricing_html) }}
          />
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <button
            onClick={goToPricing}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition"
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>Lihat Paket & Upgrade Sekarang</span>
          </button>

          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=Halo,%20saya%20mau%20tanya%20upgrade%20paket%20Zetass%20POS`}
              target="_blank"
              rel="noreferrer"
              onClick={closePopup}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-xs transition"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              <span>Konsultasi via WhatsApp</span>
            </a>
          )}

          <button
            onClick={closePopup}
            className="w-full text-center text-xs text-slate-400 hover:text-white py-1.5 transition"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
};

function safeHttpsUrl(value?: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}
