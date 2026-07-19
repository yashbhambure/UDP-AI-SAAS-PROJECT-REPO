import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

export default function DocumentsView() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [successToast, setSuccessToast] = useState('');

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch documents.');
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleRetryExtraction = async (id) => {
    setActioningId(id);
    setError('');
    try {
      const res = await fetch(`/api/documents/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retry extraction.');
      
      showToast('Document extraction retried successfully');
      fetchDocuments();
    } catch (err) {
      setError(`Retry failed: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading documents repository...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Notifier */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 border border-purple-500/40 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white m-0 tracking-wide">Document Repository</h2>
          <p className="text-slate-400 text-xs mt-1">Review status and manage uploaded files in your database</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchDocuments();
          }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-350 py-2 px-4 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors hover:text-white cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh List
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-955/40 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-xs text-red-200 m-0">{error}</p>
        </div>
      )}

      {/* Documents List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-850 bg-slate-900/10 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-450 text-[10px] uppercase font-extrabold tracking-widest">
                <th className="py-4.5 px-6">File Details</th>
                <th className="py-4.5 px-6">Extracted Title</th>
                <th className="py-4.5 px-6">Status</th>
                <th className="py-4.5 px-6">Uploaded At</th>
                <th className="py-4.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-xs">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 px-6 text-center text-slate-500 font-medium italic">
                    No documents uploaded in this workspace yet. Navigate to the "Upload Ingest" tab to upload your first document.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const isRetrying = actioningId === doc._id;
                  return (
                    <tr key={doc._id} className="hover:bg-slate-900/15 text-slate-350 transition-colors">
                      {/* File Details */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate max-w-[200px]" title={doc.originalFilename}>
                            {doc.originalFilename}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-slate-550 font-extrabold block mt-0.5">
                            {doc.fileType || 'unknown'}
                          </span>
                        </div>
                      </td>

                      {/* Extracted Title */}
                      <td className="py-4 px-6 font-semibold text-slate-200">
                        {doc.status === 'processed' ? doc.title : (
                          <span className="text-slate-500 italic font-medium">Pending Ingestion Analysis</span>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          {doc.status === 'processed' && (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold tracking-wide px-2.5 py-0.5 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" /> PROCESSED
                            </span>
                          )}
                          {doc.status === 'processing' && (
                            <span className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-extrabold tracking-wide px-2.5 py-0.5 rounded-full animate-pulse">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> PROCESSING
                            </span>
                          )}
                          {doc.status === 'failed' && (
                            <div className="group relative inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-extrabold tracking-wide px-2.5 py-0.5 rounded-full cursor-help">
                              <AlertCircle className="w-3.5 h-3.5" /> FAILED
                              {doc.errorMessage && (
                                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-950 border border-slate-800 text-[10px] text-slate-350 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all z-10 leading-normal font-sans tracking-wide">
                                  {doc.errorMessage}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Uploaded At */}
                      <td className="py-4 px-6 text-slate-450 font-medium">
                        {new Date(doc.createdAt).toLocaleString()}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        {doc.status === 'failed' ? (
                          <button
                            onClick={() => handleRetryExtraction(doc._id)}
                            disabled={isRetrying}
                            className="inline-flex items-center gap-1.5 bg-purple-600/10 border border-purple-500/25 text-purple-400 hover:bg-purple-600/20 hover:text-purple-300 py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                          >
                            {isRetrying ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span>{isRetrying ? 'Retrying...' : 'Retry Ingestion'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-550 font-extrabold uppercase tracking-widest block pr-3 select-none">
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
