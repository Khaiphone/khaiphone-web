"use client";

// Interval in ms per tracking mode
const INTERVAL: Record<string, number> = {
  idle:    120_000,
  enroute:  15_000,
  on_site:  60_000,
  return:   20_000,
};

export type TrackingMode = "idle" | "enroute" | "on_site" | "return";

type PingFn = (payload: {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  batteryPct: number | null;
  mode: TrackingMode;
  appState: "foreground" | "background";
}) => Promise<void>;

let watchId: number | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let wakeLock: WakeLockSentinel | null = null;
let currentMode: TrackingMode = "idle";
let currentPos: GeolocationPosition | null = null;
let pingFn: PingFn | null = null;

async function getBattery(): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batt = await (navigator as any).getBattery?.();
    return batt ? Math.round(batt.level * 100) : null;
  } catch {
    return null;
  }
}

async function sendPing(appState: "foreground" | "background") {
  if (!currentPos || !pingFn) return;
  const batteryPct = await getBattery();
  await pingFn({
    lat:       currentPos.coords.latitude,
    lng:       currentPos.coords.longitude,
    accuracy:  currentPos.coords.accuracy,
    heading:   currentPos.coords.heading,
    speed:     currentPos.coords.speed != null ? currentPos.coords.speed * 3.6 : null,
    batteryPct,
    mode:      currentMode,
    appState,
  });
}

function restartInterval() {
  if (intervalId) clearInterval(intervalId);
  const ms = INTERVAL[currentMode] ?? INTERVAL.idle;
  intervalId = setInterval(() => {
    const state = document.hidden ? "background" : "foreground";
    sendPing(state);
  }, ms);
}

async function acquireWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch {
    // silently ignore — not critical
  }
}

async function releaseWakeLock() {
  if (wakeLock) { await wakeLock.release(); wakeLock = null; }
}

export async function startTracking(fn: PingFn): Promise<boolean> {
  if (watchId !== null) return true;
  pingFn = fn;

  const ok = await new Promise<boolean>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { currentPos = pos; resolve(true); },
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  });
  if (!ok) return false;

  watchId = navigator.geolocation.watchPosition(
    (pos) => { currentPos = pos; },
    () => {},
    { enableHighAccuracy: true, maximumAge: 10_000 }
  );

  restartInterval();
  await sendPing("foreground");
  await acquireWakeLock();

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("beforeunload", stopTracking);

  return true;
}

function handleVisibility() {
  if (!document.hidden) {
    navigator.geolocation.getCurrentPosition(
      (pos) => { currentPos = pos; sendPing("foreground"); },
      () => {},
      { enableHighAccuracy: true, timeout: 5_000 }
    );
  }
}

export function setTrackingMode(mode: TrackingMode) {
  if (mode === currentMode) return;
  currentMode = mode;
  if (watchId !== null) restartInterval();
  // WakeLock: keep screen on during active job travel
  if (mode === "enroute" || mode === "return") {
    acquireWakeLock();
  } else {
    releaseWakeLock();
  }
}

export function stopTracking() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (intervalId)        { clearInterval(intervalId); intervalId = null; }
  releaseWakeLock();
  document.removeEventListener("visibilitychange", handleVisibility);
  window.removeEventListener("beforeunload", stopTracking);
  pingFn = null;
  currentPos = null;
  currentMode = "idle";
}

export function getCurrentMode(): TrackingMode { return currentMode; }
export function isTracking(): boolean { return watchId !== null; }
