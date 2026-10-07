import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-xs"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm font-bold ring-1 ring-slate-200 dark:ring-slate-600'
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        title="Light theme"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
          theme === 'dark'
            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold ring-1 ring-slate-200 dark:ring-slate-600'
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        title="Dark theme"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('system')}
        aria-pressed={theme === 'system'}
        className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm font-bold ring-1 ring-slate-200 dark:ring-slate-600'
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
        title="System theme preference"
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
