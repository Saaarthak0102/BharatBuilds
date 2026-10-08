'use client';

import { ReactNode } from 'react';

export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) {
  
  const base = "inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
    secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
    outline: "border-2 border-brand-200 text-brand-700 hover:border-brand-500 hover:bg-brand-50",
    ghost: "text-brand-600 hover:bg-brand-50"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
