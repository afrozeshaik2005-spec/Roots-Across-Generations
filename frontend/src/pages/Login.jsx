import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { loginSchema } from '../validators/auth.validator.js';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect to backend Google OAuth endpoint using VITE_API_URL
  const handleGoogleSignIn = () => {
    const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "";
    // Pass state or query parameters to Google callback so it knows where to redirect
    const redirectParam = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
    window.location.href = `${apiUrl}/auth/google${redirectParam}`;
  };

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    const result = await login(data.email, data.password);
    setSubmitting(false);

    if (result.success) {
      navigate(redirectTo || '/onboarding');
    } else {
      setServerError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-ancestral-50">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100 opacity-50 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-gold-50 opacity-40 blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl grid md:grid-cols-12 rounded-3xl overflow-hidden glass-panel shadow-glass relative z-10"
      >
        {/* Visual Brand Panel */}
        <div className="hidden md:flex md:col-span-5 forest-gradient text-ancestral-50 p-12 flex-col justify-between relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ancestral-400/20 via-transparent to-transparent"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🕊</span>
              <span className="font-display font-bold text-xl tracking-wider text-gold-200">
                ROOTS
              </span>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <h1 className="text-4xl font-display font-light leading-tight">
              Preserve your <span className="font-semibold text-gold-200">legacy</span> across generations.
            </h1>
            <p className="text-ancestral-200/90 text-sm leading-relaxed font-light">
              Welcome to your Family Operating System. Document stories, track relationships, and maintain direct connections with all branches of your lineage.
            </p>
          </div>

          <div className="relative z-10 text-xs text-ancestral-400">
            &copy; 2026 Roots Across Generations. All rights reserved.
          </div>
        </div>

        {/* Form Panel */}
        <div className="md:col-span-7 p-8 md:p-16 flex flex-col justify-center bg-white/40">
          <div className="max-w-md w-full mx-auto space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-display font-bold text-ancestral-900">
                Welcome Back
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                Enter your credentials to manage your family tree
              </p>
            </div>

            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 tracking-wider uppercase block">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="name@family.com"
                    className={`w-full pl-12 pr-4 py-3.5 bg-white/70 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm ${
                      errors.email ? 'border-red-300 bg-red-50/20' : 'border-neutral-200'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 tracking-wider uppercase block">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-4 py-3.5 bg-white/70 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm ${
                      errors.password ? 'border-red-300 bg-red-50/20' : 'border-neutral-200'
                    }`}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full forest-gradient hover:bg-ancestral-600 text-ancestral-50 py-3.5 px-6 rounded-2xl font-medium tracking-wide flex items-center justify-center gap-2 transition duration-300 hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed group"
              >
                {submitting ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <div className="relative flex py-2 items-center text-xs text-neutral-400">
              <div className="flex-grow border-t border-neutral-200"></div>
              <span className="flex-shrink mx-4 font-light tracking-widest uppercase">or</span>
              <div className="flex-grow border-t border-neutral-200"></div>
            </div>

            {/* Google Sign‑In button */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full py-3.5 px-6 border border-neutral-200 rounded-2xl font-medium text-ancestral-700 bg-white/80 hover:bg-neutral-50 flex items-center justify-center gap-3 transition duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.16-3.16C17.47 1.83 14.93 1 12 1 7.37 1 3.4 3.66 1.48 7.56l3.78 2.93c.88-2.65 3.38-4.45 6.74-4.45z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58v2.96h3.9c2.28-2.1 3.55-5.19 3.55-8.69z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.26 14.12c-.22-.67-.35-1.39-.35-2.12s.13-1.45.35-2.12L1.48 7.56C.54 9.47 0 11.67 0 14s.54 4.53 1.48 6.44l3.78-2.93z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.9-2.96c-1.08.72-2.48 1.15-4.06 1.15-3.36 0-5.86-1.8-6.74-4.45L1.48 16.7C3.4 20.6 7.37 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="text-center text-sm font-light text-neutral-500">
              New to the system?{' '}
              <Link to={redirectTo ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"} className="text-ancestral-500 font-semibold hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
