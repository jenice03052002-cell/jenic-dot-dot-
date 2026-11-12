import React, { useState } from 'react';
import {
  BoardState,
  EdgeMove,
  TacticalHint,
  countBoxSides,
  simulatePlaceAndCount,
} from '../game/rules';

interface DotsBoardProps {
  board: BoardState;
  isAiThinking: boolean;
  activeHint: TacticalHint | null;
  onSelectEdge: (move: EdgeMove) => void;
}

export const DotsBoard: React.FC<DotsBoardProps> = ({
  board,
  isAiThinking,
  activeHint,
  onSelectEdge,
}) => {
  const [hoveredEdge, setHoveredEdge] = useState<EdgeMove | null>(null);
  const rows = board.rows;
  const cols = board.cols;
  const maxDim = Math.max(rows, cols);

  const cellWidthClass =
    maxDim <= 2
      ? 'w-28 sm:w-36'
      : maxDim === 3
      ? 'w-20 sm:w-28'
      : maxDim === 4
      ? 'w-16 sm:w-22'
      : 'w-13 sm:w-18';

  const cellHeightClass =
    maxDim <= 2
      ? 'h-28 sm:h-36'
      : maxDim === 3
      ? 'h-20 sm:h-28'
      : maxDim === 4
      ? 'h-16 sm:h-22'
      : 'h-13 sm:h-18';

  const cellSizeClass = `${cellWidthClass} ${cellHeightClass}`;

  const isEdgeLastMove = (orientation: 'h' | 'v', r: number, c: number) =>
    board.lastMove?.orientation === orientation &&
    board.lastMove?.row === r &&
    board.lastMove?.col === c;

  const isEdgeHint = (orientation: 'h' | 'v', r: number, c: number) =>
    activeHint?.move.orientation === orientation &&
    activeHint?.move.row === r &&
    activeHint?.move.col === c;

  const isEdgeHovered = (orientation: 'h' | 'v', r: number, c: number) =>
    hoveredEdge?.orientation === orientation &&
    hoveredEdge?.row === r &&
    hoveredEdge?.col === c;

  const canInteract =
    board.currentTurn === 'player' && !board.isGameOver && !isAiThinking;

  // Use GameManager's SimulatePlaceAndCount to preview how many boxes hoveredEdge completes
  const hoveredCompletionCount =
    hoveredEdge && canInteract
      ? simulatePlaceAndCount(
          board,
          hoveredEdge.orientation === 'h',
          hoveredEdge.row,
          hoveredEdge.col
        )
      : 0;

  return (
    <div
      data-testid="dots-board"
      className="relative flex flex-col items-center justify-center p-5 sm:p-8 rounded-2xl bg-[#071C26]/95 border border-cyan-900/60 shadow-[0_20px_50px_rgba(5,19,26,0.85)]"
    >
      {/* Top Column Coordinate Labels */}
      <div className="flex items-center mb-3 pl-6 pr-2 w-full justify-around">
        {Array.from({ length: cols }).map((_, colIdx) => (
          <span
            key={`col-label-${colIdx}`}
            className="font-mono-tabular text-[11px] font-semibold text-cyan-400/60 tracking-wider"
          >
            COL {colIdx + 1}
          </span>
        ))}
      </div>

      <div className="flex items-center">
        {/* Left Row Coordinate Labels */}
        <div className="flex flex-col justify-around pr-3 self-stretch py-2">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <span
              key={`row-label-${rowIdx}`}
              className="font-mono-tabular text-[11px] font-semibold text-cyan-400/60"
            >
              R{rowIdx + 1}
            </span>
          ))}
        </div>

        {/* Main Interactive Grid Matrix: (rows + 1) horizontal edge rows and `rows` box rows */}
        <div
          role="grid"
          aria-label={`${rows} by ${cols} Dots and Boxes game board`}
          className="flex flex-col select-none"
        >
          {Array.from({ length: rows + 1 }).map((_, rowIdx) => (
            <React.Fragment key={`matrix-row-${rowIdx}`}>
              {/* 1. Horizontal Dot + Edge Row */}
              <div className="flex items-center" role="row">
                {Array.from({ length: cols + 1 }).map((__, colIdx) => {
                  const hasRightEdge = colIdx < cols;
                  const hOwner = hasRightEdge
                    ? board.hEdges[rowIdx][colIdx]
                    : null;
                  const hLast =
                    hasRightEdge && isEdgeLastMove('h', rowIdx, colIdx);
                  const hHint = hasRightEdge && isEdgeHint('h', rowIdx, colIdx);
                  const hHover =
                    hasRightEdge && isEdgeHovered('h', rowIdx, colIdx);

                  return (
                    <React.Fragment key={`node-${rowIdx}-${colIdx}`}>
                      {/* Intersection Vertex Dot */}
                      <div
                        className="relative z-20 w-4 h-4 rounded-full bg-cyan-50 border-2 border-[#05131A] shadow-[0_0_8px_rgba(28,227,223,0.35)] shrink-0 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1CE3DF]" />
                      </div>

                      {/* Horizontal Edge Button between (rowIdx, colIdx) and (rowIdx, colIdx + 1) */}
                      {hasRightEdge && (
                        <div
                          className={`relative flex items-center justify-center ${cellWidthClass} h-4`}
                        >
                          <button
                            type="button"
                            disabled={hOwner !== null || !canInteract}
                            aria-label={
                              hOwner
                                ? `Horizontal line row ${rowIdx + 1} column ${
                                    colIdx + 1
                                  } claimed by ${hOwner}`
                                : `Draw horizontal line at row ${
                                    rowIdx + 1
                                  }, column ${colIdx + 1}`
                            }
                            onClick={() =>
                              onSelectEdge({
                                orientation: 'h',
                                row: rowIdx,
                                col: colIdx,
                              })
                            }
                            onMouseEnter={() =>
                              setHoveredEdge({
                                orientation: 'h',
                                row: rowIdx,
                                col: colIdx,
                              })
                            }
                            onMouseLeave={() => setHoveredEdge(null)}
                            className={`group absolute inset-x-0 -inset-y-3.5 z-10 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1CE3DF] rounded ${
                              hOwner === null && canInteract
                                ? 'cursor-pointer'
                                : 'cursor-default'
                            }`}
                          >
                            {/* Visual Line Bar */}
                            <span
                              className={`block w-full transition-all duration-150 rounded-full ${
                                hOwner === 'player'
                                  ? 'h-2.5 bg-[#1CE3DF] shadow-[0_0_12px_rgba(28,227,223,0.55)]'
                                  : hOwner === 'computer'
                                  ? 'h-2.5 bg-[#38B6FF] shadow-[0_0_12px_rgba(56,182,255,0.55)]'
                                  : hHint
                                  ? 'h-2.5 bg-[#1CE39B] shadow-[0_0_14px_rgba(28,227,155,0.8)]'
                                  : hHover && canInteract
                                  ? 'h-2.5 bg-[#1CE3DF]/85'
                                  : 'h-0 border-t-2 border-dashed border-cyan-700/75 group-hover:border-[#1CE3DF]/75'
                              }`}
                            />
                            {hLast && (
                              <span
                                aria-hidden="true"
                                className={`absolute w-3 h-3 rotate-45 border-2 border-[#05131A] ${
                                  hOwner === 'player'
                                    ? 'bg-[#70F3F0]'
                                    : 'bg-[#7CCBFF]'
                                }`}
                              />
                            )}
                            {hHint && hOwner === null && (
                              <span
                                aria-hidden="true"
                                className="absolute -top-4 px-1.5 py-0.5 rounded bg-[#1CE39B] text-[#04131A] font-mono-tabular font-bold text-[10px] tracking-tight"
                              >
                                HINT
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* 2. Vertical Edge + Interior Box Row (only for rowIdx < rows) */}
              {rowIdx < rows && (
                <div className="flex items-center" role="row">
                  {Array.from({ length: cols + 1 }).map((__, colIdx) => {
                    const hasBoxRight = colIdx < cols;
                    const vOwner = board.vEdges[rowIdx][colIdx];
                    const vLast = isEdgeLastMove('v', rowIdx, colIdx);
                    const vHint = isEdgeHint('v', rowIdx, colIdx);
                    const vHover = isEdgeHovered('v', rowIdx, colIdx);

                    const boxOwner = hasBoxRight
                      ? board.boxes[rowIdx][colIdx]
                      : null;
                    const boxMoveNum = hasBoxRight
                      ? board.boxCaptureOrder[rowIdx][colIdx]
                      : null;
                    const currentSides = hasBoxRight
                      ? countBoxSides(board, rowIdx, colIdx)
                      : 0;

                    const wouldCompleteOnHover =
                      hasBoxRight &&
                      boxOwner === null &&
                      currentSides === 3 &&
                      hoveredCompletionCount > 0 &&
                      hoveredEdge !== null &&
                      ((hoveredEdge.orientation === 'h' &&
                        hoveredEdge.col === colIdx &&
                        (hoveredEdge.row === rowIdx ||
                          hoveredEdge.row === rowIdx + 1) &&
                        board.hEdges[hoveredEdge.row][hoveredEdge.col] ===
                          null) ||
                        (hoveredEdge.orientation === 'v' &&
                          hoveredEdge.row === rowIdx &&
                          (hoveredEdge.col === colIdx ||
                            hoveredEdge.col === colIdx + 1) &&
                          board.vEdges[hoveredEdge.row][hoveredEdge.col] ===
                            null));

                    return (
                      <React.Fragment key={`vcell-${rowIdx}-${colIdx}`}>
                        {/* Vertical Edge Button */}
                        <div
                          className={`relative flex items-center justify-center w-4 ${cellHeightClass}`}
                        >
                          <button
                            type="button"
                            disabled={vOwner !== null || !canInteract}
                            aria-label={
                              vOwner
                                ? `Vertical line row ${rowIdx + 1} column ${
                                    colIdx + 1
                                  } claimed by ${vOwner}`
                                : `Draw vertical line at row ${
                                    rowIdx + 1
                                  }, column ${colIdx + 1}`
                            }
                            onClick={() =>
                              onSelectEdge({
                                orientation: 'v',
                                row: rowIdx,
                                col: colIdx,
                              })
                            }
                            onMouseEnter={() =>
                              setHoveredEdge({
                                orientation: 'v',
                                row: rowIdx,
                                col: colIdx,
                              })
                            }
                            onMouseLeave={() => setHoveredEdge(null)}
                            className={`group absolute inset-y-0 -inset-x-3.5 z-10 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1CE3DF] rounded ${
                              vOwner === null && canInteract
                                ? 'cursor-pointer'
                                : 'cursor-default'
                            }`}
                          >
                            <span
                              className={`block h-full transition-all duration-150 rounded-full ${
                                vOwner === 'player'
                                  ? 'w-2.5 bg-[#1CE3DF] shadow-[0_0_12px_rgba(28,227,223,0.55)]'
                                  : vOwner === 'computer'
                                  ? 'w-2.5 bg-[#38B6FF] shadow-[0_0_12px_rgba(56,182,255,0.55)]'
                                  : vHint
                                  ? 'w-2.5 bg-[#1CE39B] shadow-[0_0_14px_rgba(28,227,155,0.8)]'
                                  : vHover && canInteract
                                  ? 'w-2.5 bg-[#1CE3DF]/85'
                                  : 'w-0 border-l-2 border-dashed border-cyan-700/75 group-hover:border-[#1CE3DF]/75'
                              }`}
                            />
                            {vLast && (
                              <span
                                aria-hidden="true"
                                className={`absolute w-3 h-3 rotate-45 border-2 border-[#05131A] ${
                                  vOwner === 'player'
                                    ? 'bg-[#70F3F0]'
                                    : 'bg-[#7CCBFF]'
                                }`}
                              />
                            )}
                            {vHint && vOwner === null && (
                              <span
                                aria-hidden="true"
                                className="absolute -left-5 px-1 py-0.5 rounded bg-[#1CE39B] text-[#04131A] font-mono-tabular font-bold text-[10px]"
                              >
                                H
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Box Territory Cell */}
                        {hasBoxRight && (
                          <div
                            data-testid={`box-${rowIdx}-${colIdx}`}
                            data-owner={boxOwner ?? 'none'}
                            className={`${cellSizeClass} p-1.5 flex items-center justify-center`}
                          >
                            <div
                              className={`w-full h-full rounded-lg flex flex-col items-center justify-center transition-colors duration-150 ${
                                boxOwner === 'player'
                                  ? 'animate-box-capture bg-[#1CE3DF]/20 border border-[#1CE3DF]/60 text-[#70F3F0]'
                                  : boxOwner === 'computer'
                                  ? 'animate-box-capture bg-[#1C9BE3]/22 border border-[#38B6FF]/60 text-[#7CCBFF]'
                                  : wouldCompleteOnHover
                                  ? 'bg-[#1CE39B]/18 border border-dashed border-[#1CE39B] text-[#1CE39B]'
                                  : currentSides === 3
                                  ? 'bg-[#1CE39B]/10 border border-dashed border-[#1CE39B]/55 text-[#1CE39B]'
                                  : 'bg-[#041017]/55 border border-cyan-950/80 text-cyan-600/70'
                              }`}
                            >
                              {boxOwner === 'player' && (
                                <>
                                  <span className="font-display font-extrabold text-xs sm:text-sm tracking-tight text-[#1CE3DF]">
                                    YOU
                                  </span>
                                  {boxMoveNum !== null && (
                                    <span className="font-mono-tabular text-[10px] text-[#70F3F0]/80">
                                      #{boxMoveNum}
                                    </span>
                                  )}
                                </>
                              )}

                              {boxOwner === 'computer' && (
                                <>
                                  <span className="font-display font-extrabold text-xs sm:text-sm tracking-tight text-[#38B6FF]">
                                    CPU
                                  </span>
                                  {boxMoveNum !== null && (
                                    <span className="font-mono-tabular text-[10px] text-[#7CCBFF]/80">
                                      #{boxMoveNum}
                                    </span>
                                  )}
                                </>
                              )}

                              {boxOwner === null && wouldCompleteOnHover && (
                                <span className="font-display font-bold text-[11px] text-[#1CE39B]">
                                  +{hoveredCompletionCount} BOX
                                </span>
                              )}

                              {boxOwner === null &&
                                !wouldCompleteOnHover &&
                                currentSides === 3 && (
                                  <span
                                    title="3 of 4 sides claimed — ready to capture!"
                                    className="font-mono-tabular font-semibold text-[10px] text-[#1CE39B]"
                                  >
                                    3/4
                                  </span>
                                )}

                              {boxOwner === null &&
                                !wouldCompleteOnHover &&
                                currentSides > 0 &&
                                currentSides < 3 && (
                                  <span className="font-mono-tabular text-[10px] text-cyan-600/80">
                                    {currentSides}/4
                                  </span>
                                )}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
