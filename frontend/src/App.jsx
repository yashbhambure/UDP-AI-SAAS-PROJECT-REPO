import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import TrackerView from './views/TrackerView';
import IngestionView from './views/IngestionView';
import SearchView from './views/SearchView';
import DocumentsView from './views/DocumentsView';
import AnalyticsView from './views/AnalyticsView';
import ProfileView from './views/ProfileView';
import Sidebar from './components/layout/Sidebar';
import {
  Search,
  ChevronRight,
  Command,
  Bell
} from 'lucide-react';

function AppContent() {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('tracker'); // Default to tracker to showcase redesign
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Keyboard shortcut listener for Omnibox search
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Open Search (Cmd/Ctrl + K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Close open states on Esc
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'tracker':
        return <TrackerView />;
      case 'ingestion':
        return <IngestionView setActiveTab={setActiveTab} />;
      case 'search':
        return <SearchView />;
      case 'documents':
        return <DocumentsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  // Mock global search options
  const searchItems = [
    { name: 'AI Innovation Grant Proposal', type: 'Opportunity', tab: 'tracker' },
    { name: 'Upload Acme RFP Schedule', type: 'Task', tab: 'tracker' },
    { name: 'Pitch Deck PDF deliverable', type: 'Checklist', tab: 'tracker' },
    { name: 'RAG Semantic Ingest Pipeline', type: 'System', tab: 'dashboard' },
    { name: 'Review final draft timeline', type: 'Reminder', tab: 'tracker' }
  ];

  const filteredSearchItems = searchItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden relative">
      {/* Dynamic backdrop glow spots */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-purple-300/10 dark:bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-indigo-300/10 dark:bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Global Command omnibox Search dialog overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-start justify-center pt-24">
          <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 p-4 border-b border-slate-800/80">
              <Search className="w-5 h-5 text-indigo-400" />
              <input
                type="text"
                placeholder="Search everything (opportunities, tasks, docs)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none"
              />
              <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-500 font-bold">ESC</span>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1.5">Search Results</h5>
              {filteredSearchItems.length === 0 ? (
                <p className="text-slate-500 text-xs px-3 py-4 italic">No matching results found.</p>
              ) : (
                filteredSearchItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveTab(item.tab);
                      setIsSearchOpen(false);
                    }}
                    className="w-full text-left flex items-center justify-between p-2.5 hover:bg-slate-850/60 rounded-xl transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white truncate">{item.name}</span>
                    <span className="text-[9px] uppercase tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400 group-hover:text-indigo-400">
                      {item.type}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modern Collapsible Sidebar Component */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        logout={logout} 
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Sticky Top Header Navigation */}
        <header className="sticky top-0 h-[72px] bg-white/85 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-900/60 px-8 flex items-center justify-between z-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{activeTab}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Search Omnibox Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-between gap-12 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/50 dark:hover:bg-slate-900/80 border border-slate-300 dark:border-slate-850 hover:border-slate-400 dark:hover:border-slate-750 px-3.5 py-1.5 rounded-xl cursor-pointer text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Search everything...</span>
              </div>
              <div className="flex items-center gap-0.5 text-[9px] bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 px-1.5 py-0.5 rounded font-bold text-slate-600 dark:text-slate-500">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </button>

            {/* Notification alert bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors relative focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-purple-500 rounded-full" />
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 top-10 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                  <h5 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3.5 py-1.5 border-b border-slate-200 dark:border-slate-800/80 pb-2">Recent Notifications</h5>
                  <div className="p-2 space-y-1">
                    <div className="p-2 hover:bg-slate-850/40 rounded-lg text-[10px] text-slate-800 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">AI Extraction</strong> parsed "Prompt Engineering.pdf" successfully.
                      <span className="block text-[8px] text-slate-500 mt-1">10 minutes ago</span>
                    </div>
                    <div className="p-2 hover:bg-slate-850/40 rounded-lg text-[10px] text-slate-800 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">Reminder Alarm</strong>: Grant deadline is due in 3 days.
                      <span className="block text-[8px] text-slate-500 mt-1">2 hours ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Circle */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        {/* PageContainer: Scrollable View Area */}
        <main className="flex-1 overflow-y-auto h-[calc(100vh-72px)] scrollbar-thin z-0">
          <div className="max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
