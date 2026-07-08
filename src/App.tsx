/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import AndroidFrame from './components/AndroidFrame';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import { LevelProgress, GameSettings, GameStats, LevelData } from './types';
import { LEVELS } from './utils/levels';
import { sound } from './utils/audio';

const STORAGE_KEYS = {
  PROGRESS: 'bubble_shooter_progress',
  ENDLESS_HS: 'bubble_shooter_endless_hs',
  SETTINGS: 'bubble_shooter_settings',
  STATS: 'bubble_shooter_stats'
};

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  vibrateEnabled: true,
};

const DEFAULT_STATS: GameStats = {
  bubblesShot: 0,
  bubblesPopped: 0,
  totalScore: 0,
  levelsCompleted: 0,
  maxCombo: 0,
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'game'>('menu');
  const [selectedLevel, setSelectedLevel] = useState<LevelData | null>(null);

  // Persistence States
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>([]);
  const [endlessHighScore, setEndlessHighScore] = useState<number>(0);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);

  // Load state on mount
  useEffect(() => {
    // 1. Load Levels progress
    const savedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (savedProgress) {
      try {
        setLevelProgress(JSON.parse(savedProgress));
      } catch (e) {
        initDefaultProgress();
      }
    } else {
      initDefaultProgress();
    }

    // 2. Load Endless high score
    const savedEndless = localStorage.getItem(STORAGE_KEYS.ENDLESS_HS);
    if (savedEndless) {
      setEndlessHighScore(Number(savedEndless) || 0);
    }

    // 3. Load Settings
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        sound.enabled = parsed.soundEnabled;
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      sound.enabled = DEFAULT_SETTINGS.soundEnabled;
    }

    // 4. Load Stats
    const savedStats = localStorage.getItem(STORAGE_KEYS.STATS);
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {
        setStats(DEFAULT_STATS);
      }
    }
  }, []);

  const initDefaultProgress = () => {
    const initial: LevelProgress[] = LEVELS.map((lvl) => ({
      levelId: lvl.id,
      unlocked: lvl.id === 1, // Only first level unlocked initially
      highScore: 0,
      stars: 0,
    }));
    setLevelProgress(initial);
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(initial));
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
  };

  const handleResetProgress = () => {
    initDefaultProgress();
    setEndlessHighScore(0);
    setStats(DEFAULT_STATS);
    localStorage.setItem(STORAGE_KEYS.ENDLESS_HS, '0');
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS));
  };

  // Select level to play
  const handleSelectLevel = (levelId: number) => {
    const lvl = LEVELS.find((l) => l.id === levelId) || null;
    setSelectedLevel(lvl);
    setCurrentScreen('game');
  };

  // Select Endless mode
  const handleSelectEndless = () => {
    setSelectedLevel(null);
    setCurrentScreen('game');
  };

  // Handle Level completion
  const handleLevelComplete = (score: number, stars: number) => {
    if (!selectedLevel) return;

    // Update level progression
    const updatedProgress = levelProgress.map((p) => {
      // Current played level updates
      if (p.levelId === selectedLevel.id) {
        return {
          ...p,
          highScore: Math.max(p.highScore, score),
          stars: Math.max(p.stars, stars),
        };
      }
      // Unlock NEXT level
      if (p.levelId === selectedLevel.id + 1) {
        return {
          ...p,
          unlocked: true,
        };
      }
      return p;
    });

    setLevelProgress(updatedProgress);
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updatedProgress));

    // Update global Stats
    const isFirstTimeClear = (levelProgress.find(p => p.levelId === selectedLevel.id)?.stars || 0) === 0;
    const newStats: GameStats = {
      ...stats,
      totalScore: stats.totalScore + score,
      levelsCompleted: stats.levelsCompleted + (isFirstTimeClear ? 1 : 0),
      bubblesShot: stats.bubblesShot + (selectedLevel.movesLimit - 10), // estimate
      bubblesPopped: stats.bubblesPopped + 30, // estimate
    };
    setStats(newStats);
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(newStats));

    // Wait a brief delay for celebration, then routing menu
    setTimeout(() => {
      setCurrentScreen('menu');
    }, 1800);
  };

  // Handle Level fails
  const handleLevelFail = () => {
    // Just simple route back on game over popup action inside canvas
  };

  // Handle leaving active game canvas
  const handleBackToMenu = () => {
    sound.playShoot();
    setCurrentScreen('menu');
  };

  return (
    <AndroidFrame 
      onBackPress={currentScreen === 'game' ? handleBackToMenu : undefined} 
      showBackButton={currentScreen === 'game'}
    >
      {currentScreen === 'menu' ? (
        <MainMenu
          levelProgress={levelProgress}
          endlessHighScore={endlessHighScore}
          settings={settings}
          onChangeSettings={handleUpdateSettings}
          stats={stats}
          onSelectLevel={handleSelectLevel}
          onSelectEndless={handleSelectEndless}
          onResetProgress={handleResetProgress}
        />
      ) : (
        <GameCanvas
          levelData={selectedLevel}
          onLevelComplete={handleLevelComplete}
          onLevelFail={handleLevelFail}
          onBackToMenu={handleBackToMenu}
          soundEnabled={settings.soundEnabled}
          vibrateEnabled={settings.vibrateEnabled}
        />
      )}
    </AndroidFrame>
  );
}
