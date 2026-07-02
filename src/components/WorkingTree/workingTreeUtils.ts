export const getStatusClass = (status: string) => {
  if (status.includes('A') || status === '??') return 'file-item__status--added';
  if (status.includes('M')) return 'file-item__status--modified';
  if (status.includes('D')) return 'file-item__status--deleted';
  if (status.includes('R')) return 'file-item__status--renamed';
  if (status === 'U') return 'file-item__status--conflicted';
  return '';
};
