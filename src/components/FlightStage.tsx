import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type { RoundStatus, UserWonInfo } from '../types.ts';
import { sound } from '../services/sound.ts';

interface FlightStageProps {
  status: RoundStatus;
  currentMultiplier: number;
  crashMultiplier: number;
  countdownRemaining: number;
  roundId: string;
  userWonInfo: UserWonInfo | null;
  onClearWonInfo: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  radius: number;
  color: string;
}

export const FlightStage: React.FC<FlightStageProps> = ({
  status,
  currentMultiplier,
  crashMultiplier,
  countdownRemaining,
  roundId,
  userWonInfo,
  onClearWonInfo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Plane & particles state
  const particlesRef = useRef<Particle[]>([]);
  const propellerAngleRef = useRef<number>(0);
  const crashAnimationProgressRef = useRef<number>(0);

  // Stable callback and win deduplication refs
  const lastHandledWinIdRef = useRef<string | null>(null);
  const onClearRef = useRef(onClearWonInfo);
  onClearRef.current = onClearWonInfo;

  // Handle Confetti and win audio strictly once per distinct win
  useEffect(() => {
    if (!userWonInfo) {
      lastHandledWinIdRef.current = null;
      return;
    }

    // If we have already executed feedback for this exact win ID, do not repeat
    if (lastHandledWinIdRef.current === userWonInfo.id) {
      return;
    }
    lastHandledWinIdRef.current = userWonInfo.id;

    sound.playCashOut(userWonInfo.multiplier);
    try {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00e676', '#ffeb3b', '#ff1744', '#00e5ff'],
      });
    } catch {
      // Ignore
    }

    const timer = setTimeout(() => {
      onClearRef.current();
    }, 3500);

    return () => clearTimeout(timer);
  }, [userWonInfo?.id, userWonInfo?.multiplier]);

  // Clean up any lingering win banner when transitioning to WAITING for next round
  useEffect(() => {
    if (status === 'WAITING' && userWonInfo) {
      onClearRef.current();
    }
  }, [status, userWonInfo]);

  // Handle crash audio and plane fly-away reset
  useEffect(() => {
    if (status === 'CRASHED') {
      sound.playCrash();
      crashAnimationProgressRef.current = 0;
    } else if (status === 'FLYING') {
      sound.startEngine(currentMultiplier);
    } else if (status === 'WAITING') {
      sound.stopEngine();
    }
  }, [status]);

  // Update sound engine pitch as multiplier ticks
  useEffect(() => {
    if (status === 'FLYING') {
      sound.updateEnginePitch(currentMultiplier);
    }
  }, [status, currentMultiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const updateCanvasSize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    updateCanvasSize();
    const resizeObserver = new ResizeObserver(() => updateCanvasSize());
    resizeObserver.observe(container);

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Cockpit Background & Radar Grid
      drawBackground(ctx, width, height);

      // 2. State-dependent drawing
      if (status === 'FLYING' || status === 'CRASHED') {
        drawFlightPathAndPlane(ctx, width, height);
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
    };
  }, [status, currentMultiplier, crashMultiplier]);

  // Draw background radar lines and coordinates
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Dark radial glow
    const bgGrad = ctx.createRadialGradient(
      width * 0.45,
      height * 0.5,
      10,
      width * 0.5,
      height * 0.5,
      Math.max(width, height)
    );
    bgGrad.addColorStop(0, '#171922');
    bgGrad.addColorStop(1, '#0c0d12');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSpacingY = height / 6;
    for (let y = gridSpacingY; y < height; y += gridSpacingY) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }

    // Subtle vertical grid lines
    const gridSpacingX = width / 8;
    for (let x = gridSpacingX; x < width; x += gridSpacingX) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 30);
      ctx.stroke();
    }

    // Border frame
    ctx.strokeStyle = '#222736';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  };

  // Draw smooth Spribe curve and Plane
  const drawFlightPathAndPlane = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const startX = 50;
    const startY = height - 40;
    const maxTargetX = width * 0.82;
    const minTargetY = height * 0.22;

    // Calculate curve progress based on multiplier
    // At 1.00x progress is near 0, at 10x+ it approaches 1
    const mult = status === 'CRASHED' ? crashMultiplier : currentMultiplier;
    const progress = Math.min(Math.max((mult - 1.0) / 7.0, 0.05), 0.95);

    let planeX = startX + (maxTargetX - startX) * Math.pow(progress, 0.7);
    let planeY = startY - (startY - minTargetY) * Math.pow(progress, 0.9);

    // Control points for the quadratic/cubic ascent curve
    const cpX = startX + (planeX - startX) * 0.6;
    const cpY = startY;

    // If crashed, animate plane flying away rapidly to top-right
    if (status === 'CRASHED') {
      crashAnimationProgressRef.current = Math.min(
        crashAnimationProgressRef.current + 0.025,
        1.5
      );
      planeX += crashAnimationProgressRef.current * (width * 0.6);
      planeY -= crashAnimationProgressRef.current * (height * 0.5);
    }

    // Draw Red Neon Area Fill under curve
    const fillGrad = ctx.createLinearGradient(0, planeY, 0, startY);
    fillGrad.addColorStop(0, 'rgba(230, 30, 60, 0.35)');
    fillGrad.addColorStop(0.6, 'rgba(230, 30, 60, 0.12)');
    fillGrad.addColorStop(1, 'rgba(230, 30, 60, 0.0)');

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, planeX, planeY);
    ctx.lineTo(planeX, startY);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Draw Red Trajectory Glow Line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, planeX, planeY);
    ctx.strokeStyle = '#ff1e42';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Calculate tangent angle for plane pitch
    // Derivative of quadratic bezier B'(t) at end
    const tangentX = planeX - cpX;
    const tangentY = planeY - cpY;
    const angle = Math.atan2(tangentY, tangentX);

    // Emit smoke particles from engine exhaust
    if (status === 'FLYING' && Math.random() < 0.65) {
      particlesRef.current.push({
        x: planeX - Math.cos(angle) * 22,
        y: planeY - Math.sin(angle) * 22,
        vx: -Math.cos(angle) * (1.5 + Math.random()) + (Math.random() - 0.5) * 0.5,
        vy: -Math.sin(angle) * (1.5 + Math.random()) + (Math.random() - 0.5) * 0.5,
        alpha: 0.8,
        radius: 2.5 + Math.random() * 2.5,
        color: Math.random() < 0.4 ? '#ff5252' : '#ffab91',
      });
    }

    // Update and draw particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.025;
      p.radius += 0.15;

      if (p.alpha <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(p.alpha, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw the Aviator Monoplane
    propellerAngleRef.current = (propellerAngleRef.current + 0.4) % (Math.PI * 2);
    drawAirplane(ctx, planeX, planeY, angle, propellerAngleRef.current);
  };

  // Detailed Canvas drawing of Spribe's red monoplane
  const drawAirplane = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    propellerAngle: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Main red fuselage
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(26, 0); // nose
    ctx.quadraticCurveTo(15, -7, -22, -4); // upper fuselage
    ctx.lineTo(-26, 0); // tail tip
    ctx.quadraticCurveTo(-22, 5, 15, 6); // lower fuselage
    ctx.closePath();
    ctx.fill();

    // Fuselage highlight
    ctx.fillStyle = '#ff6659';
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.quadraticCurveTo(12, -5, -18, -3);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.fill();

    // Cockpit canopy (cyan windshield)
    ctx.fillStyle = '#40c4ff';
    ctx.beginPath();
    ctx.moveTo(14, -5);
    ctx.quadraticCurveTo(6, -9, 0, -4);
    ctx.lineTo(2, -3);
    ctx.closePath();
    ctx.fill();

    // Glass shine reflection
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(11, -5.5);
    ctx.lineTo(6, -7);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Main wing (swept back)
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.lineTo(-6, 16);
    ctx.lineTo(-14, 15);
    ctx.lineTo(-2, 1);
    ctx.closePath();
    ctx.fill();

    // Upper wing edge highlight
    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.lineTo(-6, 16);
    ctx.lineTo(-4, 16);
    ctx.lineTo(7, 1);
    ctx.closePath();
    ctx.fill();

    // Tail vertical fin
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.moveTo(-20, -3);
    ctx.lineTo(-27, -15);
    ctx.lineTo(-23, -15);
    ctx.lineTo(-16, -3);
    ctx.closePath();
    ctx.fill();

    // Tail horizontal stabilizer
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(-22, 1);
    ctx.lineTo(-26, 6);
    ctx.lineTo(-24, 6);
    ctx.lineTo(-19, 1);
    ctx.closePath();
    ctx.fill();

    // Nose cone
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(26, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Spinning propeller blades
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.8;
    const propLength = 12;
    ctx.beginPath();
    ctx.moveTo(27, -Math.sin(propellerAngle) * propLength);
    ctx.lineTo(27, Math.sin(propellerAngle) * propLength);
    ctx.stroke();

    ctx.restore();
  };

  return (
    <div
      ref={containerRef}
      id="flight-stage-container"
      className="relative w-full h-[280px] sm:h-[350px] md:h-[420px] bg-[#0c0d12] rounded-xl overflow-hidden border border-[#222736] shadow-2xl flex items-center justify-center select-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Center Dynamic Multiplier Readout */}
      {status === 'FLYING' && (
        <div className="relative z-10 flex flex-col items-center pointer-events-none drop-shadow-md">
          <span
            id="current-multiplier-display"
            className="text-5xl sm:text-7xl md:text-8xl font-black font-mono tracking-tight text-white animate-pulse"
            style={{ textShadow: '0 0 35px rgba(255, 23, 68, 0.55)' }}
          >
            {currentMultiplier.toFixed(2)}x
          </span>
        </div>
      )}

      {/* Flew Away Crash Banner */}
      {status === 'CRASHED' && (
        <div className="relative z-10 flex flex-col items-center pointer-events-none transition-all scale-105 duration-200">
          <span
            id="flew-away-title"
            className="text-red-500 font-extrabold uppercase tracking-widest text-lg sm:text-2xl drop-shadow-lg mb-1"
          >
            FLEW AWAY!
          </span>
          <span
            id="crashed-multiplier-display"
            className="text-5xl sm:text-7xl md:text-8xl font-black font-mono tracking-tight text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.7)]"
          >
            {crashMultiplier.toFixed(2)}x
          </span>
        </div>
      )}

      {/* Waiting for Next Round Progress Overlay */}
      {status === 'WAITING' && (
        <div className="relative z-10 flex flex-col items-center bg-[#13161f]/90 border border-[#2b3244] p-5 sm:p-6 rounded-2xl shadow-2xl backdrop-blur-sm max-w-sm w-[90%] mx-auto">
          {/* Circular Countdown Progress */}
          <div className="relative w-20 h-20 mb-3 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-red-500 transition-all duration-100 ease-linear"
                strokeDasharray={`${(countdownRemaining / 5.0) * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xl font-black font-mono text-white">
              {countdownRemaining.toFixed(1)}s
            </span>
          </div>

          <span className="text-gray-200 font-extrabold text-sm sm:text-base uppercase tracking-wider text-center">
            WAITING FOR NEXT ROUND
          </span>
          <span className="text-xs text-red-400 font-mono mt-1">
            Round: {roundId}
          </span>
        </div>
      )}

      {/* Instant Win Feedback Flying Popup Banner */}
      {userWonInfo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-emerald-600 to-green-500 border border-emerald-300 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
            🏆
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-100">
              YOU CASHED OUT AT {userWonInfo.multiplier.toFixed(2)}x!
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white">
              +${userWonInfo.payout.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
