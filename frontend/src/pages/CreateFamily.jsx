import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, User, Calendar, MapPin, ArrowLeft, Loader2, Info } from 'lucide-react';
import api from '../services/api.js';
import { createFamilySchema } from '../validators/family.validator.js';
import { useAuth } from '../context/AuthContext.jsx';

export const CreateFamily = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(createFamilySchema),
    defaultValues: {
      name: '',
      surname: '',
      description: '',
      originVillageCity: '',
      founderProfile: {
        fullName: '',
        nickname: '',
        dob: '',
        gender: '',
        birthPlace: '',
        birthVillageCity: '',
        bloodGroup: '',
        occupation: '',
        education: '',
        phone: '',
        email: '',
        bio: ''
      }
    }
  });

  const onSubmit = async (data) => {
    setError('');
    setSubmitting(true);
    try {
      // Parse empty strings to null or omit
      const payload = {
        ...data,
        founderProfile: {
          ...data.founderProfile,
          dob: data.founderProfile.dob ? new Date(data.founderProfile.dob).toISOString() : undefined,
          email: data.founderProfile.email || undefined
        }
      };

      const response = await api.post('/families', payload);
      if (response.data?.success) {
        try {
          const userRes = await api.get('/auth/me');
          if (userRes.data?.success) {
            setUser(userRes.data.user);
          }
        } catch (e) {
          console.error('Failed to refresh user after family creation:', e);
        }
        navigate('/dashboard');
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to create family tree';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ancestral-50 py-12 px-4 relative overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100 opacity-40 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50 opacity-30 blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-ancestral-700 transition duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Onboarding</span>
        </button>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-ancestral-900">
            Establish Your Family Tree
          </h1>
          <p className="text-neutral-500 font-light text-sm">
            Create a new family node with yourself as the primary founder and root historian.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-start gap-2">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Family Card Details */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-10 h-10 rounded-xl bg-ancestral-500/10 flex items-center justify-center text-ancestral-600">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-ancestral-900">Family Identity</h3>
                <p className="text-xs text-neutral-400 font-light">Set up the name, surname, and origin of this lineage</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Family Name (e.g. The Smith Legacy)
                </label>
                <input
                  {...register('name')}
                  type="text"
                  placeholder="The Smith Family"
                  className={`w-full px-4 py-3.5 bg-white/70 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm ${
                    errors.name ? 'border-red-300 bg-red-50/20' : 'border-neutral-200'
                  }`}
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Family Surname
                </label>
                <input
                  {...register('surname')}
                  type="text"
                  placeholder="Smith"
                  className={`w-full px-4 py-3.5 bg-white/70 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm ${
                    errors.surname ? 'border-red-300 bg-red-50/20' : 'border-neutral-200'
                  }`}
                />
                {errors.surname && <p className="text-xs text-red-600">{errors.surname.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Origin Village / City / Town
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <MapPin className="w-5 h-5" />
                  </span>
                  <input
                    {...register('originVillageCity')}
                    type="text"
                    placeholder="e.g. Galway, Ireland"
                    className="w-full pl-12 pr-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Short Family Description / Motto
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Describe your family's history, traits, or ancestral focus..."
                  className="w-full px-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Personal Profile Details */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
              <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg text-ancestral-900">Founder Profile</h3>
                <p className="text-xs text-neutral-400 font-light">Fill out your profile profile details to establish the first tree node</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Your Full Name
                </label>
                <input
                  {...register('founderProfile.fullName')}
                  type="text"
                  placeholder="John Smith"
                  className={`w-full px-4 py-3.5 bg-white/70 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm ${
                    errors.founderProfile?.fullName ? 'border-red-300 bg-red-50/20' : 'border-neutral-200'
                  }`}
                />
                {errors.founderProfile?.fullName && <p className="text-xs text-red-600">{errors.founderProfile.fullName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Nickname / Call Sign
                </label>
                <input
                  {...register('founderProfile.nickname')}
                  type="text"
                  placeholder="Johnny"
                  className="w-full px-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Date of Birth
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <input
                    {...register('founderProfile.dob')}
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm text-neutral-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('founderProfile.gender')}
                    className={`w-full px-4 py-3.5 bg-white/70 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm ${
                      errors.founderProfile?.gender ? 'border-red-300 bg-red-50/20' : 'border-neutral-200'
                    }`}
                  >
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.founderProfile?.gender && <p className="text-xs text-red-600">{errors.founderProfile.gender.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                    Blood Group
                  </label>
                  <select
                    {...register('founderProfile.bloodGroup')}
                    className="w-full px-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm text-neutral-500"
                  >
                    <option value="">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('founderProfile.phone')}
                    type="tel"
                    placeholder="+1 555-0199"
                    className={`w-full px-4 py-3.5 bg-white/70 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm ${
                      errors.founderProfile?.phone ? 'border-red-300 bg-red-50/20' : 'border-neutral-200'
                    }`}
                  />
                  {errors.founderProfile?.phone && <p className="text-xs text-red-600">{errors.founderProfile.phone.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Birth Country / City
                </label>
                <input
                  {...register('founderProfile.birthPlace')}
                  type="text"
                  placeholder="e.g. Galway, Ireland"
                  className="w-full px-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Village / City of Birth
                </label>
                <input
                  {...register('founderProfile.birthVillageCity')}
                  type="text"
                  placeholder="e.g. Athenry"
                  className="w-full px-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Current Occupation
                </label>
                <input
                  {...register('founderProfile.occupation')}
                  type="text"
                  placeholder="e.g. Genealogist, Engineer"
                  className="w-full px-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Highest Education level
                </label>
                <input
                  {...register('founderProfile.education')}
                  type="text"
                  placeholder="e.g. B.Sc. History"
                  className="w-full px-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                  Personal Biography / About Me
                </label>
                <textarea
                  {...register('founderProfile.bio')}
                  rows={3}
                  placeholder="Write a brief description of your life, memories, or lineage contributions..."
                  className="w-full px-4 py-3.5 bg-white/70 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="px-8 py-3.5 forest-gradient hover:bg-ancestral-600 text-white font-medium rounded-2xl flex items-center gap-2 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-300"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Tree</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFamily;
