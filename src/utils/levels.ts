/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LevelData, BubbleColor } from '../types';

// S shorthand helpers to make layouts easy to read
const R: BubbleColor = 'red';
const G: BubbleColor = 'green';
const B: BubbleColor = 'blue';
const Y: BubbleColor = 'yellow';
const P: BubbleColor = 'purple';
const C: BubbleColor = 'cyan';
const _ = null;

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "Neon Gateway",
    targetDescription: "Clear all bubbles! Aim carefully.",
    movesLimit: 25,
    stars: [800, 1500, 2500],
    grid: [
      [R, R, G, B, B, G, R, R],
       [R, Y, G, B, G, Y, R],
      [Y, Y, Y, G, G, Y, Y, Y],
       [Y, Y, Y, G, Y, Y, Y],
      [P, P, P, G, G, P, P, P],
       [P, P, P, G, P, P, P],
      [P, P, P, G, G, P, P, P],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
    ]
  },
  {
    id: 2,
    name: "Symmetrical Wall",
    targetDescription: "Break the barrier using the sides!",
    movesLimit: 22,
    stars: [1200, 2200, 3500],
    grid: [
      [P, P, C, C, C, C, P, P],
       [G, G, _, _, _, G, G],
      [Y, Y, R, R, R, R, Y, Y],
       [P, _, _, _, _, _, P],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
    ]
  },
  {
    id: 3,
    name: "Double Helix",
    targetDescription: "Clear the twisting strands!",
    movesLimit: 26,
    stars: [1500, 2800, 4200],
    grid: [
      [R, _, B, _, P, _, G, _],
       [R, _, B, _, P, _, G],
      [_, R, _, B, _, P, _, G],
       [_, R, _, B, _, P, _],
      [_, _, R, _, B, _, _, _],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
    ]
  },
  {
    id: 4,
    name: "Pyramid Challenge",
    targetDescription: "Pop the crown before you run out of moves!",
    movesLimit: 20,
    stars: [1800, 3200, 5000],
    grid: [
      [_, _, _, Y, Y, _, _, _],
       [_, _, B, P, B, _, _],
      [_, _, R, G, G, R, _, _],
       [_, C, C, C, C, C, _],
      [P, P, P, R, R, P, P, P],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
    ]
  },
  {
    id: 5,
    name: "Chaos Star",
    targetDescription: "A massive block. Target the top clusters first!",
    movesLimit: 30,
    stars: [2500, 4500, 6500],
    grid: [
      [R, G, B, Y, P, C, R, G],
       [G, B, Y, P, C, R, G],
      [P, C, R, _, _, R, P, C],
       [C, R, _, _, _, R, C],
      [B, _, _, _, _, _, _, B],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
      [_, _, _, _, _, _, _, _],
       [_, _, _, _, _, _, _],
    ]
  }
];
