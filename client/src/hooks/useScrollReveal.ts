import { useEffect } from 'react';

/** Observe a group of elements by CSS selector — each triggers .is-visible on scroll */
export function useScrollReveal(selector: string, threshold = 0.1) {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(selector);
    if (!els.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -30px 0px' },
    );

    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [selector, threshold]);
}
