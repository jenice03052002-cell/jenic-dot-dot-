import React from 'react';
import {
  BoardState,
  Difficulty,
  getGameManagerScoreText,
  getGameManagerStatusText,
  getTotalBoxes,
} from '../game/rules';

interface StatusModalProps {
  mode: 'paused' | 'gameover';
  board: BoardState;
  difficulty: Difficulty;
  elapsedSeconds: number;
  isMuted: boolean;
  isAmbientEnabled: boolean;
  theme: 'dark' | 'light';
  onToggleMute: () => void;
  onToggleAmbient: () => void;
  onSelectTheme: (theme: 'dark' | 'light') => void;
  onResume?: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  mode,
  board,
  difficulty,
  elapsedSeconds,
  isMuted,
  isAmbientEnabled,
  theme,
  onToggleMute,
  onToggleAmbient,
  onSelectTheme,
  onResume,
  onRestart,
  onReturnToTitle,
}) => {
  const totalBoxes = getTotalBoxes(board);
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  if (mode === 'paused') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030D12]/85"
      >
        <div className="w-full max-w-md rounded-2xl bg-[#071C26] border border-cyan-800/80 p-6 shadow-2xl space-y-5">
          <div className="space-y-1">
            <div className="text-xs font-mono-tabular uppercase tracking-wider text-[#1CE3DF]">
              MATCH SUSPENDED · SETTINGS
            </div>
            <h2
              id="pause-modal-title"
              className="font-display font-extrabold text-2xl text-cyan-50"
            >
              Game Paused &amp; Settings
            </h2>
            <p className="text-xs text-cyan-200/75">
              {board.rows}×{board.cols} Board · {getGameManagerScoreText(board)} · vs{' '}
              {difficulty.toUpperCase()} CPU (60% Win Chance)
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#041017]/90 border border-cyan-900/70">
              <div className="text-[10px] font-bold uppercase text-[#1CE3DF]">
                YOUR BOXES
              </div>
              <div className="font-display font-extrabold text-2xl text-cyan-50 font-mono-tabular mt-1">
                {board.scores.player}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#041017]/90 border border-cyan-900/70">
              <div className="text-[10px] font-bold uppercase text-[#38B6FF]">
                CPU BOXES
              </div>
              <div className="font-display font-extrabold text-2xl text-cyan-50 font-mono-tabular mt-1">
                {board.scores.computer}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#041017]/90 border border-cyan-900/70">
              <div className="text-[10px] font-bold uppercase text-[#1CE39B]">
                ELAPSED
              </div>
              <div className="font-display font-extrabold text-2xl text-cyan-50 font-mono-tabular mt-1">
                {formatTime(elapsedSeconds)}
              </div>
            </div>
          </div>

          {/* Appearance, Audio & Architectural Ambient Soundscape Settings */}
          <div className="p-3.5 rounded-xl bg-[#041017]/90 border border-cyan-900/70 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">
              APPEARANCE &amp; AUDIO SETTINGS
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-cyan-50">
                  Display Theme
                </div>
                <div className="text-[11px] text-cyan-300/65">
                  Midnight blueprint or daylight vellum [T]
                </div>
              </div>
              <div
                role="group"
                aria-label="Display Theme"
                className="inline-flex p-0.5 bg-[#071C26] border border-cyan-800/80 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => onSelectTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  aria-label="Dark Theme"
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#1CE3DF] text-[#04131A]'
                      : 'text-cyan-200/80 hover:text-cyan-50'
                  }`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTheme('light')}
                  aria-pressed={theme === 'light'}
                  aria-label="Light Theme"
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    theme === 'light'
                      ? 'bg-[#1CE3DF] text-[#04131A]'
                      : 'text-cyan-200/80 hover:text-cyan-50'
                  }`}
                >
                  Light
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-cyan-900/50">
              <div>
                <div className="text-xs font-semibold text-cyan-50">
                  Architectural Ambient Loop
                </div>
                <div className="text-[11px] text-cyan-300/65">
                  Low-volume harmonic drafting drone &amp; chime
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleAmbient}
                aria-pressed={isAmbientEnabled}
                aria-label="Toggle Architectural Ambient Audio Loop"
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isAmbientEnabled
                    ? 'bg-[#1CE39B]/20 border-[#1CE39B] text-[#1CE39B]'
                    : 'bg-[#071C26] border-cyan-800/80 text-cyan-300/70'
                }`}
              >
                {isAmbientEnabled ? 'Enabled [A]' : 'Disabled [A]'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-cyan-900/50">
              <div>
                <div className="text-xs font-semibold text-cyan-50">
                  Master Game Audio
                </div>
                <div className="text-[11px] text-cyan-300/65">
                  Drafting pen clicks, box chimes &amp; ambient loop
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                aria-pressed={!isMuted}
                aria-label="Toggle Master Game Audio"
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  !isMuted
                    ? 'bg-[#1CE3DF]/20 border-[#1CE3DF] text-[#1CE3DF]'
                    : 'bg-[#071C26] border-cyan-800/80 text-cyan-300/70'
                }`}
              >
                {isMuted ? 'Muted [M]' : 'Active [M]'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {onResume && (
              <button
                type="button"
                onClick={onResume}
                className="w-full py-3 px-4 rounded-lg bg-[#1CE3DF] hover:bg-[#52EFEA] text-[#04131A] font-display font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Resume Match
              </button>
            )}
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0D2B3A] hover:bg-[#133B4E] text-cyan-50 font-display font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              Restart Match
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full py-2.5 px-4 rounded-lg bg-transparent hover:bg-[#0D2B3A]/60 border border-cyan-800/80 text-cyan-200 font-display font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              Quit Match &amp; Back to Configuration [B]
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Over Modal (Victory / Defeat / Draw)
  const isVictory = board.winner === 'player';
  const isDraw = board.winner === 'draw';
  const sharePercent = Math.round((board.scores.player / totalBoxes) * 100);
  const statusHeadline = getGameManagerStatusText(board);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030D12]/85"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#071C26] border border-cyan-800/80 p-6 shadow-2xl space-y-6">
        <div className="space-y-1.5">
          <div
            className={`text-xs font-mono-tabular font-bold uppercase tracking-wider ${
              isVictory
                ? 'text-[#1CE3DF]'
                : isDraw
                ? 'text-[#1CE39B]'
                : 'text-[#38B6FF]'
            }`}
          >
            {isVictory
              ? 'VICTORY · TERRITORY SECURED'
              : isDraw
              ? 'DEADLOCK · SYMMETRIC SPLIT'
              : 'DEFEAT · COMPUTER DOMINATED'}
          </div>
          <h2
            id="gameover-modal-title"
            className="font-display font-extrabold text-3xl text-cyan-50"
          >
            {statusHeadline}
          </h2>
          <p className="text-xs text-cyan-200/75 font-mono-tabular">
            {getGameManagerScoreText(board)} · {board.rows}×{board.cols} Grid ({difficulty.toUpperCase()})
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#041017]/90 border border-cyan-900/70">
            <div className="text-[10px] font-bold uppercase text-[#1CE3DF]">
              FINAL SCORE
            </div>
            <div className="font-display font-extrabold text-2xl text-cyan-50 font-mono-tabular mt-1">
              {board.scores.player}–{board.scores.computer}
            </div>
            <div className="text-[11px] text-cyan-300/70 font-mono-tabular mt-0.5">
              {sharePercent}% Territory
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#041017]/90 border border-cyan-900/70">
            <div className="text-[10px] font-bold uppercase text-[#1CE39B]">
              MAX CHAIN
            </div>
            <div className="font-display font-extrabold text-2xl text-cyan-50 font-mono-tabular mt-1">
              ×{board.maxStreak.player}
            </div>
            <div className="text-[11px] text-cyan-300/70 font-mono-tabular mt-0.5">
              CPU ×{board.maxStreak.computer}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#041017]/90 border border-cyan-900/70">
            <div className="text-[10px] font-bold uppercase text-[#38B6FF]">
              CLEAR TIME
            </div>
            <div className="font-display font-extrabold text-2xl text-cyan-50 font-mono-tabular mt-1">
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-[11px] text-cyan-300/70 font-mono-tabular mt-0.5">
              {board.moveHistory.length} Moves
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-lg bg-[#1CE3DF] hover:bg-[#52EFEA] text-[#04131A] font-display font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2.5 px-4 rounded-lg bg-[#0D2B3A] hover:bg-[#133B4E] text-cyan-100 font-display font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Configure Board &amp; Difficulty
          </button>
        </div>
      </div>
    </div>
  );
};
