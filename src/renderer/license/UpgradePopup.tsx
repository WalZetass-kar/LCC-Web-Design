import React from 'react';
import { useLicense } from './FeatureContext';
import { sanitizeHtml } from '../utils/sanitizeHtml';

/**
 * Popup upgrade yang isi nya datang dari server (dari tabel popup_settings).
 * Otomatis muncul saat:
 *  - fitur terkunci diakses (FEATURE_LOCKED)
 *  - limit tercapai (DEMO_LIMIT)
 *  - subscription expired (EXPIRED)
 *  - dipanggil manual via showUpgradePopup()
 */
export const UpgradePopup: React.FC = () => {
  const { popup, closePopup, plan } = useLicense();
  if (!popup) return null;
  const ctaUrl = safeHttpsUrl(popup.cta_url);
  const whatsappNumber = popup.whatsapp_number?.replace(/[^\d]/g, '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
      onClick={closePopup}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {popup.image_url && (
          <img src={popup.image_url} alt="" className="w-full h-40 object-cover" />
        )}
        <div className="p-6">
          <div className="text-3xl mb-2">🔒</div>
          <h2 className="text-xl font-bold">{popup.title}</h2>
          {popup.description && (
            <p className="mt-2 text-gray-600 whitespace-pre-line">{popup.description}</p>
          )}

          {plan && (
            <div className="mt-3 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              Paket Anda saat ini: <b>{plan.name}</b>
            </div>
          )}

          {popup.pricing_html && (
            <div
              className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(popup.pricing_html) }}
            />
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={closePopup}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Nanti Saja
            </button>
            {ctaUrl && (
              <a
                href={ctaUrl}
                target="_blank"
                rel="noreferrer"
                onClick={closePopup}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
              >
                {popup.cta_text || 'Upgrade Sekarang'}
              </a>
            )}
          </div>

          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=Halo,%20saya%20mau%20upgrade%20paket%20MediaSoft%20POS`}
              target="_blank"
              rel="noreferrer"
              onClick={closePopup}
              className="mt-3 block text-center text-sm text-green-600 hover:underline"
            >
              💬 Atau hubungi via WhatsApp
            </a>
          )}
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
