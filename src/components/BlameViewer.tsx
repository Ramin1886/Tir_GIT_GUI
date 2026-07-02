import { useEffect, useState } from 'react';
import { getBlame, BlameLine } from '../api/git';
import { useAppStore } from '../store';

import styles from "./BlameViewer.module.css";

interface BlameViewerProps {
  path: string;
  commitId?: string;
}

function getHeatColor(time: number, minTime: number, maxTime: number, isDark: boolean) {
  if (time === 0 || maxTime === minTime) {
    return 'var(--color-bg-secondary)';
  }
  // fraction = 1 means most recent, fraction = 0 means oldest
  const fraction = (time - minTime) / (maxTime - minTime);
  
  if (isDark) {
    // Dark mode time heat color scale (from dark slate to warm rust/amber)
    const hue = 30; // Orange/amber
    const saturation = 10 + Math.round(fraction * 35); // 10% to 45%
    const lightness = 12 + Math.round(fraction * 15); // 12% to 27%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } else {
    // Light mode time heat color scale (from clean white/gray to soft cream/warm orange)
    const hue = 30; // Orange/amber
    const saturation = 5 + Math.round(fraction * 45); // 5% to 50%
    const lightness = 98 - Math.round(fraction * 12); // 98% to 86%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

function highlightCode(code: string, path: string): React.ReactNode {
  if (!code) return ' ';

  const ext = path.split('.').pop()?.toLowerCase();
  if (
    !ext ||
    !['ts', 'tsx', 'js', 'jsx', 'rs', 'py', 'go', 'cs', 'java', 'cpp', 'h', 'css', 'json', 'toml'].includes(ext)
  ) {
    return code;
  }

  // Simple token highlighter
  const parts = code.split(
    /(\/\/.*|#.*|".*?"|'.*?'|`.*?`|\b(?:const|let|var|function|return|import|export|from|class|extends|if|else|for|while|fn|pub|use|struct|impl|mut|match|def|elif|as|async|await|nil|true|false)\b)/g
  );

  return parts.map((part, idx) => {
    if (part.startsWith('//') || part.startsWith('#')) {
      return (
        <span key={idx} className={styles.style1}>
          {part}
        </span>
      );
    }
    if (
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith("'") && part.endsWith("'")) ||
      (part.startsWith('`') && part.endsWith('`'))
    ) {
      return (
        <span key={idx} className={styles.style2}>
          {part}
        </span>
      );
    }
    if (
      [
        'const',
        'let',
        'var',
        'function',
        'return',
        'import',
        'export',
        'from',
        'class',
        'extends',
        'if',
        'else',
        'for',
        'while',
        'fn',
        'pub',
        'use',
        'struct',
        'impl',
        'mut',
        'match',
        'def',
        'elif',
        'as',
        'async',
        'await',
        'nil',
        'true',
        'false',
      ].includes(part)
    ) {
      return (
        <span key={idx} className={styles.style3}>
          {part}
        </span>
      );
    }
    return part;
  });
}

export function BlameViewer({ path, commitId }: BlameViewerProps) {
  const [blameLines, setBlameLines] = useState<BlameLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  useEffect(() => {
    async function loadBlame() {
      setIsLoading(true);
      setError(null);
      try {
        const lines = await getBlame(path, commitId);
        setBlameLines(lines);
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    }
    loadBlame();
  }, [path, commitId]);

  if (isLoading) {
    return (
      <div className={styles.style4}>Loading blame information...
              </div>
    );
  }

  if (error) {
    return (
      <div
        className={styles.style5}
      >
        <strong>Failed to load blame:</strong> {error}
      </div>
    );
  }

  const times = blameLines.map((l) => l.time).filter((t) => t > 0);
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;

  return (
    <div
      className={styles.style6}
    >
      <div
        className={styles.style7}
      >
        <div className={styles.style8}>
          {blameLines.map((line, idx) => {
            const heatBg = getHeatColor(line.time, minTime, maxTime, isDark);
            
            // Format date
            const dateStr = line.time > 0 
              ? new Date(line.time * 1000).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric' })
              : '';

            return (
              <div
                key={idx}
                className={styles.style9}
              >
                {/* Blame Commit Info Column */}
                <div
                  style={{
                    width: '260px',
                    flexShrink: 0,
                    padding: '2px 8px',
                    backgroundColor: heatBg,
                    borderRight: '1px solid var(--color-border)',
                    color: isDark ? '#d4d4d8' : '#3f3f46',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                  }}
                  title={`${line.commit_id.substring(0, 8)} - ${line.author} - ${line.summary} (${dateStr})`}
                >
                  <span className={styles.style10}>
                    {line.commit_id ? line.commit_id.substring(0, 8) : '-------'}
                  </span>
                  <span className={styles.style11}>
                    {line.author ? line.author.split(' ')[0] : ''}
                  </span>
                  <span className={styles.style12}>
                    {dateStr}
                  </span>
                </div>
                {/* Line Number Column */}
                <div
                  className={styles.style13}
                >
                  {line.line_number}
                </div>
                {/* Code Content Column */}
                <div
                  className={styles.style14}
                >
                  {highlightCode(line.content, path)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
