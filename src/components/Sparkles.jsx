import { useMemo } from 'react';

// Decorative twinkling gold specks behind the whole app. Positions come from a
// fixed seed so they stay put between renders.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function Sparkles({ count = 36 }) {
  const specks = useMemo(() => {
    const rnd = seeded(20261120);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      top: rnd() * 100,
      size: 2 + rnd() * 3,
      dur: 3 + rnd() * 4,
      delay: rnd() * 6,
      star: i % 5 === 0,
    }));
  }, [count]);

  return (
    <div className="sparkles" aria-hidden="true">
      {specks.map((p) => (
        <span
          key={p.id}
          className={p.star ? 'sparkle sparkle-star' : 'sparkle'}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.star ? p.size * 3 : p.size,
            height: p.star ? p.size * 3 : p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}