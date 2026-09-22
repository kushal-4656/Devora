import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Brain } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_BASE } from './config';

export default function Signup() {
  const navigate = useNavigate();
  const emailRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Sign Up | Devora';
    emailRef.current?.focus();
  }, []);

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[a-z]/.test(pwd)) return false;
    if (!/\d/.test(pwd)) return false;
    if (!/[^A-Za-z0-9]/.test(pwd)) return false;
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password) return setErrorMsg('Please fill in all fields');
    if (!validatePassword(password)) {
      return setErrorMsg('Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, 1 digit, and 1 symbol.');
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Authentication failed');
      
      localStorage.setItem('token', data.token);
      navigate('/chat');
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl p-8"
      >
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-50 mb-2">Create Account</h2>
        <p className="text-slate-400 text-center mb-8 text-sm">Sign up to get started</p>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">Email</label>
            <input 
              ref={emailRef}
              type="email" 
              id="email" 
              required 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                required 
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors pr-10"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button" 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Must be 8+ characters with uppercase, lowercase, number, and symbol.</p>
          </div>

          <div aria-live="assertive" className="min-h-[24px]">
            {errorMsg && <p className="text-sm text-red-400 text-center">{errorMsg}</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-3 font-semibold transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100 flex justify-center items-center h-12"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
