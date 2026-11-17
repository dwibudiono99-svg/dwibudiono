import React, { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  X,
} from 'lucide-react';
import { OrgNode, SchoolProfile, ViewTab } from '../types/org';

export const DEFAULT_APP_WEB_URL =
  'https://ais-pre-kcxun5xqxzgbw5ptyepfru-302703941788.asia-southeast1.run.app';

interface WebLinkShareModalProps {
  isOpen: boolean;
  schoolProfile: SchoolProfile;
  activeTab: ViewTab;
  selectedNode: OrgNode | null;
  onClose: () => void;
  onUpdateProfile: (updated: SchoolProfile) => void;
}

export const WebLinkShareModal: React.FC<WebLinkShareModalProps> = ({
  isOpen,
  schoolProfile,
  activeTab,
  selectedNode,
  onClose,
  onUpdateProfile,
}) => {
  const [urlDraft, setUrlDraft] = useState(
    schoolProfile.appWebUrl || DEFAULT_APP_WEB_URL
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setUrlDraft(schoolProfile.appWebUrl || DEFAULT_APP_WEB_URL);
    setCopiedKey(null);
    setSavedFeedback(false);
  }, [isOpen, schoolProfile.appWebUrl]);

  if (!isOpen) return null;

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed) return DEFAULT_APP_WEB_URL;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const basePublicUrl = normalizeUrl(urlDraft);
  const deepParams = new URLSearchParams();
  if (activeTab !== 'bagan') deepParams.set('tab', activeTab);
  if (selectedNode) deepParams.set('unit', selectedNode.id);
  const queryStr = deepParams.toString();
  const deepLinkUrl = queryStr ? `${basePublicUrl}/?${queryStr}` : `${basePublicUrl}/`;

  const embedIframeCode = `<iframe src="${basePublicUrl}/" title="Struktur Organisasi ${schoolProfile.schoolName}" width="100%" height="840" style="border:1px solid #e7e5e4;border-radius:12px;" loading="lazy"></iframe>`;

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback ignored if clipboard permissions are blocked
    }
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = normalizeUrl(urlDraft);
    setUrlDraft(cleaned);
    onUpdateProfile({ ...schoolProfile, appWebUrl: cleaned });
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 2200);
  };

  const handleUseCurrentBrowserUrl = () => {
    const currentUrl =
      window.location.origin + window.location.pathname.replace(/\/+$/, '');
    setUrlDraft(currentUrl);
    onUpdateProfile({ ...schoolProfile, appWebUrl: currentUrl });
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 2200);
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-link-modal-title"
    >
      <div
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl bg-[#FAF9F6] border border-stone-200 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-900" />
            <h2
              id="web-link-modal-title"
              className="font-display text-lg font-semibold text-stone-900"
            >
              Tautan Web Aplikasi &amp; Semat Portal Sekolah
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal tautan web"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-[13px] text-stone-600 leading-relaxed">
            Gunakan tautan di bawah ini untuk membuka bagan struktur organisasi secara daring di peramban web, membagikannya ke guru/wali murid/dinas, atau menyematkannya langsung ke situs web resmi sekolah.
          </p>

          {/* 1. Alamat Tautan Web Publik */}
          <form
            onSubmit={handleSaveUrl}
            className="bg-white border border-stone-200 rounded-xl p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-900" />
                <span>Alamat Web Aplikasi (Dapat Ditelusur Online)</span>
              </label>
              <button
                type="button"
                onClick={handleUseCurrentBrowserUrl}
                className="text-xs font-medium text-blue-900 hover:underline cursor-pointer"
              >
                Pakai URL Peramban Saat Ini
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder={DEFAULT_APP_WEB_URL}
                className="flex-1 px-3 py-2 text-sm font-mono-num bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-lg whitespace-nowrap cursor-pointer"
              >
                {savedFeedback ? 'Tersimpan' : 'Simpan URL'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={`${basePublicUrl}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Tautan di Tab Baru</span>
              </a>

              <button
                type="button"
                onClick={() => handleCopy('main', `${basePublicUrl}/`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'main' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-800">Tautan Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link Utama</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 2. Deep Link ke Tampilan / Jabatan Saat Ini */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Tautan Langsung Tampilan Saat Ini
                {selectedNode ? ` (${selectedNode.roleTitle})` : ''}
              </p>
              <span className="text-[11px] font-mono-num text-stone-500">
                Tab: {activeTab}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={deepLinkUrl}
                aria-label="Tautan langsung tampilan saat ini"
                className="flex-1 px-3 py-2 text-xs font-mono-num bg-stone-50 border border-stone-200 rounded-lg text-stone-700"
              />
              <button
                type="button"
                onClick={() => handleCopy('deep', deepLinkUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'deep' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Kode Semat HTML (Embed Website Sekolah) */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-900" />
                <span>Kode Semat Website Sekolah (HTML Embed / iFrame)</span>
              </p>
              <button
                type="button"
                onClick={() => handleCopy('embed', embedIframeCode)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
              >
                {copiedKey === 'embed' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-800">Kode Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode Semat</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono-num bg-stone-900 text-stone-100 rounded-lg overflow-x-auto leading-relaxed">
              {embedIframeCode}
            </pre>
            <p className="text-[11px] text-stone-500">
              Tempelkan kode HTML di atas pada halaman profil website sekolah agar pengunjung dapat menelusuri bagan organisasi secara langsung.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
