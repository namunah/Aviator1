import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, Sparkles } from 'lucide-react';
import { sound } from '../services/sound.ts';
import { api } from '../services/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AVATARS = ['👨‍✈️', '👩‍✈️', '🚀', '💎', '🦅', '⚡', '🔥', '🎯', '👑', '🛩️'];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    sound.playClick();

    try {
      if (mode === 'login') {
        await api.login({ identifier, password });
      } else {
        if (!username || !email || !password) {
          throw new Error('Please fill all required fields');
        }
        await api.register({
          username,
          email,
          password,
          avatar: selectedAvatar,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoPlay = async () => {
    setError(null);
    setLoading(true);
    sound.playClick();
    try {
      await api.login({ identifier: 'pilot@aviator.game', password: 'password123' });
      onSuccess();
      onClose();
    } catch {
      // If default demo login fails, register a quick guest account
      const guestId = Math.floor(1000 + Math.random() * 9000);
      await api.register({
        username: `Pilot_${guestId}`,
        email: `guest${guestId}@aviator.game`,
        password: 'password123',
        avatar: selectedAvatar,
      });
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#131621] border border-[#252c40] rounded-2xl w-full max-w-md shadow-2xl p-6 text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#212738] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-950/40 border border-red-800/40 rounded-lg text-red-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wide font-mono">
                {mode === 'login' ? 'Pilot Sign In' : 'Register Pilot'}
              </h2>
              <p className="text-xs text-gray-400">
                Secure real-time Aviator account authentication
              </p>
            </div>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#1e2434] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Play Shortcut */}
        <div className="mb-4 bg-[#181d2c] border border-[#2d364e] p-3 rounded-xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Demo Play</span>
            </span>
            <span className="text-[11px] text-gray-400">
              $1,000.00 preloaded demo balance
            </span>
          </div>
          <button
            id="btn-quick-demo-play"
            onClick={handleQuickDemoPlay}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md shadow-emerald-950/40 transition-all active:scale-95"
          >
            Quick Play
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0d0f15] p-1 rounded-xl border border-[#212738] mb-4">
          <button
            id="btn-switch-login"
            onClick={() => {
              sound.playClick();
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            id="btn-switch-register"
            onClick={() => {
              sound.playClick();
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-950/70 border border-red-800/60 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Choose Pilot Avatar
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#0c0e14] rounded-lg border border-[#212738] no-scrollbar">
                  {AVATARS.map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={`text-xl p-1.5 rounded-md transition-all ${
                        selectedAvatar === av
                          ? 'bg-red-600/30 border border-red-500 scale-110'
                          : 'hover:bg-[#1a1f2e]'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    id="input-register-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. AceFlyer"
                    className="w-full bg-[#0d0f15] border border-[#232a3c] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    id="input-register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pilot@example.com"
                    className="w-full bg-[#0d0f15] border border-[#232a3c] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </>
          )}

          {mode === 'login' && (
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                <input
                  id="input-login-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="DemoPilot or pilot@aviator.game"
                  className="w-full bg-[#0d0f15] border border-[#232a3c] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-gray-400 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              <input
                id="input-auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d0f15] border border-[#232a3c] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            id="btn-submit-auth"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/50 transition-all active:scale-95 mt-2"
          >
            {loading
              ? 'Processing...'
              : mode === 'login'
              ? 'Sign In'
              : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-[#1d2332] text-center flex items-center justify-center gap-1 text-[11px] text-gray-500">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>SHA-256 encrypted authentication & session security</span>
        </div>
      </div>
    </div>
  );
};
