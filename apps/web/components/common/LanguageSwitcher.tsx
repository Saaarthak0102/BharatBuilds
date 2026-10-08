'use client';

import { useT } from '@/lib/i18n/useT';
import { Language } from '@/lib/types';

export function LanguageSwitcher() {
  const { lang, changeLanguage } = useT();

  return (
    <div className="relative group">
      <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-white/50 border border-white/20 hover:bg-white/80 transition-colors">
        <span className="uppercase">{lang}</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="absolute right-0 mt-2 w-32 py-1 bg-white rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-dropdown">
        {(['en', 'hi', 'pa'] as Language[]).map((l) => (
          <button
            key={l}
            onClick={() => changeLanguage(l)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 hover:text-brand-700 transition-colors ${lang === l ? 'font-bold text-brand-600' : 'text-gray-700'}`}
          >
            {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'ਪੰਜਾਬੀ'}
          </button>
        ))}
      </div>
    </div>
  );
}
