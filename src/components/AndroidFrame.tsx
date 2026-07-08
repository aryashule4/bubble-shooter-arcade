/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, ChevronLeft, Home, Square, ArrowLeft } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  onBackPress?: () => void;
  showBackButton?: boolean;
}

export default function AndroidFrame({ children, onBackPress, showBackButton = false }: AndroidFrameProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setTime(`${hours}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 md:p-6 select-none font-sans overflow-x-hidden text-slate-100 no-bounce">
      
      {/* Container simulating a premium Android device */}
      <div 
        id="android-device-outer"
        className="relative w-full max-w-md h-screen md:h-[840px] bg-slate-900 md:rounded-[44px] md:border-[12px] md:border-slate-800 md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-all duration-300 md:ring-4 md:ring-slate-700/30"
      >
        {/* Phone Camera Notch (Visible on Desktop) */}
        <div className="hidden md:block absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50">
          <div className="absolute top-1 right-8 w-2 h-2 rounded-full bg-slate-950 border border-slate-700"></div>
          <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-10 h-1 rounded-full bg-slate-900"></div>
        </div>

        {/* Android Status Bar */}
        <div className="h-7 px-5 bg-slate-950 flex items-center justify-between text-xs font-medium text-slate-400 z-40 shrink-0">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] tracking-tight">{time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] font-mono">LTE</span>
              <Battery className="w-4 h-4 ml-0.5 text-emerald-500 fill-emerald-500/25" />
            </div>
          </div>
        </div>

        {/* Action Header bar inside the screen (if back button enabled) */}
        {showBackButton && (
          <div className="h-12 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-30 shrink-0">
            <button 
              id="android-back-btn"
              onClick={onBackPress}
              className="p-1.5 rounded-full hover:bg-slate-800 text-rose-500 transition-colors flex items-center gap-1 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Kembali</span>
            </button>
            <div className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
              Bubble Shooter
            </div>
            <div className="w-8"></div> {/* Spacer for symmetry */}
          </div>
        )}

        {/* Primary Screen Area */}
        <div id="android-screen-content" className="flex-1 relative flex flex-col bg-slate-950 overflow-hidden">
          {children}
        </div>

        {/* Android Native Virtual Navigation Bar */}
        <div className="h-10 bg-slate-950 border-t border-slate-900/40 flex items-center justify-around text-slate-500 z-40 shrink-0 select-none">
          <button 
            id="android-nav-back"
            onClick={onBackPress || (() => {})} 
            disabled={!onBackPress}
            className={`p-2 transition-all active:scale-75 ${onBackPress ? 'text-slate-400 hover:text-rose-400' : 'opacity-20 cursor-not-allowed'}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <button 
            id="android-nav-home"
            className="p-2 text-slate-400 hover:text-rose-400 transition-all active:scale-75"
          >
            <Home className="w-4 h-4" />
          </button>
          
          <button 
            id="android-nav-recents"
            className="p-2 text-slate-400 hover:text-rose-400 transition-all active:scale-75"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Desktop Helper Instructions */}
      <p className="hidden md:block mt-4 text-xs text-slate-500 font-mono text-center max-w-sm">
        💡 Drag atau Gerakkan mouse untuk membidik, lepas klik untuk menembak. <br/>
        Gunakan mode full-screen atau view seluler untuk pengalaman Android optimal.
      </p>
    </div>
  );
}
