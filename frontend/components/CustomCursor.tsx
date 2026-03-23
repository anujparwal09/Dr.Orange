'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    document.addEventListener('mousemove', onMouseMove);

    let animId: number;
    function animate() {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.18;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.18;

      if (dotRef.current) {
        dotRef.current.style.left = `${mouse.current.x}px`;
        dotRef.current.style.top = `${mouse.current.y}px`;
      }
      if (ringRef.current) {
        ringRef.current.style.left = `${ring.current.x}px`;
        ringRef.current.style.top = `${ring.current.y}px`;
      }

      animId = requestAnimationFrame(animate);
    }
    animate();

    // Hover detection
    const onOver = () => setIsHovering(true);
    const onOut = () => setIsHovering(false);

    const addHoverListeners = () => {
      document.querySelectorAll('a,button,[onclick],[role="button"]').forEach((el) => {
        el.addEventListener('mouseenter', onOver);
        el.addEventListener('mouseleave', onOut);
      });
    };

    addHoverListeners();

    const observer = new MutationObserver(() => {
      addHoverListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('mousemove', onMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed pointer-events-none z-[9999]"
        style={{
          width: 12,
          height: 12,
          background: isHovering ? 'rgba(255,140,0,0.6)' : 'var(--orange)',
          borderRadius: '50%',
          transform: `translate(-50%,-50%) scale(${isHovering ? 1.8 : 1})`,
          transition: 'transform .1s, background .2s',
          mixBlendMode: 'normal',
        }}
      />
      <div
        ref={ringRef}
        className="fixed pointer-events-none z-[9998]"
        style={{
          width: isHovering ? 52 : 36,
          height: isHovering ? 52 : 36,
          border: `1.5px solid ${isHovering ? 'rgba(255,140,0,0.7)' : 'rgba(255,140,0,0.5)'}`,
          borderRadius: '50%',
          transform: 'translate(-50%,-50%)',
          transition: 'width .25s cubic-bezier(.25,.46,.45,.94), height .25s, border-color .2s',
        }}
      />
    </>
  );
}
