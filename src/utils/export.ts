export function downloadFile(name: string, content: string | Blob, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: (string | number | null)[][]) {
  return rows
    .map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
}
export function shareConfiguration(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.length > 12000)
    throw new Error('This system is too large for a share link. Export JSON instead.');
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
export function readConfiguration(value: string): unknown {
  if (value.length > 18000) throw new Error('Share link exceeds the size limit.');
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
        c.charCodeAt(0),
      ),
    ),
  );
}
