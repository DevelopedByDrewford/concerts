export const serif = "'Instrument Serif', serif";

export function rand(seed) {
  const x = Math.sin(seed * 99.13) * 43758.5453;
  return x - Math.floor(x);
}

export function coverStr(h1, h2, L = 0.24) {
  return (
    `radial-gradient(110% 78% at 26% 8%, oklch(0.64 0.22 ${h1} / 0.6), transparent 56%), ` +
    `radial-gradient(95% 70% at 84% 96%, oklch(0.56 0.2 ${h2} / 0.52), transparent 54%), ` +
    `radial-gradient(40% 30% at 60% 38%, oklch(0.78 0.16 ${h1} / 0.35), transparent 60%), ` +
    `linear-gradient(162deg, oklch(${L} 0.06 ${h1}), oklch(0.09 0.02 ${h2}))`
  );
}

export function tileStr(h1, h2, L) {
  return (
    `radial-gradient(80% 60% at ${30 + h1 % 30}% 16%, oklch(0.62 0.2 ${h1} / 0.62), transparent 58%), ` +
    `radial-gradient(70% 55% at 78% 90%, oklch(0.5 0.18 ${h2} / 0.45), transparent 56%), ` +
    `linear-gradient(165deg, oklch(${L} 0.06 ${h1}), oklch(0.08 0.02 ${h2}))`
  );
}

export function avStr(h) {
  return `linear-gradient(135deg, oklch(0.62 0.18 ${h}), oklch(0.5 0.18 ${(h + 45) % 360}))`;
}
