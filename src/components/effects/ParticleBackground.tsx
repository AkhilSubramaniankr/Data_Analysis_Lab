"use client";

/**
 * Advanced ParticleBackground — Combines smooth delta-time physics, pointer events,
 * live intensity updates, mouse trails, and constellation connection lines.
 */
import * as React from "react";

type Intensity = "off" | "subtle" | "normal";
const STORAGE_KEY = "particle-intensity";
const CHANGE_EVENT = "pandas-lab:particle-intensity";
const COUNTS: Record<Intensity, number> = { off: 0, subtle: 50, normal: 80 };

type Particle = {
  x: number; y: number; vx: number; vy: number;
  baseX: number; baseY: number;
  radius: number; opacity: number; phase: number; lifetime: number;
};

type Trail = {
  x: number; y: number; vx: number; vy: number;
  radius: number; age: number; lifetime: number;
};

function readIntensity(): Intensity {
  if (typeof window === "undefined") return "subtle";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "off" || value === "subtle" || value === "normal" ? value : "subtle";
  } catch { return "subtle"; }
}

function writeIntensity(value: Intensity) {
  try { window.localStorage.setItem(STORAGE_KEY, value); } catch { /* optional */ }
  window.dispatchEvent(new CustomEvent<Intensity>(CHANGE_EVENT, { detail: value }));
}

export function ParticleBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let reducedMotion = motionQuery.matches;
    let intensity = readIntensity();
    let width = 1;
    let height = 1;
    let raf: number | null = null;
    let previousTime = 0;
    let lastSpawn = 0;
    let visible = !document.hidden;
    let disposed = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    
    const mouse = { x: -1000, y: -1000, active: false };
    let particles: Particle[] = [];
    let trails: Trail[] = [];

    function createParticle(fromBottom = false): Particle {
      const x = Math.random() * width;
      const y = fromBottom ? height + 4 : Math.random() * height;
      return {
        x, y,
        baseX: x, baseY: y,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -(0.09 + Math.random() * 0.18),
        radius: 0.9 + Math.random() * 1.3,
        opacity: 0.2 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        lifetime: 0,
      };
    }

    function initialize() {
      const count = reducedMotion || intensity === "off" ? 0 : Math.ceil(COUNTS[intensity] * (width < 768 ? 0.5 : 1));
      particles = Array.from({ length: count }, () => createParticle());
      trails = [];
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      initialize();
      render();
    }

    function render() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // 1. Optional Mouse Spotlight Glow
      if (mouse.active && pointerQuery.matches && intensity !== "off") {
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 140);
        gradient.addColorStop(0, "rgba(137,220,255,0.06)");
        gradient.addColorStop(1, "rgba(137,220,255,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Render Permanent Particles with Glow Near Mouse
      for (const p of particles) {
        const fade = Math.min(1, p.lifetime / 900);
        let glowFactor = 0;
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130) glowFactor = 1 - dist / 130;
        }

        const renderOpacity = Math.min(0.85, p.opacity * fade + glowFactor * 0.3);
        const renderRadius = p.radius + glowFactor * 0.6;

        ctx.beginPath();
        ctx.arc(p.x, p.y, renderRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(207,235,255,${renderOpacity})`;
        ctx.fill();
      }

      // 3. Render Connection Lines (Constellation Network)
      if (!reducedMotion && particles.length > 0 && intensity !== "off") {
        const maxDist = 110;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.12;
              let lineBoost = 0;
              if (mouse.active) {
                const midX = (particles[i].x + particles[j].x) / 2;
                const midY = (particles[i].y + particles[j].y) / 2;
                const mdist = Math.hypot(mouse.x - midX, mouse.y - midY);
                if (mdist < 180) lineBoost = (1 - mdist / 180) * 0.15;
              }
              ctx.strokeStyle = `rgba(180,200,220,${alpha + lineBoost})`;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // 4. Render Mouse Trails
      for (const t of trails) {
        const alpha = Math.pow(Math.max(0, 1 - t.age / t.lifetime), 1.5) * 0.66;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(137,220,255,${alpha})`;
        ctx.fill();
      }
    }

    function frame(time: number) {
      raf = null;
      if (disposed || !visible || reducedMotion || intensity === "off") return;
      const dt = previousTime ? Math.min(40, time - previousTime) : 16.67;
      previousTime = time;
      const scale = dt / 16.67;

      // Update permanent particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.lifetime += dt;
        p.phase += dt * 0.00055;
        p.x += (p.vx + Math.sin(p.phase) * 0.09) * scale;
        p.y += p.vy * scale;

        if (mouse.active && pointerQuery.matches) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 1 && distance < 180) {
            const strength = (1 - distance / 180) * 0.04 * scale;
            p.vx += (dx / distance) * strength;
            p.vy += (dy / distance) * strength;
          }
        }
        p.vx += (p.baseX - p.x) * 0.002;
        p.vy += (p.baseY - p.y) * 0.002;
        p.vx *= 0.96;
        p.vy *= 0.96;

        if (p.y < -8 || p.x < -15 || p.x > width + 15) particles[i] = createParticle(true);
      }

      // Update mouse trails
      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        t.age += dt;
        if (t.age >= t.lifetime) { trails.splice(i, 1); continue; }
        t.x += t.vx * scale;
        t.y += t.vy * scale;
        const damping = Math.pow(0.965, scale);
        t.vx *= damping;
        t.vy *= damping;
      }

      render();
      schedule();
    }

    function schedule() {
      if (raf === null && !disposed && visible && !reducedMotion && intensity !== "off") {
        raf = requestAnimationFrame(frame);
      }
    }
    function stop() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      previousTime = 0;
    }
    function refresh() {
      stop();
      initialize();
      render();
      schedule();
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse" || !pointerQuery.matches || reducedMotion || intensity === "off") return;
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;

      const now = performance.now();
      if (now - lastSpawn < (intensity === "normal" ? 35 : 60)) return;
      lastSpawn = now;

      const count = intensity === "normal" ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.25 + Math.random() * 0.75;
        trails.push({
          x: event.clientX + (Math.random() - 0.5) * 8,
          y: event.clientY + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 0.9 + Math.random() * 1.5,
          age: 0,
          lifetime: 650 + Math.random() * 650,
        });
      }
      if (trails.length > 60) trails.splice(0, trails.length - 60);
    }

    function onLeave() { mouse.active = false; }
    function onVisibility() {
      visible = !document.hidden;
      if (visible) schedule(); else stop();
    }
    function onIntensity(event: Event) {
      intensity = (event as CustomEvent<Intensity>).detail;
      refresh();
    }
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) { intensity = readIntensity(); refresh(); }
    }
    function onMotionChange(event: MediaQueryListEvent) {
      reducedMotion = event.matches;
      refresh();
    }
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }

    resize();
    schedule();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", onLeave);
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(CHANGE_EVENT, onIntensity);
    window.addEventListener("storage", onStorage);
    motionQuery.addEventListener("change", onMotionChange);

    return () => {
      disposed = true;
      stop();
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(CHANGE_EVENT, onIntensity);
      window.removeEventListener("storage", onStorage);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={{ display: "block" }} />;
}

export function ParticleIntensityToggle() {
  const [intensity, setIntensity] = React.useState<Intensity>("subtle");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setIntensity(readIntensity());
  }, []);

  function change(value: Intensity) {
    setIntensity(value);
    writeIntensity(value);
  }

  if (!mounted) return null;
  return (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/50 px-2 py-1 text-[10px]">
      <span className="text-muted-foreground">Particles:</span>
      {(["off", "subtle", "normal"] as Intensity[]).map((value) => (
        <button key={value} type="button" aria-pressed={intensity === value} onClick={() => change(value)}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${intensity === value
            ? "bg-[var(--color-ai-cyan)]/20 text-[var(--color-ai-cyan)]"
            : "text-muted-foreground hover:text-foreground"}`}>
          {value}
        </button>
      ))}
    </div>
  );
}