import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialBoard,
  getTotalEdges,
  countBoxSides,
  isValidMove,
  applyMove,
  chooseComputerMove,
  getTacticalHint,
  undoLastPlayerTurn,
  simulateChainConceded,
  buildCaptureRatioTimeline,
  simulatePlaceAndCount,
  getGameManagerStatusText,
  getGameManagerScoreText,
} from './rules.ts';

test('createInitialBoard initializes correct dimensions and empty edges (square and rectangular)', () => {
  const board = createInitialBoard(3, 'player', 3);
  assert.equal(board.rows, 3);
  assert.equal(board.cols, 3);
  assert.equal(board.hEdges.length, 4);
  assert.equal(board.hEdges[0].length, 3);
  assert.equal(board.vEdges.length, 3);
  assert.equal(board.vEdges[0].length, 4);
  assert.equal(board.boxes.length, 3);
  assert.equal(board.boxes[0].length, 3);
  assert.equal(getTotalEdges(3, 3), 24);
  assert.equal(board.currentTurn, 'player');
  assert.equal(getGameManagerStatusText(board), 'Your turn');
  assert.equal(getGameManagerScoreText(board), 'You: 0  CPU: 0');

  // Rectangular 3x4 board
  const rectBoard = createInitialBoard(3, 'player', 4);
  assert.equal(rectBoard.rows, 3);
  assert.equal(rectBoard.cols, 4);
  assert.equal(rectBoard.hEdges.length, 4);
  assert.equal(rectBoard.hEdges[0].length, 4);
  assert.equal(rectBoard.vEdges.length, 3);
  assert.equal(rectBoard.vEdges[0].length, 5);
  assert.equal(getTotalEdges(3, 4), 4 * 4 + 3 * 5);
});

test('non-capturing move switches turn from player to computer and updates statusText', () => {
  let board = createInitialBoard(2, 'player');
  assert.equal(isValidMove(board, { orientation: 'h', row: 0, col: 0 }), true);
  assert.equal(simulatePlaceAndCount(board, true, 0, 0), 0);

  board = applyMove(board, { orientation: 'h', row: 0, col: 0 });
  assert.equal(board.hEdges[0][0], 'player');
  assert.equal(board.currentTurn, 'computer');
  assert.equal(getGameManagerStatusText(board), 'Computer thinking...');
  assert.equal(board.scores.player, 0);
  assert.equal(board.scores.computer, 0);
  // Already placed edge returns -1 in simulatePlaceAndCount
  assert.equal(simulatePlaceAndCount(board, true, 0, 0), -1);
  assert.equal(isValidMove(board, { orientation: 'h', row: 0, col: 0 }), false);
});

test('completing a box awards a point and grants an extra turn to the same player', () => {
  let board = createInitialBoard(2, 'player');
  board = applyMove(board, { orientation: 'h', row: 0, col: 0 }); // player -> computer
  board = applyMove(board, { orientation: 'h', row: 1, col: 0 }); // computer -> player
  board = applyMove(board, { orientation: 'v', row: 0, col: 0 }); // player -> computer

  assert.equal(countBoxSides(board, 0, 0), 3);
  assert.equal(board.currentTurn, 'computer');
  assert.equal(simulatePlaceAndCount(board, false, 0, 1), 1);

  // Computer draws the 4th side of box (0,0)
  board = applyMove(board, { orientation: 'v', row: 0, col: 1 });
  assert.equal(board.boxes[0][0], 'computer');
  assert.equal(board.scores.computer, 1);
  assert.equal(getGameManagerScoreText(board), 'You: 0  CPU: 1');
  // Extra turn granted to computer!
  assert.equal(board.currentTurn, 'computer');
  assert.equal(board.currentStreak, 1);
});

test('completing two boxes with one shared edge awards 2 points in a single move', () => {
  let board = createInitialBoard(2, 'player');
  board = applyMove(board, { orientation: 'h', row: 0, col: 0 }); // P
  board = applyMove(board, { orientation: 'h', row: 1, col: 0 }); // C
  board = applyMove(board, { orientation: 'v', row: 0, col: 0 }); // P
  board = applyMove(board, { orientation: 'h', row: 0, col: 1 }); // C
  board = applyMove(board, { orientation: 'h', row: 1, col: 1 }); // P
  board = applyMove(board, { orientation: 'v', row: 0, col: 2 }); // C

  assert.equal(board.currentTurn, 'player');
  assert.equal(simulatePlaceAndCount(board, false, 0, 1), 2);
  board = applyMove(board, { orientation: 'v', row: 0, col: 1 });
  assert.equal(board.scores.player, 2);
  assert.equal(board.boxes[0][0], 'player');
  assert.equal(board.boxes[0][1], 'player');
  assert.equal(board.currentTurn, 'player');
  assert.equal(board.maxStreak.player, 2);
});

test('AI chooses immediate box completion and avoids giving away 3rd side when safe moves exist', () => {
  let board = createInitialBoard(2, 'computer');
  board = applyMove(board, { orientation: 'h', row: 0, col: 0 });
  board = applyMove(board, { orientation: 'h', row: 1, col: 0 });
  board = applyMove(board, { orientation: 'v', row: 0, col: 0 });

  const bestMove = chooseComputerMove(board, 'tactical', () => 0.1);
  assert.deepEqual(bestMove, { orientation: 'v', row: 0, col: 1 });

  const hint = getTacticalHint(board);
  assert.ok(hint);
  assert.equal(hint.category, 'capture');
  assert.deepEqual(hint.move, { orientation: 'v', row: 0, col: 1 });
});

test('AI chooses smallest chain sacrifice when all moves create a 3rd side', () => {
  let board = createInitialBoard(2, 'computer');
  board = applyMove(board, { orientation: 'h', row: 0, col: 0 });
  board = applyMove(board, { orientation: 'v', row: 0, col: 0 });
  board = applyMove(board, { orientation: 'h', row: 1, col: 0 });
  board = applyMove(board, { orientation: 'v', row: 0, col: 1 }); // (0,0) captured

  board = applyMove(board, { orientation: 'v', row: 1, col: 1 });
  const concededSingle = simulateChainConceded(board, {
    orientation: 'v',
    row: 1,
    col: 0,
  });
  assert.equal(concededSingle, 1);
});

test('full 2x2 game reaches isGameOver and determines winner accurately, and undoLastPlayerTurn works', () => {
  const initial = createInitialBoard(2, 'player');
  let board = initial;

  while (!board.isGameOver) {
    const move = chooseComputerMove(board, 'tactical', () => 0.42);
    assert.ok(move, 'Expected a valid move until game over');
    board = applyMove(board, move);
  }

  assert.equal(board.isGameOver, true);
  assert.equal(board.scores.player + board.scores.computer, 4);
  assert.ok(
    board.winner === 'player' ||
      board.winner === 'computer' ||
      board.winner === 'draw'
  );
  assert.ok(getGameManagerStatusText(board).startsWith('Game over — '));

  const undone = undoLastPlayerTurn(initial, board);
  assert.equal(undone.isGameOver, false);
  assert.equal(undone.currentTurn, 'player');

  const timeline = buildCaptureRatioTimeline(board, 8);
  assert.ok(timeline.length > 0 && timeline.length <= 8);
  const finalPoint = timeline[timeline.length - 1];
  assert.equal(finalPoint.playerBoxes + finalPoint.computerBoxes, 4);
  assert.equal(finalPoint.playerRatio + finalPoint.computerRatio, 100);
  assert.equal(finalPoint.unclaimedRatio, 0);
});

import { soundEngine } from './audio.ts';

test('soundEngine manages low-volume architectural ambient loop and mute toggles safely', () => {
  assert.equal(soundEngine.isAmbientEnabled(), true);
  assert.equal(soundEngine.isMuted(), false);
  assert.equal(soundEngine.getAmbientVolume(), 0.04);

  soundEngine.setAmbientEnabled(false);
  assert.equal(soundEngine.isAmbientEnabled(), false);

  soundEngine.setAmbientEnabled(true);
  assert.equal(soundEngine.isAmbientEnabled(), true);

  soundEngine.setMuted(true);
  assert.equal(soundEngine.isMuted(), true);
  soundEngine.setMuted(false);
  assert.equal(soundEngine.isMuted(), false);

  soundEngine.setAmbientVolume(0.5);
  assert.equal(soundEngine.getAmbientVolume(), 0.12); // Clamped to low-volume ceiling
  soundEngine.setAmbientVolume(0.04);
  assert.equal(soundEngine.getAmbientVolume(), 0.04);
});

import {
  COMPUTER_WIN_PROBABILITY,
  getComputerWinChancePercent,
} from './rules.ts';

test('computer win chance is calibrated to 60 percent (0.60)', () => {
  assert.equal(COMPUTER_WIN_PROBABILITY, 0.6);
  assert.equal(getComputerWinChancePercent(), 60);

  // Set up a board where computer is ahead (2-0) and has a capture move vs a safe move
  let board = createInitialBoard(2, 'computer');
  board.scores.computer = 2;
  board.scores.player = 0;
  board = applyMove(board, { orientation: 'h', row: 0, col: 0 });
  board = applyMove(board, { orientation: 'h', row: 1, col: 0 });
  board = applyMove(board, { orientation: 'v', row: 0, col: 0 });

  // When rng() < effectiveOptimalChance, AI takes the box capture immediately
  const optimalChoice = chooseComputerMove(board, 'tactical', () => 0.1);
  assert.deepEqual(optimalChoice, { orientation: 'v', row: 0, col: 1 });

  // When rng() >= effectiveOptimalChance and computer is already ahead, AI leaves an opening so player has a 40% win chance
  const forgivingChoice = chooseComputerMove(board, 'tactical', () => 0.9);
  assert.notDeepEqual(forgivingChoice, { orientation: 'v', row: 0, col: 1 });
});


