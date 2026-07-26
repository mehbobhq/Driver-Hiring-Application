import { useEffect } from 'react';
import type { BrandingConfig } from './types';
import { DEFAULT_BRANDING } from './types';

export function applyBranding(branding: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', branding.primary_color);
  root.style.setProperty('--brand-secondary', branding.secondary_color);
  root.style.setProperty('--brand-accent', branding.accent_color);
  document.title = `${branding.company_name} — Driver Application Portal`;
}

export function useBranding(branding: BrandingConfig | null) {
  useEffect(() => {
    applyBranding(branding ?? DEFAULT_BRANDING);
  }, [branding]);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lightenHex(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

export function darkenHex(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  const nr = Math.round(r * factor);
  const ng = Math.round(g * factor);
  const nb = Math.round(b * factor);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}
