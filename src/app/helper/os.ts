export default function isElectron(): boolean {
  return !!(typeof window !== 'undefined' && (window as any).zskarte);
}
