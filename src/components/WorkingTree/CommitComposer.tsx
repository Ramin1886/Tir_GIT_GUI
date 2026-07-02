import React from 'react';
import { Spinner } from './Spinner';
import { WorkingTreeStatus } from '../../api/git';

import styles from "./CommitComposer.module.css";

interface CommitComposerProps {
  commitMessage: string;
  setCommitMessage: (msg: string) => void;
  coAuthors: string;
  setCoAuthors: (authors: string) => void;
  amend: boolean;
  handleAmendChange: (checked: boolean) => void;
  isCommitting: boolean;
  status: WorkingTreeStatus;
  handleCommitSubmit: (e?: React.SyntheticEvent | { preventDefault: () => void }) => void;
}

export function CommitComposer({
  commitMessage, setCommitMessage, coAuthors, setCoAuthors,
  amend, handleAmendChange, isCommitting, status, handleCommitSubmit
}: CommitComposerProps) {
  return (
    <div className="working-tree__composer">
      <form onSubmit={handleCommitSubmit} className="composer-form">
        <textarea
          className="composer-textarea"
          placeholder="Commit message (Enter message here...)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleCommitSubmit(e);
            }
          }}
          disabled={isCommitting}
          spellCheck={true}
          required
        />
        <div className={styles.style1}>
          <label className={styles.style2}>
            Co-authors (e.g. John Doe &lt;john@example.com&gt;, separated by commas)
          </label>
          <input
            type="text"
            className="settings-input"
            placeholder="John Doe <john@example.com>, Jane Smith <jane@example.com>"
            value={coAuthors}
            onChange={(e) => setCoAuthors(e.target.value)}
            disabled={isCommitting} />
        </div>
        <div className="composer-actions">
          <label className="composer-checkbox-label">
            <input
              type="checkbox"
              className="composer-checkbox"
              checked={amend}
              onChange={(e) => handleAmendChange(e.target.checked)}
              disabled={isCommitting}
            />
            Amend Last Commit
          </label>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={isCommitting || (status.staged.length === 0 && !amend)}>
            {isCommitting ? <Spinner /> : null}
            Commit
          </button>
        </div>
      </form>
    </div>
  );
}
