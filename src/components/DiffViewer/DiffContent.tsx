import { DiffHunk, DiffLine } from '../../api/git';
import { computeInlineWordDiffs, highlightCode, alignHunkLines, diffWords } from './diffUtils';

import styles from "./DiffContent.module.css";

interface DiffContentProps {
  hunks: DiffHunk[];
  path: string;
  viewMode: 'inline' | 'split';
  staged: boolean;
  commitId?: string;
  selectedKeys: Set<string>;
  setSelectedKeys: (keys: Set<string>) => void;
  hunkActionLoading: string | null;
  handleStageSelected: (header: string, lines: DiffLine[], idx: number) => void;
  handleUnstageSelected: (header: string, lines: DiffLine[], idx: number) => void;
  handleDiscardSelected: (header: string, lines: DiffLine[], idx: number) => void;
  getHunkSelectionState: (hunk: DiffHunk, idx: number) => { all: boolean; none: boolean; some: boolean };
}

export function DiffContent({
  hunks,
  path,
  viewMode,
  staged,
  commitId,
  selectedKeys,
  setSelectedKeys,
  hunkActionLoading,
  handleStageSelected,
  handleUnstageSelected,
  handleDiscardSelected,
  getHunkSelectionState,
}: DiffContentProps) {
  if (viewMode === 'inline') {
    return (
      <>
        {hunks.map((hunk, hunkIdx) => {
          const inlineWordDiffs = computeInlineWordDiffs(hunk.lines);
          return (
            <div key={hunkIdx} className="diff-hunk">
              <div className="diff-hunk__header">
                <span>{hunk.header.trim()}</span>
                {!commitId && (() => {
                  const selState = getHunkSelectionState(hunk, hunkIdx);
                  return (
                    <div className={styles.style2}>
                      {staged ? (
                        <button
                          className="btn btn--secondary"
                          onClick={() => handleUnstageSelected(hunk.header, hunk.lines, hunkIdx)}
                          disabled={hunkActionLoading !== null || selState.none}>
                          {hunkActionLoading === `unstage-${hunkIdx}` ? 'Unstaging...' : selState.some ? 'Unstage Selected' : 'Unstage Hunk'}
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn--primary"
                            onClick={() => handleStageSelected(hunk.header, hunk.lines, hunkIdx)}
                            disabled={hunkActionLoading !== null || selState.none}>
                            {hunkActionLoading === `stage-${hunkIdx}` ? 'Staging...' : selState.some ? 'Stage Selected' : 'Stage Hunk'}
                          </button>
                          <button
                            className="btn btn--danger"
                            onClick={() => handleDiscardSelected(hunk.header, hunk.lines, hunkIdx)}
                            disabled={hunkActionLoading !== null || selState.none}>
                            {hunkActionLoading === `discard-${hunkIdx}` ? 'Discarding...' : selState.some ? 'Discard Selected' : 'Discard Hunk'}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
              <table className="diff-table">
                <tbody>
                  {hunk.lines.map((line, lineIdx) => {
                    let lineClass = 'diff-line';
                    let originChar = ' ';
                    if (line.origin === '+') {
                      lineClass += ' diff-line--add';
                      originChar = '+';
                    } else if (line.origin === '-') {
                      lineClass += ' diff-line--remove';
                      originChar = '-';
                    }

                    return (
                      <tr key={lineIdx} className={lineClass}>
                        <td className={styles.style6}>
                          {(line.origin === '+' || line.origin === '-') && !commitId && (
                            <input
                              type="checkbox"
                              checked={selectedKeys.has(`${hunkIdx}-${lineIdx}`)}
                              onChange={(e) => {
                                const newKeys = new Set(selectedKeys);
                                const key = `${hunkIdx}-${lineIdx}`;
                                if (e.target.checked) {
                                  newKeys.add(key);
                                } else {
                                  newKeys.delete(key);
                                }
                                setSelectedKeys(newKeys);
                              }}
                              className={styles.style7}
                            />
                          )}
                        </td>
                        <td className="diff-line__num diff-line__num--old">
                          {line.old_lineno !== -1 && line.old_lineno !== null ? line.old_lineno : ''}
                        </td>
                        <td className="diff-line__num diff-line__num--new">
                          {line.new_lineno !== -1 && line.new_lineno !== null ? line.new_lineno : ''}
                        </td>
                        <td className="diff-line__origin">{originChar}</td>
                        <td className="diff-line__code">
                          {inlineWordDiffs.has(lineIdx) ? (
                            <pre>
                              {inlineWordDiffs.get(lineIdx)?.[line.origin === '-' ? 'oldHighlighted' : 'newHighlighted'].map((w, wIdx) => (
                                <span
                                  key={wIdx}
                                  style={{
                                    backgroundColor: w.changed
                                      ? line.origin === '-'
                                        ? 'rgba(248, 81, 73, 0.35)'
                                        : 'rgba(46, 160, 67, 0.35)'
                                      : 'transparent',
                                    borderRadius: '2px',
                                    padding: w.changed ? '1px 1px' : '0',
                                  }}
                                >
                                  {w.text}
                                </span>
                              ))}
                            </pre>
                          ) : (
                            <pre>{highlightCode(line.content, path)}</pre>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </>
    );
  } else {
    return (
      <>
        {hunks.map((hunk, hunkIdx) => {
          const alignedRows = alignHunkLines(hunk.lines);

          return (
            <div key={hunkIdx} className="diff-hunk">
              <div className="diff-hunk__header">
                <span>{hunk.header.trim()}</span>
                {!commitId && (() => {
                  const selState = getHunkSelectionState(hunk, hunkIdx);
                  return (
                    <div className={styles.style9}>
                      {staged ? (
                        <button
                          className="btn btn--secondary"
                          onClick={() => handleUnstageSelected(hunk.header, hunk.lines, hunkIdx)}
                          disabled={hunkActionLoading !== null || selState.none}>
                          {hunkActionLoading === `unstage-${hunkIdx}` ? 'Unstaging...' : selState.some ? 'Unstage Selected' : 'Unstage Hunk'}
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn--primary"
                            onClick={() => handleStageSelected(hunk.header, hunk.lines, hunkIdx)}
                            disabled={hunkActionLoading !== null || selState.none}>
                            {hunkActionLoading === `stage-${hunkIdx}` ? 'Staging...' : selState.some ? 'Stage Selected' : 'Stage Hunk'}
                          </button>
                          <button
                            className="btn btn--danger"
                            onClick={() => handleDiscardSelected(hunk.header, hunk.lines, hunkIdx)}
                            disabled={hunkActionLoading !== null || selState.none}>
                            {hunkActionLoading === `discard-${hunkIdx}` ? 'Discarding...' : selState.some ? 'Discard Selected' : 'Discard Hunk'}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
              <table className="diff-table diff-table--split">
                <colgroup>
                  <col className={styles.style13} />
                  <col className={styles.style14} />
                  <col />
                  <col className={styles.style15} />
                  <col className={styles.style16} />
                  <col />
                </colgroup>
                <tbody>
                  {alignedRows.map((row, rowIdx) => {
                    const isLeftDelete = row.left.type === 'delete';
                    const isLeftEmpty = row.left.type === 'empty';
                    const isRightAdd = row.right.type === 'add';
                    const isRightEmpty = row.right.type === 'empty';

                    return (
                      <tr key={rowIdx} className="diff-split-row">
                        <td
                          className={`diff-line__num diff-line__num--old ${
                            isLeftDelete ? 'diff-line__num--delete' : ''
                          } ${isLeftEmpty ? 'diff-split-empty' : ''}`}
                        >
                          {row.left.num}
                        </td>
                        <td
                          className={styles.style17}
                        >
                          {isLeftDelete && row.left.index !== null && !commitId && (
                            <input
                              type="checkbox"
                              checked={selectedKeys.has(`${hunkIdx}-${row.left.index}`)}
                              onChange={(e) => {
                                const newKeys = new Set(selectedKeys);
                                const key = `${hunkIdx}-${row.left.index}`;
                                if (e.target.checked) {
                                  newKeys.add(key);
                                } else {
                                  newKeys.delete(key);
                                }
                                setSelectedKeys(newKeys);
                              }}
                              className={styles.style18}
                            />
                          )}
                        </td>
                        <td
                          className={`diff-line__code ${
                            isLeftDelete ? 'diff-line__code--delete' : ''
                          } ${isLeftEmpty ? 'diff-split-empty' : ''}`}
                        >
                          {!isLeftEmpty && (() => {
                            if (isLeftDelete && isRightAdd) {
                              const wdiff = diffWords(row.left.code, row.right.code);
                              return (
                                <pre>
                                  {wdiff.oldHighlighted.map((w, wIdx) => (
                                    <span
                                      key={wIdx}
                                      style={{
                                        backgroundColor: w.changed ? 'rgba(248, 81, 73, 0.35)' : 'transparent',
                                        borderRadius: '2px',
                                        padding: w.changed ? '1px 1px' : '0',
                                      }}
                                    >
                                      {w.text}
                                    </span>
                                  ))}
                                </pre>
                              );
                            }
                            return <pre>{highlightCode(row.left.code, path)}</pre>;
                          })()}
                        </td>
                        <td
                          className={`diff-line__num diff-line__num--new ${
                            isRightAdd ? 'diff-line__num--add' : ''
                          } ${isRightEmpty ? 'diff-split-empty' : ''}`}
                        >
                          {row.right.num}
                        </td>
                        <td
                          className={styles.style19}
                        >
                          {isRightAdd && row.right.index !== null && !commitId && (
                            <input
                              type="checkbox"
                              checked={selectedKeys.has(`${hunkIdx}-${row.right.index}`)}
                              onChange={(e) => {
                                const newKeys = new Set(selectedKeys);
                                const key = `${hunkIdx}-${row.right.index}`;
                                if (e.target.checked) {
                                  newKeys.add(key);
                                } else {
                                  newKeys.delete(key);
                                }
                                setSelectedKeys(newKeys);
                              }}
                              className={styles.style20}
                            />
                          )}
                        </td>
                        <td
                          className={`diff-line__code ${
                            isRightAdd ? 'diff-line__code--add' : ''
                          } ${isRightEmpty ? 'diff-split-empty' : ''}`}
                        >
                          {!isRightEmpty && (() => {
                            if (isLeftDelete && isRightAdd) {
                              const wdiff = diffWords(row.left.code, row.right.code);
                              return (
                                <pre>
                                  {wdiff.newHighlighted.map((w, wIdx) => (
                                    <span
                                      key={wIdx}
                                      style={{
                                        backgroundColor: w.changed ? 'rgba(46, 160, 67, 0.35)' : 'transparent',
                                        borderRadius: '2px',
                                        padding: w.changed ? '1px 1px' : '0',
                                      }}
                                    >
                                      {w.text}
                                    </span>
                                  ))}
                                </pre>
                              );
                            }
                            return <pre>{highlightCode(row.right.code, path)}</pre>;
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </>
    );
  }
}
