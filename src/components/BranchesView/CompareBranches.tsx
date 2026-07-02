
import { BranchInfo, BranchComparison } from '../../api/git';
import { Spinner } from './Spinner';

import styles from "./CompareBranches.module.css";

interface CompareBranchesProps {
  branches: BranchInfo[];
  baseBranch: string;
  setBaseBranch: (b: string) => void;
  compareBranch: string;
  setCompareBranch: (b: string) => void;
  comparisonLoading: boolean;
  comparisonError: string | null;
  comparison: BranchComparison | null;
}

export function CompareBranches({
  branches,
  baseBranch,
  setBaseBranch,
  compareBranch,
  setCompareBranch,
  comparisonLoading,
  comparisonError,
  comparison
}: CompareBranchesProps) {
  return (
    <div className="compare-view">
      <div className="compare-view__selectors">
        <div className="compare-view__selector-group">
          <label className="compare-view__label">Base Branch (Compare from)</label>
          <select
            className="compare-view__select"
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
          >
            <option value="" disabled>Select base branch</option>
            {branches.map((b) => (
              <option key={`base-${b.name}`} value={b.name}>
                {b.shorthand} {b.is_remote ? '(remote)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.style1}>
          VS
        </div>

        <div className="compare-view__selector-group">
          <label className="compare-view__label">Compare Branch (Compare to)</label>
          <select
            className="compare-view__select"
            value={compareBranch}
            onChange={(e) => setCompareBranch(e.target.value)}
          >
            <option value="" disabled>Select compare branch</option>
            {branches.map((b) => (
              <option key={`compare-${b.name}`} value={b.name}>
                {b.shorthand} {b.is_remote ? '(remote)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {baseBranch === compareBranch ? (
        <div className={styles.style2}>
          Base and Compare branches are the same. Select different branches to compare.
        </div>
      ) : comparisonLoading ? (
        <div className={styles.style3}>
          <Spinner /> Calculating ahead/behind and file differences...
        </div>
      ) : comparisonError ? (
        <div className={styles.style4}>
          Error comparing branches: {comparisonError}
        </div>
      ) : comparison ? (
        <div className="compare-view__results">
          <div className="compare-view__summary">
            <div className="compare-view__card">
              <span className="compare-view__card-title">Commits Ahead (on base branch)</span>
              <span className="compare-view__card-count compare-view__card-count--ahead">
                {comparison.ahead}
              </span>
            </div>
            <div className="compare-view__card">
              <span className="compare-view__card-title">Commits Behind (on base branch)</span>
              <span className="compare-view__card-count compare-view__card-count--behind">
                {comparison.behind}
              </span>
            </div>
          </div>

          <div className="compare-view__files-container">
            <div className="compare-view__files-header">
              Changed Files ({comparison.files.length})
            </div>
            {comparison.files.length === 0 ? (
              <div className={styles.style5}>
                No file differences between these branches.
              </div>
            ) : (
              <ul className="compare-view__file-list">
                {comparison.files.map((file) => (
                  <li key={file.path} className="compare-view__file-item">
                    <span className={`compare-view__badge compare-view__badge--${file.status.toLowerCase()}`}>
                      {file.status}
                    </span>
                    <span className="compare-view__file-path">{file.path}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
