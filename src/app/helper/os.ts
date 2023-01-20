export function isElectron(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(typeof window !== 'undefined' && (window as any).zskarte);
}

export enum OS {
  MACOS = 'macOS',
  IOS = 'iOS',
  WINDOWS = 'Windows',
  ANDROID = 'Android',
  LINUX = 'Linux',
}

export const getOS = (): OS | undefined => {
  const userAgent = window.navigator.userAgent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platform = (window.navigator as any)?.userAgentData?.platform || window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  let os: OS | undefined;

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = OS.MACOS;
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = OS.IOS;
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = OS.WINDOWS;
  } else if (/Android/.test(userAgent)) {
    os = OS.ANDROID;
  } else if (/Linux/.test(platform)) {
    os = OS.LINUX;
  }

  return os;
};
