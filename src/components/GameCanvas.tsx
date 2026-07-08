/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, Volume2, VolumeX, Pause, Play, Flame, 
  Sparkles, Zap, ArrowLeft, RefreshCw, Trophy
} from 'lucide-react';
import { 
  Bubble, BubbleColor, Projectile, Particle, FloatingText, 
  PowerUp, LevelData, COLOR_MAP, NORMAL_COLORS 
} from '../types';
import { sound } from '../utils/audio';

interface GameCanvasProps {
  levelData: LevelData | null; // null means Endless mode
  onLevelComplete: (score: number, stars: number) => void;
  onLevelFail: () => void;
  onBackToMenu: () => void;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

// Fixed Logical resolution for deterministic physics
const WIDTH = 360;
const HEIGHT = 540;
const BUBBLE_RADIUS = 20;
const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
const GRID_COLS_EVEN = 8;
const GRID_PADDING_LEFT = (WIDTH - (GRID_COLS_EVEN * BUBBLE_DIAMETER)) / 2; // (360 - 320)/2 = 20 px
const ROW_HEIGHT = 33; // Nesting height, approx R * sqrt(3)
const LAUNCHER_X = WIDTH / 2;
const LAUNCHER_Y = HEIGHT - 45;

export default function GameCanvas({
  levelData,
  onLevelComplete,
  onLevelFail,
  onBackToMenu,
  soundEnabled,
  vibrateEnabled,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core States
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'win' | 'lose'>('playing');
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(levelData ? levelData.movesLimit : 999);
  const [comboCount, setComboCount] = useState(0);
  const [coins, setCoins] = useState(100); // Earn coins by popping to buy powerups

  // Powerups State
  const [powerUps, setPowerUps] = useState<PowerUp[]>([
    { id: 'fireball', name: 'Bola Api', description: 'Meledakkan balon sekitar', icon: '🔥', cost: 40, count: 2 },
    { id: 'rainbow', name: 'Pelangi', description: 'Cocok dengan semua warna', icon: '🌈', cost: 30, count: 1 },
    { id: 'laser', name: 'Laser Laser', description: 'Garis bidikan panjang', icon: '⚡', cost: 20, count: 2 },
  ]);
  const [activePowerUp, setActivePowerUp] = useState<'fireball' | 'rainbow' | null>(null);
  const [laserActive, setLaserActive] = useState(false);

  // Grid and Shooter state (refs for high frequency loop)
  const gridRef = useRef<(BubbleColor | null)[][]>([]);
  const projectileRef = useRef<Projectile | null>(null);
  const nextBubbleColorRef = useRef<BubbleColor>('red');
  const currentBubbleColorRef = useRef<BubbleColor>('blue');
  const fallingBubblesRef = useRef<Bubble[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Aiming vector state
  const [aimAngle, setAimAngle] = useState<number>(-Math.PI / 2);
  const [isAiming, setIsAiming] = useState(false);
  const [shakeIntensity, setShakeIntensity] = useState(0);

  // Tracking Endless-specific progress
  const endlessShotsRef = useRef(0);
  const SHOTS_BEFORE_DROP = 6;

  // Track if game is over
  const gameOverHandledRef = useRef(false);

  // Initialize Game Grid & Shooter
  useEffect(() => {
    // Set sound enabled on synthetic audio class
    sound.enabled = soundEnabled;

    // Build Initial Grid
    if (levelData) {
      // Level Mode
      gridRef.current = levelData.grid.map(row => [...row]);
    } else {
      // Endless Mode: generate top 5 rows
      const initialGrid: (BubbleColor | null)[][] = [];
      for (let r = 0; r < 12; r++) {
        const rowBubbles: (BubbleColor | null)[] = [];
        const isOdd = r % 2 !== 0;
        const maxCols = isOdd ? 7 : 8;
        for (let c = 0; c < maxCols; c++) {
          if (r < 5) {
            rowBubbles.push(getRandomNormalColor());
          } else {
            rowBubbles.push(null);
          }
        }
        initialGrid.push(rowBubbles);
      }
      gridRef.current = initialGrid;
    }

    // Set Initial Shooter Balls
    if (levelData && levelData.id === 1) {
      currentBubbleColorRef.current = 'green';
      nextBubbleColorRef.current = getRandomNormalColor();
    } else {
      currentBubbleColorRef.current = getRandomNormalColor();
      nextBubbleColorRef.current = getRandomNormalColor();
    }

    // Reset Refs
    projectileRef.current = null;
    fallingBubblesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    endlessShotsRef.current = 0;
    gameOverHandledRef.current = false;

    // Reset States
    setScore(0);
    setComboCount(0);
    setGameState('playing');
    setMovesLeft(levelData ? levelData.movesLimit : 999);
  }, [levelData]);

  // Helper: Random bubble color
  const getRandomNormalColor = (): BubbleColor => {
    const idx = Math.floor(Math.random() * NORMAL_COLORS.length);
    return NORMAL_COLORS[idx];
  };

  // Trigger brief vibration (Haptic)
  const triggerVibration = (ms: number) => {
    if (vibrateEnabled && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  // Power Up purchase & toggle
  const handleUsePowerUp = (powerUpId: 'fireball' | 'rainbow' | 'laser') => {
    const pIndex = powerUps.findIndex(p => p.id === powerUpId);
    if (pIndex === -1) return;

    const p = powerUps[pIndex];
    if (p.count > 0) {
      sound.playPowerUp();
      triggerVibration(60);

      // Consume item
      const updated = [...powerUps];
      updated[pIndex] = { ...p, count: p.count - 1 };
      setPowerUps(updated);

      if (powerUpId === 'laser') {
        setLaserActive(true);
        addFloatingText(LAUNCHER_X, LAUNCHER_Y - 100, 'LASER AKTIF!', '#F59E0B');
      } else {
        setActivePowerUp(powerUpId);
        currentBubbleColorRef.current = powerUpId;
        addFloatingText(LAUNCHER_X, LAUNCHER_Y - 100, powerUpId === 'fireball' ? 'BOLA API!' : 'PELANGI!', '#EC4899');
      }
    } else {
      // Try to buy using coins
      if (coins >= p.cost) {
        sound.playPowerUp();
        triggerVibration(60);
        setCoins(prev => prev - p.cost);
        
        if (powerUpId === 'laser') {
          setLaserActive(true);
          addFloatingText(LAUNCHER_X, LAUNCHER_Y - 100, 'LASER AKTIF!', '#F59E0B');
        } else {
          setActivePowerUp(powerUpId);
          currentBubbleColorRef.current = powerUpId;
          addFloatingText(LAUNCHER_X, LAUNCHER_Y - 100, powerUpId === 'fireball' ? 'BOLA API!' : 'PELANGI!', '#EC4899');
        }
      } else {
        sound.playLose(); // Reject sound
        addFloatingText(LAUNCHER_X, LAUNCHER_Y - 100, 'Koin Tidak Cukup!', '#EF4444');
      }
    }
  };

  // Swap current and next bubbles
  const handleSwapBubbles = () => {
    if (projectileRef.current) return; // Can't swap mid-flight
    sound.playShoot();
    const temp = currentBubbleColorRef.current;
    currentBubbleColorRef.current = nextBubbleColorRef.current;
    nextBubbleColorRef.current = temp;

    // Reset active matching powerups back if needed
    if (activePowerUp) {
      setActivePowerUp(null);
    }
    triggerVibration(40);
  };

  // Helper coordinate getters
  const getBubbleCoords = (row: number, col: number) => {
    const isOdd = row % 2 !== 0;
    const offset = isOdd ? BUBBLE_RADIUS : 0;
    const x = GRID_PADDING_LEFT + BUBBLE_RADIUS + offset + (col * BUBBLE_DIAMETER);
    const y = BUBBLE_RADIUS + (row * ROW_HEIGHT);
    return { x, y };
  };

  // SPAWN particles
  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // slightly upwards offset
        color,
        radius: Math.random() * 3 + 2,
        alpha: 1,
        life: 1,
      });
    }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      alpha: 1,
      life: 1,
      scale: 1,
    });
  };

  // --- CORE GAME LOGIC / BFS MATCHING ---
  
  // Get neighbors helper
  const getNeighbors = (row: number, col: number) => {
    const neighbors: { r: number; c: number }[] = [];
    const isOdd = row % 2 !== 0;

    // Left & Right
    neighbors.push({ r: row, c: col - 1 });
    neighbors.push({ r: row, c: col + 1 });

    // Up and down offsets depending on row index parity
    if (isOdd) {
      neighbors.push({ r: row - 1, c: col });
      neighbors.push({ r: row - 1, c: col + 1 });
      neighbors.push({ r: row + 1, c: col });
      neighbors.push({ r: row + 1, c: col + 1 });
    } else {
      neighbors.push({ r: row - 1, c: col - 1 });
      neighbors.push({ r: row - 1, c: col });
      neighbors.push({ r: row + 1, c: col - 1 });
      neighbors.push({ r: row + 1, c: col });
    }

    // Filter bounds
    return neighbors.filter(n => {
      if (n.r < 0 || n.r >= gridRef.current.length) return false;
      const cols = n.r % 2 !== 0 ? 7 : 8;
      return n.c >= 0 && n.c < cols;
    });
  };

  // Find clusters of matching color using BFS
  const findCluster = (startRow: number, startCol: number, matchColor: BubbleColor) => {
    const queue: { r: number; c: number }[] = [{ r: startRow, c: startCol }];
    const visited = new Set<string>();
    visited.add(`${startRow},${startCol}`);
    const cluster: { r: number; c: number }[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);

      const neighbors = getNeighbors(current.r, current.c);
      for (const n of neighbors) {
        const key = `${n.r},${n.c}`;
        if (!visited.has(key)) {
          const neighborColor = gridRef.current[n.r][n.c];
          if (neighborColor && (neighborColor === matchColor || matchColor === 'rainbow')) {
            visited.add(key);
            queue.push(n);
          }
        }
      }
    }
    return cluster;
  };

  // Find floating (unanchored) bubbles in the grid
  const dropFloatingBubbles = () => {
    const anchored = new Set<string>();
    const queue: { r: number; c: number }[] = [];

    // Start anchor search from any bubbles in Row 0
    const topCols = gridRef.current[0].length;
    for (let c = 0; c < topCols; c++) {
      if (gridRef.current[0][c]) {
        anchored.add(`0,${c}`);
        queue.push({ r: 0, c });
      }
    }

    // Traverse grid from ceiling
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = getNeighbors(current.r, current.c);
      for (const n of neighbors) {
        const key = `${n.r},${n.c}`;
        if (!anchored.has(key) && gridRef.current[n.r] && gridRef.current[n.r][n.c]) {
          anchored.add(key);
          queue.push(n);
        }
      }
    }

    // Move any bubble not anchored to the falling pool
    let droppedCount = 0;
    for (let r = 0; r < gridRef.current.length; r++) {
      const cols = r % 2 !== 0 ? 7 : 8;
      for (let c = 0; c < cols; c++) {
        const color = gridRef.current[r][c];
        if (color && !anchored.has(`${r},${c}`)) {
          const coords = getBubbleCoords(r, c);
          fallingBubblesRef.current.push({
            id: Math.random().toString(),
            row: r,
            col: c,
            x: coords.x,
            y: coords.y,
            color,
            radius: BUBBLE_RADIUS,
            isFalling: true,
            vx: (Math.random() * 4) - 2,
            vy: (Math.random() * 2) + 2,
            alpha: 1,
          });
          gridRef.current[r][c] = null; // Remove from active grid
          droppedCount++;
        }
      }
    }

    if (droppedCount > 0) {
      sound.playDrop();
      const bonus = droppedCount * 150;
      setScore(prev => prev + bonus);
      setCoins(prev => prev + Math.floor(droppedCount * 2));
      addFloatingText(WIDTH / 2, HEIGHT / 2, `CASCADES! +${bonus}`, '#10B981');
    }
  };

  // Trigger grid shift down (Endless Mode)
  const shiftGridDown = () => {
    const currentGrid = gridRef.current;
    
    // Check if bottom-most rows already have bubbles (Game Over threshold)
    // Let's say if any bubble resides in row 11 (the 12th row), pushing down triggers Lose
    let gameLost = false;
    for (let c = 0; c < currentGrid[currentGrid.length - 1].length; c++) {
      if (currentGrid[currentGrid.length - 1][c]) {
        gameLost = true;
        break;
      }
    }

    if (gameLost) {
      setGameState('lose');
      sound.playLose();
      triggerVibration(500);
      return;
    }

    // Insert a new randomized row at the index 0, shift everything else
    const newRow: (BubbleColor | null)[] = [];
    // Calculate if new row should be even or odd. If the old top row was even (8), this new one should be odd (7)?
    // Wait, to keep alternating perfectly, if we add row, row indices shift by 1.
    // So if index 0 becomes index 1 (which was even, now becomes odd offset), we just shift rows
    const shiftedGrid: (BubbleColor | null)[][] = [];
    
    // Create new top row
    const newColsCount = 8; // Row 0 is always 8 cols
    for (let c = 0; c < newColsCount; c++) {
      newRow.push(Math.random() > 0.15 ? getRandomNormalColor() : null); // some gaps
    }
    shiftedGrid.push(newRow);

    // Shift previous rows down. Drop the last row to stay in dimensions
    for (let r = 0; r < currentGrid.length - 1; r++) {
      // Parity check: when row 0 shifts to row 1, its column count should adapt!
      // To keep it clean and prevent arrays from messing up, let's restructure:
      const oldRow = currentGrid[r];
      const targetParityOdd = (r + 1) % 2 !== 0;
      const maxCols = targetParityOdd ? 7 : 8;
      
      const adaptedRow: (BubbleColor | null)[] = [];
      for (let c = 0; c < maxCols; c++) {
        // Carry over old bubble if within bounds, otherwise null
        if (c < oldRow.length) {
          adaptedRow.push(oldRow[c]);
        } else {
          adaptedRow.push(null);
        }
      }
      shiftedGrid.push(adaptedRow);
    }

    gridRef.current = shiftedGrid;
    sound.playDrop();
    addFloatingText(WIDTH / 2, 80, 'PERINGATAN: BALON TURUN!', '#EF4444');
    setShakeIntensity(15);
  };

  // Perform checks after bubble lands
  const handleBubbleLanding = (row: number, col: number, color: BubbleColor) => {
    gridRef.current[row][col] = color;
    setMovesLeft(prev => Math.max(0, prev - 1));

    // Reset Laser Guide after shot
    setLaserActive(false);

    // Track Endless shifts
    if (!levelData) {
      endlessShotsRef.current++;
      if (endlessShotsRef.current >= SHOTS_BEFORE_DROP) {
        endlessShotsRef.current = 0;
        shiftGridDown();
      }
    }

    // Trigger Screen shake slightly
    setShakeIntensity(5);

    // --- HANDLE POWER-UP FXS ---
    if (color === 'fireball') {
      sound.playPop();
      triggerVibration(250);
      setShakeIntensity(20);

      // Pop all bubbles within 2 grid steps
      const fireballQueue = [{ r: row, c: col }];
      const visited = new Set<string>();
      visited.add(`${row},${col}`);
      const toExplode: { r: number; c: number }[] = [];

      for (let step = 0; step < 2; step++) {
        const len = fireballQueue.length;
        for (let i = 0; i < len; i++) {
          const curr = fireballQueue.shift()!;
          toExplode.push(curr);

          const neighbors = getNeighbors(curr.r, curr.c);
          for (const n of neighbors) {
            const key = `${n.r},${n.c}`;
            if (!visited.has(key)) {
              visited.add(key);
              fireballQueue.push(n);
            }
          }
        }
      }

      let popped = 0;
      toExplode.forEach(cell => {
        const existingColor = gridRef.current[cell.r][cell.c];
        if (existingColor) {
          const coords = getBubbleCoords(cell.r, cell.c);
          createExplosion(coords.x, coords.y, COLOR_MAP[existingColor].main);
          gridRef.current[cell.r][cell.c] = null;
          popped++;
        }
      });

      const earned = popped * 100;
      setScore(prev => prev + earned);
      setCoins(prev => prev + popped);
      addFloatingText(getBubbleCoords(row, col).x, getBubbleCoords(row, col).y - 20, `BOLA API! +${earned}`, '#EF4444');
      
      // Reset powerup setting
      setActivePowerUp(null);

      // Check drop attachments
      dropFloatingBubbles();
      checkWinLoseConditions();
      return;
    }

    // --- NORMAL MATCH POPPING ---
    // Rainbow power-up logic matches closest color
    let colorToMatch: BubbleColor = color;
    if (color === 'rainbow') {
      const neighbors = getNeighbors(row, col);
      const firstBubbleNeighbor = neighbors.find(n => gridRef.current[n.r] && gridRef.current[n.r][n.c]);
      if (firstBubbleNeighbor) {
        const neighborColor = gridRef.current[firstBubbleNeighbor.r][firstBubbleNeighbor.c];
        colorToMatch = neighborColor ? neighborColor : getRandomNormalColor();
      } else {
        colorToMatch = getRandomNormalColor();
      }
      setActivePowerUp(null);
    }

    const cluster = findCluster(row, col, colorToMatch);

    if (cluster.length >= 3 || color === 'rainbow') {
      const currentCombo = comboCount + 1;
      setComboCount(currentCombo);
      sound.playCombo(currentCombo);
      triggerVibration(100 + currentCombo * 15);

      // Explode bubbles
      cluster.forEach(cell => {
        const bubbleColor = gridRef.current[cell.r][cell.c];
        if (bubbleColor) {
          const coords = getBubbleCoords(cell.r, cell.c);
          createExplosion(coords.x, coords.y, COLOR_MAP[bubbleColor].main);
          gridRef.current[cell.r][cell.c] = null;
        }
      });

      // Calculate score with combo multiplier
      const basePoints = cluster.length * 100;
      const multiplierBonus = basePoints * (currentCombo - 1) * 0.5;
      const finalPoints = Math.floor(basePoints + multiplierBonus);
      setScore(prev => prev + finalPoints);
      setCoins(prev => prev + cluster.length);

      const bubblePos = getBubbleCoords(row, col);
      addFloatingText(bubblePos.x, bubblePos.y - 25, `+${finalPoints}`, '#FDA4AF');
      if (currentCombo > 1) {
        addFloatingText(bubblePos.x, bubblePos.y + 10, `${currentCombo}x Combo!`, '#FBBF24');
      }

      // Drop disconnected attachments
      dropFloatingBubbles();
    } else {
      setComboCount(0); // break combo chain
      sound.playPop();
    }

    checkWinLoseConditions();
  };

  // Win or lose conditions check
  const checkWinLoseConditions = () => {
    // Check if grid is completely empty
    let hasBubblesLeft = false;
    for (let r = 0; r < gridRef.current.length; r++) {
      for (let c = 0; c < gridRef.current[r].length; c++) {
        if (gridRef.current[r][c]) {
          hasBubblesLeft = true;
          break;
        }
      }
      if (hasBubblesLeft) break;
    }

    if (!hasBubblesLeft) {
      // Level Mode Victory
      if (levelData) {
        // Calculate stars
        let stars = 1;
        if (score >= levelData.stars[2]) stars = 3;
        else if (score >= levelData.stars[1]) stars = 2;
        
        setGameState('win');
        sound.playWin();
        triggerVibration(400);
        
        if (!gameOverHandledRef.current) {
          gameOverHandledRef.current = true;
          setTimeout(() => onLevelComplete(score, stars), 1500);
        }
      } else {
        // Endless Mode: refresh full grid top lines
        addFloatingText(WIDTH / 2, HEIGHT / 2, 'GELOMBANG BERSIH! BONUS +1000', '#FBBF24');
        setScore(prev => prev + 1000);
        setCoins(prev => prev + 50);
        
        // Spawn fresh top rows
        for (let r = 0; r < 5; r++) {
          const isOdd = r % 2 !== 0;
          const maxCols = isOdd ? 7 : 8;
          for (let c = 0; c < maxCols; c++) {
            gridRef.current[r][c] = getRandomNormalColor();
          }
        }
      }
      return;
    }

    // Moves Out of Limits Check (Level Mode only)
    if (levelData && movesLeft <= 0 && !projectileRef.current) {
      setGameState('lose');
      sound.playLose();
      triggerVibration(400);
      if (!gameOverHandledRef.current) {
        gameOverHandledRef.current = true;
        setTimeout(() => onLevelFail(), 1500);
      }
      return;
    }

    // Check if bottom-most bubbles exceed boundary row (Lose threshold)
    // Row 11 of the grid starts hanging too low
    for (let r = 11; r < gridRef.current.length; r++) {
      for (let c = 0; c < gridRef.current[r].length; c++) {
        if (gridRef.current[r] && gridRef.current[r][c]) {
          setGameState('lose');
          sound.playLose();
          triggerVibration(400);
          if (!gameOverHandledRef.current) {
            gameOverHandledRef.current = true;
            setTimeout(() => onLevelFail(), 1500);
          }
          return;
        }
      }
    }
  };

  // --- HTML5 CANVAS RENDERING LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // 1. Canvas clearing & screen shake
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      
      if (shakeIntensity > 0.1) {
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(shakeX, shakeY);
        setShakeIntensity(prev => prev * 0.9); // decay
      }

      // Draw background board grids
      ctx.fillStyle = '#090d16'; // deep dark navy
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Draw ceiling warning or boundary grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 11; i++) {
        const y = i * ROW_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      }

      // Draw danger bottom limit line (Row 11 threshold)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 11 * ROW_HEIGHT + BUBBLE_DIAMETER);
      ctx.lineTo(WIDTH, 11 * ROW_HEIGHT + BUBBLE_DIAMETER);
      ctx.stroke();
      ctx.setLineDash([]); // clear

      // Draw danger label
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.fillText('GARIS BATAS KHATULISTIWA', 15, 11 * ROW_HEIGHT + BUBBLE_DIAMETER - 6);

      // 2. Render Existing Grid Bubbles with 3D Radial Gradients
      const currentGrid = gridRef.current;
      for (let r = 0; r < currentGrid.length; r++) {
        const cols = r % 2 !== 0 ? 7 : 8;
        for (let c = 0; c < cols; c++) {
          const color = currentGrid[r][c];
          if (color) {
            const coords = getBubbleCoords(r, c);
            drawGlossyBubble(ctx, coords.x, coords.y, color, BUBBLE_RADIUS);
          }
        }
      }

      // 3. Render Active Projectile (if flying)
      const proj = projectileRef.current;
      if (proj) {
        // Update physics positions
        proj.x += proj.vx;
        proj.y += proj.vy;

        // Wall reflections
        if (proj.x - proj.radius < 0) {
          proj.x = proj.radius;
          proj.vx = -proj.vx;
          sound.playPop(); // small bounce click
          triggerVibration(25);
        } else if (proj.x + proj.radius > WIDTH) {
          proj.x = WIDTH - proj.radius;
          proj.vx = -proj.vx;
          sound.playPop();
          triggerVibration(25);
        }

        // Out of top bounds trigger lock at top row
        if (proj.y - proj.radius < 0) {
          proj.y = proj.radius;
          lockProjectileToGrid(proj);
        } else {
          // Check collision against other bubbles in grid
          let collided = false;
          for (let r = 0; r < currentGrid.length; r++) {
            const cols = r % 2 !== 0 ? 7 : 8;
            for (let c = 0; c < cols; c++) {
              const color = currentGrid[r][c];
              if (color) {
                const bubbleCoords = getBubbleCoords(r, c);
                const distSq = Math.pow(proj.x - bubbleCoords.x, 2) + Math.pow(proj.y - bubbleCoords.y, 2);
                const minDist = BUBBLE_DIAMETER - 2; // slightly forgiving tolerance
                if (distSq <= Math.pow(minDist, 2)) {
                  collided = true;
                  break;
                }
              }
            }
            if (collided) break;
          }

          if (collided) {
            lockProjectileToGrid(proj);
          } else {
            // Draw Projectile
            drawGlossyBubble(ctx, proj.x, proj.y, proj.color, proj.radius);
          }
        }
      }

      // 4. Render Aiming Line Guide (Wall bouncing predictions included!)
      if (isAiming && !proj && gameState === 'playing') {
        drawAimGuideLine(ctx);
      }

      // 5. Render Launcher Station (Bottom shooter visuals)
      drawLauncherStation(ctx);

      // 6. Update and Draw Falling Bubbles
      const falling = fallingBubblesRef.current;
      for (let i = falling.length - 1; i >= 0; i--) {
        const fb = falling[i];
        fb.vy = (fb.vy || 0) + 0.25; // apply gravity
        fb.x += fb.vx || 0;
        fb.y += fb.vy;
        fb.alpha = (fb.alpha || 1) - 0.025; // fade out

        if (fb.alpha <= 0 || fb.y > HEIGHT) {
          falling.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = fb.alpha;
          drawGlossyBubble(ctx, fb.x, fb.y, fb.color, fb.radius);
          ctx.restore();
        }
      }

      // 7. Update and Draw Particles Sparks
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.12; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03; // decay life

        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.restore();
        }
      }

      // 8. Update and Draw Floating Combo Text
      const texts = floatingTextsRef.current;
      for (let i = texts.length - 1; i >= 0; i--) {
        const ft = texts[i];
        ft.y -= 0.8; // drift upwards
        ft.alpha -= 0.02;

        if (ft.alpha <= 0) {
          texts.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = ft.alpha;
          ctx.font = 'bold 12px "Space Grotesk", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = ft.color;
          
          // Draw a small dark outline for legibility
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(ft.text, ft.x, ft.y);
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      }

      ctx.restore(); // restore translated shaking states

      if (gameState === 'playing' || proj || falling.length > 0 || particles.length > 0) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState, isAiming, aimAngle, shakeIntensity]);

  // Lock projectile bubble into hexagonal grid position
  const lockProjectileToGrid = (proj: Projectile) => {
    projectileRef.current = null; // Free up active flight ref

    // Search nearest valid slot in hex grid structure
    let bestRow = -1;
    let bestCol = -1;
    let minDistance = Infinity;

    for (let r = 0; r < gridRef.current.length; r++) {
      const cols = r % 2 !== 0 ? 7 : 8;
      for (let c = 0; c < cols; c++) {
        // Can only fit in empty slots
        if (gridRef.current[r][c] === null) {
          const coords = getBubbleCoords(r, c);
          const distSq = Math.pow(proj.x - coords.x, 2) + Math.pow(proj.y - coords.y, 2);
          if (distSq < minDistance) {
            minDistance = distSq;
            bestRow = r;
            bestCol = c;
          }
        }
      }
    }

    if (bestRow !== -1 && bestCol !== -1) {
      handleBubbleLanding(bestRow, bestCol, proj.color);
    } else {
      // Safety failback: restart shooter
      sound.playLose();
    }
  };

  // HTML5 glossy 3D ball gradient helper
  const drawGlossyBubble = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: BubbleColor,
    radius: number
  ) => {
    const pal = COLOR_MAP[color];
    if (!pal) return;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    // Create a 3D radial shine gradient
    const grad = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.1,
      x,
      y,
      radius
    );

    grad.addColorStop(0, pal.light);
    grad.addColorStop(0.4, pal.main);
    grad.addColorStop(1, pal.dark);

    ctx.fillStyle = grad;
    ctx.fill();

    // Add beautiful shiny spotlight crescent
    ctx.beginPath();
    ctx.ellipse(
      x - radius * 0.35,
      y - radius * 0.35,
      radius * 0.3,
      radius * 0.15,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    // Fireball special visual accents
    if (color === 'fireball') {
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  // Draw Launcher Area
  const drawLauncherStation = (ctx: CanvasRenderingContext2D) => {
    // Semi-circle platform
    ctx.beginPath();
    ctx.arc(LAUNCHER_X, LAUNCHER_Y + 15, 36, Math.PI, 0);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Aim Pointer Arrow barrel
    ctx.save();
    ctx.translate(LAUNCHER_X, LAUNCHER_Y);
    ctx.rotate(aimAngle);

    // Launcher body arrow
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(24, -10);
    ctx.lineTo(34, 0);
    ctx.lineTo(24, 10);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Draw NEXT bubble preview bubble
    const nextBubbleX = LAUNCHER_X - 60;
    const nextBubbleY = LAUNCHER_Y + 10;
    
    // Draw preview ring base
    ctx.beginPath();
    ctx.arc(nextBubbleX, nextBubbleY, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw Next Bubble
    drawGlossyBubble(ctx, nextBubbleX, nextBubbleY, nextBubbleColorRef.current, BUBBLE_RADIUS - 4);

    // Text indicators
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', nextBubbleX, nextBubbleY + 28);

    // Swap action symbol preview circle
    const swapX = LAUNCHER_X - 35;
    const swapY = LAUNCHER_Y + 15;
    ctx.beginPath();
    ctx.arc(swapX, swapY, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('⇆', swapX, swapY + 3);

    // Draw CURRENT bubble on launcher
    if (gameState === 'playing') {
      drawGlossyBubble(ctx, LAUNCHER_X, LAUNCHER_Y, currentBubbleColorRef.current, BUBBLE_RADIUS);
    }
  };

  // Draw a semi-transparent preview of where the shot bubble will land on the grid
  const drawPreviewBubble = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    let bestRow = -1;
    let bestCol = -1;
    let minDistance = Infinity;

    for (let r = 0; r < gridRef.current.length; r++) {
      const cols = r % 2 !== 0 ? 7 : 8;
      for (let c = 0; c < cols; c++) {
        if (gridRef.current[r] && gridRef.current[r][c] === null) {
          const coords = getBubbleCoords(r, c);
          const distSq = Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2);
          if (distSq < minDistance) {
            minDistance = distSq;
            bestRow = r;
            bestCol = c;
          }
        }
      }
    }

    if (bestRow !== -1 && bestCol !== -1) {
      const coords = getBubbleCoords(bestRow, bestCol);
      
      ctx.save();
      // Draw a dotted circle representing the preview
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw a semi-transparent colored circle of the current shooter color
      const color = currentBubbleColorRef.current;
      const pal = COLOR_MAP[color];
      if (pal) {
        ctx.fillStyle = pal.base;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
        ctx.fill();

        // Add a small center dot for extra precision
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // Draw aiming line guide with reflections and bubble collisions
  const drawAimGuideLine = (ctx: CanvasRenderingContext2D) => {
    const maxBounces = laserActive ? 5 : 3;
    const lineLength = laserActive ? 1200 : 800;
    
    let currentX = LAUNCHER_X;
    let currentY = LAUNCHER_Y;
    let currentVx = Math.cos(aimAngle);
    let currentVy = Math.sin(aimAngle);

    ctx.save();
    ctx.strokeStyle = laserActive ? 'rgba(244, 63, 94, 0.95)' : 'rgba(56, 189, 248, 0.75)'; // cyan/neon blue
    ctx.lineWidth = laserActive ? 3 : 2;
    ctx.setLineDash(laserActive ? [8, 4] : [6, 4]);

    ctx.beginPath();
    ctx.moveTo(currentX, currentY);

    let remainingDist = lineLength;
    let endX = currentX;
    let endY = currentY;

    for (let bounce = 0; bounce < maxBounces + 1; bounce++) {
      // Find intersection with walls or ceiling
      let distToWall = Infinity;
      let hitWallX = -1;

      if (currentVx < 0) {
        distToWall = -currentX / currentVx;
        hitWallX = 0;
      } else if (currentVx > 0) {
        distToWall = (WIDTH - currentX) / currentVx;
        hitWallX = WIDTH;
      }

      const distToCeiling = -currentY / currentVy;
      const limitDist = Math.min(distToWall, distToCeiling, remainingDist);

      // Check collision with bubbles along this segment
      let closestBubbleCollision = { t: Infinity, r: -1, c: -1 };
      
      const currentGrid = gridRef.current;
      for (let r = 0; r < currentGrid.length; r++) {
        const cols = r % 2 !== 0 ? 7 : 8;
        for (let c = 0; c < cols; c++) {
          if (currentGrid[r] && currentGrid[r][c]) {
            const bubbleCoords = getBubbleCoords(r, c);
            const fx = bubbleCoords.x - currentX;
            const fy = bubbleCoords.y - currentY;
            const a = fx * currentVx + fy * currentVy;
            if (a > 0) {
              const f2 = fx * fx + fy * fy;
              const minDist = BUBBLE_DIAMETER - 2;
              const minDistSq = minDist * minDist;
              const d2 = f2 - a * a;
              if (d2 < minDistSq) {
                const t = a - Math.sqrt(minDistSq - d2);
                if (t > 0 && t < closestBubbleCollision.t) {
                  closestBubbleCollision = { t, r, c };
                }
              }
            }
          }
        }
      }

      if (closestBubbleCollision.t < limitDist) {
        // Hit a bubble!
        endX = currentX + currentVx * closestBubbleCollision.t;
        endY = currentY + currentVy * closestBubbleCollision.t;
        ctx.lineTo(endX, endY);
        break;
      } else if (distToWall < distToCeiling && distToWall < remainingDist) {
        // Hit Left/Right Wall
        const hitX = hitWallX;
        const hitY = currentY + currentVy * distToWall;

        ctx.lineTo(hitX, hitY);

        // Reflect vector
        currentX = hitX;
        currentY = hitY;
        currentVx = -currentVx;
        remainingDist -= distToWall;
        endX = currentX;
        endY = currentY;
      } else {
        // Hit ceiling or finished length limit
        const limitDistCeil = Math.min(distToCeiling, remainingDist);
        endX = currentX + currentVx * limitDistCeil;
        endY = currentY + currentVy * limitDistCeil;

        ctx.lineTo(endX, endY);
        break;
      }
    }

    ctx.stroke();
    ctx.restore();

    // Now draw the preview bubble at (endX, endY)!
    drawPreviewBubble(ctx, endX, endY);
  };

  // --- MOUSE & TOUCH EVENT BINDINGS (Aiming & Shooting) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || projectileRef.current) return;
    
    // Capture canvas coordinates
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;

    // Disallow shooting if clicked near swap button or preview
    if (x < LAUNCHER_X - 15 && y > LAUNCHER_Y - 10) {
      handleSwapBubbles();
      return;
    }

    setIsAiming(true);
    updateAimAngle(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAiming || gameState !== 'playing' || projectileRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;

    updateAimAngle(x, y);
  };

  const handlePointerUp = () => {
    if (!isAiming) return;
    setIsAiming(false);

    if (gameState !== 'playing' || projectileRef.current) return;

    // Trigger Shoot
    const shootSpeed = 12;
    projectileRef.current = {
      x: LAUNCHER_X,
      y: LAUNCHER_Y,
      vx: Math.cos(aimAngle) * shootSpeed,
      vy: Math.sin(aimAngle) * shootSpeed,
      color: currentBubbleColorRef.current,
      radius: BUBBLE_RADIUS,
    };

    sound.playShoot();
    triggerVibration(45);

    // Roll new shooters queue
    currentBubbleColorRef.current = nextBubbleColorRef.current;
    nextBubbleColorRef.current = getRandomNormalColor();
  };

  const updateAimAngle = (x: number, y: number) => {
    const dx = x - LAUNCHER_X;
    const dy = y - LAUNCHER_Y;
    
    // Disallow shooting downwards/backwards
    let angle = Math.atan2(dy, dx);
    if (angle > -0.15 && angle < Math.PI) angle = -0.15;
    if (angle < -Math.PI || angle < -Math.PI + 0.15) angle = -Math.PI + 0.15;
    
    setAimAngle(angle);
  };

  // Re-aim Helper for keys/touchpad
  const adjustAim = (delta: number) => {
    setAimAngle(prev => {
      let next = prev + delta;
      if (next > -0.15) next = -0.15;
      if (next < -Math.PI + 0.15) next = -Math.PI + 0.15;
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 text-slate-100 select-none no-bounce">
      
      {/* HUD Header display */}
      <div className="flex justify-between items-center bg-slate-900 border-b border-slate-800 px-4 py-2.5 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button 
            id="btn-back-main"
            onClick={onBackToMenu}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-400 active:scale-95 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider font-bold">
              {levelData ? `LEVEL ${levelData.id}` : 'SURVIVAL MODE'}
            </span>
            <span className="text-xs font-bold font-mono text-amber-400 truncate max-w-[120px]">
              {levelData ? levelData.name : 'Bertahan Hidup'}
            </span>
          </div>
        </div>

        {/* Moves or endless count */}
        {levelData ? (
          <div className="flex flex-col items-center bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl">
            <span className="text-[9px] font-mono text-rose-400 font-bold uppercase">SISA GERAKAN</span>
            <span className="text-sm font-black font-mono text-rose-500">{movesLeft}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl">
            <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase">SHOTS COOLDOWN</span>
            <span className="text-sm font-black font-mono text-cyan-400">{6 - endlessShotsRef.current}</span>
          </div>
        )}

        {/* Scores */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-slate-500 font-mono tracking-widest font-bold uppercase">SCORE</span>
          <span className="text-base font-black font-mono text-slate-100">{score}</span>
        </div>
      </div>

      {/* Main Canvas Body Section */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center bg-slate-950">
        
        {/* Play board canvas frame */}
        <div className="relative aspect-[2/3] h-full max-h-[540px] max-w-[360px] w-full bg-slate-900 overflow-hidden md:border-x md:border-slate-800/80 shadow-[0_15px_40px_-5px_rgba(0,0,0,0.6)]">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-full h-full block cursor-crosshair no-bounce touch-none"
          />

          {/* Quick UI overlays (Win, Lose, Pause states) */}
          <AnimatePresence>
            {gameState === 'paused' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-40 text-center"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-[280px]">
                  <h3 className="text-xl font-extrabold text-slate-100 uppercase tracking-widest mb-2">
                    Game Ditangguhkan
                  </h3>
                  <p className="text-xs text-slate-400 mb-6 font-mono">
                    Target: {levelData ? levelData.targetDescription : 'Pecahkan balon & terus bertahan!'}
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => { sound.playShoot(); setGameState('playing'); }}
                      className="w-full bg-rose-600 hover:bg-rose-500 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" /> Lanjutkan Game
                    </button>
                    <button
                      onClick={onBackToMenu}
                      className="w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-xs font-bold text-slate-300 cursor-pointer active:scale-95 transition-all"
                    >
                      Kembali ke Menu Utama
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {gameState === 'win' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 z-40 text-center select-none"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-[300px] shadow-2xl relative">
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-amber-500/10 blur-xl rounded-full"></div>
                  <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2 animate-bounce" />
                  
                  <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 uppercase tracking-wider">
                    LEVEL SELESAI!
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider mb-4">HEBAT, SKOR BERHASIL DICATAT</p>

                  <div className="flex justify-center gap-2 my-4">
                    {[1, 2, 3].map((starIdx) => {
                      // Visual stars
                      let achieved = false;
                      if (levelData) {
                        if (score >= levelData.stars[2]) achieved = true;
                        else if (score >= levelData.stars[1] && starIdx <= 2) achieved = true;
                        else if (score >= levelData.stars[0] && starIdx <= 1) achieved = true;
                      }
                      return (
                        <Sparkles
                          key={starIdx}
                          className={`w-7 h-7 ${achieved ? 'text-amber-400 fill-amber-400' : 'text-slate-800'}`}
                        />
                      );
                    })}
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-2xl mb-6 border border-slate-900 font-mono">
                    <span className="text-[10px] text-slate-500">SKOR AKHIR</span>
                    <h4 className="text-2xl font-black text-amber-400 mt-0.5">{score}</h4>
                  </div>

                  <p className="text-[10px] text-slate-400 animate-pulse">Menghubungkan ke server cloud...</p>
                </div>
              </motion.div>
            )}

            {gameState === 'lose' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-40 text-center select-none"
              >
                <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 w-full max-w-[300px] shadow-2xl">
                  <h3 className="text-2xl font-black text-rose-500 uppercase tracking-wide mb-2">
                    GAME OVER!
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Bidikan meleset atau sisa gerakan Anda habis! Ayo coba lagi untuk mengumpulkan skor terbaik.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        window.location.reload(); // Quick reset
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-500 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" /> Coba Lagi Sekarang
                    </button>
                    <button
                      onClick={onBackToMenu}
                      className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-2xl text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      Kembali ke Menu Utama
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* BOTTOM HUB POWERUPS CONTROL PANEL */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 shrink-0 z-30">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-850">
            <span className="text-[9px] font-mono text-slate-500">💰 KOIN</span>
            <span className="text-xs font-black font-mono text-amber-400">{coins}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { sound.playShoot(); setGameState(prev => prev === 'playing' ? 'paused' : 'playing'); }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-mono text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1"
            >
              <Pause className="w-3.5 h-3.5" /> PAUSE
            </button>
            <button
              onClick={handleSwapBubbles}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> SWAP
            </button>
          </div>
        </div>

        {/* Powerups Horizontal Grid selectors */}
        <div className="grid grid-cols-3 gap-2">
          {powerUps.map((p) => {
            const isEquipped = p.count > 0;
            const isCurrentlySelected = activePowerUp === p.id || (p.id === 'laser' && laserActive);
            
            return (
              <button
                key={p.id}
                onClick={() => handleUsePowerUp(p.id)}
                className={`relative flex items-center gap-1.5 p-2 rounded-2xl border text-left transition-all active:scale-95 ${
                  isCurrentlySelected
                    ? 'bg-rose-600 border-rose-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-850 hover:border-slate-700 text-slate-100'
                }`}
              >
                {/* Visual Circle Icon */}
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-base shrink-0">
                  {p.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[10px] truncate leading-tight text-slate-100">
                    {p.name}
                  </h4>
                  <p className="text-[8px] text-slate-500 truncate mt-0.5 leading-none">
                    {p.count > 0 ? `${p.count} Tersedia` : `Beli: 💰${p.cost}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
