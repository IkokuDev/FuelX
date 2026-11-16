/** Client-side formatting helpers. Money arrives from the API as integer kobo. */

export function formatKobo(kobo: number, decimals = true): string {
  const negative = kobo < 0;
  const abs = Math.abs(Math.round(kobo));
  const naira = Math.floor(abs / 100);
  const koboPart = abs % 100;
  const grouped = naira.toLocaleString('en-NG');
  const base = decimals ? `${grouped}.${koboPart.toString().padStart(2, '0')}` : grouped;
  return `${negative ? '-' : ''}\u20a6${base}`;
}

export function formatKoboShort(kobo: number): string {
  return kobo % 100 === 0 ? formatKobo(kobo, false) : formatKobo(kobo);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
