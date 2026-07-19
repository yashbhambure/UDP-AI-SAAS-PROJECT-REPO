import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, User, AlertCircle, Sparkles, Upload, Brain, ClipboardList, Bell } from 'lucide-react';

export default function LoginView() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Side: Workflow Explainer */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-8 p-4 text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SMART DOCUMENT WORKFLOW</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Get Organized with <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">Tick-It AI</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Transform any document or pasted text into clear, automated checklists. Keep your work on track without manually parsing deadlines.
            </p>
          </div>

          <div className="space-y-6">
            {/* Step 1: Upload */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-center text-purple-400 group-hover:text-purple-300 group-hover:border-purple-500/30 transition-all shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Upload</h3>
                <p className="text-sm text-slate-400 leading-normal">Drop in a PDF, document, or pasted text</p>
              </div>
            </div>

            {/* Step 2: AI Extracts */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-center text-purple-400 group-hover:text-purple-300 group-hover:border-purple-500/30 transition-all shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">AI Extracts</h3>
                <p className="text-sm text-slate-400 leading-normal">Groq-powered AI identifies deadlines, requirements, and action items automatically</p>
              </div>
            </div>

            {/* Step 3: Track */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-center text-purple-400 group-hover:text-purple-300 group-hover:border-purple-500/30 transition-all shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Track</h3>
                <p className="text-sm text-slate-400 leading-normal">Auto-generated tasks and checklists keep you organized</p>
              </div>
            </div>

            {/* Step 4: Get Reminded */}
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-center text-purple-400 group-hover:text-purple-300 group-hover:border-purple-500/30 transition-all shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Get Reminded</h3>
                <p className="text-sm text-slate-400 leading-normal">In-app, email, and SMS reminders before deadlines</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white m-0">Tick-It AI</h1>
              <p className="text-slate-400 mt-2 text-sm text-center">
                {isRegister ? 'Create an intelligent workspace' : 'Log in to your execution engine'}
              </p>
            </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200 m-0">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 text-sm flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Access Dashboard'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/80 pt-6">
          <p className="text-slate-400 text-sm m-0">
            {isRegister ? 'Already have an account?' : 'New to Tick-It AI?'}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-purple-400 hover:text-purple-300 font-medium ml-1 bg-transparent border-0 cursor-pointer focus:outline-none transition-colors"
            >
              {isRegister ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
