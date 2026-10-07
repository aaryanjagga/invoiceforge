import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
        title="Install InvoiceForge to your home screen or desktop"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Install InvoiceForge on iPhone / iPad
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-2">
                1. Tap the <strong className="text-indigo-600 dark:text-indigo-400">Share button</strong> (square with arrow up) at the bottom of Safari.<br />
                2. Scroll down and tap <strong className="text-indigo-600 dark:text-indigo-400">Add to Home Screen</strong>.<br />
                3. Tap <strong className="text-indigo-600 dark:text-indigo-400">Add</strong> at top right to install.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-slate-900 dark:bg-slate-800 text-white py-2 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
