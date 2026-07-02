import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { signupSchema } from '../validators/auth.validator.js';

export const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data) => {
    setServerError('');
    setSubmitting(true);
    const result = await signup(data.email, data.password);
    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate(redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login');
      }, 3000);
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
              Begin your <span className="font-semibold text-gold-200">journey</span> home.
            </h1>
            <p className="text-ancestral-200/90 text-sm leading-relaxed font-light">
              Create an account to start cataloging your ancestry, tagging memories, and collaborating on a living family archive.
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
                Create Account
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                Join the Family Operating System today
              </p>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center text-center gap-3 text-emerald-800"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-bounce" />
                <h3 className="text-lg font-semibold font-display">Registration Successful!</h3>
                <p className="text-sm font-light text-emerald-700">
                  Your account has been created. Redirecting to sign in screen...
                </p>
              </motion.div>
            ) : (
              <>
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
                    {submitting ? 'Creating account...' : 'Create Account'}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>

                <div className="text-center text-sm font-light text-neutral-500 mt-6">
                  Already have an account?{' '}
                  <Link to={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login"} className="text-ancestral-500 font-semibold hover:underline">
                    Sign in here
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
