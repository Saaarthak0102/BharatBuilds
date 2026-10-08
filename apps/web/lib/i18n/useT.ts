'use client';

import { useState, useEffect } from 'react';
import { en } from './en';
import { hi } from './hi';
import { pa } from './pa';
import { Language } from '../types';

const dictionaries = { en, hi, pa };

type Dictionary = typeof en;
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export function useT() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    // Load preferred language from localStorage if available
    const saved = localStorage.getItem('saans_lang') as Language;
    if (saved && (saved === 'en' || saved === 'hi' || saved === 'pa')) {
      setLang(saved);
    }
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('saans_lang', newLang);
  };

  const t = (path: NestedKeyOf<Dictionary>): string => {
    const dict = dictionaries[lang] || dictionaries.en;
    const keys = path.split('.');
    
    let current: any = dict;
    for (const key of keys) {
      if (current[key] === undefined) {
        // Fallback to english
        let fallback: any = dictionaries.en;
        for (const k of keys) {
           if (fallback[k] === undefined) return path;
           fallback = fallback[k];
        }
        return fallback;
      }
      current = current[key];
    }
    
    return current;
  };

  return { t, lang, changeLanguage };
}
