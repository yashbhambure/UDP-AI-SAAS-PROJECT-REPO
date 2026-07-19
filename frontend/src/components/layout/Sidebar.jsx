import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  Upload,
  Search,
  LogOut,
  Sparkles,
  Settings,
  ChevronRight,
  HelpCircle,
  FolderOpen,
  FileCode,
  LineChart,
  Database,
  MessageSquare
} from 'lucide-react';

const WORKSPACE_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tracker', label: 'Tracker', icon: ClipboardList },
  { id: 'ingestion', label: 'Upload Ingest', icon: Upload },
  { id: 'search', label: 'AI Search', icon: Search }
];

const MANAGEMENT_ITEMS = [
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: LineChart }
];

function Tooltip({ children, text, enabled }) {
  if (!enabled) return children;
  return (
    <div className="relative group flex items-center">
      {children}
      <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-[10px] font-bold uppercase rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {text}
      </div>
    </div>
  );
}

function NavItem({ item, active, onClick, isCollapsed }) {
  const Icon = item.icon;
  return (
    <Tooltip text={item.label} enabled={isCollapsed}>
      <button
        onClick={onClick}
        aria-label={item.label}
        className={`w-full relative flex items-center rounded-xl text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer overflow-hidden ${
          isCollapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3.5 py-3 px-4 min-h-[44px]'
        } ${
          active
            ? 'text-purple-400 border border-purple-500/20'
            : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-900/40'
        }`}
      >
        {active && (
          <motion.div
            layoutId="active-indicator"
            className="absolute inset-0 bg-purple-600/10 border-l-2 border-purple-500 rounded-xl z-0"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        
        <div className="relative z-10 shrink-0 w-6 h-6 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 truncate text-left"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}

export default function Sidebar({ activeTab, setActiveTab, user, logout }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 76 : 280 }}
      transition={{ duration: 0.24, ease: 'easeInOut' }}
      className="bg-slate-900/30 border-r border-slate-900/60 flex flex-col justify-between shrink-0 sticky top-0 z-20 h-screen overflow-hidden p-4"
    >
      <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
        {/* Logo Section acting as collapse/expand toggle */}
        <div className={`flex items-center h-12 shrink-0 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <button
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
            role="button"
            tabIndex={0}
            className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 border border-purple-500/10 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 hover:scale-[1.03] transition-all duration-180 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 shrink-0 select-none"
          >
            <Sparkles className="w-5.5 h-5.5 text-white" />
          </button>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 flex flex-col justify-center animate-in fade-in duration-300"
              >
                <h1 className="text-sm font-bold text-white tracking-tight leading-none">Tick-It AI</h1>
                <span className="text-[9px] text-slate-500 font-extrabold tracking-wider uppercase mt-1 block">Mission Control</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>



        {/* Navigation Categories Container */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Workspace Category */}
          <div className="space-y-2">
            {!isCollapsed && (
              <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 pl-3">
                Workspace
              </h5>
            )}
            <div className="space-y-1">
              {WORKSPACE_ITEMS.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </div>

          {/* Management Category */}
          <div className="space-y-2">
            {!isCollapsed && (
              <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 pl-3">
                Management
              </h5>
            )}
            <div className="space-y-1">
              {MANAGEMENT_ITEMS.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User Card Capacity and Profile Card */}
      <div className="border-t border-slate-800/80 pt-4 space-y-4 shrink-0">

        <div className="relative">
          <Tooltip text={user?.name || 'Profile'} enabled={isCollapsed}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="Profile actions"
              className={`w-full flex items-center hover:bg-slate-900/40 rounded-xl cursor-pointer transition-all duration-200 p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                isCollapsed ? 'justify-center h-12 w-12 mx-auto' : 'gap-3.5'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 text-left">
                  <span className="text-xs font-bold text-white block truncate">{user?.name || 'Enterprise User'}</span>
                  <span className="text-[9px] text-slate-500 block truncate">{user?.email}</span>
                </div>
              )}
            </button>
          </Tooltip>
          
          {showProfileMenu && (
            <div className={`absolute ${isCollapsed ? 'left-16 bottom-0' : 'bottom-12 left-0'} w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150`}>
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                Settings
              </button>
              <button className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-2 cursor-pointer border-0 bg-transparent">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                Help Center
              </button>
              <button className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 flex items-center gap-2 cursor-pointer border-0 bg-transparent">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                Send Feedback
              </button>
              <div className="border-t border-slate-800/80 my-1" />
              <button
                onClick={logout}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 flex items-center gap-2 cursor-pointer border-0 bg-transparent"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
