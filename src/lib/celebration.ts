import confetti from 'canvas-confetti';

export function triggerUpgradeCelebration() {
  const colors = ['#7C5CFC', '#A78BFA', '#EDE9FF', '#ffffff'];
  confetti({ particleCount: 80, spread: 70, origin: { x: 0.5, y: 0.5 }, colors, scalar: 1.1, zIndex: 9999 });
  setTimeout(() => confetti({ particleCount: 40, spread: 50, origin: { x: 0.35, y: 0.45 }, colors, scalar: 0.9, zIndex: 9999 }), 150);
  setTimeout(() => confetti({ particleCount: 40, spread: 50, origin: { x: 0.65, y: 0.45 }, colors, scalar: 0.9, zIndex: 9999 }), 300);
}
