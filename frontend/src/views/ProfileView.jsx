import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Smartphone,
  Check
} from 'lucide-react';

export default function ProfileView() {
  const { user, token, updateUser } = useAuth();
  
  // Local state
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [inApp, setInApp] = useState(user?.notificationPreferences?.inApp ?? true);
  const [email, setEmail] = useState(user?.notificationPreferences?.email ?? false);
  const [sms, setSms] = useState(user?.notificationPreferences?.sms ?? false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  // Validate E.164 format on change
  const validatePhoneFormat = (phone) => {
    if (!phone.trim()) {
      setValidationError('');
      return true;
    }
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone.trim())) {
      setValidationError('Please enter a valid phone number starting with + and country code (e.g. +15551234567)');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhoneNumber(val);
    if (success) setSuccess(false);
    if (error) setError('');
    validatePhoneFormat(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate phone number format before submission
    if (!validatePhoneFormat(phoneNumber)) {
      setError('Cannot save settings. Fix validation errors first.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          notificationPreferences: {
            inApp,
            email,
            sms
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      // Sync state with Context and LocalStorage
      updateUser(data);
      setSuccess(true);
      
      // Auto fade-out success state
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 space-y-8"
    >
      {/* Header section */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <Shield className="w-7 h-7 text-purple-500" />
          Account & Notification Settings
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Update your phone number and choose which channels to receive task reminders through.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - User profile info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/40 border border-slate-900/60 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-purple-500/10">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{user?.name || 'Enterprise User'}</h3>
                <span className="text-xs text-slate-500">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            <div className="mt-8 space-y-4 pt-6 border-t border-slate-800/60">
              <div className="flex items-center gap-3 text-slate-300">
                <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold tracking-wider">Email Address</span>
                  <span className="text-xs truncate block">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Twilio & Resend limits help card */}
          <div className="bg-slate-900/20 border border-slate-900/40 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Configuration Notes</h4>
            <ul className="space-y-3 text-xs text-slate-400 list-none p-0">
              <li className="flex gap-2">
                <span className="text-purple-500 font-bold">•</span>
                <span><strong>Twilio Trial Limit</strong>: SMS messages can only be sent to phone numbers manually verified inside your Twilio Console account.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-500 font-bold">•</span>
                <span><strong>Resend Free-Tier Limit</strong>: Reminders will be emailed to your account's registered address via `onboarding@resend.dev` until a domain is verified.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right column - Settings Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-slate-900/60 rounded-2xl p-8 backdrop-blur-md space-y-8">
            <AnimatePresence mode="wait">
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-semibold">Settings updated successfully!</span>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-semibold">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Contact details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                Contact Information
              </h3>
              
              <div className="space-y-1.5">
                <label htmlFor="phoneNumber" className="block text-xs font-semibold text-slate-300">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+15551234567"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className={`w-full bg-slate-950 border rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                      validationError ? 'border-red-500/40 focus:ring-red-500' : 'border-slate-850 hover:border-slate-700'
                    }`}
                  />
                </div>
                {validationError ? (
                  <p className="text-[10px] text-red-400 font-medium">{validationError}</p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Format: + [Country Code] [Phone Number] (e.g. <strong>+15551234567</strong>). Twilio requires E.164.
                  </p>
                )}
              </div>
            </div>

            {/* Channels preferences */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                Notification Channels
              </h3>

              <div className="space-y-4">
                {/* In-app channel */}
                <label className="flex items-start gap-4 p-4 bg-slate-950/20 border border-slate-900/60 rounded-xl cursor-pointer hover:bg-slate-950/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={inApp}
                    onChange={(e) => {
                      setInApp(e.target.checked);
                      if (success) setSuccess(false);
                    }}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                    inApp ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-800 bg-slate-950'
                  }`}>
                    {inApp && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-purple-400" />
                      In-App Notifications
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Receive bell icon alerts in the dashboard.
                    </span>
                  </div>
                </label>

                {/* Email channel */}
                <label className="flex items-start gap-4 p-4 bg-slate-950/20 border border-slate-900/60 rounded-xl cursor-pointer hover:bg-slate-950/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={email}
                    onChange={(e) => {
                      setEmail(e.target.checked);
                      if (success) setSuccess(false);
                    }}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                    email ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-800 bg-slate-950'
                  }`}>
                    {email && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-purple-400" />
                      Email Reminders
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Receive task reminders via email. Sends to <strong>{user?.email}</strong>.
                    </span>
                  </div>
                </label>

                {/* SMS channel */}
                <label className={`flex items-start gap-4 p-4 border rounded-xl transition-all duration-200 ${
                  !phoneNumber.trim() 
                    ? 'border-slate-950/20 bg-slate-950/5 opacity-50 cursor-not-allowed'
                    : 'bg-slate-950/20 border-slate-900/60 cursor-pointer hover:bg-slate-950/40'
                }`}>
                  <input
                    type="checkbox"
                    checked={sms && !!phoneNumber.trim()}
                    disabled={!phoneNumber.trim()}
                    onChange={(e) => {
                      setSms(e.target.checked);
                      if (success) setSuccess(false);
                    }}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ${
                    sms && !!phoneNumber.trim() ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-800 bg-slate-950'
                  }`}>
                    {sms && !!phoneNumber.trim() && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                      SMS Reminders
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Receive SMS reminder texts. Requires a phone number.
                    </span>
                    {!phoneNumber.trim() && (
                      <span className="text-[9px] text-amber-500 font-bold block mt-1">
                        * Add a phone number above to enable SMS reminders.
                      </span>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading || !!validationError}
                className="w-full sm:w-auto bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold py-3.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
