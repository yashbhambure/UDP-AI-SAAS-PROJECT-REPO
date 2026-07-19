import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  Calendar,
  CheckSquare,
  Square,
  AlertCircle,
  FileText,
  User,
  Clock,
  Loader2,
  ChevronRight,
  Search,
  Check,
  ClipboardList,
  Sparkles,
  Plus,
  ArrowUpDown,
  MessageSquare,
  MoreVertical,
  Download,
  History,
  TrendingUp,
  X,
  Send,
  HelpCircle,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

export default function TrackerView() {
  const { token } = useAuth();
  
  // Data states from backend
  const [opportunities, setOpportunities] = useState([]);
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [selectedOppDetail, setSelectedOppDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Redesign state parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgency'); // urgency, deadline, priority, completion, recommended
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview'); // overview, tasks, checklist, timeline, documents, insights
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  
  // Floating AI Chat states
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your AI execution assistant. Ask me anything about your active opportunities, missing document requirements, or upcoming task deadlines.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Cascade success toast state
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Drag and drop mock file uploading
  const [dragging, setDragging] = useState(false);

  // Fetch all opportunities
  const fetchOpportunities = async () => {
    try {
      const res = await fetch('/api/opportunities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load opportunities.');
      setOpportunities(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch details of selected opportunity
  const fetchOppDetail = async (id, checkCascade = false) => {
    setLoadingDetail(checkCascade ? false : true);
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load details.');

      if (checkCascade && selectedOppDetail) {
        const oldStatus = selectedOppDetail.opportunity.status;
        const newStatus = data.opportunity.status;
        if (oldStatus !== 'completed' && newStatus === 'completed') {
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3500);
        }
      }

      setSelectedOppDetail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleSelectOpp = (id) => {
    setSelectedOppId(id);
    fetchOppDetail(id);
  };

  // Toggle task status
  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'todo' ? 'done' : 'todo';
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle task.');

      await fetchOppDetail(selectedOppId, true);
      await fetchOpportunities();
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle checklist item status
  const handleToggleChecklist = async (itemId, currentChecked) => {
    try {
      const res = await fetch(`/api/checklist-items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ checked: !currentChecked })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle checklist item.');

      await fetchOppDetail(selectedOppId);
    } catch (err) {
      setError(err.message);
    }
  };

  // Update opportunity status manually
  const handleUpdateOppStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/opportunities/${selectedOppId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status.');

      if (selectedOppDetail && selectedOppDetail.opportunity.status !== 'completed' && newStatus === 'completed') {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3500);
      }

      await fetchOppDetail(selectedOppId);
      await fetchOpportunities();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // floating AI Chat response engine
  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      let replyText = 'I have analyzed the current workspace snapshot. Let me know which document or deadline you want me to assist you with.';
      const query = chatInput.toLowerCase();
      
      if (query.includes('work') || query.includes('today')) {
        replyText = 'Based on your high-priority items, you should upload the pending Proposal drafts today, and schedule draft roadmap pre-reviews.';
      } else if (query.includes('missing') || query.includes('document')) {
        replyText = 'You have 2 missing documents: "Product Demonstration Video" and "Incorporating Certificate". Click on the Checklist tab to upload.';
      } else if (query.includes('summarize')) {
        if (selectedOppDetail) {
          replyText = `Opportunity "${selectedOppDetail.opportunity.title}" is currently "${selectedOppDetail.opportunity.status}". It has ${selectedOppDetail.tasks.length} tasks and requires ${selectedOppDetail.checklistItems.length} documents.`;
        } else {
          replyText = 'Please select an opportunity from the sidebar first, and I will summarize it for you.';
        }
      } else if (query.includes('deadline')) {
        replyText = 'Missing your target deadlines will auto-trigger warning flags on the dashboard, deactivate active reminders, and flag compliance alerts to the program director.';
      }

      setChatMessages((prev) => [...prev, { sender: 'ai', text: replyText }]);
      setIsTyping(false);
    }, 1200);
  };

  // Mock document drag and drop files handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => {
    setDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    alert('Document uploaded and queued for verification successfully!');
  };

  // Accent Category Color Map
  const getCategoryAccent = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('fund') || cat.includes('seed')) return { border: 'border-l-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (cat.includes('hackathon') || cat.includes('hack')) return { border: 'border-l-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10' };
    if (cat.includes('rfp') || cat.includes('client') || cat.includes('bid')) return { border: 'border-l-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' };
    if (cat.includes('meeting') || cat.includes('notes')) return { border: 'border-l-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { border: 'border-l-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-500/10' };
  };

  // Priority Styles
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  // Status Styles
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'archived': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  // Client-side filtering logic
  const filteredOpportunities = opportunities
    .filter((opp) => {
      const matchesSearch =
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || opp.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.deadline || 0) - new Date(b.deadline || 0);
      }
      if (sortBy === 'priority') {
        const score = { high: 3, medium: 2, low: 1 };
        return score[b.priority] - score[a.priority];
      }
      // default urgency/recent
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  // Calculate task completions
  const totalTasks = selectedOppDetail?.tasks?.length || 0;
  const completedTasks = selectedOppDetail?.tasks?.filter(t => t.status === 'done').length || 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate checklists completions
  const totalChecklist = selectedOppDetail?.checklistItems?.length || 0;
  const completedChecklist = selectedOppDetail?.checklistItems?.filter(c => c.checked).length || 0;
  const checklistCompletionRate = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  return (
    <div className="p-6 flex flex-col lg:flex-row gap-6 relative">
      {/* Toast Alert Banner for cascades */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel bg-emerald-950/90 border border-emerald-500/40 p-4 rounded-xl shadow-2xl animate-bounce flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm m-0">Cascade Completed</h4>
            <p className="text-slate-300 text-xs mt-0.5 font-medium">Opportunity status successfully set to Completed! 🎉</p>
          </div>
        </div>
      )}

      {/* Floating AI chat drawer */}
      {isAIChatOpen && (
        <div className="fixed bottom-24 right-8 w-96 h-[480px] bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40 animate-in slide-in-from-bottom duration-250">
          <div className="p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">AI Assistant Context</span>
            </div>
            <button 
              onClick={() => setIsAIChatOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-purple-600 text-white rounded-br-none' 
                    : 'bg-slate-950 border border-slate-800 text-slate-300 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-950 border border-slate-800 text-slate-500 rounded-xl p-3 text-xs flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  AI is planning...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-850 bg-slate-950/60 flex gap-2">
            <input
              type="text"
              placeholder="Ask: 'What should I work on today?'"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <button 
              type="submit" 
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg p-2 flex items-center justify-center transition-colors cursor-pointer border-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating AI trigger bubble */}
      <button
        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
        className="fixed bottom-8 right-8 z-40 w-12 h-12 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transform hover:scale-105 transition-all cursor-pointer border-0"
      >
        <Sparkles className="w-5.5 h-5.5 animate-pulse" />
      </button>

      {/* Column 1: Opportunity Explorer (420px) */}
      <div className="w-full lg:w-[420px] bg-slate-900/10 border border-slate-900/60 p-5 rounded-2xl flex flex-col justify-between shrink-0">
        <div className="space-y-4 flex flex-col">
          <div className="flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-sm font-bold text-white m-0 uppercase tracking-wider">Opportunity Explorer</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">Mission Board</p>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Sort selector dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200 text-[10px] font-bold uppercase rounded-lg px-2 py-1 focus:outline-none transition-colors"
                >
                  <option value="urgency">Urgency</option>
                  <option value="deadline">Deadline</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Search Field */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search title, category, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-purple-500 rounded-xl py-2 pl-9 pr-3 text-white placeholder-slate-500 text-xs focus:outline-none transition-all"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-850 pb-3 shrink-0">
            {['all', 'pending', 'in_progress', 'completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`text-[9px] uppercase font-extrabold tracking-wider px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-purple-600/10 border-purple-500/25 text-purple-400'
                    : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-750'
                }`}
              >
                {tab === 'all' ? 'All' : tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Scrollable list items */}
          <div className="space-y-3.5 pl-2 pr-1.5 py-1.5">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Syncing Database...</span>
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <div className="glass-panel p-8 rounded-xl text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <h5 className="text-xs font-bold text-white m-0">No matching items</h5>
                <p className="text-[10px] text-slate-500 leading-relaxed">Adjust filters or upload a deliverable document to analyze.</p>
              </div>
            ) : (
              filteredOpportunities.map((opp) => {
                const accent = getCategoryAccent(opp.category);
                const isSelected = selectedOppId === opp._id;
                return (
                  <div
                    key={opp._id}
                    onClick={() => handleSelectOpp(opp._id)}
                    className={`glass-panel p-4 rounded-xl cursor-pointer border-l-4 ${accent.border} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-purple-600 border-y-transparent border-r-transparent bg-slate-900/60 shadow-lg shadow-purple-500/10' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="font-semibold text-white text-xs m-0 line-clamp-1 leading-snug">{opp.title}</h4>
                      <span className={`text-[8px] uppercase font-extrabold tracking-wider px-2 py-0.5 border rounded-full shrink-0 ${getStatusColor(opp.status)}`}>
                        {opp.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-slate-400 text-[10px] mt-2 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      Due: {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'N/A'}
                    </p>

                    {/* Progress indicators inside card */}
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-900/80">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-500 uppercase block">Tasks Progress</span>
                        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div className="h-full bg-indigo-500" style={{ width: opp.status === 'completed' ? '100%' : '50%' }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-500 uppercase block">Checklist Docs</span>
                        <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div className="h-full bg-emerald-500" style={{ width: opp.status === 'completed' ? '100%' : '60%' }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-900/40">
                      <span className="text-slate-400 text-[9px] bg-slate-950/80 px-2 py-0.5 rounded border border-slate-850 font-semibold">
                        {opp.category}
                      </span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-extrabold uppercase ${getPriorityColor(opp.priority)}`}>
                        {opp.priority}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Column 2: AI Workspace Detail Panel (Remaining Width) */}
      <div className="flex-1 bg-slate-900/10 border border-slate-900/60 p-5 rounded-2xl flex flex-col">
        {loadingDetail ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
            <p className="text-slate-400 text-xs font-semibold animate-pulse uppercase tracking-wider">Syncing workspace records...</p>
          </div>
        ) : !selectedOppDetail ? (
          /* High-Fidelity Empty Workspace illustration view */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative">
            <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-purple-600/5 rounded-full blur-[90px] pointer-events-none" />
            
            <div className="w-16 h-16 bg-slate-950 border border-slate-900 rounded-full flex items-center justify-center text-slate-500 mb-6 shadow-inner relative z-10">
              <ClipboardList className="w-8 h-8 text-slate-400 animate-pulse" />
            </div>
            
            <h4 className="text-md font-bold text-white m-0 relative z-10 uppercase tracking-wider">AI Workspace Ready</h4>
            <p className="text-slate-400 text-xs mt-3.5 max-w-sm leading-relaxed relative z-10 font-medium">
              Select an opportunity from the Explorer panel on the left to review metrics, monitor timeline audits, verify supporting documents, and chat with AI.
            </p>
            
            <div className="mt-8 flex items-center gap-2.5 text-[10px] text-purple-400 bg-purple-500/5 border border-purple-500/10 px-4 py-2 rounded-xl relative z-10 font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-bounce" />
              <span>Select any item to initialize RAG analysis tools</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Header Info Banner */}
            <div className="border-b border-slate-900/80 pb-4 shrink-0 space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <h3 className="text-md font-bold text-white m-0">{selectedOppDetail.opportunity.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded font-bold uppercase tracking-wider">
                      {selectedOppDetail.opportunity.category}
                    </span>
                    <span className="text-[9px] text-slate-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded font-bold">
                      Confidence Index: 98%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Override</label>
                  <select
                    disabled={updatingStatus}
                    value={selectedOppDetail.opportunity.status}
                    onChange={(e) => handleUpdateOppStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl px-3 py-1.5 text-white text-xs font-semibold focus:outline-none transition-colors"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Workspace Navigation Tab selection pills */}
              <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-900/60">
                {[
                  { tab: 'overview', label: 'Overview' },
                  { tab: 'tasks', label: `Tasks (${selectedOppDetail.tasks.length})` },
                  { tab: 'checklist', label: `Checklist (${selectedOppDetail.checklistItems.length})` },
                  { tab: 'timeline', label: 'Timeline' },
                  { tab: 'documents', label: 'Documents' },
                  { tab: 'insights', label: 'AI Insights' }
                ].map((item) => (
                  <button
                    key={item.tab}
                    onClick={() => setActiveWorkspaceTab(item.tab)}
                    className={`text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      activeWorkspaceTab === item.tab
                        ? 'bg-purple-600/10 border-purple-500/25 text-purple-400 font-extrabold'
                        : 'bg-transparent border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-750'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Work Tab contents */}
            <div className="flex-1 overflow-y-auto pt-4 pr-1">
              
              {/* Tab: Overview */}
              {activeWorkspaceTab === 'overview' && (
                <div className="space-y-6">
                  {/* Status counter widgets cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-950/40 border border-slate-900/60 p-4 rounded-2xl text-center space-y-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Task Progress rate</span>
                      <div className="text-lg font-black text-white">{taskCompletionRate}%</div>
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600" style={{ width: `${taskCompletionRate}%` }} />
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-900/60 p-4 rounded-2xl text-center space-y-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Document Deliverables</span>
                      <div className="text-lg font-black text-white">{checklistCompletionRate}%</div>
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${checklistCompletionRate}%` }} />
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-900/60 p-4 rounded-2xl text-center space-y-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">AI Risk Assessment</span>
                      <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 mt-1">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Medium Risk
                      </div>
                    </div>
                  </div>

                  {selectedOppDetail.opportunity.summary && (
                    <div className="bg-slate-950/40 border border-slate-900/60 p-5 rounded-2xl space-y-2">
                      <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 m-0">AI Executive Summary</h5>
                      <p className="text-slate-300 text-xs mt-2.5 leading-relaxed font-medium">{selectedOppDetail.opportunity.summary}</p>
                    </div>
                  )}

                  <div className="bg-slate-950/40 border border-slate-900/60 p-5 rounded-2xl space-y-3">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 m-0">Target Opportunity Details</h5>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-2">
                      <div className="flex justify-between items-center py-2 border-b border-slate-900/50 text-slate-400">
                        <span>Assignee Lead:</span>
                        <span className="text-white font-medium">{selectedOppDetail.opportunity.suggestedAssignee || 'Unassigned'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-900/50 text-slate-400">
                        <span>Target Deadline:</span>
                        <span className="text-white font-medium">{selectedOppDetail.opportunity.deadline ? new Date(selectedOppDetail.opportunity.deadline).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-slate-400">
                        <span>Status Type:</span>
                        <span className="text-white font-medium uppercase text-[10px] tracking-wider">{selectedOppDetail.opportunity.status}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-slate-400">
                        <span>Priority Level:</span>
                        <span className="text-white font-medium uppercase text-[10px] tracking-wider">{selectedOppDetail.opportunity.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Tasks List */}
              {activeWorkspaceTab === 'tasks' && (
                <div className="space-y-3">
                  {selectedOppDetail.tasks.length === 0 ? (
                    <p className="text-slate-500 text-xs italic pl-2">No workflow action tasks created for this opportunity.</p>
                  ) : (
                    selectedOppDetail.tasks.map((task) => (
                      <div
                        key={task._id}
                        className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${
                          task.status === 'done'
                            ? 'bg-emerald-950/5 border-emerald-500/10 text-slate-400'
                            : 'bg-slate-950/40 border-slate-850 text-white hover:border-slate-750'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleTask(task._id, task.status)}
                          className="bg-transparent border-0 cursor-pointer p-0 m-0 shrink-0 mt-0.5 text-slate-500 focus:outline-none"
                        >
                          {task.status === 'done' ? (
                            <CheckSquare className="w-5 h-5 text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500 shrink-0" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold m-0 ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {task.title}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {task.assignee && (
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                Assignee: {task.assignee}
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab: Compliance Checklist */}
              {activeWorkspaceTab === 'checklist' && (
                <div className="space-y-4">
                  {/* Drag and Drop Zone Container */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      dragging 
                        ? 'bg-purple-950/20 border-purple-500/60' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-750'
                    }`}
                  >
                    <FolderOpen className="w-10 h-10 text-slate-500" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Upload supporting document deliverables</span>
                    <span className="text-[10px] text-slate-500 font-medium">Drag-and-drop or select file to link & verify requirements</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {selectedOppDetail.checklistItems.length === 0 ? (
                      <p className="text-slate-500 text-xs italic pl-2 col-span-2">No document checklist requirements identified.</p>
                    ) : (
                      selectedOppDetail.checklistItems.map((item) => (
                        <div
                          key={item._id}
                          onClick={() => handleToggleChecklist(item._id, item.checked)}
                          className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                            item.checked
                              ? 'bg-emerald-950/5 border-emerald-500/20 text-slate-400'
                              : 'bg-slate-950/40 border-slate-850 text-white hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                              item.checked 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-slate-900 border-slate-850 text-slate-500'
                            }`}>
                              <FileText className="w-4.5 h-4.5" />
                            </div>
                            <span className={`text-xs truncate font-semibold ${item.checked ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                              {item.label}
                            </span>
                          </div>
                          <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                            item.checked ? 'bg-emerald-500 border-transparent text-slate-950' : 'border-slate-850'
                          }`}>
                            {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab: SVGs Audit Timeline */}
              {activeWorkspaceTab === 'timeline' && (
                <div className="relative pl-6 border-l border-slate-800 ml-3 py-2 space-y-6">
                  {[
                    { title: 'Document Ingestion Complete', desc: 'Raw document details successfully uploaded and checked for duplications.', time: 'Synced 1 hour ago', icon: Check, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' },
                    { title: 'AI Entity Extraction', desc: 'Identified core category, deadlines, and suggested assignees.', time: 'Synced 1 hour ago', icon: Sparkles, color: 'bg-purple-500/20 text-purple-400 border-purple-500/20' },
                    { title: 'Workflow Tasks Generated', desc: 'Set up checklist files and generated action items automatically.', time: 'Synced 1 hour ago', icon: ClipboardList, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' }
                  ].map((node, idx) => {
                    const Icon = node.icon;
                    return (
                      <div key={idx} className="relative flex items-start gap-4">
                        {/* Icon — fixed size, anchored to the timeline line */}
                        <div className={`absolute -left-10 top-0 w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${node.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {/* Text content — never overlaps the icon */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <h5 className="text-xs font-bold text-white m-0 leading-none">{node.title}</h5>
                          <p className="text-[10px] text-slate-500 m-0">{node.time}</p>
                          <p className="text-slate-400 text-[10px] leading-relaxed font-medium m-0">{node.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}


              {/* Tab: Documents */}
              {activeWorkspaceTab === 'documents' && (
                <div className="space-y-3.5">
                  <div className="p-4 bg-slate-950/40 border border-slate-900/60 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white m-0 truncate">Source_Document.txt</h5>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase mt-1 block">Version 1.0 • 818 Bytes</span>
                      </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: AI Insights */}
              {activeWorkspaceTab === 'insights' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-950/40 border border-slate-900/60 rounded-2xl space-y-2.5">
                      <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 m-0">Probability of Completion</h5>
                      <div className="text-2xl font-black text-white">88%</div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Extremely high likelihood of completion before target dates if proposal docs are verified this week.</p>
                    </div>

                    <div className="p-5 bg-slate-950/40 border border-slate-900/60 rounded-2xl space-y-2.5">
                      <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 m-0">AI Action Recommendations</h5>
                      <ul className="text-[10px] text-slate-400 pl-4 space-y-1 font-semibold leading-relaxed">
                        <li>1. Prioritize early bird pre-reviews.</li>
                        <li>2. Link and verify incorporates certificate.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Column 3: Collapsible Right Utility Sidebar (320px) */}
      {isRightSidebarOpen && (
        <div className="w-full lg:w-[320px] bg-slate-900/10 border border-slate-900/60 p-5 rounded-2xl flex flex-col justify-between shrink-0 animate-in slide-in-from-right duration-300">
          <div className="space-y-6 flex flex-col">
            <div className="flex justify-between items-center shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Quick Dashboard Insights</span>
              <button 
                onClick={() => setIsRightSidebarOpen(false)}
                className="text-slate-500 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6 pr-1">
              {/* Upcoming reminders widget */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <span>Target Alarms</span>
                  <span className="text-purple-400">Active</span>
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-950/40 border border-slate-900/60 rounded-xl flex items-start gap-3">
                    <Clock className="w-4.5 h-4.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[11px] font-bold text-white m-0">Grant Proposal Deadline</h5>
                      <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider block mt-1">Due in 3 days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Tasks Summary widget */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <span>Today's Actions</span>
                  <span className="text-indigo-400">Todo</span>
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-950/40 border border-slate-900/60 rounded-xl flex items-start gap-3">
                    <CheckSquare className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[11px] font-bold text-white m-0">Upload Proposal Documents</h5>
                      <span className="text-[9px] text-slate-500 font-bold block mt-1">Acme Tech Accelerator</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Button to reopen utility sidebar if collapsed */}
      {!isRightSidebarOpen && (
        <button
          onClick={() => setIsRightSidebarOpen(true)}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white w-6 h-12 rounded-l-xl flex items-center justify-center cursor-pointer transition-colors z-30"
        >
          <ChevronRight className="w-4 h-4 transform rotate-180" />
        </button>
      )}
    </div>
  );
}
