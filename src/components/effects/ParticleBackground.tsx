"use client";

/**
 * ParticleBackground — lightweight Canvas 2D animated particle layer.
 *
 * Features:
 *  - Idle floating particles (muted white/silver/cyan).
 *  - Mouse attraction: nearby particles gently move toward cursor.
 *  - Mouse-spawn: moving the cursor spawns temporary particles that
 *    drift outward and fade — inspired by the user's shared design.
 *  - Connection lines between nearby particles.
 *  - Reduced-motion: static render.
 *  - pointer-events: none, z-index: 0.
 *  - rAF loop, cleans up, pauses on hidden tab.
 */

import * as React from "react";

type Intensity = "off" | "subtle" | "normal";

const PARTICLE_COUNT: Record<Intensity, number> = {
  off: 0,
  subtle: 50,
  normal: 80,
};

const MOBILE_DIVISOR = 2;
const STORAGE_KEY = "particle-intensity";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  baseOpacity: number;
  isTemp?: boolean;      // temporary particle (mouse-spawned)
  life?: number;         // life remaining (0..1) for temp particles
  maxLife?: number;      // max life for temp particles
}

function getStoredIntensity(): Intensity {
  if (typeof window === "undefined") return "subtle";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "off" || v === "subtle" || v === "normal") return v;
    return "subtle";
  } catch { return "subtle"; }
}

function storeIntensity(v: Intensity) {
  try { localStorage.setItem(STORAGE_KEY, v); } catch {}
}

export function ParticleBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const tempParticlesRef = React.useRef<Particle[]>([]);
  const mouseRef = React.useRef<{ x: number; y: number; active: boolean; lastSpawn: number }>({ x: -9999, y: -9999, active: false, lastSpawn: 0 });
  const intensityRef = React.useRef<Intensity>("subtle");

  React.useEffect(() => { intensityRef.current = getStoredIntensity(); }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0, height = 0, dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();

    const isMobile = () => width < 768;
    const getParticleCount = () => {
      const count = PARTICLE_COUNT[intensityRef.current];
      return isMobile() ? Math.ceil(count / MOBILE_DIVISOR) : count;
    };

    const initParticles = () => {
      const count = getParticleCount();
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        particles.push({
          x, y, baseX: x, baseY: y,
          vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
          radius: Math.random() * 1.0 + 1.0,
          baseOpacity: Math.random() * 0.2 + 0.25,
        });
      }
      particlesRef.current = particles;
    };
    initParticles();

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); initParticles(); }, 200);
    };

    // Mouse tracking — spawns temp particles at cursor
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true, lastSpawn: now };

      // Spawn a temp particle every ~60ms when moving
      if (!prefersReduced && now - mouseRef.current.lastSpawn < 60) {
        // throttle: only spawn if enough time passed
      }
      if (!prefersReduced && now - (mouseRef.current.lastSpawn || 0) >= 50) {
        spawnTempParticle(e.clientX, e.clientY);
      }
    };

    const spawnTempParticle = (x: number, y: number) => {
      const size = Math.random() * 2 + 1.5;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.5;
      tempParticlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseX: x, baseY: y,
        radius: size,
        baseOpacity: 0.6,
        isTemp: true,
        life: 1.0,
        maxLife: Math.random() * 1.5 + 1.0, // 1-2.5 seconds
      });
      // Cap temp particles to prevent memory issues
      if (tempParticlesRef.current.length > 60) {
        tempParticlesRef.current.shift();
      }
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.relatedTarget === null) mouseRef.current.active = false;
    };

    let isVisible = !document.hidden;
    const onVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible && !prefersReduced) rafRef.current = requestAnimationFrame(animate);
    };

    const animate = () => {
      if (!isVisible) return;

      const particles = particlesRef.current;
      const tempParticles = tempParticlesRef.current;
      const mouse = mouseRef.current;
      const attractRadius = 180;
      const attractForce = 0.04;
      const glowRadius = 130;

      ctx.clearRect(0, 0, width, height);

      // Update + draw permanent particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReduced) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          if (mouse.active) {
            const dx = mouse.x - p.x, dy = mouse.y - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < attractRadius && dist > 1) {
              const force = (1 - dist / attractRadius) * attractForce;
              p.vx += (dx / dist) * force; p.vy += (dy / dist) * force;
            }
          }
          p.vx += (p.baseX - p.x) * 0.002;
          p.vy += (p.baseY - p.y) * 0.002;
          p.vx *= 0.96; p.vy *= 0.96;
          p.vx = Math.max(-2, Math.min(2, p.vx));
          p.vy = Math.max(-2, Math.min(2, p.vy));
        }

        let glowFactor = 0;
        if (mouse.active) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < glowRadius) glowFactor = 1 - dist / glowRadius;
        }

        const renderOpacity = Math.min(0.85, p.baseOpacity + glowFactor * 0.4);
        const renderRadius = p.radius + glowFactor * 0.8;
        const cyanMix = glowFactor;
        const r = Math.round(255 * (1 - cyanMix * 0.3));
        const g = Math.round(255 - cyanMix * 20);
        const b = Math.round(255 + cyanMix * 40 - 255 * (1 - cyanMix > 0.5 ? 0 : 0));

        ctx.beginPath();
        ctx.arc(p.x, p.y, renderRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${renderOpacity})`;
        ctx.fill();

        if (glowFactor > 0.2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, renderRadius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56,189,248,${glowFactor * 0.06})`;
          ctx.fill();
        }
      }

      // Update + draw temp (mouse-spawned) particles
      for (let i = tempParticles.length - 1; i >= 0; i--) {
        const tp = tempParticles[i];
        if (!prefersReduced) {
          tp.x += tp.vx; tp.y += tp.vy;
          tp.vx *= 0.97; tp.vy *= 0.97; // gradual slowdown
          tp.life = (tp.life ?? 0) - (1 / 60) / (tp.maxLife ?? 2); // decrement life
        }
        if ((tp.life ?? 0) <= 0) {
          tempParticles.splice(i, 1);
          continue;
        }

        const lifeRatio = tp.life ?? 0;
        const opacity = tp.baseOpacity * lifeRatio;
        const radius = tp.radius * (0.5 + lifeRatio * 0.5);

        ctx.beginPath();
        ctx.arc(tp.x, tp.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,240,${opacity})`;
        ctx.fill();

        // Subtle glow
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${opacity * 0.15})`;
        ctx.fill();
      }

      // Connection lines
      if (!prefersReduced && particles.length > 0) {
        const maxDist = 110;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.12;
              let lineBoost = 0;
              if (mouse.active) {
                const midX = (particles[i].x + particles[j].x) / 2;
                const midY = (particles[i].y + particles[j].y) / 2;
                const mdx = mouse.x - midX, mdy = mouse.y - midY;
                const mdist = Math.sqrt(mdx*mdx + mdy*mdy);
                if (mdist < attractRadius) lineBoost = (1 - mdist / attractRadius) * 0.15;
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

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibility);

    if (prefersReduced) {
      ctx.clearRect(0, 0, width, height);
      for (const p of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.baseOpacity})`;
        ctx.fill();
      }
    } else {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ display: "block" }}
    />
  );
}

export function ParticleIntensityToggle() {
  const [intensity, setIntensity] = React.useState<Intensity>("subtle");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); setIntensity(getStoredIntensity()); }, []);

  const change = (v: Intensity) => {
    setIntensity(v); storeIntensity(v);
    if (typeof window !== "undefined") window.location.reload();
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/50 px-2 py-1 text-[10px]">
      <span className="text-muted-foreground">Particles:</span>
      {(["off", "subtle", "normal"] as Intensity[]).map((v) => (
        <button key={v} type="button" onClick={() => change(v)}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
            intensity === v ? "bg-[var(--color-ai-cyan)]/20 text-[var(--color-ai-cyan)]" : "text-muted-foreground hover:text-foreground"
          }`}>{v}</button>
      ))}
    </div>
  );
}
