import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  ChevronRight,
  XCircle,
  Trash2,
  FileUp,
  Sparkles
} from 'lucide-react';

export default function IngestionView({ setActiveTab }) {
  const { token } = useAuth();
  const [files, setFiles] = useState([]);
  const [text, setText] = useState('');
  const [rawTitle, setRawTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [singleSuccessResult, setSingleSuccessResult] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [processingList, setProcessingList] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 10) {
        setError('You can only upload up to 10 files in a single batch.');
        return;
      }
      setFiles(selectedFiles);
      setText(''); // Clear pasted text if files are selected
      setError('');
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSingleSuccessResult(null);
    setBatchResults(null);

    // Single plain text paste path
    if (text.trim()) {
      try {
        const formData = new FormData();
        formData.append('text', text.trim());
        if (rawTitle.trim()) {
          formData.append('title', rawTitle.trim());
        }

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process pasted text.');

        setSingleSuccessResult(data);
        setText('');
        setRawTitle('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Batch files path
    if (files.length === 0) {
      setError('Please select files or paste text content to analyze.');
      setLoading(false);
      return;
    }

    // Setup initial per-file progress list for rendering
    setProcessingList(files.map(f => ({
      name: f.name,
      status: 'processing',
      title: '',
      message: ''
    })));

    try {
      const formData = new FormData();
      files.forEach(f => {
        formData.append('files', f);
      });

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete batch upload.');

      setBatchResults(data.results);
      setProcessingList(data.results.map(r => ({
        name: r.filename,
        status: r.status, // 'success', 'duplicate', 'failed'
        title: r.title || '',
        message: r.message || '',
        opportunityId: r.opportunityId
      })));

      setFiles([]); // clear file picker queue
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-450 shrink-0" />;
      case 'duplicate':
        return <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
      default:
        return <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />;
    }
  };

  const getStatusLabelClass = (status) => {
    switch (status) {
      case 'success':
        return 'text-emerald-400 font-bold bg-emerald-500/10 border-emerald-500/20';
      case 'duplicate':
        return 'text-amber-400 font-bold bg-amber-500/10 border-amber-500/20';
      case 'failed':
        return 'text-red-400 font-bold bg-red-500/10 border-red-500/20';
      default:
        return 'text-purple-400 font-bold bg-purple-500/10 border-purple-500/20 animate-pulse';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* View Header */}
      <div>
        <h2 className="text-2xl font-bold text-white m-0 tracking-wide">Ingest Document</h2>
        <p className="text-slate-400 text-xs mt-1">Convert unstructured content into workflows using Groq (Llama 3.3 70B)</p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-xs text-red-200 m-0">{error}</p>
        </div>
      )}

      {/* Honest In-Progress Loading State (No Simulated Steps) */}
      {loading && !batchResults && !singleSuccessResult && (
        <div className="glass-panel p-8 rounded-2xl border border-slate-850 flex flex-col items-center justify-center py-16 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-450 animate-spin" />
          <h3 className="text-sm font-semibold text-white">Executing Ingestion Pipeline</h3>
          <p className="text-xs text-slate-450 max-w-xs leading-relaxed">
            Uploading files, extracting raw text, and using Groq (Llama 3.3 70B) to generate opportunities, tasks, and checklists. Please wait...
          </p>
        </div>
      )}

      {/* Ingestion Results Display */}
      {processingList.length > 0 && !loading && batchResults && (
        <div className="glass-panel p-6 rounded-2xl space-y-6 border border-slate-850">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <h3 className="text-sm font-bold text-white m-0 tracking-wide">Batch Processing Status</h3>
            <span className="text-[10px] bg-slate-950 text-slate-450 px-2.5 py-1 rounded-full font-extrabold border border-slate-850 tracking-wider uppercase">
              Completed
            </span>
          </div>

          <div className="space-y-3.5">
            {processingList.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-950/20 border border-slate-900 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getStatusIcon(item.status)}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200 truncate m-0">{item.name}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-1.5 font-medium">
                      {item.status === 'success' && `✅ Extracted Opportunity: "${item.title}"`}
                      {item.status === 'duplicate' && `ℹ️ Already processed: "${item.title}"`}
                      {item.status === 'failed' && `❌ Failed: ${item.message}`}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <span className={`text-[9px] uppercase tracking-widest font-extrabold border px-2 py-0.5 rounded-full ${getStatusLabelClass(item.status)}`}>
                    {item.status}
                  </span>
                  
                  {item.opportunityId && (
                    <button
                      onClick={() => setActiveTab('tracker')}
                      className="flex items-center gap-1 text-[9px] bg-indigo-500/10 text-indigo-400 hover:text-white hover:bg-indigo-600/30 border border-indigo-500/20 px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider"
                    >
                      Track
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-900">
            <button
              onClick={() => {
                setBatchResults(null);
                setProcessingList([]);
              }}
              className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-white font-bold py-2.5 rounded-xl transition-colors text-xs uppercase tracking-wider cursor-pointer"
            >
              Clear & Upload More
            </button>
            <button
              onClick={() => setActiveTab('tracker')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              Go to Tasks Tracker
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Single Paste Success Showcase */}
      {singleSuccessResult && !loading && (
        <div className="glass-panel p-8 rounded-2xl border-emerald-500/25 border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6 border-b border-slate-900 pb-4">
            <div className="w-10 h-10 bg-emerald-555/10 rounded-xl flex items-center justify-center text-emerald-450 border border-emerald-500/20 shadow-inner">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0 tracking-wide">Pasted Ingestion Succeeded</h3>
              <p className="text-slate-455 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Opportunity extracted and indexed successfully</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-5 bg-slate-950/30 border border-slate-900 rounded-xl">
              <div className="flex justify-between items-start gap-4">
                <h4 className="text-sm font-bold text-white m-0">
                  {singleSuccessResult.opportunity?.title || singleSuccessResult.document?.title}
                </h4>
                <span className="text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shrink-0">
                  {singleSuccessResult.opportunity?.priority || 'medium'} priority
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-3 leading-relaxed">
                {singleSuccessResult.opportunity?.summary || 'No summary generated.'}
              </p>
              
              <div className="flex gap-4 mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider pt-4 border-t border-slate-900/60">
                <span>Category: <strong className="text-indigo-400">{singleSuccessResult.opportunity?.category}</strong></span>
                {singleSuccessResult.opportunity?.deadline && (
                  <span>Deadline: <strong className="text-slate-300">{new Date(singleSuccessResult.opportunity.deadline).toLocaleDateString()}</strong></span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSingleSuccessResult(null)}
                className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-white font-bold py-2.5 rounded-xl transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                Upload/Paste More
              </button>
              <button
                onClick={() => setActiveTab('tracker')}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                Go to Tasks Tracker
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Upload Dropzone and paste form */}
      {!loading && !batchResults && !singleSuccessResult && (
        <form onSubmit={handleUploadSubmit} className="space-y-6">
          
          {/* File Picker Drop Zone */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center border-dashed border-2 border-slate-800 hover:border-purple-600/40 transition-all relative group cursor-pointer bg-slate-900/5 hover:bg-slate-900/10">
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className="w-12 h-12 bg-slate-950 border border-slate-850 text-slate-400 group-hover:text-purple-400 group-hover:border-purple-500/30 rounded-xl flex items-center justify-center shadow-inner transition-all mb-4">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white m-0 tracking-wide">
              Drag & drop or click to choose files
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-2.5">
              PDF, DOCX, TXT up to 25MB (max 10 files)
            </p>
          </div>

          {/* Selected File list queue */}
          {files.length > 0 && (
            <div className="bg-slate-950/20 border border-slate-900 p-4 rounded-2xl space-y-2">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Files selected ({files.length}/10)</h5>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {files.map((f, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-950/40 border border-slate-900/60 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileUp className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-xs text-slate-200 font-bold truncate max-w-[280px]">{f.name}</span>
                      <span className="text-[9px] text-slate-500 font-semibold shrink-0">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="bg-transparent border-0 text-slate-500 hover:text-red-400 p-1 cursor-pointer transition-colors focus:outline-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative flex py-2 items-center justify-center">
            <div className="flex-grow border-t border-slate-900"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-[9px] font-bold uppercase tracking-widest">OR PASTE CONTENT</span>
            <div className="flex-grow border-t border-slate-900"></div>
          </div>

          {/* Plain Text Paste Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Acme Schedule Notes"
                value={rawTitle}
                onChange={(e) => setRawTitle(e.target.value)}
                disabled={files.length > 0}
                className="w-full bg-slate-900/40 border border-slate-850 focus:border-purple-500/60 rounded-xl py-2.5 px-4 text-white placeholder-slate-650 focus:outline-none transition-all text-xs font-semibold disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Text Content</label>
              <textarea
                rows={6}
                placeholder="Paste LinkedIn post, RFP email details, or contract bullet points here (at least 20 characters)..."
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setFiles([]); // clear files queue if text pasted
                }}
                className="w-full bg-slate-900/40 border border-slate-850 focus:border-purple-500/60 rounded-xl py-3 px-4 text-white placeholder-slate-650 focus:outline-none transition-all text-xs font-semibold resize-y scrollbar-thin"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (files.length === 0 && text.trim().length < 20)}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 disabled:opacity-45 disabled:pointer-events-none text-xs uppercase tracking-wider cursor-pointer"
          >
            Run Ingestion Pipeline
          </button>
        </form>
      )}
    </div>
  );
}
