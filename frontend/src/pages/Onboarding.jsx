import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Upload, Link as LinkIcon, LogOut, Loader2, X } from 'lucide-react';
import api from '../services/api.js';

export const Onboarding = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Join Family modal state
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinFamilyId, setJoinFamilyId] = useState('');
  const [joinError, setJoinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleJoinVerify = async () => {
    const id = joinFamilyId.trim();
    if (!id) {
      setJoinError('Please enter a Family ID');
      return;
    }
    setVerifying(true);
    setJoinError('');

    try {
      // Verify the family ID exists via getJoinInfo endpoint
      await api.get(`/families/join-info/${id}`);
      // If success, navigate to join form
      navigate(`/join/${id}`);
    } catch (err) {
      setJoinError('Family ID not found. Please check and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const options = [
    {
      id: 'myself',
      title: 'Start with Myself',
      tag: 'Recommended',
      description: 'Create a new family node with your profile as the root and build outwards.',
      icon: User,
      color: 'bg-ancestral-500 text-ancestral-50',
      action: () => navigate('/family/create')
    },
    {
      id: 'import',
      title: 'Import Family Data',
      description: 'Upload a structured CSV or Excel spreadsheet containing family records.',
      icon: Upload,
      color: 'bg-gold-500 text-white',
      action: () => navigate('/family/import')
    },
    {
      id: 'join',
      title: 'Join an Existing Family',
      description: 'Input a unique Family ID or scan a QR invitation code shared by a relative.',
      icon: LinkIcon,
      color: 'bg-neutral-800 text-white',
      action: () => setJoinModalOpen(true)
    }
  ];

  return (
    <div className="min-h-screen bg-ancestral-50 flex flex-col relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100 opacity-40 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50 opacity-30 blur-3xl"></div>

      {/* Header */}
      <header className="w-full py-4 px-6 md:px-12 flex justify-between items-center border-b border-neutral-100 bg-white/40 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🕊</span>
          <span className="font-display font-bold tracking-wider text-ancestral-800">ROOTS</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 rounded-lg text-xs text-neutral-600 transition duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-3xl w-full text-center space-y-12">
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-display font-bold text-ancestral-900"
            >
              How would you like to start your family tree?
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-neutral-500 max-w-md mx-auto font-light text-sm md:text-base"
            >
              Select one of the options below to initialize your lineage. You can link multiple families later.
            </motion.p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {options.map((option, idx) => {
              const IconComp = option.icon;
              return (
                <motion.div
                  key={option.id}
                  onClick={option.action}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1, duration: 0.6 }}
                  whileHover={{ y: -6 }}
                  className="bg-white/80 border border-neutral-200 hover:border-gold-300 rounded-3xl p-6 shadow-sm hover:shadow-md cursor-pointer transition duration-300 relative flex flex-col justify-between group"
                >
                  {option.tag && (
                    <span className="absolute top-4 right-4 bg-ancestral-100 text-ancestral-700 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
                      {option.tag}
                    </span>
                  )}
                  
                  <div className="space-y-6">
                    <div className={`w-12 h-12 rounded-2xl ${option.color} flex items-center justify-center shadow-inner`}>
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-display font-semibold text-lg text-ancestral-900 group-hover:text-gold-600 transition duration-200">
                        {option.title}
                      </h3>
                      <p className="text-neutral-500 text-xs leading-relaxed font-light">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-end text-neutral-400 group-hover:text-gold-500 transition duration-200">
                    <span className="text-xs font-semibold mr-1">Get Started</span>
                    <span>&rarr;</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Join Family Modal — replaces browser window.prompt() */}
      {joinModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform scale-100 transition-transform">
            <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div>
                <h3 className="font-display font-bold text-lg text-ancestral-900">Join an Existing Family</h3>
                <p className="text-xs text-neutral-400 font-light mt-0.5">
                  Enter the unique Family ID shared by your relative
                </p>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="p-1.5 hover:bg-neutral-200/50 rounded-lg text-neutral-500 transition duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {joinError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {joinError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                  Family ID
                </label>
                <input
                  type="text"
                  value={joinFamilyId}
                  onChange={(e) => {
                    setJoinFamilyId(e.target.value);
                    setJoinError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinVerify();
                  }}
                  placeholder="e.g. SMITH-12345"
                  className="w-full px-4 py-3.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 text-sm bg-white"
                  autoFocus
                />
                <p className="text-[10px] text-neutral-400 font-light">
                  Ask a family member for this tree's unique ID
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setJoinModalOpen(false)}
                  className="px-5 py-2.5 border border-neutral-200 text-neutral-500 hover:bg-neutral-50 text-xs font-medium rounded-xl transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinVerify}
                  disabled={verifying || !joinFamilyId.trim()}
                  className="px-6 py-2.5 forest-gradient hover:bg-ancestral-600 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow transition duration-200 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {verifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Continue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
