import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Lock, AlertCircle, ArrowRight, TreePine, BookOpen,
  Users, Shield, Heart, Clock, ChevronDown, ChevronUp,
  GitBranch, Camera, UserCheck, FileText, Globe, Share2,
  Search, Sparkles, LockKeyhole, Eye, Network, BookMarked
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { loginSchema } from '../validators/auth.validator.js';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' }
  })
};

const features = [
  { icon: TreePine, title: 'Build Digital Family Trees', desc: 'Create and visualize your complete family lineage with an interactive, easy-to-use tree builder.' },
  { icon: BookOpen, title: 'Preserve Family History', desc: 'Document stories, milestones, and memories so future generations never lose touch with their roots.' },
  { icon: GitBranch, title: 'Discover Relationships', desc: 'Explore how family members connect across branches with an intelligent relationship explorer.' },
  { icon: Camera, title: 'Store Memories Securely', desc: 'Upload photos, videos, and documents to a private family vault protected with enterprise-grade security.' },
  { icon: Users, title: 'Collaborate with Relatives', desc: 'Invite family members to jointly build and enrich your shared family tree in real time.' },
  { icon: Heart, title: 'Keep Generations Connected', desc: 'Bridge the gap between grandparents and grandchildren with a living, evolving digital legacy.' },
];

const steps = [
  { num: '1', title: 'Create or Join a Family', desc: 'Set up your family space or accept an invitation from a relative.' },
  { num: '2', title: 'Invite Your Relatives', desc: 'Send secure invitations to family members to join your tree.' },
  { num: '3', title: 'Build Your Family Tree', desc: 'Add members, relationships, stories, and memories together.' },
  { num: '4', title: 'Preserve Your Legacy Forever', desc: 'Your family history is safely stored for generations to come.' },
];

const whyChoose = [
  { icon: GitBranch, title: 'Interactive Family Tree', desc: 'Visualize complex family connections with a dynamic, zoomable tree.' },
  { icon: Search, title: 'Relationship Explorer', desc: 'Instantly trace how any two family members are related.' },
  { icon: Clock, title: 'Family Timeline', desc: 'See your family history unfold chronologically across generations.' },
  { icon: Camera, title: 'Memories & Photos', desc: 'Store and share precious family moments in a private vault.' },
  { icon: UserCheck, title: 'Role-Based Permissions', desc: 'Control who can view, edit, or manage different parts of the tree.' },
  { icon: Shield, title: 'Secure Collaboration', desc: 'Work together with family members in a protected environment.' },
  { icon: Network, title: 'Multi-Generation Visualization', desc: 'View your lineage spanning multiple generations at a glance.' },
  { icon: FileText, title: 'Family Documents', desc: 'Archive important family documents, letters, and records digitally.' },
];

const useCases = [
  { icon: BookMarked, title: 'Family History Preservation', desc: 'Keep your family heritage alive by documenting stories from elders before they are lost.' },
  { icon: Search, title: 'Genealogy Research', desc: 'Conduct deep ancestry research with organized data and collaborative tools.' },
  { icon: Users, title: 'Family Reunions', desc: 'Plan reunions with a complete understanding of who is related to whom.' },
  { icon: BookOpen, title: 'Legacy Documentation', desc: 'Create a lasting record of achievements, values, and life stories.' },
  { icon: Globe, title: 'Heritage Preservation', desc: 'Celebrate and preserve cultural traditions tied to your family history.' },
  { icon: Heart, title: 'Matrimony Family Verification', desc: 'Verify family connections and lineage for matrimonial purposes.' },
  { icon: Sparkles, title: 'Educational Projects', desc: 'Support students and researchers exploring family and cultural history.' },
];

const securityBadges = [
  { icon: LockKeyhole, title: 'Secure Authentication', desc: 'Industry-standard encryption protects your login credentials.' },
  { icon: Eye, title: 'Private Family Spaces', desc: 'Only invited members can access your family information.' },
  { icon: UserCheck, title: 'Role-Based Access', desc: 'Fine-grained permissions ensure the right people see the right data.' },
  { icon: Share2, title: 'Controlled Sharing', desc: 'You decide exactly what information is shared and with whom.' },
  { icon: Shield, title: 'Protected Personal Information', desc: 'Personal data is encrypted and never shared without your consent.' },
];

const faqs = [
  { q: 'What is Roots Across Generations?', a: 'Roots Across Generations is a digital family tree platform that helps families build, preserve, and explore their ancestry. It combines interactive visualization with secure collaboration to keep family connections alive across generations.' },
  { q: 'Can multiple family members collaborate?', a: 'Absolutely. You can invite relatives to join your family tree. Each member can contribute stories, photos, and information while respecting role-based permissions set by the family administrator.' },
  { q: 'Is my family data private?', a: 'Yes. Your family tree and all associated data are completely private. Only members you explicitly invite can access your family space. We use enterprise-grade encryption to protect all information.' },
  { q: 'Can I invite relatives?', a: 'Yes. You can send secure invitations via email or share a unique join link. Invited relatives can create an account and request to join your family tree.' },
  { q: 'Can I preserve memories?', a: 'Yes. You can upload photos, videos, documents, and written stories to your family vault. These memories are organized by family member and accessible to all invited relatives.' },
  { q: 'Who can edit the tree?', a: 'Editing permissions are controlled by family administrators. They can assign roles that determine who can add members, edit relationships, upload memories, or only view the tree.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white/50">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <span className="font-display font-semibold text-ancestral-800 text-sm pr-4">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-ancestral-500 shrink-0" /> : <ChevronDown className="w-5 h-5 text-ancestral-400 shrink-0" />}
      </button>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.25 }}>
          <p className="px-5 pb-5 text-sm text-neutral-600 leading-relaxed">{a}</p>
        </motion.div>
      )}
    </div>
  );
}

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleSignIn = () => {
    const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "";
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
      const hasMemberships = result.user?.memberships?.length > 0;
      navigate(redirectTo || (hasMemberships ? '/dashboard' : '/onboarding'));
    } else {
      setServerError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-ancestral-50 relative">
      {/* Decorative background blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-ancestral-100 opacity-40 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-gold-50 opacity-30 blur-3xl pointer-events-none" />

      {/* Desktop: Two-column layout | Mobile: Single column */}
      <div className="flex flex-col lg:flex-row min-h-screen">

        {/* ═══════════════════════════════════════════
            LEFT COLUMN — Marketing Content
        ═══════════════════════════════════════════ */}
        <main className="lg:w-[58%] xl:w-[60%] overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-12 lg:py-20 space-y-24">

            {/* ── SECTION 1: Hero ── */}
            <motion.section
              initial="hidden" animate="visible" variants={fadeUp}
              className="text-center lg:text-left space-y-6"
            >
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <span className="text-4xl">🕊</span>
                <span className="font-display font-bold text-2xl tracking-wider text-ancestral-700">ROOTS</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ancestral-900 leading-tight">
                Roots Across <span className="gold-gradient-text">Generations</span>
              </h1>
              <p className="font-display text-xl sm:text-2xl text-ancestral-600 font-light leading-relaxed">
                Preserve Your Family Legacy Across Generations.
              </p>
              <p className="text-neutral-500 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                Build, preserve, and explore your family's history through a collaborative digital family tree designed for generations to come.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
                <a href="#login" className="forest-gradient text-ancestral-50 py-3.5 px-8 rounded-2xl font-medium tracking-wide inline-flex items-center gap-2 transition duration-300 hover:shadow-lg hover:scale-[1.02]">
                  Get Started <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#features" className="border border-ancestral-300 text-ancestral-700 py-3.5 px-8 rounded-2xl font-medium tracking-wide inline-flex items-center gap-2 transition duration-300 hover:bg-ancestral-100">
                  Learn More
                </a>
              </div>
            </motion.section>

            {/* ── SECTION 2: What is this platform? ── */}
            <motion.section
              id="features" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
              className="space-y-10"
            >
              <div className="text-center lg:text-left space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ancestral-900">
                  What is <span className="gold-gradient-text">Roots Across Generations</span>?
                </h2>
                <p className="text-neutral-500 max-w-2xl mx-auto lg:mx-0">
                  A comprehensive family operating system designed to help families document, preserve, and celebrate their shared heritage.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title} custom={i} variants={fadeUp}
                    className="group p-6 rounded-3xl bg-white/60 border border-neutral-200/80 hover:border-ancestral-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-ancestral-500/5 hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-ancestral-500/10 flex items-center justify-center mb-4 group-hover:bg-ancestral-500/20 transition-colors">
                      <f.icon className="w-6 h-6 text-ancestral-500" />
                    </div>
                    <h3 className="font-display font-semibold text-ancestral-800 mb-2">{f.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 3: How It Works ── */}
            <motion.section
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
              className="space-y-10"
            >
              <div className="text-center lg:text-left space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ancestral-900">
                  How It <span className="gold-gradient-text">Works</span>
                </h2>
                <p className="text-neutral-500 max-w-2xl mx-auto lg:mx-0">
                  Four simple steps to start building your family legacy.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {steps.map((s, i) => (
                  <motion.div key={s.num} custom={i} variants={fadeUp} className="relative">
                    <div className="flex items-start gap-5 p-6 rounded-3xl bg-white/60 border border-neutral-200/80 hover:border-ancestral-300/50 transition-all duration-300 hover:shadow-lg hover:shadow-ancestral-500/5 h-full">
                      <div className="w-12 h-12 rounded-2xl forest-gradient text-ancestral-50 flex items-center justify-center font-display font-bold text-lg shrink-0">
                        {s.num}
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-ancestral-800 mb-1">{s.title}</h3>
                        <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                    {i < steps.length - 1 && i % 2 === 0 && (
                      <div className="hidden sm:block absolute top-1/2 -right-3 w-6 h-6 text-ancestral-300 rotate-90">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 4: Why Choose ── */}
            <motion.section
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
              className="space-y-10"
            >
              <div className="text-center lg:text-left space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ancestral-900">
                  Why Choose <span className="gold-gradient-text">Roots Across Generations</span>?
                </h2>
                <p className="text-neutral-500 max-w-2xl mx-auto lg:mx-0">
                  Purpose-built tools for families who value their heritage.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {whyChoose.map((f, i) => (
                  <motion.div
                    key={f.title} custom={i} variants={fadeUp}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-white/50 border border-neutral-200/60 hover:border-ancestral-300/40 transition-all duration-300 hover:bg-white/70"
                  >
                    <div className="w-10 h-10 rounded-xl bg-ancestral-500/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-ancestral-500" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-ancestral-800 text-sm mb-1">{f.title}</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 5: Real-World Use Cases ── */}
            <motion.section
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
              className="space-y-10"
            >
              <div className="text-center lg:text-left space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ancestral-900">
                  Real-World <span className="gold-gradient-text">Use Cases</span>
                </h2>
                <p className="text-neutral-500 max-w-2xl mx-auto lg:mx-0">
                  Families use Roots Across Generations for a variety of meaningful purposes.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {useCases.map((u, i) => (
                  <motion.div
                    key={u.title} custom={i} variants={fadeUp}
                    className="p-5 rounded-3xl bg-white/50 border border-neutral-200/60 hover:border-gold-300/50 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center mb-3">
                      <u.icon className="w-5 h-5 text-gold-600" />
                    </div>
                    <h3 className="font-display font-semibold text-ancestral-800 text-sm mb-1">{u.title}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">{u.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 6: Security ── */}
            <motion.section
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
              className="space-y-10"
            >
              <div className="text-center lg:text-left space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ancestral-900">
                  Your Family Data is <span className="gold-gradient-text">Protected</span>
                </h2>
                <p className="text-neutral-500 max-w-2xl mx-auto lg:mx-0">
                  We take the security of your family information seriously with multiple layers of protection.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {securityBadges.map((b, i) => (
                  <motion.div
                    key={b.title} custom={i} variants={fadeUp}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-white/50 border border-ancestral-200/60"
                  >
                    <div className="w-10 h-10 rounded-xl bg-ancestral-500/10 flex items-center justify-center shrink-0">
                      <b.icon className="w-5 h-5 text-ancestral-500" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-ancestral-800 text-sm mb-1">{b.title}</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* ── SECTION 7: FAQ ── */}
            <motion.section
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
              className="space-y-8"
            >
              <div className="text-center lg:text-left space-y-3">
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-ancestral-900">
                  Frequently Asked <span className="gold-gradient-text">Questions</span>
                </h2>
                <p className="text-neutral-500 max-w-2xl mx-auto lg:mx-0">
                  Everything you need to know about Roots Across Generations.
                </p>
              </div>
              <div className="space-y-3 max-w-2xl">
                {faqs.map((faq) => (
                  <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>
            </motion.section>

            {/* Mobile-only CTA before login */}
            <div className="lg:hidden text-center space-y-4 pt-4" id="login-mobile">
              <p className="text-neutral-500 text-sm">Ready to preserve your family legacy?</p>
            </div>
          </div>
        </main>

        {/* ═══════════════════════════════════════════
            RIGHT COLUMN — Login Form (Sticky)
        ═══════════════════════════════════════════ */}
        <aside
          id="login"
          className="lg:w-[42%] xl:w-[40%] lg:sticky lg:top-0 lg:h-screen flex items-center justify-center p-6 lg:p-10 bg-white/40 backdrop-blur-sm border-l border-neutral-200/50"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md space-y-8"
          >
            {/* Mobile-only brand header */}
            <div className="lg:hidden text-center space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-3xl">🕊</span>
                <span className="font-display font-bold text-xl tracking-wider text-ancestral-700">ROOTS</span>
              </div>
              <p className="text-neutral-500 text-sm">Preserve Your Family Legacy Across Generations.</p>
            </div>

            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-display font-bold text-ancestral-900">
                Welcome Back
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                Sign in to continue building your family tree
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full py-3.5 px-6 border border-neutral-200 rounded-2xl font-medium text-ancestral-700 bg-white/80 hover:bg-neutral-50 flex items-center justify-center gap-3 transition duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.16-3.16C17.47 1.83 14.93 1 12 1 7.37 1 3.4 3.66 1.48 7.56l3.78 2.93c.88-2.65 3.38-4.45 6.74-4.45z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58v2.96h3.9c2.28-2.1 3.55-5.19 3.55-8.69z" />
                <path fill="#FBBC05" d="M5.26 14.12c-.22-.67-.35-1.39-.35-2.12s.13-1.45.35-2.12L1.48 7.56C.54 9.47 0 11.67 0 14s.54 4.53 1.48 6.44l3.78-2.93z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.9-2.96c-1.08.72-2.48 1.15-4.06 1.15-3.36 0-5.86-1.8-6.74-4.45L1.48 16.7C3.4 20.6 7.37 23 12 23z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="text-center text-sm font-light text-neutral-500">
              New to the system?{' '}
              <Link to={redirectTo ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"} className="text-ancestral-500 font-semibold hover:underline">
                Create an account
              </Link>
            </div>

            <div className="hidden lg:block text-center text-xs text-neutral-400 pt-4 border-t border-neutral-200/60">
              &copy; 2026 Roots Across Generations. All rights reserved.
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
};

export default Login;
