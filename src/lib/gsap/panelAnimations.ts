// /lib/gsap/panelAnimations.ts
import { gsap } from 'gsap';
import { Flip, ScrollSmoother, ScrollTrigger, Observer, CustomEase } from 'gsap/all';
gsap.registerPlugin(Flip, ScrollSmoother, ScrollTrigger, Observer, CustomEase);

// theme‑level easings so you can edit them in global.css
export const easeOut      = CustomEase.create('ease-out' , '0.22,1,0.36,1');
export const easeInOut    = CustomEase.create('ease-inout','0.65,0,0.35,1');

export const enterTL = (
  target: HTMLElement,
  type: 'fade' | 'slide' | 'zoom',
  staggerChildren = false,
) => {
  const tl = gsap.timeline({ defaults: { ease: easeOut } });

  switch (type) {
    case 'slide':
      tl.from(target, { x: 20, autoAlpha: 0, duration: 0.35 });
      break;
    case 'zoom':
      tl.from(target, { scale: 0.96, autoAlpha: 0, duration: 0.4 });
      break;
    default:
      tl.from(target, { autoAlpha: 0, duration: 0.25 });
  }

  if (staggerChildren) {
    tl.from(
      target.querySelectorAll('[data-panel-child]'),
      { y: 12, autoAlpha: 0, stagger: 0.06, duration: 0.25 },
      '-=0.2',
    );
  }
  return tl;
};

export const exitTL = (target: HTMLElement, type: 'fade'|'slide'|'zoom') => {
  const tl = gsap.timeline();
  switch (type) {
    case 'slide':
      tl.to(target, { x: -20, autoAlpha: 0, duration: 0.25, ease: easeInOut });
      break;
    case 'zoom':
      tl.to(target, { scale: 0.96, autoAlpha: 0, duration: 0.3, ease: easeInOut });
      break;
    default:
      tl.to(target, { autoAlpha: 0, duration: 0.20, ease: easeInOut });
  }
  return tl;
};
