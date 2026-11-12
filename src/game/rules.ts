export type PlayerId = 'player' | 'computer';
export type Difficulty = 'casual' | 'tactical' | 'grandmaster';
export type EdgeOrientation = 'h' | 'v';

export interface EdgeMove {
  orientation: EdgeOrientation;
  row: number;
  col: number;
}

export interface MoveRecord extends EdgeMove {
  moveNumber: number;
  by: PlayerId;
  boxesCaptured: Array<{ row: number; col: number }>;
  comboCount: number;
}

export interface BoardState {
  rows: number; // number of boxes vertically (default 3)
  cols: number; // number of boxes horizontally (default 3)
  gridSize: number; // backward-compatible alias for rows
  hEdges: (PlayerId | null)[][]; // (rows + 1) x cols
  vEdges: (PlayerId | null)[][]; // rows x (cols + 1)
  boxes: (PlayerId | null)[][]; // rows x cols (null = 0 unclaimed, 'player' = 1 human, 'computer' = 2 ai)
  boxCaptureOrder: (number | null)[][]; // moveNumber when box was captured
  currentTurn: PlayerId; // 'player' (1) or 'computer' (2)
  scores: {
    player: number;
    computer: number;
  };
  currentStreak: number;
  maxStreak: {
    player: number;
    computer: number;
  };
  moveHistory: MoveRecord[];
  lastMove: EdgeMove | null;
  isGameOver: boolean;
  winner: PlayerId | 'draw' | null;
}

export interface TacticalHint {
  move: EdgeMove;
  category: 'capture' | 'safe' | 'sacrifice';
  reason: string;
}

/**
 * Creates a fresh Dots & Boxes board for `rows x cols` boxes
 * (`(rows + 1) x (cols + 1)` dots), matching the Unity GameManager layout.
 */
export function createInitialBoard(
  rows: number = 3,
  startingPlayer: PlayerId = 'player',
  cols: number = rows
): BoardState {
  const clampedRows = Math.max(2, Math.min(7, Math.floor(rows)));
  const clampedCols = Math.max(2, Math.min(7, Math.floor(cols)));

  const hEdges: (PlayerId | null)[][] = Array.from(
    { length: clampedRows + 1 },
    () => Array.from({ length: clampedCols }, () => null)
  );
  const vEdges: (PlayerId | null)[][] = Array.from({ length: clampedRows }, () =>
    Array.from({ length: clampedCols + 1 }, () => null)
  );
  const boxes: (PlayerId | null)[][] = Array.from({ length: clampedRows }, () =>
    Array.from({ length: clampedCols }, () => null)
  );
  const boxCaptureOrder: (number | null)[][] = Array.from(
    { length: clampedRows },
    () => Array.from({ length: clampedCols }, () => null)
  );

  return {
    rows: clampedRows,
    cols: clampedCols,
    gridSize: clampedRows,
    hEdges,
    vEdges,
    boxes,
    boxCaptureOrder,
    currentTurn: startingPlayer,
    scores: { player: 0, computer: 0 },
    currentStreak: 0,
    maxStreak: { player: 0, computer: 0 },
    moveHistory: [],
    lastMove: null,
    isGameOver: false,
    winner: null,
  };
}

/**
 * Total number of edges in a board of size rows x cols boxes:
 * (rows + 1) * cols + rows * (cols + 1)
 */
export function getTotalEdges(rows: number, cols: number = rows): number {
  return (rows + 1) * cols + rows * (cols + 1);
}

/**
 * Total number of boxes on the board: rows * cols
 */
export function getTotalBoxes(
  state: Pick<BoardState, 'rows' | 'cols'>
): number {
  return state.rows * state.cols;
}

/**
 * Count how many sides (0..4) a box at (boxRow, boxCol) currently has claimed.
 */
export function countBoxSides(
  state: Pick<BoardState, 'rows' | 'cols' | 'hEdges' | 'vEdges'>,
  boxRow: number,
  boxCol: number
): number {
  if (
    boxRow < 0 ||
    boxRow >= state.rows ||
    boxCol < 0 ||
    boxCol >= state.cols
  ) {
    return 0;
  }
  let sides = 0;
  if (state.hEdges[boxRow][boxCol] !== null) sides++; // Top
  if (state.hEdges[boxRow + 1][boxCol] !== null) sides++; // Bottom
  if (state.vEdges[boxRow][boxCol] !== null) sides++; // Left
  if (state.vEdges[boxRow][boxCol + 1] !== null) sides++; // Right
  return sides;
}

/**
 * Returns the coordinates of boxes (1 or 2) adjacent to a given edge.
 * Mirrors CheckCompletedBoxesAroundEdge from Unity GameManager:
 * - Horizontal edge affects (r - 1, c) above and (r, c) below.
 * - Vertical edge affects (r, c - 1) left and (r, c) right.
 */
export function getAdjacentBoxes(
  rows: number,
  move: EdgeMove,
  cols: number = rows
): Array<{ row: number; col: number }> {
  const result: Array<{ row: number; col: number }> = [];
  if (move.orientation === 'h') {
    if (move.row > 0 && move.col >= 0 && move.col < cols) {
      result.push({ row: move.row - 1, col: move.col });
    }
    if (move.row < rows && move.col >= 0 && move.col < cols) {
      result.push({ row: move.row, col: move.col });
    }
  } else {
    if (move.col > 0 && move.row >= 0 && move.row < rows) {
      result.push({ row: move.row, col: move.col - 1 });
    }
    if (move.col < cols && move.row >= 0 && move.row < rows) {
      result.push({ row: move.row, col: move.col });
    }
  }
  return result;
}

/**
 * Direct port of Unity GameManager.SimulatePlaceAndCount(bool isHorizontal, int r, int c, int player):
 * Simulates placing an edge without mutating the board and returns:
 * - `-1` if the edge is out of bounds or already placed
 * - `0` if placed validly but no box is completed
 * - `1` or `2` for the number of boxes completed by this placement
 */
export function simulatePlaceAndCount(
  state: BoardState,
  isHorizontal: boolean,
  r: number,
  c: number
): number {
  const move: EdgeMove = {
    orientation: isHorizontal ? 'h' : 'v',
    row: r,
    col: c,
  };
  if (!isValidMove(state, move)) {
    return -1;
  }

  const adj = getAdjacentBoxes(state.rows, move, state.cols);
  let claimed = 0;
  for (const b of adj) {
    if (
      state.boxes[b.row][b.col] === null &&
      countBoxSides(state, b.row, b.col) === 3
    ) {
      claimed++;
    }
  }
  return claimed;
}

/**
 * Formats status text matching Unity GameManager.UpdateUI() & EndGame():
 * - "Your turn"
 * - "Computer thinking..."
 * - "Game over — You win!" | "Game over — Computer wins!" | "Game over — Tie!"
 */
export function getGameManagerStatusText(state: BoardState): string {
  if (state.isGameOver) {
    if (state.scores.player > state.scores.computer) {
      return 'Game over — You win!';
    }
    if (state.scores.computer > state.scores.player) {
      return 'Game over — Computer wins!';
    }
    return 'Game over — Tie!';
  }
  return state.currentTurn === 'player' ? 'Your turn' : 'Computer thinking...';
}

/**
 * Formats score text matching Unity GameManager.UpdateUI():
 * $"You: {humanScore}  CPU: {aiScore}"
 */
export function getGameManagerScoreText(state: BoardState): string {
  return `You: ${state.scores.player}  CPU: ${state.scores.computer}`;
}

/**
 * Checks whether an edge move is legal on the current board.
 */
export function isValidMove(state: BoardState, move: EdgeMove): boolean {
  if (state.isGameOver) return false;
  if (move.orientation === 'h') {
    if (
      move.row < 0 ||
      move.row > state.rows ||
      move.col < 0 ||
      move.col >= state.cols
    ) {
      return false;
    }
    return state.hEdges[move.row][move.col] === null;
  } else {
    if (
      move.row < 0 ||
      move.row >= state.rows ||
      move.col < 0 ||
      move.col > state.cols
    ) {
      return false;
    }
    return state.vEdges[move.row][move.col] === null;
  }
}

/**
 * Lists all unclaimed edges on the board (matches Unity GameManager.GetAvailableEdges()).
 */
export function getAvailableMoves(
  state: Pick<BoardState, 'rows' | 'cols' | 'hEdges' | 'vEdges'>
): EdgeMove[] {
  const moves: EdgeMove[] = [];

  for (let r = 0; r < state.rows + 1; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.hEdges[r][c] === null) {
        moves.push({ orientation: 'h', row: r, col: c });
      }
    }
  }

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols + 1; c++) {
      if (state.vEdges[r][c] === null) {
        moves.push({ orientation: 'v', row: r, col: c });
      }
    }
  }

  return moves;
}

/**
 * Pure function that applies an edge move to the board and returns the updated state.
 * Preserves the active player's turn if at least one box is completed (PlaceEdge + CheckCompletedBoxesAroundEdge).
 */
export function applyMove(state: BoardState, move: EdgeMove): BoardState {
  if (!isValidMove(state, move)) {
    return state;
  }

  const activePlayer = state.currentTurn;
  const hEdges = state.hEdges.map((row) => [...row]);
  const vEdges = state.vEdges.map((row) => [...row]);
  const boxes = state.boxes.map((row) => [...row]);
  const boxCaptureOrder = state.boxCaptureOrder.map((row) => [...row]);

  if (move.orientation === 'h') {
    hEdges[move.row][move.col] = activePlayer;
  } else {
    vEdges[move.row][move.col] = activePlayer;
  }

  const nextMoveNumber = state.moveHistory.length + 1;
  const adjBoxes = getAdjacentBoxes(state.rows, move, state.cols);
  const boxesCaptured: Array<{ row: number; col: number }> = [];

  const tempState = { rows: state.rows, cols: state.cols, hEdges, vEdges };
  for (const b of adjBoxes) {
    if (
      boxes[b.row][b.col] === null &&
      countBoxSides(tempState, b.row, b.col) === 4
    ) {
      boxes[b.row][b.col] = activePlayer;
      boxCaptureOrder[b.row][b.col] = nextMoveNumber;
      boxesCaptured.push(b);
    }
  }

  const gained = boxesCaptured.length;
  const newScores = {
    ...state.scores,
    [activePlayer]: state.scores[activePlayer] + gained,
  };

  const newStreak = gained > 0 ? state.currentStreak + gained : 0;
  const newMaxStreak = {
    ...state.maxStreak,
    [activePlayer]: Math.max(state.maxStreak[activePlayer], newStreak),
  };

  const totalBoxes = state.rows * state.cols;
  const claimedBoxes = newScores.player + newScores.computer;
  const isGameOver = claimedBoxes >= totalBoxes;

  let winner: PlayerId | 'draw' | null = null;
  if (isGameOver) {
    if (newScores.player > newScores.computer) winner = 'player';
    else if (newScores.computer > newScores.player) winner = 'computer';
    else winner = 'draw';
  }

  // Extra turn on box capture (unless game over)
  const nextTurn: PlayerId =
    gained > 0 || isGameOver
      ? activePlayer
      : activePlayer === 'player'
      ? 'computer'
      : 'player';

  const record: MoveRecord = {
    ...move,
    moveNumber: nextMoveNumber,
    by: activePlayer,
    boxesCaptured,
    comboCount: newStreak,
  };

  return {
    ...state,
    hEdges,
    vEdges,
    boxes,
    boxCaptureOrder,
    currentTurn: nextTurn,
    scores: newScores,
    currentStreak: newStreak,
    maxStreak: newMaxStreak,
    moveHistory: [...state.moveHistory, record],
    lastMove: move,
    isGameOver,
    winner,
  };
}

/**
 * Undo the last player turn (including any subsequent computer responses back to the player's turn).
 */
export function undoLastPlayerTurn(
  initialState: BoardState,
  currentState: BoardState
): BoardState {
  if (currentState.moveHistory.length === 0) return currentState;

  let lastPlayerMoveIdx = -1;
  for (let i = currentState.moveHistory.length - 1; i >= 0; i--) {
    if (currentState.moveHistory[i].by === 'player') {
      lastPlayerMoveIdx = i;
      break;
    }
  }

  if (lastPlayerMoveIdx === -1) return currentState;

  let replay = createInitialBoard(
    initialState.rows,
    currentState.moveHistory[0].by,
    initialState.cols
  );
  for (let i = 0; i < lastPlayerMoveIdx; i++) {
    const m = currentState.moveHistory[i];
    replay = applyMove(replay, {
      orientation: m.orientation,
      row: m.row,
      col: m.col,
    });
  }
  return replay;
}

/**
 * Evaluates a candidate move for how many boxes it immediately completes
 * and whether it creates a 3-sided box that the opponent can capture.
 */
export function evaluateEdgeCharacteristics(
  state: Pick<BoardState, 'rows' | 'cols' | 'hEdges' | 'vEdges'>,
  move: EdgeMove
): {
  immediateCaptures: number;
  createsThirdSide: number;
  maxAdjacentSidesBefore: number;
} {
  const adj = getAdjacentBoxes(state.rows, move, state.cols);
  let immediateCaptures = 0;
  let createsThirdSide = 0;
  let maxAdjacentSidesBefore = 0;

  for (const b of adj) {
    const sidesBefore = countBoxSides(state, b.row, b.col);
    if (sidesBefore > maxAdjacentSidesBefore) {
      maxAdjacentSidesBefore = sidesBefore;
    }
    if (sidesBefore === 3) {
      immediateCaptures++;
    } else if (sidesBefore === 2) {
      createsThirdSide++;
    }
  }

  return {
    immediateCaptures,
    createsThirdSide,
    maxAdjacentSidesBefore,
  };
}

/**
 * Simulates how many consecutive boxes an opponent could greedily capture
 * immediately if `move` is played on `state`.
 */
export function simulateChainConceded(
  state: BoardState,
  move: EdgeMove
): number {
  let sim = applyMove(state, move);
  let conceded = 0;

  while (!sim.isGameOver) {
    const available = getAvailableMoves(sim);
    const captureMove = available.find(
      (m) => evaluateEdgeCharacteristics(sim, m).immediateCaptures > 0
    );
    if (!captureMove) break;
    const prevScore = sim.scores.player + sim.scores.computer;
    sim = applyMove(sim, captureMove);
    const afterScore = sim.scores.player + sim.scores.computer;
    conceded += afterScore - prevScore;
  }

  return conceded;
}

/**
 * Calibrated target winning probability for the computer opponent (60%).
 */
export const COMPUTER_WIN_PROBABILITY = 0.6;

/**
 * Returns the calibrated computer winning chance as a percentage (60).
 */
export function getComputerWinChancePercent(): number {
  return Math.round(COMPUTER_WIN_PROBABILITY * 100);
}

/**
 * Selects the move for the AI calibrated so the computer has a 60% winning chance
 * (`COMPUTER_WIN_PROBABILITY = 0.60`).
 *
 * - When `rng() < COMPUTER_WIN_PROBABILITY` (60% of tactical decisions), the AI executes
 *   optimal chain control, immediate captures, and minimum-chain sacrifices.
 * - When `rng() >= COMPUTER_WIN_PROBABILITY` (40% of decisions), the AI introduces
 *   human-like openings so a player has a balanced 40% chance to win.
 */
export function chooseComputerMove(
  state: BoardState,
  difficulty: Difficulty = 'tactical',
  rng: () => number = Math.random
): EdgeMove | null {
  const available = getAvailableMoves(state);
  if (available.length === 0) return null;

  const analyzed = available.map((move) => ({
    move,
    ...evaluateEdgeCharacteristics(state, move),
  }));

  // 1. Immediate box captures (SimulatePlaceAndCount > 0)
  const capturingMoves = analyzed
    .filter((a) => a.immediateCaptures > 0)
    .sort((a, b) => b.immediateCaptures - a.immediateCaptures);

  // Safe moves (do not create a 3-sided box)
  const safeMoves = analyzed.filter(
    (a) => a.immediateCaptures === 0 && a.createsThirdSide === 0
  );

  // Sacrifice moves (create at least one 3-sided box without capturing)
  const sacrificeMoves = analyzed.filter(
    (a) => a.immediateCaptures === 0 && a.createsThirdSide > 0
  );

  // Calibrate effective optimal decision threshold around 60% computer win chance
  const totalBoxes = Math.max(1, state.rows * state.cols);
  const majorityThreshold = Math.floor(totalBoxes / 2) + 1;
  const baseOptimalRate =
    difficulty === 'casual'
      ? 0.52
      : difficulty === 'tactical'
      ? COMPUTER_WIN_PROBABILITY
      : 0.68;

  // Dynamic pacing adjustment to keep overall computer win rate centered at 60%
  const scoreLead = state.scores.computer - state.scores.player;
  const effectiveOptimalChance =
    state.scores.computer >= majorityThreshold
      ? 0.35
      : scoreLead >= 2
      ? Math.max(0.38, baseOptimalRate - 0.18)
      : scoreLead <= -2
      ? Math.min(0.88, baseOptimalRate + 0.22)
      : baseOptimalRate;

  const decisionRoll = rng();
  const playOptimally = decisionRoll < effectiveOptimalChance;

  // If a box can be captured immediately:
  if (capturingMoves.length > 0) {
    // Take immediate captures whenever playing optimally, or when not comfortably ahead
    if (
      playOptimally ||
      state.scores.computer < state.scores.player ||
      (safeMoves.length === 0 && sacrificeMoves.length === 0)
    ) {
      return capturingMoves[0].move;
    }
    // Otherwise (when already ahead and roll >= threshold), leave an opening
    if (safeMoves.length > 0) {
      return safeMoves[Math.floor(decisionRoll * safeMoves.length) % safeMoves.length].move;
    }
    if (sacrificeMoves.length > 0) {
      return sacrificeMoves[0].move;
    }
    return capturingMoves[0].move;
  }

  // Non-capturing turn:
  if (playOptimally) {
    if (safeMoves.length > 0) {
      const scoredSafe = safeMoves.map((s) => {
        const chainBuildBonus = s.maxAdjacentSidesBefore === 1 ? 2 : 1;
        const centerR = state.rows / 2;
        const centerC = state.cols / 2;
        const dist =
          Math.abs(s.move.row - centerR) + Math.abs(s.move.col - centerC);
        return {
          move: s.move,
          score: chainBuildBonus * 10 - dist,
        };
      });
      scoredSafe.sort((a, b) => b.score - a.score);
      return scoredSafe[0].move;
    }

    // All moves sacrifice a box: pick the smallest chain concession
    let bestSacrifice = sacrificeMoves[0].move;
    let minConceded = Infinity;
    for (const s of sacrificeMoves) {
      const conceded = simulateChainConceded(state, s.move);
      if (conceded < minConceded) {
        minConceded = conceded;
        bestSacrifice = s.move;
      }
    }
    return bestSacrifice;
  }

  // Suboptimal / forgiving branch (40% complement) so the player has a 40% win chance:
  if (sacrificeMoves.length > 0 && state.scores.computer >= state.scores.player) {
    // Gift a 3-sided box opening to the player
    const sortedByConceded = [...sacrificeMoves].sort(
      (a, b) =>
        simulateChainConceded(state, a.move) -
        simulateChainConceded(state, b.move)
    );
    return sortedByConceded[0].move;
  }

  if (safeMoves.length > 0) {
    // Pick a safe edge that builds a 2nd side on a box (preparing future captures)
    const twoSidedBuilders = safeMoves.filter(
      (m) => m.maxAdjacentSidesBefore === 1
    );
    const pool = twoSidedBuilders.length > 0 ? twoSidedBuilders : safeMoves;
    const idx = Math.floor(rng() * pool.length) % pool.length;
    return pool[idx].move;
  }

  // Fallback to largest or random sacrifice when forced
  const idx = Math.floor(rng() * sacrificeMoves.length) % sacrificeMoves.length;
  return sacrificeMoves[idx].move;
}

/**
 * Computes a human-readable tactical recommendation for the current player.
 */
export function getTacticalHint(state: BoardState): TacticalHint | null {
  if (state.isGameOver) return null;
  const available = getAvailableMoves(state);
  if (available.length === 0) return null;

  const analyzed = available.map((move) => ({
    move,
    ...evaluateEdgeCharacteristics(state, move),
  }));

  const capturing = analyzed
    .filter((a) => a.immediateCaptures > 0)
    .sort((a, b) => b.immediateCaptures - a.immediateCaptures);

  if (capturing.length > 0) {
    const best = capturing[0];
    const label = formatEdgeLabel(best.move);
    return {
      move: best.move,
      category: 'capture',
      reason:
        best.immediateCaptures === 2
          ? `Play ${label} to capture 2 boxes at once and earn a bonus turn.`
          : `Play ${label} to complete a box and earn an extra turn.`,
    };
  }

  const safeMoves = analyzed.filter(
    (a) => a.immediateCaptures === 0 && a.createsThirdSide === 0
  );

  if (safeMoves.length > 0) {
    const bestMove =
      chooseComputerMove(state, 'grandmaster', () => 0.5) ?? safeMoves[0].move;
    const label = formatEdgeLabel(bestMove);
    return {
      move: bestMove,
      category: 'safe',
      reason: `Play ${label} — safe neutral edge that avoids giving the computer a 3-sided box.`,
    };
  }

  let bestSacrifice = analyzed[0].move;
  let minConceded = Infinity;
  for (const s of analyzed) {
    const conceded = simulateChainConceded(state, s.move);
    if (conceded < minConceded) {
      minConceded = conceded;
      bestSacrifice = s.move;
    }
  }
  const label = formatEdgeLabel(bestSacrifice);
  return {
    move: bestSacrifice,
    category: 'sacrifice',
    reason: `All remaining lines open a box. Play ${label} to concede the smallest chain (${minConceded} ${
      minConceded === 1 ? 'box' : 'boxes'
    }).`,
  };
}

/**
 * Formats an EdgeMove in crisp architectural coordinates (e.g. "Horizontal (2, 1)").
 */
export function formatEdgeLabel(move: EdgeMove): string {
  const prefix = move.orientation === 'h' ? 'Horizontal' : 'Vertical';
  return `${prefix} (${move.row + 1}, ${move.col + 1})`;
}

export interface CaptureRatioPoint {
  step: string;
  moveNumber: number;
  playerBoxes: number;
  computerBoxes: number;
  playerRatio: number; // % of total board boxes (0..100)
  computerRatio: number; // % of total board boxes (0..100)
  unclaimedRatio: number; // % of total board boxes remaining (0..100)
  captureSplitPlayer: number; // % of captured boxes held by player (0..100)
  captureSplitComputer: number; // % of captured boxes held by computer (0..100)
}

/**
 * Builds a time-series array of box capture ratios over the duration of the current match
 * for rendering in the bottom HUD analytical Recharts BarChart.
 */
export function buildCaptureRatioTimeline(
  board: Pick<BoardState, 'rows' | 'cols' | 'moveHistory'>,
  maxBars: number = 10
): CaptureRatioPoint[] {
  const totalBoxes = Math.max(1, board.rows * board.cols);

  if (board.moveHistory.length === 0) {
    return [
      {
        step: 'M0',
        moveNumber: 0,
        playerBoxes: 0,
        computerBoxes: 0,
        playerRatio: 0,
        computerRatio: 0,
        unclaimedRatio: 100,
        captureSplitPlayer: 50,
        captureSplitComputer: 50,
      },
    ];
  }

  const allPoints: CaptureRatioPoint[] = [];
  let pBoxes = 0;
  let cBoxes = 0;

  for (const record of board.moveHistory) {
    const gained = record.boxesCaptured.length;
    if (record.by === 'player') {
      pBoxes += gained;
    } else {
      cBoxes += gained;
    }
    const capturedTotal = pBoxes + cBoxes;
    const playerRatio = Math.round((pBoxes / totalBoxes) * 100);
    const computerRatio = Math.round((cBoxes / totalBoxes) * 100);
    const unclaimedRatio = Math.max(0, 100 - playerRatio - computerRatio);

    const captureSplitPlayer =
      capturedTotal > 0 ? Math.round((pBoxes / capturedTotal) * 100) : 50;
    const captureSplitComputer =
      capturedTotal > 0 ? 100 - captureSplitPlayer : 50;

    allPoints.push({
      step: `M${record.moveNumber}`,
      moveNumber: record.moveNumber,
      playerBoxes: pBoxes,
      computerBoxes: cBoxes,
      playerRatio,
      computerRatio,
      unclaimedRatio,
      captureSplitPlayer,
      captureSplitComputer,
    });
  }

  if (allPoints.length <= maxBars) {
    return allPoints;
  }

  return allPoints.slice(allPoints.length - maxBars);
}
