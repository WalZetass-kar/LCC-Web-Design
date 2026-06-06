import React from 'react';
import { useFeature } from './FeatureContext';

interface FeatureGateProps {
  /** Kode fitur dari master (mis. "reports", "export_excel"). */
  code: string;
  /** Jika true, render children tapi blok klik & tampilkan popup upgrade. */
  softLock?: boolean;
  /** Tampilan alternatif kalau fitur dikunci dan softLock=false. */
  fallback?: React.ReactNode;
  /** Saat fitur tidak aktif dan tidak ada fallback, sembunyikan saja. */
  hideWhenLocked?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Bungkus tombol/section dengan komponen ini agar otomatis tunduk pada feature flag.
 *
 * Contoh:
 *  <FeatureGate code="export_excel" softLock>
 *    <button className="btn-primary">Export Excel</button>
 *  </FeatureGate>
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  code,
  softLock = false,
  fallback = null,
  hideWhenLocked = false,
  children,
  className,
}) => {
  const { enabled, showUpgrade } = useFeature(code);

  if (enabled) {
    return className ? <span className={className}>{children}</span> : <>{children}</>;
  }

  if (softLock) {
    return (
      <span
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          showUpgrade();
        }}
        title="Fitur ini terkunci. Klik untuk upgrade."
        className={'opacity-50 cursor-not-allowed inline-block ' + (className ?? '')}
      >
        {children}
      </span>
    );
  }

  if (fallback) return <>{fallback}</>;
  if (hideWhenLocked) return null;
  return null;
};
