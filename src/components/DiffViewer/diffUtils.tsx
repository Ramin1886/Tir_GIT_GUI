import React from 'react';
import { DiffLine } from '../../api/git';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-python';

export interface AlignedLine {
  left: { num: string; code: string; type: 'delete' | 'empty' | 'context'; index: number | null };
  right: { num: string; code: string; type: 'add' | 'empty' | 'context'; index: number | null };
}

export function alignHunkLines(lines: DiffLine[]): AlignedLine[] {
  const aligned: AlignedLine[] = [];
  let i = 0;

  while (i < lines.length) {
    const deletes: { line: DiffLine; index: number }[] = [];
    const adds: { line: DiffLine; index: number }[] = [];

    while (i < lines.length && lines[i].origin === '-') {
      deletes.push({ line: lines[i], index: i });
      i++;
    }

    while (i < lines.length && lines[i].origin === '+') {
      adds.push({ line: lines[i], index: i });
      i++;
    }

    if (deletes.length > 0 || adds.length > 0) {
      const count = Math.max(deletes.length, adds.length);
      for (let j = 0; j < count; j++) {
        const delObj = deletes[j];
        const addObj = adds[j];

        aligned.push({
          left: delObj
            ? {
                num: delObj.line.old_lineno !== -1 && delObj.line.old_lineno !== null ? String(delObj.line.old_lineno) : '',
                code: delObj.line.content,
                type: 'delete',
                index: delObj.index,
              }
            : { num: '', code: '', type: 'empty', index: null },
          right: addObj
            ? {
                num: addObj.line.new_lineno !== -1 && addObj.line.new_lineno !== null ? String(addObj.line.new_lineno) : '',
                code: addObj.line.content,
                type: 'add',
                index: addObj.index,
              }
            : { num: '', code: '', type: 'empty', index: null },
        });
      }
    } else {
      const line = lines[i];
      aligned.push({
        left: {
          num: line.old_lineno !== -1 && line.old_lineno !== null ? String(line.old_lineno) : '',
          code: line.content,
          type: 'context',
          index: i,
        },
        right: {
          num: line.new_lineno !== -1 && line.new_lineno !== null ? String(line.new_lineno) : '',
          code: line.content,
          type: 'context',
          index: i,
        },
      });
      i++;
    }
  }

  return aligned;
}

export function constructCustomPatch(
  filePath: string,
  hunkHeader: string,
  lines: DiffLine[],
  selectedIndices: Set<number>,
  isReverse: boolean
): string {
  let patch = `diff --git a/${filePath} b/${filePath}\n--- a/${filePath}\n+++ b/${filePath}\n${hunkHeader}\n`;
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const isSelected = selectedIndices.has(idx);
    
    if (line.origin === ' ') {
      patch += ' ' + line.content;
    } else if (line.origin === '-') {
      if (isReverse) {
        if (isSelected) {
          patch += '-' + line.content;
        }
      } else {
        if (isSelected) {
          patch += '-' + line.content;
        } else {
          patch += ' ' + line.content;
        }
      }
    } else if (line.origin === '+') {
      if (isReverse) {
        if (isSelected) {
          patch += '+' + line.content;
        } else {
          patch += ' ' + line.content;
        }
      } else {
        if (isSelected) {
          patch += '+' + line.content;
        }
      }
    }
    
    if (!line.content.endsWith('\n')) {
      patch += '\n';
    }
  }
  
  return patch;
}

export interface WordDiffHighlight {
  oldHighlighted: { text: string; changed: boolean }[];
  newHighlighted: { text: string; changed: boolean }[];
}

export function diffWords(oldStr: string, newStr: string): WordDiffHighlight {
  const pattern = /(\s+|\b)/;
  const oldWords = oldStr.split(pattern).filter((x) => x !== '');
  const newWords = newStr.split(pattern).filter((x) => x !== '');

  const n = oldWords.length;
  const m = newWords.length;
  const dp: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const oldHighlighted: { text: string; changed: boolean }[] = [];
  const newHighlighted: { text: string; changed: boolean }[] = [];

  let i = n;
  let j = m;
  const oldMatches = new Set<number>();
  const newMatches = new Set<number>();

  while (i > 0 && j > 0) {
    if (oldWords[i - 1] === newWords[j - 1]) {
      oldMatches.add(i - 1);
      newMatches.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  for (let idx = 0; idx < oldWords.length; idx++) {
    oldHighlighted.push({ text: oldWords[idx], changed: !oldMatches.has(idx) });
  }

  for (let idx = 0; idx < newWords.length; idx++) {
    newHighlighted.push({ text: newWords[idx], changed: !newMatches.has(idx) });
  }

  return { oldHighlighted, newHighlighted };
}

export function computeInlineWordDiffs(lines: DiffLine[]): Map<number, WordDiffHighlight> {
  const diffs = new Map<number, WordDiffHighlight>();
  let i = 0;
  while (i < lines.length) {
    const deletes: number[] = [];
    const adds: number[] = [];
    
    while (i < lines.length && lines[i].origin === '-') {
      deletes.push(i);
      i++;
    }
    while (i < lines.length && lines[i].origin === '+') {
      adds.push(i);
      i++;
    }
    
    const count = Math.min(deletes.length, adds.length);
    for (let j = 0; j < count; j++) {
      const delIdx = deletes[j];
      const addIdx = adds[j];
      const wdiff = diffWords(lines[delIdx].content, lines[addIdx].content);
      diffs.set(delIdx, wdiff);
      diffs.set(addIdx, wdiff);
    }
    
    if (deletes.length === 0 && adds.length === 0) {
      i++;
    }
  }
  return diffs;
}

export function highlightCode(code: string, path: string): React.ReactNode {
  if (!code) return '';

  const ext = path.split('.').pop()?.toLowerCase() || '';
  let lang = 'none';

  switch (ext) {
    case 'ts':
      lang = 'typescript';
      break;
    case 'tsx':
      lang = 'tsx';
      break;
    case 'js':
    case 'jsx':
      lang = 'javascript';
      break;
    case 'css':
      lang = 'css';
      break;
    case 'json':
      lang = 'json';
      break;
    case 'rs':
      lang = 'rust';
      break;
    case 'py':
      lang = 'python';
      break;
  }

  if (lang !== 'none' && Prism.languages[lang]) {
    const html = Prism.highlight(code, Prism.languages[lang], lang);
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return code;
}
