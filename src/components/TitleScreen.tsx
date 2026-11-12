import React, { useState } from 'react';
import { Difficulty, PlayerId } from '../game/rules';

export type ThemeMode = 'dark' | 'light';

interface TitleScreenProps {
  rows: number;
  cols: number;
  difficulty: Difficulty;
  startingPlayer: PlayerId;
  isAmbientEnabled: boolean;
  theme: ThemeMode;
  onChangeBoardDimensions: (rows: number, cols: number) => void;
  onChangeDifficulty: (diff: Difficulty) => void;
  onChangeStartingPlayer: (player: PlayerId) => void;
  onToggleAmbient: () => void;
  onSelectTheme: (theme: ThemeMode) => void;
  onStartGame: () => void;
}

const GRID_PRESETS: Array<{
  rows: number;
  cols: number;
  label: string;
  desc: string;
}> = [
  { rows: 2, cols: 2, label: '2×2 Blitz', desc: '3×3 Dots · 4 Boxes' },
  { rows: 3, cols: 3, label: '3×3 Classic', desc: '4×4 Dots · 9 Boxes (Default)' },
  { rows: 3, cols: 4, label: '3×4 Wide', desc: '4×5 Dots · 12 Boxes' },
  { rows: 4, cols: 4, label: '4×4 Standard', desc: '5×5 Dots · 16 Boxes' },
];

const DIFFICULTY_OPTIONS: Array<{
  id: Difficulty;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'casual',
    label: 'Casual',
    subtitle: 'Relaxed pacing · Leaves occasional openings',
  },
  {
    id: 'tactical',
    label: 'Tactical',
    subtitle: 'Balanced AI · SimulatePlaceAndCount & chain guard',
  },
  {
    id: 'grandmaster',
    label: 'Grandmaster',
    subtitle: 'Optimal solver · Chain control & minimum sacrifice',
  },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  rows,
  cols,
  difficulty,
  startingPlayer,
  isAmbientEnabled,
  theme,
  onChangeBoardDimensions,
  onChangeDifficulty,
  onChangeStartingPlayer,
  onToggleAmbient,
  onSelectTheme,
  onStartGame,
}) => {
  const [previewEdges, setPreviewEdges] = useState<
    Record<string, 'player' | 'computer'>
  >({
    'h-0-0': 'player',
    'h-1-0': 'computer',
    'v-0-0': 'player',
    'v-0-1': 'player',
    'h-0-1': 'computer',
    'v-0-2': 'computer',
    'h-1-1': 'player',
    'v-1-1': 'computer',
    'h-2-1': 'player',
  });
  const [hoveredPreviewEdge, setHoveredPreviewEdge] = useState<string | null>(
    null
  );

  const togglePreviewEdge = (key: string) => {
    setPreviewEdges((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = 'player';
      }
      return next;
    });
  };

  const isTopLeftBoxComplete =
    Boolean(previewEdges['h-0-0']) &&
    Boolean(previewEdges['h-1-0']) &&
    Boolean(previewEdges['v-0-0']) &&
    Boolean(previewEdges['v-0-1']);

  const isTopRightBoxComplete =
    Boolean(previewEdges['h-0-1']) &&
    Boolean(previewEdges['h-1-1']) &&
    Boolean(previewEdges['v-0-1']) &&
    Boolean(previewEdges['v-0-2']);

  const totalBoxes = rows * cols;
  const totalLines = (rows + 1) * cols + rows * (cols + 1);

  return (
    <main
      data-theme={theme}
      className="min-h-screen w-full drafting-canvas-bg text-cyan-50 flex flex-col justify-between px-4 py-4 sm:px-6 sm:py-6 md:px-12 md:py-8"
    >
      {/* Top quiet brand bar */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect
              x="5"
              y="5"
              width="22"
              height="22"
              rx="2"
              stroke="#1CE3DF"
              strokeWidth="2.5"
            />
            <line
              x1="16"
              y1="5"
              x2="16"
              y2="27"
              stroke="#164E63"
              strokeWidth="2"
            />
            <line
              x1="5"
              y1="16"
              x2="27"
              y2="16"
              stroke="#164E63"
              strokeWidth="2"
            />
            <rect
              x="7.5"
              y="7.5"
              width="6"
              height="6"
              fill="#1CE3DF"
              fillOpacity="0.38"
            />
            <rect
              x="18.5"
              y="18.5"
              width="6"
              height="6"
              fill="#1C9BE3"
              fillOpacity="0.38"
            />
            <circle cx="5" cy="5" r="3" fill="#ECFEFF" />
            <circle cx="16" cy="5" r="2.5" fill="#67E8F9" />
            <circle cx="27" cy="5" r="3" fill="#ECFEFF" />
            <circle cx="5" cy="16" r="2.5" fill="#67E8F9" />
            <circle cx="16" cy="16" r="3" fill="#1CE3DF" />
            <circle cx="27" cy="16" r="2.5" fill="#67E8F9" />
            <circle cx="5" cy="27" r="3" fill="#ECFEFF" />
            <circle cx="16" cy="27" r="2.5" fill="#67E8F9" />
            <circle cx="27" cy="27" r="3" fill="#ECFEFF" />
          </svg>
          <span className="font-display font-bold tracking-tight text-lg text-cyan-50 whitespace-nowrap">
            QUADRA
          </span>
          <span className="text-cyan-700" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-cyan-200/70 hidden sm:inline">
            Architectural Dots &amp; Boxes Duel
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-cyan-200/70 font-mono-tabular">
          <span>1P vs Computer AI</span>
          <span aria-hidden="true">·</span>
          <span>
            {rows}×{cols} Grid ({totalBoxes} Boxes)
          </span>
        </div>
      </div>

      {/* Main Split Stage */}
      <div className="max-w-7xl w-full mx-auto my-auto py-3 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
        {/* Left 7 columns */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-4 sm:space-y-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-3">
              <svg
                width="48"
                height="48"
                viewBox="0 0 64 64"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect
                  x="4"
                  y="4"
                  width="56"
                  height="56"
                  rx="10"
                  fill="#081E28"
                  stroke="#153E52"
                  strokeWidth="2"
                />
                <line
                  x1="16"
                  y1="16"
                  x2="48"
                  y2="16"
                  stroke="#1CE3DF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="16"
                  y1="32"
                  x2="48"
                  y2="32"
                  stroke="#1CE3DF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="16"
                  y1="48"
                  x2="32"
                  y2="48"
                  stroke="#1C9BE3"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="16"
                  y1="16"
                  x2="16"
                  y2="48"
                  stroke="#1CE3DF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="32"
                  y1="16"
                  x2="32"
                  y2="48"
                  stroke="#1C9BE3"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="48"
                  y1="16"
                  x2="48"
                  y2="32"
                  stroke="#1CE39B"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <line
                  x1="32"
                  y1="48"
                  x2="48"
                  y2="48"
                  stroke="#2A6478"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />
                <rect
                  x="19"
                  y="19"
                  width="10"
                  height="10"
                  rx="1.5"
                  fill="#1CE3DF"
                  fillOpacity="0.3"
                />
                <rect
                  x="35"
                  y="19"
                  width="10"
                  height="10"
                  rx="1.5"
                  fill="#1CE39B"
                  fillOpacity="0.3"
                />
                <rect
                  x="19"
                  y="35"
                  width="10"
                  height="10"
                  rx="1.5"
                  fill="#1C9BE3"
                  fillOpacity="0.3"
                />
                {[16, 32, 48].map((y) =>
                  [16, 32, 48].map((x) => (
                    <circle
                      key={`${x}-${y}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#ECFEFF"
                      stroke="#081E28"
                      strokeWidth="1.5"
                    />
                  ))
                )}
              </svg>
              <div>
                <p className="text-xs text-[#1CE3DF] font-medium tracking-wide">
                  Tactical Grid Territory Game
                </p>
                <h1
                  className="font-display font-extrabold tracking-tight text-cyan-50 leading-none"
                  style={{
                    fontSize: 'clamp(1.85rem, 4vw, 3.5rem)',
                    textWrap: 'balance',
                  }}
                >
                  Connect the Dots. Claim Every Box.
                </h1>
              </div>
            </div>

            <p className="text-cyan-100/80 text-sm sm:text-base leading-relaxed max-w-2xl">
              Take turns drawing single horizontal or vertical lines between
              adjacent dots. Completing the fourth side of a{' '}
              <span className="text-[#1CE3DF] font-medium">1×1 box</span> claims
              it for your score and awards an immediate{' '}
              <span className="text-[#1CE39B] font-medium">bonus turn</span>.
              Outmaneuver the computer by forcing chain sacrifices.
            </p>
          </div>

          {/* Configuration Controls */}
          <div className="w-full max-w-2xl space-y-3.5 sm:space-y-5 pt-2 border-t border-cyan-900/50">
            {/* 1. Grid Size Selector (Supports both presets and custom rows x cols) */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-cyan-100">
                  01. Select Board Dimensions (Rows × Cols)
                </span>
                <div className="flex items-center gap-3 font-mono-tabular">
                  <label className="inline-flex items-center gap-1.5 text-cyan-200">
                    <span>Rows:</span>
                    <select
                      aria-label="Board Rows"
                      value={rows}
                      onChange={(e) =>
                        onChangeBoardDimensions(Number(e.target.value), cols)
                      }
                      className="bg-[#081E28] border border-cyan-800 rounded px-1.5 py-0.5 text-cyan-50 focus:outline-none focus:border-[#1CE3DF]"
                    >
                      {[2, 3, 4, 5].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-cyan-200">
                    <span>Cols:</span>
                    <select
                      aria-label="Board Columns"
                      value={cols}
                      onChange={(e) =>
                        onChangeBoardDimensions(rows, Number(e.target.value))
                      }
                      className="bg-[#081E28] border border-cyan-800 rounded px-1.5 py-0.5 text-cyan-50 focus:outline-none focus:border-[#1CE3DF]"
                    >
                      {[2, 3, 4, 5].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="text-cyan-300/70">
                    {totalBoxes} Boxes · {totalLines} Lines
                  </span>
                </div>
              </div>
              <div
                role="group"
                aria-label="Board Dimensions"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
              >
                {GRID_PRESETS.map((opt) => {
                  const active = rows === opt.rows && cols === opt.cols;
                  return (
                    <button
                      key={`${opt.rows}x${opt.cols}`}
                      type="button"
                      onClick={() =>
                        onChangeBoardDimensions(opt.rows, opt.cols)
                      }
                      aria-pressed={active}
                      className={`px-3.5 py-2.5 rounded-lg text-left transition-colors border cursor-pointer ${
                        active
                          ? 'bg-[#1CE3DF]/15 border-[#1CE3DF] text-cyan-50 shadow-[0_0_16px_rgba(28,227,223,0.18)]'
                          : 'bg-[#081E28]/80 border-cyan-900/60 text-cyan-200/80 hover:border-cyan-700 hover:text-cyan-50'
                      }`}
                    >
                      <div className="font-display font-bold text-sm whitespace-nowrap">
                        {opt.label}
                      </div>
                      <div className="text-xs text-cyan-300/65 mt-0.5 truncate">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Computer AI Difficulty Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-cyan-100">
                  02. Computer Opponent Intelligence
                </span>
                <span
                  data-testid="cpu-win-chance-badge"
                  className="font-mono-tabular font-semibold text-[#38B6FF]"
                >
                  CPU Win Chance: 60% (Player 40%)
                </span>
              </div>
              <div
                role="group"
                aria-label="Computer Difficulty"
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
              >
                {DIFFICULTY_OPTIONS.map((opt) => {
                  const active = difficulty === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeDifficulty(opt.id)}
                      aria-pressed={active}
                      className={`px-3.5 py-2.5 rounded-lg text-left transition-colors border cursor-pointer ${
                        active
                          ? 'bg-[#1C9BE3]/20 border-[#38B6FF] text-cyan-50 shadow-[0_0_16px_rgba(28,155,227,0.22)]'
                          : 'bg-[#081E28]/80 border-cyan-900/60 text-cyan-200/80 hover:border-cyan-700 hover:text-cyan-50'
                      }`}
                    >
                      <div className="font-display font-bold text-sm whitespace-nowrap">
                        {opt.label}
                      </div>
                      <div className="text-xs text-cyan-300/65 mt-0.5 line-clamp-1">
                        {opt.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Turn Order + Ambient Audio + Theme Setting + Primary Start Button */}
            <div className="pt-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-cyan-200/90 hidden xl:inline">
                    Opening:
                  </span>
                  <div
                    role="group"
                    aria-label="Opening Move"
                    className="inline-flex p-1 bg-[#081E28] border border-cyan-900/70 rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => onChangeStartingPlayer('player')}
                      aria-pressed={startingPlayer === 'player'}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        startingPlayer === 'player'
                          ? 'bg-[#1CE3DF] text-[#04131A]'
                          : 'text-cyan-200/80 hover:text-white'
                      }`}
                    >
                      You First
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeStartingPlayer('computer')}
                      aria-pressed={startingPlayer === 'computer'}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        startingPlayer === 'computer'
                          ? 'bg-[#38B6FF] text-[#04131A]'
                          : 'text-cyan-200/80 hover:text-white'
                      }`}
                    >
                      CPU First
                    </button>
                  </div>
                </div>

                {/* Ambient Background Audio Setting Toggle */}
                <button
                  type="button"
                  onClick={onToggleAmbient}
                  aria-pressed={isAmbientEnabled}
                  aria-label="Toggle Architectural Ambient Audio Loop"
                  className={`px-2.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isAmbientEnabled
                      ? 'bg-[#1CE39B]/15 border-[#1CE39B]/80 text-[#1CE39B]'
                      : 'bg-[#081E28] border-cyan-900/70 text-cyan-300/70 hover:text-cyan-100'
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
                  <span>
                    Ambient: {isAmbientEnabled ? 'On' : 'Off'}
                  </span>
                </button>

                {/* Light / Dark Theme Segmented Selector */}
                <div
                  role="group"
                  aria-label="Display Theme"
                  className="inline-flex p-1 bg-[#081E28] border border-cyan-900/70 rounded-lg"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    aria-label="Dark Theme"
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-[#1CE3DF] text-[#04131A]'
                        : 'text-cyan-200/80 hover:text-cyan-50'
                    }`}
                  >
                    <svg
                      width="13"
                      height="13"
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
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTheme('light')}
                    aria-pressed={theme === 'light'}
                    aria-label="Light Theme"
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      theme === 'light'
                        ? 'bg-[#1CE3DF] text-[#04131A]'
                        : 'text-cyan-200/80 hover:text-cyan-50'
                    }`}
                  >
                    <svg
                      width="13"
                      height="13"
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
                    <span>Light</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={onStartGame}
                className="px-6 py-3 rounded-lg bg-[#1CE3DF] hover:bg-[#52EFEA] active:bg-[#14B8B4] text-[#04131A] font-display font-bold text-base tracking-tight transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-[0_0_24px_rgba(28,227,223,0.3)]"
              >
                Start Match
              </button>
            </div>
          </div>
        </div>

        {/* Right 5 columns: Interactive Centerpiece Showcase */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-[#081E28]/85 border border-cyan-900/60 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-900/50">
              <div>
                <h2 className="font-display font-bold text-sm text-cyan-50">
                  Interactive Rule Preview
                </h2>
                <p className="text-xs text-cyan-300/70">
                  Click any dashed line below to test box completion
                </p>
              </div>
              <span className="font-mono-tabular text-xs text-[#1CE3DF] font-semibold">
                {(isTopLeftBoxComplete ? 1 : 0) +
                  (isTopRightBoxComplete ? 1 : 0)}{' '}
                / 2 Captured
              </span>
            </div>

            <div className="flex justify-center my-2">
              <svg
                viewBox="0 0 260 190"
                className="w-full max-w-[280px] h-auto select-none"
                role="img"
                aria-label="Interactive Dots and Boxes demonstration board"
              >
                <rect
                  x="46"
                  y="31"
                  width="78"
                  height="68"
                  rx="6"
                  fill={
                    isTopLeftBoxComplete
                      ? 'rgba(28, 227, 223, 0.24)'
                      : theme === 'light'
                      ? 'rgba(204, 251, 241, 0.55)'
                      : 'rgba(12, 42, 56, 0.45)'
                  }
                  stroke={
                    isTopLeftBoxComplete
                      ? theme === 'light'
                        ? '#0D9488'
                        : '#1CE3DF'
                      : 'transparent'
                  }
                  strokeWidth="1.5"
                />
                {isTopLeftBoxComplete && (
                  <text
                    x="85"
                    y="70"
                    textAnchor="middle"
                    fill={theme === 'light' ? '#0F766E' : '#1CE3DF'}
                    className="font-display font-bold text-xs"
                  >
                    +1 BONUS
                  </text>
                )}

                <rect
                  x="136"
                  y="31"
                  width="78"
                  height="68"
                  rx="6"
                  fill={
                    isTopRightBoxComplete
                      ? 'rgba(28, 227, 155, 0.24)'
                      : theme === 'light'
                      ? 'rgba(224, 242, 254, 0.65)'
                      : 'rgba(12, 42, 56, 0.45)'
                  }
                  stroke={
                    isTopRightBoxComplete
                      ? theme === 'light'
                        ? '#059669'
                        : '#1CE39B'
                      : 'transparent'
                  }
                  strokeWidth="1.5"
                />
                {isTopRightBoxComplete ? (
                  <text
                    x="175"
                    y="70"
                    textAnchor="middle"
                    fill={theme === 'light' ? '#047857' : '#1CE39B'}
                    className="font-display font-bold text-xs"
                  >
                    CAPTURED!
                  </text>
                ) : (
                  <text
                    x="175"
                    y="69"
                    textAnchor="middle"
                    fill={theme === 'light' ? '#0284C7' : '#38B6FF'}
                    className="font-mono-tabular text-[11px]"
                  >
                    3/4 SIDES
                  </text>
                )}

                {[
                  { key: 'h-0-0', x1: 40, y1: 25, x2: 130, y2: 25 },
                  { key: 'h-0-1', x1: 130, y1: 25, x2: 220, y2: 25 },
                  { key: 'h-1-0', x1: 40, y1: 105, x2: 130, y2: 105 },
                  { key: 'h-1-1', x1: 130, y1: 105, x2: 220, y2: 105 },
                  { key: 'v-0-0', x1: 40, y1: 25, x2: 40, y2: 105 },
                  { key: 'v-0-1', x1: 130, y1: 25, x2: 130, y2: 105 },
                  { key: 'v-0-2', x1: 220, y1: 25, x2: 220, y2: 105 },
                ].map((edge) => {
                  const owner = previewEdges[edge.key];
                  const isHovered = hoveredPreviewEdge === edge.key;
                  const strokeColor =
                    owner === 'player'
                      ? theme === 'light'
                        ? '#0D9488'
                        : '#1CE3DF'
                      : owner === 'computer'
                      ? theme === 'light'
                        ? '#0284C7'
                        : '#38B6FF'
                      : isHovered
                      ? '#1CE39B'
                      : theme === 'light'
                      ? '#6495A6'
                      : '#2A6478';
                  return (
                    <g
                      key={edge.key}
                      className="cursor-pointer"
                      onClick={() => togglePreviewEdge(edge.key)}
                      onMouseEnter={() => setHoveredPreviewEdge(edge.key)}
                      onMouseLeave={() => setHoveredPreviewEdge(null)}
                    >
                      <line
                        x1={edge.x1}
                        y1={edge.y1}
                        x2={edge.x2}
                        y2={edge.y2}
                        stroke="transparent"
                        strokeWidth="22"
                      />
                      <line
                        x1={edge.x1}
                        y1={edge.y1}
                        x2={edge.x2}
                        y2={edge.y2}
                        stroke={strokeColor}
                        strokeWidth={owner || isHovered ? '6' : '3'}
                        strokeDasharray={owner ? undefined : '6 5'}
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}

                <line
                  x1="40"
                  y1="105"
                  x2="40"
                  y2="160"
                  stroke={theme === 'light' ? '#94B8C5' : '#1E4E63'}
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                />
                <line
                  x1="130"
                  y1="105"
                  x2="130"
                  y2="160"
                  stroke={theme === 'light' ? '#0284C7' : '#38B6FF'}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <line
                  x1="220"
                  y1="105"
                  x2="220"
                  y2="160"
                  stroke={theme === 'light' ? '#94B8C5' : '#1E4E63'}
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                />
                <line
                  x1="40"
                  y1="160"
                  x2="130"
                  y2="160"
                  stroke={theme === 'light' ? '#94B8C5' : '#1E4E63'}
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                />
                <line
                  x1="130"
                  y1="160"
                  x2="220"
                  y2="160"
                  stroke={theme === 'light' ? '#0D9488' : '#1CE3DF'}
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                {[25, 105, 160].map((y) =>
                  [40, 130, 220].map((x) => (
                    <g key={`dot-${x}-${y}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="7"
                        fill={theme === 'light' ? '#06283D' : '#05131A'}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="4.5"
                        fill={theme === 'light' ? '#FFFFFF' : '#ECFEFF'}
                      />
                    </g>
                  ))
                )}
              </svg>
            </div>

            <div className="space-y-2 pt-3 border-t border-cyan-900/50 text-xs text-cyan-100/85">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#1CE3DF]">
                  1. TryPlaceEdge(isHorizontal, r, c)
                </span>
                <span className="text-cyan-300/70">
                  Connect 2 adjacent orthogonal dots
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#1CE39B]">
                  2. CheckCompletedBoxesAroundEdge
                </span>
                <span className="text-cyan-300/70">
                  Score +1 point &amp; keep turn
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#38B6FF]">
                  3. SimulatePlaceAndCount AI
                </span>
                <span className="text-cyan-300/70">
                  Evaluates captures &amp; chains
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safe-Margin Control Hint Line */}
      <div className="max-w-7xl w-full mx-auto pt-2 flex flex-wrap items-center justify-between gap-4 text-xs text-cyan-300/65">
        <span>
          Click Any Edge to Draw Line · Enter / Space Start Match · H Tactical
          Hint · Z Undo · T Theme · A Ambient · P Pause
        </span>
        <span className="font-mono-tabular text-cyan-400/55">
          QUADRA ENGINE · ANALOGOUS AQUA EDITION
        </span>
      </div>
    </main>
  );
};
