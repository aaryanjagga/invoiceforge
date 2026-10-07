import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
      {isOnline ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            Offline
          </span>
        </>
      )}
    </div>
  );
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between no-print">
      <div className="flex items-center gap-2">
        <Wifi className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>You are currently offline. Viewing cached data. Online connection is required to sync changes.</span>
      </div>
    </div>
  );
};
