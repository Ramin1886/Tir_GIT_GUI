
import styles from "./HistoryFilters.module.css";
interface HistoryFiltersProps {
  filterKeyword: string;
  setFilterKeyword: (s: string) => void;
  filterAuthor: string;
  setFilterAuthor: (s: string) => void;
  filterDateStart: string;
  setFilterDateStart: (s: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (s: string) => void;
  filterPath: string;
  setFilterPath: (s: string) => void;
  handlePathFilterSubmit: () => void;
  filterContent: string;
  setFilterContent: (s: string) => void;
  handleContentFilterSubmit: () => void;
  handleAuthorFilterSubmit: () => void;
  handleDateFilterSubmit: () => void;
}

export function HistoryFilters({
  filterKeyword, setFilterKeyword,
  filterAuthor, setFilterAuthor,
  filterDateStart, setFilterDateStart,
  filterDateEnd, setFilterDateEnd,
  filterPath, setFilterPath, handlePathFilterSubmit,
  filterContent, setFilterContent, handleContentFilterSubmit,
  handleAuthorFilterSubmit, handleDateFilterSubmit
}: HistoryFiltersProps) {
  return (
    <div className="history-view__filters">
      <input
        type="text"
        placeholder="Search keyword..."
        value={filterKeyword}
        onChange={(e) => setFilterKeyword(e.target.value)}
        className={styles.style2}
      />
      <div className={styles.style6}>
        <input
          type="text"
          placeholder="Author..."
          value={filterAuthor}
          onChange={(e) => setFilterAuthor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAuthorFilterSubmit(); }}
          className={styles.style3}
        />
        <button className="btn btn--primary" onClick={handleAuthorFilterSubmit}>
          Author
        </button>
      </div>
      <div className={styles.style6}>
        <input
          type="date"
          title="Start date"
          value={filterDateStart}
          onChange={(e) => setFilterDateStart(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleDateFilterSubmit(); }}
          className={styles.style4}
        />
        <input
          type="date"
          title="End date"
          value={filterDateEnd}
          onChange={(e) => setFilterDateEnd(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleDateFilterSubmit(); }}
          className={styles.style5}
        />
        <button className="btn btn--primary" onClick={handleDateFilterSubmit}>
          Date
        </button>
      </div>
      <div className={styles.style6}>
        <input
          type="text"
          placeholder="File path (git log)..."
          value={filterPath}
          onChange={(e) => setFilterPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePathFilterSubmit(); }}
          className={styles.style7}
        />
        <button className="btn btn--primary" onClick={handlePathFilterSubmit}>
          Path
        </button>
      </div>
      <div className={styles.style9}>
        <input
          type="text"
          placeholder="Changed content (git log -S)..."
          value={filterContent}
          onChange={(e) => setFilterContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleContentFilterSubmit(); }}
          className={styles.style10}
        />
        <button className="btn btn--primary" onClick={handleContentFilterSubmit}>
          Content
        </button>
      </div>
    </div>
  );
}
