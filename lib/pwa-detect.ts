export function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function getPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export type InstallStatus = "installed" | "installable" | "manual_ios" | "desktop";

export function getInstallStatus(): InstallStatus {
  if (isStandalone()) return "installed";
  const platform = getPlatform();
  if (platform === "ios") return "manual_ios";
  if (platform === "android") return "installable";
  return "desktop";
}
