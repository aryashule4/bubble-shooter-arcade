/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Trophy, Settings, HelpCircle, Volume2, VolumeX, 
  Flame, Zap, Sparkles, BarChart2, RotateCcw, Lock, Star 
} from 'lucide-react';
import { LevelProgress, GameSettings, GameStats, COLOR_MAP } from '../types';
import { LEVELS } from '../utils/levels';
import { sound } from '../utils/audio';

interface MainMenuProps {
  levelProgress: LevelProgress[];
  endlessHighScore: number;
  settings: GameSettings;
  onChangeSettings: (settings: GameSettings) => void;
  stats: GameStats;
  onSelectLevel: (levelId: number) => void;
  onSelectEndless: () => void;
  onResetProgress: () => void;
}

export default function MainMenu({
  levelProgress,
  endlessHighScore,
  settings,
  onChangeSettings,
  stats,
  onSelectLevel,
  onSelectEndless,
  onResetProgress,
}: MainMenuProps) {
  const [activeTab, setActiveTab] = useState<'levels' | 'endless' | 'stats'>('levels');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const toggleSound = () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    onChangeSettings(newSettings);
    sound.enabled = newSettings.soundEnabled;
    sound.playShoot();
  };

  const toggleVibrate = () => {
    const newSettings = { ...settings, vibrateEnabled: !settings.vibrateEnabled };
    onChangeSettings(newSettings);
    if (newSettings.vibrateEnabled && navigator.vibrate) {
      navigator.vibrate(100);
    }
    sound.playPop();
  };

  const handleSelectLevel = (levelId: number, unlocked: boolean) => {
    if (!unlocked) {
      sound.playLose();
      return;
    }
    sound.playPowerUp();
    onSelectLevel(levelId);
  };

  const handleSelectEndless = () => {
    sound.playPowerUp();
    onSelectEndless();
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto no-bounce px-4 pb-8 pt-4">
      {/* Game Title Logo Area */}
      <div className="flex flex-col items-center justify-center py-6 select-none shrink-0">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120 }}
          className="relative flex items-center justify-center"
        >
          {/* Glowing background halo */}
          <div className="absolute inset-0 bg-rose-500/10 blur-3xl rounded-full w-48 h-48 -z-10 animate-pulse"></div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full text-[11px] font-mono tracking-widest text-rose-400 font-bold uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> ARCADE CLASSIC
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-center leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-400 to-amber-400 font-black uppercase tracking-tight block">
                BUBBLE
              </span>
              <span className="text-slate-100 block tracking-wider font-extrabold text-3xl mt-1">
                SHOOTER
              </span>
            </h1>
          </div>
        </motion.div>
      </div>

      {/* Floating Header Icons */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2.5 mb-6 shrink-0">
        <button
          onClick={() => { sound.playShoot(); setShowHelp(true); }}
          className="flex-1 flex flex-col items-center py-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors active:scale-95"
        >
          <HelpCircle className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono font-medium">Bantuan</span>
        </button>

        <div className="h-6 w-px bg-slate-800"></div>

        <button
          onClick={() => { sound.playShoot(); setShowSettings(true); }}
          className="flex-1 flex flex-col items-center py-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors active:scale-95"
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-mono font-medium">Pengaturan</span>
        </button>

        <div className="h-6 w-px bg-slate-800"></div>

        <button
          onClick={toggleSound}
          className="flex-1 flex flex-col items-center py-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors active:scale-95"
        >
          {settings.soundEnabled ? <Volume2 className="w-5 h-5 mb-0.5 text-cyan-400" /> : <VolumeX className="w-5 h-5 mb-0.5 text-slate-600" />}
          <span className="text-[10px] font-mono font-medium">Suara</span>
        </button>
      </div>

      {/* Nav Tabs for Game Modes */}
      <div className="flex bg-slate-900/50 border border-slate-800/50 p-1 rounded-xl mb-6 shrink-0 font-mono text-xs font-bold">
        <button
          onClick={() => { sound.playShoot(); setActiveTab('levels'); }}
          className={`flex-1 py-2.5 rounded-lg transition-all ${
            activeTab === 'levels'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          LEVEL MODE
        </button>
        <button
          onClick={() => { sound.playShoot(); setActiveTab('endless'); }}
          className={`flex-1 py-2.5 rounded-lg transition-all ${
            activeTab === 'endless'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          ENDLESS
        </button>
        <button
          onClick={() => { sound.playShoot(); setActiveTab('stats'); }}
          className={`flex-1 py-2.5 rounded-lg transition-all ${
            activeTab === 'stats'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          STATS
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'levels' && (
            <motion.div
              key="levels"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                {LEVELS.map((lvl) => {
                  const progress = levelProgress.find((p) => p.levelId === lvl.id) || {
                    levelId: lvl.id,
                    unlocked: lvl.id === 1,
                    highScore: 0,
                    stars: 0,
                  };

                  return (
                    <button
                      key={lvl.id}
                      onClick={() => handleSelectLevel(lvl.id, progress.unlocked)}
                      className={`relative flex flex-col p-4 rounded-2xl border text-left transition-all overflow-hidden active:scale-95 group ${
                        progress.unlocked
                          ? 'bg-slate-900 border-slate-800 hover:border-rose-500/50'
                          : 'bg-slate-950 border-slate-900/60 opacity-60'
                      }`}
                    >
                      {/* Background decor */}
                      <div className="absolute -right-2 -bottom-2 w-12 h-12 rounded-full bg-slate-800/10 group-hover:scale-150 transition-transform"></div>

                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono font-bold text-rose-400">
                          LVL {lvl.id}
                        </span>
                        {!progress.unlocked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-600" />
                        ) : (
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map((starIdx) => (
                              <Star
                                key={starIdx}
                                className={`w-3.5 h-3.5 ${
                                  starIdx <= progress.stars
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <span className="font-bold text-sm text-slate-100 truncate">
                        {lvl.name}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 font-mono truncate">
                        High Score: {progress.highScore}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'endless' && (
            <motion.div
              key="endless"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3">
                  <Flame className="w-12 h-12 text-rose-500/20 animate-pulse" />
                </div>
                
                <h3 className="text-lg font-bold text-rose-400 uppercase tracking-wide">
                  Survival Mode
                </h3>
                <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
                  Tembak balon sebanyak mungkin! Barisan balon akan terus turun ke bawah secara otomatis. Bertahanlah selama mungkin!
                </p>

                <div className="mt-6 flex flex-col items-center">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                    REKOR TERTINGGI
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <Trophy className="w-5 h-5 text-amber-400 self-center" />
                    <span className="text-3xl font-black font-mono text-amber-400">
                      {endlessHighScore}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSelectEndless}
                className="w-full bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-rose-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 text-base cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" />
                MULAI PERMAINAN
              </button>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Total Tembakan:</span>
                  <span className="font-bold text-slate-100">{stats.bubblesShot}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Total Meletus:</span>
                  <span className="font-bold text-slate-100">{stats.bubblesPopped}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Total Skor Terkumpul:</span>
                  <span className="font-bold text-rose-400">{stats.totalScore}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-2">
                  <span className="text-slate-400">Level Diselesaikan:</span>
                  <span className="font-bold text-emerald-400">{stats.levelsCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Combo Maksimal:</span>
                  <span className="font-bold text-cyan-400">{stats.maxCombo}x</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus semua rekor progres game?')) {
                    onResetProgress();
                    sound.playLose();
                  }
                }}
                className="w-full bg-slate-950 hover:bg-red-950/30 text-rose-500 border border-rose-950/40 font-bold py-3 rounded-2xl text-xs transition-all active:scale-95"
              >
                Reset Semua Data Progres
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Settings Modal --- */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 relative"
            >
              <h2 className="text-xl font-extrabold text-slate-100 uppercase tracking-wide mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-rose-500" /> Pengaturan Game
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-900">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-100">Suara / SFX</span>
                    <span className="text-[10px] text-slate-500 font-mono">Web Audio Synthesizer</span>
                  </div>
                  <button
                    onClick={toggleSound}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-900">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-100">Getaran (Vibrate)</span>
                    <span className="text-[10px] text-slate-500 font-mono">Android Haptic Feedback</span>
                  </div>
                  <button
                    onClick={toggleVibrate}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      settings.vibrateEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.vibrateEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={() => { sound.playShoot(); setShowSettings(false); }}
                className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-3 rounded-2xl text-xs transition-colors"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Tutorial / Help Modal --- */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 relative max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-xl font-extrabold text-slate-100 uppercase tracking-wide mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" /> Cara Bermain
              </h2>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-900 space-y-2">
                  <h3 className="font-bold text-rose-400 flex items-center gap-1.5">
                    🎯 Aturan Dasar
                  </h3>
                  <p className="leading-relaxed">
                    Arahkan penembak balon dengan menggeser layar (Touch/Drag) lalu lepaskan untuk menembak. Gabungkan <strong>3 balon atau lebih</strong> dengan warna yang sama agar meletus!
                  </p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-900 space-y-3">
                  <h3 className="font-bold text-cyan-400 flex items-center gap-1.5">
                    ⚡ Power-up Spesial
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-white shadow-lg shrink-0">🔥</div>
                    <div>
                      <h4 className="font-bold text-slate-100">Fireball (Bola Api)</h4>
                      <p className="text-[10px] text-slate-400">Meledakkan area sekitar radius target balon yang terkena.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shrink-0">🌈</div>
                    <div>
                      <h4 className="font-bold text-slate-100">Rainbow (Pelangi)</h4>
                      <p className="text-[10px] text-slate-400">Balon serbaguna yang otomatis cocok dengan semua warna.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-white shadow-lg shrink-0">⚡</div>
                    <div>
                      <h4 className="font-bold text-slate-100">Laser Guide</h4>
                      <p className="text-[10px] text-slate-400">Menampilkan garis bantu bidikan pantulan yang lebih panjang.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-900 space-y-1">
                  <h3 className="font-bold text-emerald-400">🎈 Balon Melayang</h3>
                  <p className="leading-relaxed">
                    Jika Anda meletuskan sekelompok balon, balon lain yang menggantung di bawahnya dan terputus dari langit-langit akan <strong>jatuh berjatuhan</strong>, memberikan bonus skor besar!
                  </p>
                </div>
              </div>

              <button
                onClick={() => { sound.playShoot(); setShowHelp(false); }}
                className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-3 rounded-2xl text-xs transition-colors"
              >
                Mengerti
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
