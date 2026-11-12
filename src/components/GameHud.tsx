import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  BoardState,
  Difficulty,
  EdgeMove,
  TacticalHint,
  buildCaptureRatioTimeline,
  formatEdgeLabel,
  getGameManagerScoreText,
  getGameManagerStatusText,
  getTotalBoxes,
  getTotalEdges,
} from '../game/rules';

interface GameHudProps {
  board: BoardState;
  difficulty: Difficulty;
  isAiThinking: boolean;
  isMuted: boolean;
  isAmbientEnabled: boolean;
  theme: 'dark' | 'light';
  elapsedSeconds: number;
  activeHint: TacticalHint | null;
  onRequestHint: () => void;
  onApplyHintMove: (move: EdgeMove) => void;
  onUndo: () => void;
  onToggleMute: () => void;
  onToggleAmbient: () => void;
  onToggleTheme: () => void;
  onPause: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
}

export const TopGameHud: React.FC<GameHudProps> = ({
  board,
  difficulty,
  isAiThinking,
  isMuted,
  isAmbientEnabled,
  theme,
  elapsedSeconds,
  onRequestHint,
  onUndo,
  onToggleMute,
  onToggleAmbient,
  onToggleTheme,
  onPause,
  onRestart,
  onQuitToTitle,
}) => {
  const totalBoxes = getTotalBoxes(board);
  const totalEdges = getTotalEdges(board.rows, board.cols);
  const claimedEdges = board.moveHistory.length;
  const remainingEdges = totalEdges - claimedEdges;

  // Track previous scores to trigger smooth transition animations when a box is captured
  const prevScoresRef = useRef<{ player: number; computer: number }>({
    player: board.scores.player,
    computer: board.scores.computer,
  });
  const [playerGain, setPlayerGain] = useState<{
    delta: number;
    seq: number;
  } | null>(null);
  const [computerGain, setComputerGain] = useState<{
    delta: number;
    seq: number;
  } | null>(null);

  useEffect(() => {
    const prev = prevScoresRef.current;
    const pDiff = board.scores.player - prev.player;
    const cDiff = board.scores.computer - prev.computer;

    prevScoresRef.current = {
      player: board.scores.player,
      computer: board.scores.computer,
    };

    if (pDiff > 0) {
      setPlayerGain({ delta: pDiff, seq: Date.now() });
      const timer = window.setTimeout(() => setPlayerGain(null), 650);
      return () => window.clearTimeout(timer);
    } else if (board.scores.player === 0) {
      setPlayerGain(null);
    }

    if (cDiff > 0) {
      setComputerGain({ delta: cDiff, seq: Date.now() });
      const timer = window.setTimeout(() => setComputerGain(null), 650);
      return () => window.clearTimeout(timer);
    } else if (board.scores.computer === 0) {
      setComputerGain(null);
    }
  }, [board.scores.player, board.scores.computer]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const canUndo =
    !isAiThinking &&
    !board.isGameOver &&
    board.moveHistory.some((m) => m.by === 'player');

  const statusText = getGameManagerStatusText(board);
  const scoreText = getGameManagerScoreText(board);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-3 pb-2 flex flex-wrap xl:flex-nowrap items-center justify-between gap-2">
      {/* Left: Back / Quit to Configuration Board Button + Player vs Computer Score Readouts */}
      <div
        className="flex items-center gap-2 shrink-0"
        aria-label={scoreText}
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onQuitToTitle();
          }}
          aria-label="Back to Configuration & Quit Match [B]"
          title="Quit Match & Return to Configuration Board (B or Q)"
          className="px-2.5 h-10 rounded-xl bg-[#071C26] hover:bg-[#0D2B3A] border border-cyan-800/70 hover:border-[#1CE3DF] text-cyan-100 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M19 12H5m0 0l6-6m-6 6l6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Back</span>
          <span className="hidden sm:inline text-cyan-300/75">· Quit</span>
          <span className="font-mono-tabular text-[10px] text-cyan-300/70">
            [B]
          </span>
        </button>

        {/* Player Score Block (#1CE3DF Aqua Anchor) */}
        <div
          data-testid="player-score-card"
          data-capturing={playerGain ? 'true' : 'false'}
          className={`relative px-3 py-1.5 rounded-xl border transition-all duration-200 flex items-center gap-2.5 ${
            playerGain
              ? 'bg-[#1CE3DF]/25 border-[#1CE3DF] scale-[1.03] shadow-[0_0_24px_rgba(28,227,223,0.36)]'
              : board.currentTurn === 'player' && !board.isGameOver
              ? 'bg-[#092936]/90 border-[#1CE3DF]/85 shadow-[0_0_20px_rgba(28,227,223,0.18)]'
              : 'bg-[#071C26]/85 border-cyan-900/60'
          }`}
        >
          <div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-[#1CE3DF] whitespace-nowrap">
              YOU · ARCHITECT
            </div>
            <div className="text-[11px] text-cyan-200/75 font-mono-tabular whitespace-nowrap">
              {board.currentTurn === 'player' && !board.isGameOver
                ? board.currentStreak > 0
                  ? `BONUS · ×${board.currentStreak}`
                  : 'YOUR TURN'
                : `MAX CHAIN ×${board.maxStreak.player}`}
            </div>
          </div>
          <div className="relative flex items-center justify-center min-w-[2ch]">
            <span
              key={`player-score-${board.scores.player}`}
              data-testid="player-score"
              className={`inline-block font-display font-extrabold text-2xl sm:text-3xl font-mono-tabular leading-none transition-colors duration-200 ${
                board.scores.player > 0 ? 'animate-score-pop' : ''
              } ${playerGain ? 'text-[#1CE3DF]' : 'text-cyan-50'}`}
            >
              {board.scores.player}
            </span>
            {playerGain && (
              <span
                key={`player-delta-${playerGain.seq}`}
                aria-hidden="true"
                className="animate-score-delta pointer-events-none absolute -top-3.5 -right-3 font-mono-tabular font-bold text-xs text-[#1CE39B]"
              >
                +{playerGain.delta}
              </span>
            )}
          </div>
        </div>

        <div className="text-cyan-600 font-display font-bold text-xs select-none">
          VS
        </div>

        {/* Computer Score Block (#38B6FF Analogous Cerulean Azure) */}
        <div
          data-testid="computer-score-card"
          data-capturing={computerGain ? 'true' : 'false'}
          className={`relative px-3 py-1.5 rounded-xl border transition-all duration-200 flex items-center gap-2.5 ${
            computerGain
              ? 'bg-[#1C9BE3]/25 border-[#38B6FF] scale-[1.03] shadow-[0_0_24px_rgba(56,182,255,0.36)]'
              : board.currentTurn === 'computer' && !board.isGameOver
              ? 'bg-[#092438]/90 border-[#38B6FF]/85 shadow-[0_0_20px_rgba(56,182,255,0.18)]'
              : 'bg-[#071C26]/85 border-cyan-900/60'
          }`}
        >
          <div className="relative flex items-center justify-center min-w-[2ch]">
            <span
              key={`computer-score-${board.scores.computer}`}
              data-testid="computer-score"
              className={`inline-block font-display font-extrabold text-2xl sm:text-3xl font-mono-tabular leading-none transition-colors duration-200 ${
                board.scores.computer > 0 ? 'animate-score-pop' : ''
              } ${computerGain ? 'text-[#38B6FF]' : 'text-cyan-50'}`}
            >
              {board.scores.computer}
            </span>
            {computerGain && (
              <span
                key={`computer-delta-${computerGain.seq}`}
                aria-hidden="true"
                className="animate-score-delta pointer-events-none absolute -top-3.5 -left-3 font-mono-tabular font-bold text-xs text-[#38B6FF]"
              >
                +{computerGain.delta}
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-[#38B6FF] whitespace-nowrap">
              CPU · {difficulty.toUpperCase()}
            </div>
            <div className="text-[11px] text-cyan-200/75 font-mono-tabular whitespace-nowrap">
              {isAiThinking
                ? 'THINKING...'
                : `60% WIN · MAX ×${board.maxStreak.computer}`}
            </div>
          </div>
        </div>
      </div>

      {/* Center Status Banner (Mirrors GameManager statusText & scoreText) */}
      <div
        data-testid="turn-status-banner"
        className="hidden lg:flex flex-col items-center justify-center px-3 py-1.5 rounded-xl bg-[#071C26]/85 border border-cyan-900/60 shrink-0"
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/70 whitespace-nowrap">
          {scoreText} · 60% CPU WIN · FIRST TO {Math.floor(totalBoxes / 2) + 1} ({board.rows}×{board.cols})
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs font-mono-tabular text-cyan-100 whitespace-nowrap">
          <span
            data-testid="status-text"
            className={
              board.currentTurn === 'player'
                ? 'text-[#1CE3DF] font-semibold'
                : 'text-[#38B6FF] font-semibold'
            }
          >
            {board.currentStreak > 0 && !board.isGameOver
              ? `${statusText} · Bonus (×${board.currentStreak})`
              : statusText}
          </span>
          <span className="text-cyan-700">·</span>
          <span>{remainingEdges} Left</span>
          <span className="text-cyan-700">·</span>
          <span>{formatTime(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Right Utility Controls: Tactical Hint [H], Undo [Z], Ambient [A], Mute [M], Theme [T], Pause [P], Restart [R] */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          tabIndex={-1}
          disabled={
            board.currentTurn !== 'player' || board.isGameOver || isAiThinking
          }
          onClick={(e) => {
            e.currentTarget.blur();
            onRequestHint();
          }}
          aria-label="Tactical Hint [H]"
          title="Show Optimal Move Hint (H)"
          className="px-2.5 h-10 rounded-lg bg-[#071C26] hover:bg-[#0D2B3A] disabled:opacity-40 border border-cyan-800/70 text-[#1CE39B] flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2zm-2 18h4v2h-4v-2z"
              fill="currentColor"
            />
          </svg>
          <span>Hint</span>
          <span className="font-mono-tabular text-[10px] text-cyan-300/70">
            [H]
          </span>
        </button>

        <button
          type="button"
          tabIndex={-1}
          disabled={!canUndo}
          onClick={(e) => {
            e.currentTarget.blur();
            onUndo();
          }}
          aria-label="Undo Last Turn [Z]"
          title="Undo Last Turn (Z)"
          className="px-2.5 h-10 rounded-lg bg-[#071C26] hover:bg-[#0D2B3A] disabled:opacity-40 border border-cyan-800/70 text-cyan-100 flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 7h7a5 5 0 0 1 0 10H9v-2h5a3 3 0 0 0 0-6H7v3L2 7.5 7 3v4z"
              fill="currentColor"
            />
          </svg>
          <span className="hidden sm:inline">Undo</span>
          <span className="font-mono-tabular text-[10px] text-cyan-300/70">
            [Z]
          </span>
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleAmbient();
          }}
          aria-pressed={isAmbientEnabled && !isMuted}
          aria-label={
            isAmbientEnabled
              ? 'Disable Ambient Audio Loop [A]'
              : 'Enable Ambient Audio Loop [A]'
          }
          title={
            isAmbientEnabled
              ? 'Architectural Ambient Loop: On (A)'
              : 'Architectural Ambient Loop: Off (A)'
          }
          className={`px-2 h-10 rounded-lg border flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            isAmbientEnabled && !isMuted
              ? 'bg-[#072628] hover:bg-[#0B3538] border-[#1CE39B]/70 text-[#1CE39B]'
              : 'bg-[#071C26] hover:bg-[#0D2B3A] border-cyan-800/70 text-cyan-300/60'
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 12h3l3-7 4 14 3-7h5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden 2xl:inline">Ambient</span>
          <span className="font-mono-tabular text-[10px] opacity-75">[A]</span>
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={isMuted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
          title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
          className="w-9 h-10 rounded-lg bg-[#071C26] hover:bg-[#0D2B3A] border border-cyan-800/70 text-cyan-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          {isMuted ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M11 5L6 9H2v6h4l5 4V5zm11 4l-6 6m0-6l6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M11 5L6 9H2v6h4l5 4V5zm4.54 3.46a5 5 0 0 1 0 7.07m2.83-9.9a9 9 0 0 1 0 12.73"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleTheme();
          }}
          aria-label="Toggle Theme [T]"
          title={
            theme === 'dark'
              ? 'Switch to Light Theme (T)'
              : 'Switch to Dark Theme (T)'
          }
          className="w-10 h-10 rounded-lg bg-[#071C26] hover:bg-[#0D2B3A] border border-cyan-800/70 text-cyan-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          aria-label="Pause Match [P]"
          title="Pause Match (P or Esc)"
          className="w-10 h-10 rounded-lg bg-[#071C26] hover:bg-[#0D2B3A] border border-cyan-800/70 text-cyan-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="6"
              y="4"
              width="4"
              height="16"
              rx="1"
              fill="currentColor"
            />
            <rect
              x="14"
              y="4"
              width="4"
              height="16"
              rx="1"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onRestart();
          }}
          aria-label="Restart Match [R]"
          title="Restart Match (R)"
          className="w-10 h-10 rounded-lg bg-[#071C26] hover:bg-[#0D2B3A] border border-cyan-800/70 text-cyan-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const BottomGameHud: React.FC<{
  board: BoardState;
  theme?: 'dark' | 'light';
  activeHint: TacticalHint | null;
  onApplyHintMove: (move: EdgeMove) => void;
}> = ({ board, theme = 'dark', activeHint, onApplyHintMove }) => {
  const totalBoxes = getTotalBoxes(board);
  const totalEdges = getTotalEdges(board.rows, board.cols);
  const remainingEdges = totalEdges - board.moveHistory.length;

  const lastMoveRecord =
    board.moveHistory.length > 0
      ? board.moveHistory[board.moveHistory.length - 1]
      : null;

  const timelineData = buildCaptureRatioTimeline(board, 10);
  const latestPoint = timelineData[timelineData.length - 1];
  const totalCaptured = board.scores.player + board.scores.computer;
  const playerCaptureRatio =
    totalCaptured > 0
      ? Math.round((board.scores.player / totalCaptured) * 100)
      : 0;
  const computerCaptureRatio =
    totalCaptured > 0 ? 100 - playerCaptureRatio : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-3 pt-1">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left 7 columns: Tactical Hint Advisor OR Live Match Move Telemetry */}
        <div className="lg:col-span-7 flex">
          {activeHint ? (
            <div
              data-testid="tactical-hint-bar"
              className="w-full px-4 py-2.5 rounded-xl bg-[#072628]/90 border border-[#1CE39B]/70 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 text-cyan-50">
                <span className="font-mono-tabular font-bold uppercase text-[#1CE39B]">
                  TACTICAL ADVISOR ({activeHint.category.toUpperCase()}):
                </span>
                <span>{activeHint.reason}</span>
              </div>
              <button
                type="button"
                onClick={() => onApplyHintMove(activeHint.move)}
                className="px-3.5 py-1.5 rounded-md bg-[#1CE39B] hover:bg-[#4FF0B5] text-[#04131A] font-display font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                Play Suggested Line
              </button>
            </div>
          ) : (
            <div className="w-full px-4 py-2.5 rounded-xl bg-[#071C26]/85 border border-cyan-900/60 flex flex-wrap items-center justify-between gap-3 text-xs text-cyan-200/75">
              <div className="flex items-center gap-2 font-mono-tabular">
                <span className="text-cyan-100 font-semibold">
                  {board.rows}×{board.cols} Grid ({totalBoxes} Boxes)
                </span>
                <span>·</span>
                <span>
                  Claimed: {totalCaptured} / {totalBoxes}
                </span>
                <span>·</span>
                <span>Lines Left: {remainingEdges}</span>
              </div>

              <div className="font-mono-tabular text-cyan-100">
                {lastMoveRecord ? (
                  <span>
                    Move #{lastMoveRecord.moveNumber}:{' '}
                    <strong
                      className={
                        lastMoveRecord.by === 'player'
                          ? 'text-[#1CE3DF]'
                          : 'text-[#38B6FF]'
                      }
                    >
                      {lastMoveRecord.by === 'player' ? 'YOU' : 'CPU'}
                    </strong>{' '}
                    drew {formatEdgeLabel(lastMoveRecord)}
                    {lastMoveRecord.boxesCaptured.length > 0
                      ? ` (+${lastMoveRecord.boxesCaptured.length} Box)`
                      : ''}
                  </span>
                ) : (
                  <span>
                    No lines drawn yet — click any dashed line between dots
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 5 columns: Compact Recharts Box Capture Ratio Analytical Panel */}
        <div
          data-testid="capture-ratio-panel"
          className="lg:col-span-5 px-4 py-2 rounded-xl bg-[#071C26]/90 border border-cyan-900/60 flex items-center justify-between gap-4"
        >
          <div className="flex flex-col justify-center min-w-[135px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#1CE3DF] whitespace-nowrap">
              BOX CAPTURE RATIO
            </div>
            <div className="font-mono-tabular text-xs font-semibold text-cyan-50 mt-0.5 whitespace-nowrap">
              {totalCaptured > 0 ? (
                <>
                  <span className="text-[#1CE3DF]">
                    YOU {playerCaptureRatio}%
                  </span>
                  <span className="text-cyan-600 mx-1.5">·</span>
                  <span className="text-[#38B6FF]">
                    CPU {computerCaptureRatio}%
                  </span>
                </>
              ) : (
                <span className="text-cyan-300/70">
                  0% Captured · {latestPoint.step}
                </span>
              )}
            </div>
            <div className="text-[10px] text-cyan-300/65 font-mono-tabular mt-0.5 whitespace-nowrap">
              Match Progression ({board.moveHistory.length} Moves)
            </div>
          </div>

          <div
            className="shrink-0 flex items-center justify-end"
            aria-label="Box capture ratio bar chart over match duration"
          >
            <BarChart
              width={210}
              height={46}
              data={timelineData}
              margin={{ top: 2, right: 2, left: 2, bottom: 0 }}
              barCategoryGap="18%"
            >
              <XAxis dataKey="step" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                cursor={{ fill: 'rgba(28, 227, 223, 0.12)' }}
                contentStyle={{
                  backgroundColor: theme === 'light' ? '#FFFFFF' : '#05131A',
                  borderColor: 'rgba(28, 227, 223, 0.45)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  color: theme === 'light' ? '#06283D' : '#ECFEFF',
                }}
                formatter={(value, name) => [
                  `${value}%`,
                  name === 'playerRatio'
                    ? 'You'
                    : name === 'computerRatio'
                    ? 'CPU'
                    : 'Open',
                ]}
              />
              <Bar
                dataKey="playerRatio"
                stackId="ratio"
                fill={theme === 'light' ? '#0D9488' : '#1CE3DF'}
                isAnimationActive={false}
                radius={[0, 0, 2, 2]}
              />
              <Bar
                dataKey="computerRatio"
                stackId="ratio"
                fill={theme === 'light' ? '#0284C7' : '#38B6FF'}
                isAnimationActive={false}
              />
              <Bar
                dataKey="unclaimedRatio"
                stackId="ratio"
                fill={theme === 'light' ? '#CCFBF1' : '#0E2E3D'}
                isAnimationActive={false}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </div>
        </div>
      </div>
    </div>
  );
};
