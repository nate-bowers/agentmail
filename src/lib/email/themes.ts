export interface EmailThemeColors {
  bg: string;
  containerBg: string;
  text: string;
  muted: string;
  border: string;
  positive: string;
  negative: string;
  accent: string;
}

export interface EmailThemeProse {
  verbosity: 'short' | 'medium' | 'long';
  includeIntro: boolean;
  includeCommentary: boolean;
}

export interface EmailTheme {
  id: string;
  name: string;
  colors: EmailThemeColors;
  prose: EmailThemeProse;
}

const BASE_COLORS: EmailThemeColors = {
  bg: '#f9fafb',
  containerBg: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  positive: '#16a34a',
  negative: '#dc2626',
  accent: '#7c3aed',
};

export const EMAIL_THEMES: Record<string, EmailTheme> = {
  light: {
    id: 'light',
    name: 'Light',
    colors: BASE_COLORS,
    prose: { verbosity: 'medium', includeIntro: true, includeCommentary: false },
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
      bg: '#0f0f0f',
      containerBg: '#1c1c1e',
      text: '#f0f0f0',
      muted: '#9ca3af',
      border: '#374151',
      positive: '#4ade80',
      negative: '#f87171',
      accent: '#a78bfa',
    },
    prose: { verbosity: 'medium', includeIntro: true, includeCommentary: false },
  },
  pink: {
    id: 'pink',
    name: 'Pink',
    colors: {
      bg: '#fdf2f8',
      containerBg: '#fff7fc',
      text: '#1c1c1e',
      muted: '#9d6b7e',
      border: '#f9a8d4',
      positive: '#16a34a',
      negative: '#dc2626',
      accent: '#db2777',
    },
    prose: { verbosity: 'medium', includeIntro: true, includeCommentary: false },
  },
  succinct: {
    id: 'succinct',
    name: 'Succinct',
    colors: BASE_COLORS,
    prose: { verbosity: 'short', includeIntro: false, includeCommentary: false },
  },
  wordy: {
    id: 'wordy',
    name: 'Wordy',
    colors: BASE_COLORS,
    prose: { verbosity: 'long', includeIntro: true, includeCommentary: true },
  },
};

export function getTheme(id: string): EmailTheme {
  return EMAIL_THEMES[id] ?? EMAIL_THEMES.light;
}
