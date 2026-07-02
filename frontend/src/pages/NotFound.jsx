import { useNavigate } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen bg-ancestral-50/50 flex flex-col items-center justify-center font-sans p-6 text-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-md relative z-10 space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-ancestral-500/10 text-ancestral-750 flex items-center justify-center mx-auto shadow-sm">
          <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-display font-extrabold text-ancestral-900 tracking-tight">404</h1>
          <h2 className="text-xl font-bold text-neutral-800">Lost Generation Branch</h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-xs mx-auto">
            The page branch you are attempting to trace does not exist in this database hierarchy.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 forest-gradient text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow hover:shadow-md transition mx-auto"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};

export default NotFound;
