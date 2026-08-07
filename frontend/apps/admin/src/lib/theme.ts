const THEME_KEY = 'admin_theme_mode';

export type ThemeMode = 'light' | 'dark';

export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;

    const settingsRaw = localStorage.getItem('admin_settings_v1');
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      if (settings?.theme === 'dark' || settings?.theme === 'light') return settings.theme;
    }
  } catch {
    // ignore error
  }
  return 'light';
}

export function applyTheme(theme: ThemeMode) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_KEY, theme);
    const settingsRaw = localStorage.getItem('admin_settings_v1');
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      settings.theme = theme;
      localStorage.setItem('admin_settings_v1', JSON.stringify(settings));
    }
  } catch {
    // ignore
  }
}

export function initTheme(): ThemeMode {
  const initial = getStoredTheme();
  applyTheme(initial);
  return initial;
}
