/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BubbleColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'cyan' | 'fireball' | 'rainbow';

export interface Bubble {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  color: BubbleColor;
  radius: number;
  isPopping?: boolean;
  popProgress?: number; // 0 to 1
  isFalling?: boolean;
  vx?: number;
  vy?: number;
  alpha?: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  radius: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number; // 0 to 1
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number; // 0 to 1
  scale: number;
}

export interface PowerUp {
  id: 'fireball' | 'rainbow' | 'laser';
  name: string;
  description: string;
  icon: string;
  cost: number;
  count: number;
}

export interface LevelData {
  id: number;
  name: string;
  targetDescription: string;
  movesLimit: number;
  stars: [number, number, number]; // Score thresholds for 1, 2, 3 stars
  grid: (BubbleColor | null)[][]; // Initial grid layout
}

export interface LevelProgress {
  levelId: number;
  unlocked: boolean;
  highScore: number;
  stars: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

export interface GameStats {
  bubblesShot: number;
  bubblesPopped: number;
  totalScore: number;
  levelsCompleted: number;
  maxCombo: number;
}

// Map color IDs to actual premium gradient styles/hex
export const COLOR_MAP: Record<BubbleColor, { main: string; dark: string; light: string; glow: string }> = {
  red: { main: '#F43F5E', dark: '#9F1239', light: '#FDA4AF', glow: 'rgba(244, 63, 94, 0.6)' },
  green: { main: '#10B981', dark: '#065F46', light: '#A7F3D0', glow: 'rgba(16, 185, 129, 0.6)' },
  blue: { main: '#3B82F6', dark: '#1E40AF', light: '#93C5FD', glow: 'rgba(59, 130, 246, 0.6)' },
  yellow: { main: '#F59E0B', dark: '#92400E', light: '#FDE68A', glow: 'rgba(245, 158, 11, 0.6)' },
  purple: { main: '#8B5CF6', dark: '#5B21B6', light: '#C4B5FD', glow: 'rgba(139, 92, 246, 0.6)' },
  cyan: { main: '#06B6D4', dark: '#155E75', light: '#A5F3FC', glow: 'rgba(6, 182, 212, 0.6)' },
  fireball: { main: '#EF4444', dark: '#7F1D1D', light: '#FEE2E2', glow: 'rgba(239, 68, 68, 0.8)' },
  rainbow: { main: '#EC4899', dark: '#500724', light: '#FCE7F3', glow: 'rgba(236, 72, 153, 0.8)' },
};

export const NORMAL_COLORS: ('red' | 'green' | 'blue' | 'yellow' | 'purple' | 'cyan')[] = [
  'red',
  'green',
  'blue',
  'yellow',
  'purple',
  'cyan',
];
