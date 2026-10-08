'use client';

import { useState } from 'react';
import { Role } from '@/lib/types';
import { Card } from '../ui/Card';

export function RoleSelector({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-center mb-6">Choose your role</h2>
      
      <button 
        onClick={() => onSelect('farmer')}
        className="w-full block text-left group"
      >
        <Card className="hover:border-brand-500 hover:bg-brand-50 transition-colors border-2 border-transparent">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🚜</div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">Farmer in Punjab</h3>
              <p className="text-sm text-text-secondary mt-1">Get field clearing advice and book machinery</p>
            </div>
          </div>
        </Card>
      </button>

      <button 
        onClick={() => onSelect('citizen')}
        className="w-full block text-left group"
      >
        <Card className="hover:border-sky-500 hover:bg-sky-50 transition-colors border-2 border-transparent">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🏙️</div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">Delhi NCR Citizen</h3>
              <p className="text-sm text-text-secondary mt-1">Check AQI, report burning, and get alerts</p>
            </div>
          </div>
        </Card>
      </button>
    </div>
  );
}
