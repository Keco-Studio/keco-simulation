'use client';

import type { Element } from '../types';
import { ELEMENT_CONFIG } from '../types';
import styles from './ElementGlyph.module.css';

type Props = {
  element: Element;
  size?: number;
  className?: string;
};

/** Colored dot for an element (replaces empty ELEMENT_CONFIG.emoji in UI). */
export function ElementGlyph({ element, size = 10, className }: Props) {
  const cfg = ELEMENT_CONFIG[element];
  return (
    <span
      className={[styles.glyph, className].filter(Boolean).join(' ')}
      role="img"
      aria-label={cfg.name}
      style={{
        width: size,
        height: size,
        backgroundColor: cfg.color,
      }}
    />
  );
}
