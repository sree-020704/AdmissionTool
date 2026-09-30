import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_THEME } from './theme-tokens';
import { derivePaletteFromPrimary } from './colorMath';

const STORAGE_KEY = 'admission-tool-theme-colors:v1';
const PRIMARY_TOKEN = 'primary';

export const PRESETS = [
  { id: 'default', name: 'Signature Emerald', primary: DEFAULT_THEME[PRIMARY_TOKEN] },
  { id: 'ocean', name: 'Ocean Teal', primary: '#0E7490' },
  { id: 'midnight', name: 'Midnight Indigo', primary: '#3730A3' },
  { id: 'sunset', name: 'Sunset Amber', primary: '#B45309' },
  { id: 'rose', name: 'Rose Quartz', primary: '#BE123C' },
  { id: 'violet', name: 'Royal Violet', primary: '#7C3AED' },
];

const ThemeContext = createContext(null);

function applyThemeToDom(theme) {
  const root = document.documentElement;
  for (const [token, hex] of Object.entries(theme)) {
    root.style.setProperty(`--color-${token}`, hex);
  }
}

function loadStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.theme) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveStoredTheme(theme, presetId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, presetId, savedAt: Date.now() }));
  } catch {
    // Storage can fail (private browsing, quota) — theme still works for this session.
  }
}

export function ThemeProvider({ children }) {
  const stored = useMemo(() => loadStoredTheme(), []);
  const [theme, setTheme] = useState(() => ({ ...DEFAULT_THEME, ...(stored?.theme ?? {}) }));
  const [presetId, setPresetId] = useState(stored?.presetId ?? 'default');
  const [isDefault, setIsDefault] = useState(!stored);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const persist = useCallback((nextTheme, nextPresetId) => {
    setTheme(nextTheme);
    setPresetId(nextPresetId ?? null);
    setIsDefault(false);
    saveStoredTheme(nextTheme, nextPresetId ?? null);
  }, []);

  const setPrimaryColor = useCallback((hex) => {
    const derived = derivePaletteFromPrimary(DEFAULT_THEME, PRIMARY_TOKEN, hex);
    persist(derived, null);
  }, [persist]);

  const applyPreset = useCallback((preset) => {
    if (preset.id === 'default') {
      persist({ ...DEFAULT_THEME }, 'default');
      return;
    }
    const derived = derivePaletteFromPrimary(DEFAULT_THEME, PRIMARY_TOKEN, preset.primary);
    persist(derived, preset.id);
  }, [persist]);

  const setTokenColor = useCallback((token, hex) => {
    setTheme((prev) => {
      const next = { ...prev, [token]: hex.toUpperCase() };
      setPresetId(null);
      setIsDefault(false);
      saveStoredTheme(next, null);
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setTheme({ ...DEFAULT_THEME });
    setPresetId('default');
    setIsDefault(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const makeCurrentTheDefault = useCallback(() => {
    // "Save this as my default" — keeps the current colors as-is, but marks
    // them explicitly saved so they always load first, on every visit/device
    // that shares this browser storage.
    saveStoredTheme(theme, presetId);
    setIsDefault(false);
  }, [theme, presetId]);

  const value = useMemo(() => ({
    theme,
    presetId,
    isDefault,
    setPrimaryColor,
    applyPreset,
    setTokenColor,
    resetToDefault,
    makeCurrentTheDefault,
    presets: PRESETS,
    defaultTheme: DEFAULT_THEME,
  }), [theme, presetId, isDefault, setPrimaryColor, applyPreset, setTokenColor, resetToDefault, makeCurrentTheDefault]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
