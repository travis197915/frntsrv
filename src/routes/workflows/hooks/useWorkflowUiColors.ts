import { useLayoutEffect, useState } from 'react';
import { useTheme } from '@/utils/theme';

function readCssColors() {
  if (typeof document === 'undefined') {
    return {
      border: '',
      mutedForeground: '',
      foreground: '',
      background: '',
      card: '',
      muted: '',
    };
  }
  const cs = getComputedStyle(document.documentElement);
  return {
    border: cs.getPropertyValue('--border').trim(),
    mutedForeground: cs.getPropertyValue('--muted-foreground').trim(),
    foreground: cs.getPropertyValue('--foreground').trim(),
    background: cs.getPropertyValue('--background').trim(),
    card: cs.getPropertyValue('--card').trim(),
    muted: cs.getPropertyValue('--muted').trim(),
  };
}

export function useWorkflowUiColors() {
  const { theme } = useTheme();
  const [colors, setColors] = useState(readCssColors);

  useLayoutEffect(() => {
    setColors(readCssColors());
  }, [theme]);

  const minimapMask =
    theme === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(255, 255, 255, 0.78)';

  return { ...colors, theme, minimapMask };
}
