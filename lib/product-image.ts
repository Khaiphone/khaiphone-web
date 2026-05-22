export function getProductImage(model: string): string | null {
  if (model.includes("iPhone") && model.includes("Air")) return `/iPhone-air.webp`;
  const iphoneM = model.match(/iPhone (\d+)/);
  if (iphoneM) {
    const gen = parseInt(iphoneM[1]);
    if (gen < 11 || gen > 17) return null;
    if (model.includes("Pro")) return `/iPhone-${gen}-pro-max.webp`;
    if (/\d+e(\s|$)/.test(model)) return `/iPhone-${gen}e.webp`;
    return `/iPhone-${gen}.webp`;
  }
  if (model.includes("iPad Pro")) {
    if (model.includes("2020")) return `/ipad-pro-11-old.webp`;
    const chipM = model.match(/\bM(\d)\b/);
    if (chipM) return `/ipad-pro-m${chipM[1]}.webp`;
  }
  if (model.includes("iPad Air")) {
    const airM = model.match(/iPad Air (\d+)/);
    if (airM) return `/ipad-air-${airM[1]}.webp`;
  }
  if (model.includes("iPad mini")) {
    const miniM = model.match(/iPad mini (\d+)/);
    if (miniM) return `/ipad-mini-${miniM[1]}.webp`;
  }
  const genM = model.match(/iPad Gen (\d+)/);
  if (genM) return `/ipad-gen-${genM[1]}.webp`;
  if (model.startsWith("MacBook") || model.startsWith("Mac mini") || model.startsWith("iMac")) {
    if (model.includes("MacBook Neo")) return `/macbook-neo.webp`;
    const chipM = model.match(/\bM(\d)\b/);
    const chip = chipM ? chipM[1] : null;
    if (model.includes("MacBook Air")) return chip ? `/macbook-air-m${chip}.webp` : null;
    if (model.includes("MacBook Pro")) return chip ? `/macbook-pro-m${chip}.webp` : null;
    if (model.includes("Mac mini"))   return chip ? `/mac-mini-m${chip}.webp`    : null;
    if (model.includes("iMac"))       return chip ? `/imac-m${chip}.webp`        : null;
  }
  if (model.includes("Apple Watch")) {
    const seriesM = model.match(/Series (\d+)/);
    if (seriesM) return `/apple-watch-series-${seriesM[1]}.webp`;
    const seM = model.match(/SE \(Gen (\d+)\)/);
    if (seM) return `/apple-watch-se-${seM[1]}.webp`;
    if (model.includes("Ultra 3")) return `/apple-watch-ultra-3.webp`;
    if (model.includes("Ultra 2")) return `/apple-watch-ultra-2.webp`;
    if (model.includes("Ultra"))   return `/apple-watch-ultra-1.webp`;
  }
  return null;
}
