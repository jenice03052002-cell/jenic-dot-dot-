/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BoardState,
  Difficulty,
  EdgeMove,
  PlayerId,
  TacticalHint,
  applyMove,
  chooseComputerMove,
  createInitialBoard,
  getTacticalHint,
  isValidMove,
  undoLastPlayerTurn,
} from './game/rules';
import { soundEngine } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { DotsBoard } from './components/DotsBoard';
import { TopGameHud, BottomGameHud } from './components/GameHud';
import { StatusModal } from './components/StatusModal';

type ShellState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  // Check URL parameters for ?autostart=1, ?size=2, ?rows=3, ?cols=3
  const initialParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const autoStart = initialParams?.get('autostart') === '1';
  const paramSize = Number(initialParams?.get('size'));
  const paramRows = Number(initialParams?.get('rows'));
  const paramCols = Number(initialParams?.get('cols'));

  const defaultRows =
    !Number.isNaN(paramRows) && paramRows >= 2 && paramRows <= 5
      ? paramRows
      : !Number.isNaN(paramSize) && paramSize >= 2 && paramSize <= 5
      ? paramSize
      : 3;
  const defaultCols =
    !Number.isNaN(paramCols) && paramCols >= 2 && paramCols <= 5
      ? paramCols
      : defaultRows;

  const [shellState, setShellState] = useState<ShellState>(
    autoStart ? 'playing' : 'title'
  );
  const [rows, setRows] = useState<number>(defaultRows);
  const [cols, setCols] = useState<number>(defaultCols);
  const [difficulty, setDifficulty] = useState<Difficulty>('tactical');
  const [startingPlayer, setStartingPlayer] = useState<PlayerId>('player');

  const [board, setBoard] = useState<BoardState>(() =>
    createInitialBoard(defaultRows, 'player', defaultCols)
  );
  const [initialBoardSnapshot, setInitialBoardSnapshot] = useState<BoardState>(
    () => createInitialBoard(defaultRows, 'player', defaultCols)
  );
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAmbientEnabled, setIsAmbientEnabled] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const paramTheme = initialParams?.get('theme');
    if (paramTheme === 'light' || paramTheme === 'dark') return paramTheme;
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('quadra-theme');
        if (saved === 'light' || saved === 'dark') return saved;
      } catch {}
    }
    return 'dark';
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [activeHint, setActiveHint] = useState<TacticalHint | null>(null);

  const aiTimeoutRef = useRef<number | null>(null);

  // Mirror shellState, theme, and audio state to document.body.dataset & documentElement
  useEffect(() => {
    document.body.dataset.state = shellState;
    document.body.dataset.theme = theme;
    document.documentElement.dataset.theme = theme;
    document.body.dataset.ambient =
      isAmbientEnabled && !isMuted ? 'on' : 'off';
    try {
      window.localStorage.setItem('quadra-theme', theme);
    } catch {}
    soundEngine.syncAmbientState(shellState === 'playing');
  }, [shellState, theme, isAmbientEnabled, isMuted]);

  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current);
      }
      soundEngine.syncAmbientState(false);
    };
  }, []);

  // Match timer during active play
  useEffect(() => {
    if (shellState !== 'playing' || board.isGameOver) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [shellState, board.isGameOver]);

  // Start or restart match (InitBoard + UpdateUI)
  const startMatch = useCallback(
    (
      customRows = rows,
      customCols = cols,
      customStarter = startingPlayer
    ) => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const fresh = createInitialBoard(customRows, customStarter, customCols);
      setInitialBoardSnapshot(fresh);
      setBoard(fresh);
      setActiveHint(null);
      setElapsedSeconds(0);
      setIsAiThinking(false);
      document.body.dataset.state = 'playing';
      setShellState('playing');
      soundEngine.syncAmbientState(true);
    },
    [rows, cols, startingPlayer]
  );

  // Handle player selecting an edge (TryPlaceEdge + PlaceEdge)
  const handleSelectEdge = useCallback(
    (move: EdgeMove) => {
      if (shellState !== 'playing' || isAiThinking || board.isGameOver) return;
      if (board.currentTurn !== 'player') return;
      if (!isValidMove(board, move)) return;

      const prevPlayerScore = board.scores.player;
      const nextBoard = applyMove(board, move);
      const boxesGained = nextBoard.scores.player - prevPlayerScore;

      if (boxesGained > 0) {
        soundEngine.playBoxCapture(nextBoard.currentStreak, true);
      } else {
        soundEngine.playEdgeSnap(true);
      }

      setActiveHint(null);
      setBoard(nextBoard);

      if (nextBoard.isGameOver && nextBoard.winner) {
        soundEngine.playMatchEnd(nextBoard.winner);
        window.setTimeout(() => {
          setShellState('gameover');
        }, 420);
      }
    },
    [shellState, isAiThinking, board]
  );

  // Computer turn loop (aiPlayer.MakeMoveCoroutine + AITookTurn)
  useEffect(() => {
    if (
      shellState !== 'playing' ||
      board.isGameOver ||
      board.currentTurn !== 'computer'
    ) {
      setIsAiThinking(false);
      return;
    }

    setIsAiThinking(true);
    const delayMs = board.currentStreak > 0 ? 320 : 380;

    aiTimeoutRef.current = window.setTimeout(() => {
      const aiMove = chooseComputerMove(board, difficulty);
      if (!aiMove) {
        setIsAiThinking(false);
        return;
      }

      const prevCpuScore = board.scores.computer;
      const nextBoard = applyMove(board, aiMove);
      const boxesGained = nextBoard.scores.computer - prevCpuScore;

      if (boxesGained > 0) {
        soundEngine.playBoxCapture(nextBoard.currentStreak, false);
      } else {
        soundEngine.playEdgeSnap(false);
      }

      setBoard(nextBoard);

      if (nextBoard.isGameOver && nextBoard.winner) {
        setIsAiThinking(false);
        soundEngine.playMatchEnd(nextBoard.winner);
        window.setTimeout(() => {
          setShellState('gameover');
        }, 420);
      } else if (nextBoard.currentTurn !== 'computer') {
        setIsAiThinking(false);
      }
    }, delayMs);

    return () => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [shellState, board, difficulty]);

  // Undo last player move
  const handleUndo = useCallback(() => {
    if (isAiThinking || board.isGameOver) return;
    const restored = undoLastPlayerTurn(initialBoardSnapshot, board);
    setBoard(restored);
    setActiveHint(null);
  }, [isAiThinking, board, initialBoardSnapshot]);

  // Toggle Tactical Hint
  const handleRequestHint = useCallback(() => {
    if (board.currentTurn !== 'player' || board.isGameOver || isAiThinking)
      return;
    if (activeHint) {
      setActiveHint(null);
    } else {
      const hint = getTacticalHint(board);
      setActiveHint(hint);
    }
  }, [board, isAiThinking, activeHint]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  // Toggle Architectural Ambient Background Loop
  const handleToggleAmbient = useCallback(() => {
    setIsAmbientEnabled((prev) => {
      const next = !prev;
      soundEngine.setAmbientEnabled(next);
      return next;
    });
  }, []);

  // Toggle Light / Dark Theme
  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Quit active match in between and return to Configuration Board (TitleScreen)
  const handleQuitToTitle = useCallback(() => {
    if (aiTimeoutRef.current !== null) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    setIsAiThinking(false);
    setActiveHint(null);
    soundEngine.syncAmbientState(false);
    document.body.dataset.state = 'title';
    setShellState('title');
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (shellState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          const activeTag = document.activeElement?.tagName.toLowerCase();
          const isStartButton =
            document.activeElement?.getAttribute('data-start') === 'true';
          if (
            (activeTag !== 'button' && activeTag !== 'select') ||
            isStartButton
          ) {
            e.preventDefault();
            startMatch();
          }
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleToggleAmbient();
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          handleToggleTheme();
        }
        return;
      }

      if (shellState === 'playing') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setShellState('paused');
        } else if (
          e.key.toLowerCase() === 'b' ||
          e.key.toLowerCase() === 'q'
        ) {
          e.preventDefault();
          handleQuitToTitle();
        } else if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          handleRequestHint();
        } else if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          handleToggleMute();
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleToggleAmbient();
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          handleToggleTheme();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          startMatch();
        }
        return;
      }

      if (shellState === 'paused') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setShellState('playing');
        } else if (
          e.key.toLowerCase() === 'b' ||
          e.key.toLowerCase() === 'q'
        ) {
          e.preventDefault();
          handleQuitToTitle();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          handleToggleMute();
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleToggleAmbient();
        } else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          handleToggleTheme();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          startMatch();
        }
        return;
      }

      if (shellState === 'gameover') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startMatch();
        } else if (
          e.key.toLowerCase() === 'b' ||
          e.key.toLowerCase() === 'q'
        ) {
          e.preventDefault();
          handleQuitToTitle();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    startMatch,
    handleQuitToTitle,
    handleRequestHint,
    handleUndo,
    handleToggleMute,
    handleToggleAmbient,
    handleToggleTheme,
  ]);

  if (shellState === 'title') {
    return (
      <TitleScreen
        rows={rows}
        cols={cols}
        difficulty={difficulty}
        startingPlayer={startingPlayer}
        isAmbientEnabled={isAmbientEnabled}
        theme={theme}
        onChangeBoardDimensions={(r, c) => {
          setRows(r);
          setCols(c);
        }}
        onChangeDifficulty={setDifficulty}
        onChangeStartingPlayer={setStartingPlayer}
        onToggleAmbient={handleToggleAmbient}
        onSelectTheme={setTheme}
        onStartGame={() => startMatch(rows, cols, startingPlayer)}
      />
    );
  }

  return (
    <div
      data-theme={theme}
      className="min-h-screen w-full drafting-canvas-bg text-slate-100 flex flex-col justify-between overflow-hidden"
    >
      {/* Top Perimeter HUD */}
      <TopGameHud
        board={board}
        difficulty={difficulty}
        isAiThinking={isAiThinking}
        isMuted={isMuted}
        isAmbientEnabled={isAmbientEnabled}
        theme={theme}
        elapsedSeconds={elapsedSeconds}
        activeHint={activeHint}
        onRequestHint={handleRequestHint}
        onApplyHintMove={handleSelectEdge}
        onUndo={handleUndo}
        onToggleMute={handleToggleMute}
        onToggleAmbient={handleToggleAmbient}
        onToggleTheme={handleToggleTheme}
        onPause={() => setShellState('paused')}
        onRestart={() => startMatch(rows, cols, startingPlayer)}
        onQuitToTitle={handleQuitToTitle}
      />

      {/* Central Playfield (>85% clear unobstructed arena) */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2">
        <DotsBoard
          board={board}
          isAiThinking={isAiThinking}
          activeHint={activeHint}
          onSelectEdge={handleSelectEdge}
        />
      </main>

      {/* Bottom Perimeter HUD */}
      <BottomGameHud
        board={board}
        theme={theme}
        activeHint={activeHint}
        onApplyHintMove={handleSelectEdge}
      />

      {/* Outcome-Matched Status Modal (Pause or Game Over) */}
      {(shellState === 'paused' || shellState === 'gameover') && (
        <StatusModal
          mode={shellState}
          board={board}
          difficulty={difficulty}
          elapsedSeconds={elapsedSeconds}
          isMuted={isMuted}
          isAmbientEnabled={isAmbientEnabled}
          theme={theme}
          onToggleMute={handleToggleMute}
          onToggleAmbient={handleToggleAmbient}
          onSelectTheme={setTheme}
          onResume={
            shellState === 'paused' ? () => setShellState('playing') : undefined
          }
          onRestart={() => startMatch(rows, cols, startingPlayer)}
          onReturnToTitle={handleQuitToTitle}
        />
      )}
    </div>
  );
}
