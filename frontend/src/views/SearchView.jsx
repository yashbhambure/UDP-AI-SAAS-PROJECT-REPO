import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  FileText,
  Clock,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Database,
  Cpu,
  Eye,
  Copy,
  CornerDownLeft,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export default function SearchView() {
  const { token } = useAuth();
  
  // Search state
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sourceChunks, setSourceChunks] = useState([]);
  const [sourceOpportunities, setSourceOpportunities] = useState([]);
  const [latency, setLatency] = useState(null);
  const [error, setError] = useState('');
  
  // History and UI state
  const [searchHistory, setSearchHistory] = useState([]);
  const [isLeftExpanded, setIsLeftExpanded] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [successToast, setSuccessToast] = useState('');

  // Fetch search history on mount
  useEffect(() => {
    fetchHistory();
  }, [token]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/search/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchHistory(data);
      }
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  };

  const handleSearchSubmit = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const targetQuery = (customQuery !== null ? customQuery : query).trim();
    if (!targetQuery) return;

    setQuery(targetQuery);
    setLoading(true);
    setError('');
    setAnswer('');
    setSourceChunks([]);
    setSourceOpportunities([]);
    setLatency(null);

    const startTime = Date.now();

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: targetQuery })
      });

      const endTime = Date.now();
      setLatency(((endTime - startTime) / 1000).toFixed(2));

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete RAG search.');
      }

      setAnswer(data.answer);
      setSourceChunks(data.sourceChunks || []);
      setSourceOpportunities(data.sourceOpportunities || []);
      
      // Update history list
      fetchHistory();
    } catch (err) {
      setError(err.message || 'Search failed. Please verify that server and databases are running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/search/history/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSearchHistory(prev => prev.filter(item => item._id !== id));
        showToast('Query deleted from history');
      } else {
        throw new Error('Failed to delete query.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not delete history item.');
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch('/api/search/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSearchHistory([]);
        showToast('Search history cleared');
      } else {
        throw new Error('Failed to clear history.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not clear history.');
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied content to clipboard!');
  };

  return (
    <div className="p-6 flex flex-col md:flex-row gap-5 text-slate-100 font-sans antialiased relative min-h-[calc(100vh-72px)] overflow-hidden">
      
      {/* Toast Notifier */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-slate-900/90 border border-purple-500/40 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chunk Viewer Modal */}
      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[80vh]"
            >
              <button
                onClick={() => setPreviewDoc(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold text-white truncate max-w-[450px]">
                  {previewDoc.title || 'Untitled Chunk'}
                </span>
                <span className="text-[9px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-extrabold ml-2">
                  Document Chunk
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-950 border border-slate-900 rounded-xl font-mono text-xs text-slate-350 leading-relaxed max-h-[50vh] scrollbar-thin">
                {previewDoc.text}
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => handleCopyText(previewDoc.text)}
                  className="bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Copy Text
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-lg"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Left Sidebar: Real Search History */}
      <motion.div
        animate={{ width: isLeftExpanded ? "280px" : "80px" }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex flex-col bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shrink-0 relative shadow-lg overflow-hidden min-h-[500px]"
      >
        <div className="flex items-center justify-between mb-4 gap-2">
          {isLeftExpanded ? (
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Search History</span>
          ) : (
            <Clock className="w-5 h-5 text-purple-400 mx-auto shrink-0 animate-pulse" />
          )}
          <button
            onClick={() => setIsLeftExpanded(!isLeftExpanded)}
            className="p-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {isLeftExpanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isLeftExpanded && searchHistory.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="w-full mb-4 py-1.5 bg-slate-950/80 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/40 text-slate-400 hover:text-red-400 rounded-xl text-[10px] font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {searchHistory.length === 0 ? (
            isLeftExpanded && <span className="text-[11px] text-slate-500 block px-2 italic">No past searches</span>
          ) : (
            searchHistory.map((item) => (
              <div
                key={item._id}
                onClick={() => handleSearchSubmit(null, item.query)}
                className={`group flex items-center justify-between rounded-xl text-xs cursor-pointer transition-all p-2 bg-slate-950/20 hover:bg-purple-600/10 border border-slate-850/40 hover:border-purple-500/20 ${
                  query === item.query ? 'bg-purple-600/10 border-purple-500/20 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={item.query}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-purple-400 transition-colors" />
                  {isLeftExpanded && <span className="truncate">{item.query}</span>}
                </div>
                {isLeftExpanded && (
                  <button
                    onClick={(e) => handleDeleteHistory(e, item._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition-opacity"
                    title="Delete item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Main Workspace Frame */}
      <div className="flex-1 bg-slate-900/20 border border-slate-800/40 rounded-2xl flex flex-col justify-between relative shadow-inner overflow-hidden min-h-[500px]">
        
        {/* Top Search Bar */}
        <div className="p-4 border-b border-slate-850/65 bg-slate-950/70 backdrop-blur-md shrink-0 z-10">
          <form onSubmit={handleSearchSubmit} className="flex gap-3 items-center relative max-w-4xl mx-auto w-full">
            <div className="relative flex-1 bg-slate-900/50 border border-slate-800 focus-within:border-purple-500/60 rounded-2xl py-2.5 px-4 flex gap-3 items-center transition-all shadow-inner">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything about your uploaded documents..."
                className="w-full bg-transparent text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none py-1"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold p-3 rounded-2xl shadow-lg hover:shadow-purple-500/25 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CornerDownLeft className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Search</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results / Content Body */}
        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin bg-slate-950/10">
          <AnimatePresence mode="wait">
            
            {/* 1. LOADING STATE */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col items-center justify-center py-20 text-center"
              >
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                <h3 className="text-sm font-semibold text-white">Synthesizing Grounded Answer</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Querying vector embeddings & database opportunities. Using Groq Llama 3.3 70B.
                </p>
              </motion.div>
            )}

            {/* 2. ERROR STATE */}
            {!loading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto border border-red-500/20 bg-red-950/10 p-5 rounded-2xl flex gap-3 text-red-200 mb-6"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Search Error</h4>
                  <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}

            {/* 3. EMPTY STATE */}
            {!loading && !answer && !error && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-12 relative"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/5 rounded-full blur-[90px] pointer-events-none" />
                
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 text-purple-400 mb-5 shadow-inner">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>

                <h2 className="text-base font-bold text-white tracking-wide">Ask Tick-It AI</h2>
                <p className="text-slate-400 text-xs mt-2 max-w-sm leading-relaxed">
                  Enter a question above to retrieve context-grounded answers from your uploaded files and tracked deadlines.
                </p>

                {/* Floating Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-2xl w-full">
                  {[
                    { q: "What are the focus areas of the GreenTech Challenge?", desc: "Query PDF content chunks" },
                    { q: "Which tasks are incomplete for Acme?", desc: "Check MongoDB checklist state" },
                    { q: "What is due today?", desc: "Search nearest deadlines" },
                    { q: "Show missing documents.", desc: "Evaluate required files checklist" }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchSubmit(null, item.q)}
                      className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 text-left transition-all hover:scale-[1.01] cursor-pointer group"
                    >
                      <span className="text-[11px] font-bold text-slate-200 group-hover:text-purple-400 block transition-colors">{item.q}</span>
                      <span className="text-[9px] text-slate-500 block mt-1">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 4. RESULTS STATE */}
            {!loading && answer && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                {/* Answer Display */}
                <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl shadow-inner relative">
                  
                  {/* Telemetry metadata block */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 mb-4 border-b border-slate-900 pb-3">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      Model: <span className="text-slate-350">Groq (Llama 3.3 70B)</span>
                    </span>
                    {latency && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Latency: <span className="text-slate-350">{latency}s</span>
                      </span>
                    )}
                  </div>

                  <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line font-sans">
                    {answer}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-900/50 flex justify-end">
                    <button
                      onClick={() => handleCopyText(answer)}
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-white cursor-pointer flex items-center gap-1.5 text-[10px] font-bold transition-all"
                      title="Copy Answer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Answer</span>
                    </button>
                  </div>
                </div>

                {/* Hybrid Date Results (Structured Opportunities) */}
                {sourceOpportunities.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                        Structured Data (Database Sorted Results)
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-500 -mt-1 leading-relaxed">
                      These resources were queried directly from the application database by date order and status flags, bypassing semantic text indexing.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sourceOpportunities.map((opp) => (
                        <div
                          key={opp.id}
                          className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl flex flex-col justify-between gap-2.5"
                        >
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-200 block truncate">
                              {opp.title}
                            </span>
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1">
                              <Calendar className="w-3 h-3 text-slate-600" />
                              <span>Due: {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded border tracking-wider uppercase ${
                              opp.status === 'completed'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : opp.status === 'in_progress'
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}>
                              {opp.status || 'N/A'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounding Source Citations (Unstructured chunks) */}
                {sourceChunks.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                        Document Citations
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {sourceChunks.map((chunk, idx) => (
                        <div
                          key={chunk.id || idx}
                          className="bg-slate-950/70 border border-slate-850 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-inner"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-350 block truncate" title={chunk.title}>
                              {chunk.title || 'Untitled Document'}
                            </span>
                            <p className="text-[10px] text-slate-500 line-clamp-3 font-mono mt-2 leading-relaxed">
                              "{chunk.text}"
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] font-bold mt-1 border-t border-slate-900/60 pt-2 shrink-0">
                            <button
                              onClick={() => setPreviewDoc(chunk)}
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Chunk</span>
                            </button>
                            <button
                              onClick={() => handleCopyText(chunk.text)}
                              className="text-slate-500 hover:text-slate-350 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Snippet</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
