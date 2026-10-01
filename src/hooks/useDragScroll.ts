'use client';

import { useEffect, useRef } from 'react';

export function useDragScroll<T extends HTMLElement = HTMLDivElement>(
  externalRef?: React.RefObject<T | null>
) {
  const internalRef = useRef<T>(null);
  const targetRef = externalRef || internalRef;

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let isDragging = false;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumRaf: number | null = null;

    const cancelMomentum = () => {
      if (momentumRaf !== null) {
        cancelAnimationFrame(momentumRaf);
        momentumRaf = null;
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      // Only respond to main left click
      if (e.button !== 0) return;

      cancelMomentum();

      isDown = true;
      isDragging = false;
      startX = e.pageX;
      scrollStart = el.scrollLeft;
      lastX = e.pageX;
      lastTime = performance.now();
      velocity = 0;

      // Temporarily disable smooth scroll and CSS snap to make dragging instant & 1:1
      el.style.scrollBehavior = 'auto';
      el.style.scrollSnapType = 'none';
      el.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;

      const currentX = e.pageX;
      const dx = currentX - startX;

      // Threshold of 4px to distinguish between click and drag
      if (!isDragging && Math.abs(dx) > 4) {
        isDragging = true;
        el.classList.add('is-dragging-scroll');
        el.style.userSelect = 'none';
      }

      if (isDragging) {
        e.preventDefault();
        el.scrollLeft = scrollStart - dx;

        // Measure velocity for momentum upon release
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 10) {
          velocity = (lastX - currentX) / dt;
          lastX = currentX;
          lastTime = now;
        }
      }
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;

      el.style.cursor = '';
      el.style.userSelect = '';
      el.classList.remove('is-dragging-scroll');

      // If user flicked with noticeable velocity, apply momentum gliding
      if (isDragging && Math.abs(velocity) > 0.15) {
        let v = velocity * 15;
        const friction = 0.92;

        const step = () => {
          if (Math.abs(v) > 0.5) {
            el.scrollLeft += v;
            v *= friction;
            momentumRaf = requestAnimationFrame(step);
          } else {
            momentumRaf = null;
            // Restore smooth scroll behavior and snap after momentum ends
            el.style.scrollBehavior = '';
            el.style.scrollSnapType = '';
          }
        };
        momentumRaf = requestAnimationFrame(step);
      } else {
        // Restore smooth behavior immediately
        el.style.scrollBehavior = '';
        el.style.scrollSnapType = '';
      }

      // Keep isDragging flag true for 50ms so click events from this mouseup are intercepted
      if (isDragging) {
        setTimeout(() => {
          isDragging = false;
        }, 60);
      }
    };

    // Capture phase click handler: intercepts card navigation when user dragged
    const onClickCapture = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent default browser drag on child images / links
    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('dragstart', onDragStart);

    return () => {
      cancelMomentum();
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, [targetRef]);

  return targetRef;
}
export default useDragScroll;
