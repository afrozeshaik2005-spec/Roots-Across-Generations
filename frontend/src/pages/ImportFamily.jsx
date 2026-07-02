import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Home, ArrowLeft, Loader2, Info, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const ImportFamily = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [importedSummary, setImportedSummary] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    originVillageCity: '',
    description: '',
    founderName: ''
  });
  const [file, setFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setImportedSummary(null);

    if (!formData.name || !formData.surname) {
      setError('Family name and surname are required');
      return;
    }
    if (!file) {
      setError('Please select an Excel or CSV file containing family tree data');
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('name', formData.name);
      data.append('surname', formData.surname);
      data.append('originVillageCity', formData.originVillageCity);
      data.append('description', formData.description);
      data.append('founderName', formData.founderName);

      const response = await api.post('/families/import', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data?.success) {
        try {
          const userRes = await api.get('/auth/me');
          if (userRes.data?.success) {
            setUser(userRes.data.user);
          }
        } catch (e) {
          console.error('Failed to refresh user after family import:', e);
        }
        setImportedSummary(response.data.summary);
      }
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to import family data. Verify sheet headers.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ancestral-50 py-12 px-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100 opacity-40 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50 opacity-30 blur-3xl"></div>

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        <button
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-ancestral-700 transition duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Onboarding</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-ancestral-900">
            Import Existing Family Tree
          </h1>
          <p className="text-neutral-500 font-light text-sm">
            Populate your family tree by uploading a spreadsheet. Format must match structural column templates.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-start gap-2">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {importedSummary ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 rounded-3xl space-y-6 text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-display font-bold text-ancestral-900">Import Complete!</h2>
            <p className="text-sm text-neutral-500 font-light max-w-md mx-auto">
              Your family tree has been imported successfully. Here is the summary of imported records:
            </p>
            
            <div className="max-w-xs mx-auto grid grid-cols-2 gap-4 py-4">
              <div className="bg-white/80 border border-neutral-100 p-4 rounded-2xl shadow-sm">
                <span className="text-2xl font-bold font-display text-ancestral-700">
                  {importedSummary.totalMembersImported}
                </span>
                <p className="text-xs text-neutral-400 font-light mt-1">Members Added</p>
              </div>
              <div className="bg-white/80 border border-neutral-100 p-4 rounded-2xl shadow-sm">
                <span className="text-2xl font-bold font-display text-gold-600">
                  {importedSummary.totalRelationshipsImported}
                </span>
                <p className="text-xs text-neutral-400 font-light mt-1">Relationships Linked</p>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 forest-gradient hover:bg-ancestral-600 text-white font-medium rounded-xl shadow-sm hover:shadow transition duration-200 text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-7 space-y-6">
              {/* Family Parameters */}
              <div className="glass-panel p-6 rounded-3xl space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
                  <div className="w-10 h-10 rounded-xl bg-ancestral-500/10 flex items-center justify-center text-ancestral-600">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base text-ancestral-900">Family Info</h3>
                    <p className="text-xs text-neutral-400 font-light">Details for creating the new tree</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                        Family Name
                      </label>
                      <input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        type="text"
                        placeholder="e.g. O'Connor Clan"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm bg-white/70"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                        Surname
                      </label>
                      <input
                        name="surname"
                        value={formData.surname}
                        onChange={handleInputChange}
                        type="text"
                        placeholder="e.g. O'Connor"
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm bg-white/70"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                      Your Full Name (Founding Historian)
                    </label>
                    <input
                      name="founderName"
                      value={formData.founderName}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="e.g. Sarah O'Connor"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm bg-white/70"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                      Origin Village / City
                    </label>
                    <input
                      name="originVillageCity"
                      value={formData.originVillageCity}
                      onChange={handleInputChange}
                      type="text"
                      placeholder="e.g. Kerry, Ireland"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm bg-white/70"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-ancestral-700 uppercase tracking-wider block">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Brief notes about the scope of this migration archive..."
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ancestral-500/20 focus:border-ancestral-500 transition duration-200 text-sm bg-white/70"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* File Dropzone & Template Guidelines */}
            <div className="md:col-span-5 space-y-6">
              <div className="glass-panel p-6 rounded-3xl space-y-6">
                <h3 className="font-display font-semibold text-base text-ancestral-900">Upload Spreadsheet</h3>
                
                {/* Drag n Drop area */}
                <div className="border-2 border-dashed border-neutral-200 hover:border-gold-300 rounded-2xl p-6 text-center cursor-pointer transition duration-200 bg-white/50 relative group">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-600">
                      <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </div>
                    {file ? (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-ancestral-800 break-all">{file.name}</p>
                        <p className="text-xs text-neutral-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-ancestral-800">Select file to import</p>
                        <p className="text-[11px] text-neutral-400 font-light">Supports .xlsx, .xls, and .csv formats</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Required Format</span>
                  </div>
                  <ul className="text-[11px] text-amber-700/90 font-light space-y-1 list-disc pl-4 leading-relaxed">
                    <li>Spreadsheet must contain two sheets named: <strong>Members</strong> and <strong>Relationships</strong>.</li>
                    <li><strong>Members</strong> sheet columns: <em>fullName (required)</em>, <em>nickname</em>, <em>dob</em>, <em>birthPlace</em>, <em>bloodGroup</em>, <em>occupation</em>, <em>phone</em>, <em>email</em>.</li>
                    <li><strong>Relationships</strong> sheet columns: <em>personName (required)</em>, <em>relatedPersonName (required)</em>, <em>type (FATHER/MOTHER/HUSBAND/WIFE)</em>.</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 forest-gradient hover:bg-ancestral-600 text-white font-medium rounded-xl shadow flex items-center justify-center gap-2 hover:shadow-md disabled:opacity-75 disabled:cursor-not-allowed transition duration-200 text-sm"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Import Tree</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ImportFamily;
