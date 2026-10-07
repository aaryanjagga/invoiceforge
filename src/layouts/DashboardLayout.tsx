import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Building2,
  Settings,
  Search,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Sparkles,
  Download,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { PWAInstallButton } from '@/components/common/PWAInstallButton';
import { OfflineIndicator, OfflineBanner } from '@/components/common/OfflineIndicator';
import { NotificationsPopover } from '@/components/common/NotificationsPopover';
import { GlobalSearchModal } from '@/components/common/GlobalSearchModal';

export const DashboardLayout: React.FC = () => {
  const { user, profile, business, signOut } = useAuth();
  const { isPro, monthlyUsage, openUpgradeModal } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Quotations', path: '/quotations', icon: FileCheck },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const secondaryLinks = [
    { label: 'Business Profile', path: '/business', icon: Building2 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <OfflineBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 no-print select-none">
          {/* Logo & Brand */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <NavLink to="/dashboard" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                  InvoiceForge
                </span>
                <span
                  className={`text-[10px] font-bold block -mt-0.5 ${
                    isPro ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                  }`}
                >
                  {isPro ? 'PRO Plan' : 'Free Plan'}
                </span>
              </div>
            </NavLink>
          </div>

          {/* Business Switcher / Current Business */}
          <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Active Business
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {business?.name || 'Setup Business'}
                </p>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
              Workspace
            </div>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <div className="pt-4 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
                Management
              </div>
            </div>

            {secondaryLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Subscription Usage Widget */}
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/80">
            {!isPro ? (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-slate-800/60 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                    Free Plan
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 font-semibold">
                    {monthlyUsage} / 5 used
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      monthlyUsage >= 5 ? 'bg-rose-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, (monthlyUsage / 5) * 100)}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={openUpgradeModal}
                  className="w-full py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Zap className="w-3 h-3 fill-white" />
                  <span>Upgrade to Pro — ₹99</span>
                </button>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 text-[11px]">
                    Pro Plan Active
                  </span>
                </div>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Unlimited
                </span>
              </div>
            )}
          </div>

          {/* User profile footer in sidebar */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 truncate">
                <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {profile?.full_name || 'My Account'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Navigation Bar */}
          <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between gap-4 z-20 no-print shrink-0">
            {/* Search Trigger */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>Search records...</span>
                </div>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-400">
                  Ctrl K
                </kbd>
              </button>
            </div>

            {/* Topbar Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <OfflineIndicator />
              <PWAInstallButton />
              <ThemeToggle />
              <NotificationsPopover />

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Main Routed Page Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Section 23: Home, Invoices, Customers, Reports, More) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-30 no-print px-1">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium transition ${
              isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/invoices"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium transition ${
              isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
            }`
          }
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Invoices</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium transition ${
              isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
            }`
          }
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Clients</span>
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium transition ${
              isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
            }`
          }
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          <span>Reports</span>
        </NavLink>

        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center w-14 py-1 text-[10px] font-medium text-slate-500 cursor-pointer"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end no-print">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-white dark:bg-slate-900 h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm">InvoiceForge</span>
                    <span
                      className={`text-[10px] font-bold block ${
                        isPro ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                      }`}
                    >
                      {isPro ? 'PRO Plan' : 'Free Plan'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {[...navLinks, ...secondaryLinks].map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="mb-3 px-2 text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{profile?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  handleSignOut();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
