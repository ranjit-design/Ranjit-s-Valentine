'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function Page() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [noButtonPos, setNoButtonPos] = useState({ left: 0, top: 0 });
  const [hearts, setHearts] = useState<{ id: number; left: number; top: number }[]>([]);
  const [isNoEvasive, setIsNoEvasive] = useState(false);
  const [noShifts, setNoShifts] = useState(0);
  const [showNoWarning, setShowNoWarning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const buttonsContainerRef = useRef<HTMLDivElement | null>(null);
  const yesButtonRef = useRef<HTMLButtonElement | null>(null);
  const noButtonRef = useRef<HTMLButtonElement | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);

  const triggerNoWarning = useCallback(() => {
    setShowNoWarning(true);
    if (warningTimeoutRef.current != null) {
      window.clearTimeout(warningTimeoutRef.current);
    }
    warningTimeoutRef.current = window.setTimeout(() => {
      setShowNoWarning(false);
      warningTimeoutRef.current = null;
    }, 2000);
  }, []);

  const moveNoButton = useCallback(() => {
    const container = buttonsContainerRef.current;
    const yesBtn = yesButtonRef.current;
    const btn = noButtonRef.current;
    if (!isNoEvasive) return;
    if (!container || !btn || !yesBtn) return;

    const c = container.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const y = yesBtn.getBoundingClientRect();

    const padding = 8;
    const maxLeft = Math.max(padding, c.width - b.width - padding);
    const maxTop = Math.max(padding, c.height - b.height - padding);

    const yesLeft = y.left - c.left;
    const yesTop = y.top - c.top;
    const yesRect = {
      left: yesLeft,
      top: yesTop,
      right: yesLeft + y.width,
      bottom: yesTop + y.height,
    };

    const margin = 12;
    const intersectsYes = (left: number, top: number) => {
      const rect = {
        left,
        top,
        right: left + b.width,
        bottom: top + b.height,
      };
      return !(
        rect.right < yesRect.left - margin ||
        rect.left > yesRect.right + margin ||
        rect.bottom < yesRect.top - margin ||
        rect.top > yesRect.bottom + margin
      );
    };

    let left = Math.floor(Math.random() * maxLeft);
    let top: number;

    // On mobile, bias the button to appear in the lower half of the screen
    if (isMobile) {
      const minTop = Math.max(padding, maxTop * 0.4);
      top = Math.floor(minTop + Math.random() * (maxTop - minTop));
    } else {
      // On desktop, allow full range but slightly bias away from top
      const minTop = padding;
      top = Math.floor(minTop + Math.random() * (maxTop - minTop));
    }
    let tries = 0;
    while (tries < 40 && intersectsYes(left, top)) {
      left = Math.floor(Math.random() * maxLeft);
      top = Math.floor(Math.random() * maxTop);
      tries += 1;
    }

    if (intersectsYes(left, top)) {
      const candidates = [
        { left: padding, top: padding },
        { left: maxLeft, top: padding },
        { left: padding, top: maxTop },
        { left: maxLeft, top: maxTop },
      ];
      let best = candidates[0];
      let bestScore = -Infinity;
      const yesCx = (yesRect.left + yesRect.right) / 2;
      const yesCy = (yesRect.top + yesRect.bottom) / 2;
      for (const p of candidates) {
        if (intersectsYes(p.left, p.top)) continue;
        const cx = p.left + b.width / 2;
        const cy = p.top + b.height / 2;
        const score = Math.hypot(cx - yesCx, cy - yesCy);
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
      left = best.left;
      top = best.top;
    }

    setNoButtonPos({ left, top });
    setNoShifts((prev) => {
      const next = prev + 1;
      if (next > 5) {
        triggerNoWarning();
        return 0;
      }
      return next;
    });
  }, [isNoEvasive, triggerNoWarning]);

  const handleButtonsMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const btn = noButtonRef.current;
      if (!isNoEvasive) return;
      if (!btn) return;

      if (moveRafRef.current != null) return;
      moveRafRef.current = window.requestAnimationFrame(() => {
        moveRafRef.current = null;

        const b = btn.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);

        if (dist < 140) {
          moveNoButton();
        }
      });
    },
    [isNoEvasive, moveNoButton]
  );

  const handleYes = () => {
    setShowSuccess(true);
  };

  useEffect(() => {
    // Generate hearts only on client side to avoid hydration mismatch
    const generatedHearts = [...Array(5)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
    }));
    setHearts(generatedHearts);
  }, []);

  useEffect(() => {
    setNoShifts(0);
    setShowNoWarning(false);
    return () => {
      if (moveRafRef.current != null) {
        window.cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
      if (warningTimeoutRef.current != null) {
        window.clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isNoEvasive) return;
    const id = window.requestAnimationFrame(() => {
      moveNoButton();
    });
    return () => {
      window.cancelAnimationFrame(id);
    };
  }, [isNoEvasive, moveNoButton]);

  const handleNoStart = useCallback(() => {
    if (!isNoEvasive) {
      setIsNoEvasive(true);
      return;
    }
    moveNoButton();
  }, [isNoEvasive, moveNoButton]);

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-red-100 to-pink-300 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-8xl mb-8 animate-bounce">💕</div>
          <h1 className="text-5xl font-bold text-red-600 mb-6">
            Yah....I knew it. You Loved me. 😍
          </h1>
          <p className="text-4xl font-semibold text-green-500 mb-8">
            I Love You More Baby 💗
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="mt-8 px-8 py-3 bg-red-500 text-white rounded-full text-lg font-bold hover:bg-red-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={buttonsContainerRef}
      onMouseMove={handleButtonsMouseMove}
      className="relative h-screen max-h-screen overflow-hidden bg-gradient-to-br from-pink-100 via-red-50 to-pink-200 flex items-center justify-center px-3 py-4"
    >
      {showNoWarning ? (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 sm:px-5 sm:py-5 rounded-full bg-yellow-700 text-white text-sm sm:text-lg font-semibold shadow-lg text-center max-w-[90%] sm:max-w-none whitespace-nowrap sm:whitespace-normal">
          <span className="sm:hidden">Chup Chaap 'Yes' ma<br/>Click gar kamini... 😠😂</span>
          <span className="hidden sm:inline">Chup Chaap 'Yes' ma Click gar kamini... 😠😂</span>
        </div>
      ) : null}
      <div className="fixed top-4 left-4 z-40 text-2xl font-bold text-pink-600">
        Ranjit
      </div>
      <div className="text-center">
        {/* Emojis */}
        <div className="text-5xl sm:text-7xl md:text-8xl mb-8 sm:mb-10 flex justify-center gap-4 sm:gap-6">
          <span className="animate-pulse">💕</span>
          <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>
            💑
          </span>
        </div>

        {/* Main Text */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-red-600 mb-8 sm:mb-10 leading-tight">
          Will You Be My Valentine ?
        </h1>

        {/* Buttons Container */}
        <div className="flex gap-4 sm:gap-8 justify-center items-center min-h-20">
          {/* Yes Button */}
          <button
            ref={yesButtonRef}
            onClick={handleYes}
            className="px-6 sm:px-10 py-3 sm:py-4 bg-green-500 text-white rounded-full text-xl sm:text-2xl font-bold hover:bg-green-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
          >
            Yes 💚
          </button>

          {/* No Button */}
          <button
            ref={noButtonRef}
            onMouseEnter={isNoEvasive ? moveNoButton : undefined}
            onMouseDown={handleNoStart}
            className="px-6 sm:px-10 py-3 sm:py-4 bg-red-500 text-white rounded-full text-xl sm:text-2xl font-bold transition-all shadow-lg"
            style={{
              position: isNoEvasive ? 'absolute' : 'static',
              left: isNoEvasive ? noButtonPos.left : undefined,
              top: isNoEvasive ? noButtonPos.top : undefined,
              transitionProperty: isNoEvasive ? 'left, top' : undefined,
              transitionDuration: isNoEvasive ? '150ms' : undefined,
            }}
          >
            No 💔
          </button>
        </div>

        {/* Decorative floating hearts */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {hearts.map((heart) => (
            <div
              key={heart.id}
              className="absolute text-3xl animate-bounce"
              style={{
                left: `${heart.left}%`,
                top: `${heart.top}%`,
                animationDelay: `${heart.id * 0.2}s`,
                opacity: 0.3,
              }}
            >
              ❤️
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
