import React from 'react';
import { CommitInfo } from '../../api/git';
import { DagNode } from './historyUtils';
import { VirtualItem, Virtualizer } from '@tanstack/react-virtual';

import styles from "./CommitList.module.css";

interface CommitListProps {
  filteredCommits: CommitInfo[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  parentRef: React.RefObject<HTMLDivElement | null>;
  selectedCommitId: string | null;
  setSelectedCommitId: (id: string) => void;
  dagMap: Map<string, DagNode>;
  ciStatuses: Map<string, 'success' | 'failure' | 'pending' | null>;
  refsMap: Map<string, { shorthand: string; isHead: boolean; isTag: boolean }[]>;
  setContextMenu: (menu: { x: number; y: number; items: Array<{ label: string; action: () => void; danger?: boolean; disabled?: boolean }> }) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  cherryPick: (id: string) => Promise<void>;
  revertCommit: (id: string) => Promise<void>;
  fetchHistory: (isBackground: boolean, filterPathActive: string) => void;
  filterPathActive: string;
  setShowRebaseModal: (show: boolean) => void;
}

export function CommitList({
  filteredCommits, rowVirtualizer, parentRef, selectedCommitId, setSelectedCommitId,
  dagMap, ciStatuses, refsMap, setContextMenu, addToast, cherryPick, revertCommit,
  fetchHistory, filterPathActive, setShowRebaseModal
}: CommitListProps) {
  if (filteredCommits.length === 0) {
    return (
      <div ref={parentRef} className={styles.style1}>
        <p className={styles.style2}>
          No commits match the filters.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (filteredCommits.length === 0) return;
          
          let currentIndex = filteredCommits.findIndex(c => c.id === selectedCommitId);
          if (currentIndex === -1) {
            currentIndex = 0;
          } else {
            if (e.key === 'ArrowDown' && currentIndex < filteredCommits.length - 1) {
              currentIndex++;
            } else if (e.key === 'ArrowUp' && currentIndex > 0) {
              currentIndex--;
            }
          }
          
          const targetId = filteredCommits[currentIndex].id;
          setSelectedCommitId(targetId);
          rowVirtualizer.scrollToIndex(currentIndex, { align: 'auto' });
        }
      }}
      className={styles.style3}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const commit = filteredCommits[virtualRow.index];
          const date = new Date(commit.time * 1000).toLocaleString();
          const isActive = selectedCommitId === commit.id;
          
          const node = dagMap.get(commit.id);
          const canvasWidth = node ? Math.max(1, node.activeLanesCount) * 14 + 14 : 30;

          return (
            <div
              key={virtualRow.key}
              className={`commit-row ${isActive ? 'commit-row--active' : ''}`}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 var(--spacing-4)',
                cursor: 'pointer',
                borderBottom: '1px solid var(--color-border)',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                boxSizing: 'border-box'
              }}
              onClick={() => setSelectedCommitId(commit.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelectedCommitId(commit.id);
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    {
                      label: 'Copy SHA',
                      action: () => {
                        navigator.clipboard.writeText(commit.id);
                        addToast('Commit hash copied to clipboard', 'success');
                      }
                    },
                    {
                      label: 'Cherry-pick commit',
                      action: async () => {
                        if (window.confirm(`Are you sure you want to cherry-pick commit ${commit.id.substring(0, 7)} onto the current branch?`)) {
                          try {
                            await cherryPick(commit.id);
                            addToast(`Successfully cherry-picked ${commit.id.substring(0, 7)}`, 'success');
                            fetchHistory(false, filterPathActive);
                          } catch (err) {
                            addToast(`Cherry-pick failed: ${String(err)}`, 'error');
                          }
                        }
                      }
                    },
                    {
                      label: 'Revert commit',
                      danger: true,
                      action: async () => {
                        if (window.confirm(`Are you sure you want to revert commit ${commit.id.substring(0, 7)}?`)) {
                          try {
                            await revertCommit(commit.id);
                            addToast(`Successfully reverted ${commit.id.substring(0, 7)}`, 'success');
                            fetchHistory(false, filterPathActive);
                          } catch (err) {
                            addToast(`Revert failed: ${String(err)}`, 'error');
                          }
                        }
                      }
                    },
                    {
                      label: 'Interactive Rebase from here',
                      action: () => {
                        setSelectedCommitId(commit.id);
                        setShowRebaseModal(true);
                      }
                    }
                  ]
                });
              }}
            >
              {/* Canvas DAG Graph column */}
              <div style={{ width: `${canvasWidth}px`, height: '100%', flexShrink: 0, marginRight: 'var(--spacing-3)' }}>
                <canvas
                  ref={(el) => {
                    if (el && node) {
                      const ctx = el.getContext('2d');
                      if (ctx) {
                        ctx.clearRect(0, 0, el.width, el.height);
                        ctx.lineWidth = 2.5;
                        ctx.lineCap = 'round';
                        
                        const laneWidth = 14;
                        const rowHeight = 40;
                        const nodeRadius = 4.5;
                        
                        // 1. Draw top half vertical connection lines (coming into this row)
                        const uniqueFroms = new Set(node.routes.map(r => r.from));
                        uniqueFroms.forEach((fromIdx) => {
                          const route = node.routes.find(r => r.from === fromIdx);
                          if (route) {
                            ctx.strokeStyle = route.color;
                            ctx.beginPath();
                            ctx.moveTo(fromIdx * laneWidth + laneWidth, 0);
                            ctx.lineTo(fromIdx * laneWidth + laneWidth, rowHeight / 2);
                            ctx.stroke();
                          }
                        });

                        // 2. Draw routes (lines starting from this row going down)
                        node.routes.forEach((route) => {
                          ctx.strokeStyle = route.color;
                          ctx.beginPath();
                          const startX = route.from * laneWidth + laneWidth;
                          const startY = rowHeight / 2;
                          const endX = route.to * laneWidth + laneWidth;
                          const endY = rowHeight;
                          
                          ctx.moveTo(startX, startY);
                          if (startX === endX) {
                            ctx.lineTo(endX, endY);
                          } else {
                            ctx.bezierCurveTo(startX, startY + 12, endX, startY + 8, endX, endY);
                          }
                          ctx.stroke();
                        });

                        // 3. Draw commit node circle
                        ctx.strokeStyle = '#ffffff';
                        ctx.fillStyle = '#01696f'; // teal accent color
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(node.lane * laneWidth + laneWidth, rowHeight / 2, nodeRadius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                      }
                    }
                  }}
                  width={canvasWidth}
                  height={40}
                  style={{ display: 'block', width: `${canvasWidth}px`, height: '40px' }}
                />
              </div>
              <div className="commit-row__message">
                {ciStatuses.get(commit.id) === 'success' && (
                  <span title="CI/CD Status: Passed" className={styles.style5}>🟢</span>
                )}
                {ciStatuses.get(commit.id) === 'failure' && (
                  <span title="CI/CD Status: Failed" className={styles.style6}>🔴</span>
                )}
                {ciStatuses.get(commit.id) === 'pending' && (
                  <span title="CI/CD Status: In Progress" className={styles.style7}>🟡</span>
                )}
                {refsMap.get(commit.id)?.map((ref) => {
                  const badgeStyle: React.CSSProperties = {
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1
                  };

                  if (ref.isTag) {
                    return (
                      <span key={ref.shorthand} style={{ ...badgeStyle, backgroundColor: 'rgba(191, 135, 0, 0.15)', color: 'var(--color-text-primary)', border: '1px solid rgba(191, 135, 0, 0.3)' }}>
                        🏷️ {ref.shorthand}
                      </span>
                    );
                  } else if (ref.isHead) {
                    return (
                      <span key={ref.shorthand} style={{ ...badgeStyle, backgroundColor: 'var(--color-accent)', color: '#ffffff' }}>
                        * {ref.shorthand}
                      </span>
                    );
                  } else {
                    return (
                      <span key={ref.shorthand} style={{ ...badgeStyle, backgroundColor: 'rgba(9, 105, 218, 0.15)', color: 'var(--color-text-primary)', border: '1px solid rgba(9, 105, 218, 0.3)' }}>
                        ⎇ {ref.shorthand}
                      </span>
                    );
                  }
                })}
                <strong className={styles.style8}>{commit.message}</strong>
              </div>
              <div className="commit-row__author">
                {commit.author}
              </div>
              <div className="commit-row__date">
                {date}
              </div>
              <div className="commit-row__id">
                {commit.id.substring(0, 7)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
