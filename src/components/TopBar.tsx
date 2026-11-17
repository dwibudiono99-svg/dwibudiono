import React from 'react';
import { Printer } from 'lucide-react';
import { ViewTab } from '../types/org';

interface TopBarProps {
  schoolName: string;
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onPrint: () => void;
}

const NAV_ITEMS: { id: ViewTab; label: string }[] = [
  { id: 'bagan', label: 'Bagan Struktur' },
  { id: 'direktori', label: 'Direktori SDM' },
  { id: 'tupoksi', label: 'Tupoksi & Unit' },
  { id: 'statistik', label: 'Statistik' },
];

export const TopBar: React.FC<TopBarProps> = ({
  schoolName,
  activeTab,
  onSelectTab,
  onPrint,
}) => {
  return (
    <header className="no-print sticky top-0 z-30 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('bagan')}
          className="font-display text-lg sm:text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0 text-left hover:text-blue-900 transition-colors cursor-pointer"
        >
          {schoolName}
        </button>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav
          aria-label="Navigasi utama"
          className="flex items-center gap-5 sm:gap-7 overflow-x-auto no-scrollbar"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-blue-900'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-900"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-900 hover:bg-blue-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Cetak Bagan</span>
          </button>
        </div>
      </div>
    </header>
  );
};
