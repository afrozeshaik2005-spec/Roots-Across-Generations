import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Search, Filter, RefreshCw, AlertCircle, X } from 'lucide-react';
import api from '../../services/api.js';
import SearchResultCard from './SearchResultCard.jsx';

export const SearchPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initial states derived from query parameters
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [generation, setGeneration] = useState(searchParams.get('generation') || '');
  const [village, setVillage] = useState(searchParams.get('village') || '');
  const [occupation, setOccupation] = useState(searchParams.get('occupation') || '');
  const [bloodGroup, setBloodGroup] = useState(searchParams.get('bloodGroup') || '');
  const [isDeceased, setIsDeceased] = useState(searchParams.get('isDeceased') || '');

  // Perform search query
  const { data: results = [], isLoading, refetch } = useQuery({
    queryKey: ['familySearch', familyId, q, generation, village, occupation, bloodGroup, isDeceased],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (generation) params.append('generation', generation);
      if (village) params.append('village', village);
      if (occupation) params.append('occupation', occupation);
      if (bloodGroup) params.append('bloodGroup', bloodGroup);
      if (isDeceased) params.append('isDeceased', isDeceased);

      const response = await api.get(`/families/${familyId}/search?${params.toString()}`);
      return response.data?.results || [];
    },
    enabled: !!familyId
  });

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    const params = {};
    if (q) params.q = q;
    if (generation) params.generation = generation;
    if (village) params.village = village;
    if (occupation) params.occupation = occupation;
    if (bloodGroup) params.bloodGroup = bloodGroup;
    if (isDeceased) params.isDeceased = isDeceased;
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setQ('');
    setGeneration('');
    setVillage('');
    setOccupation('');
    setBloodGroup('');
    setIsDeceased('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/family/${familyId}/tree`)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tree</span>
          </button>
          
          <button
            onClick={() => refetch()}
            className="p-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-500 rounded-xl transition duration-200"
            title="Refresh Search"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-600">
            <Search className="w-5 h-5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Search Directory
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Locate relatives and filter archives by lineage generation tiers, locations, or blood groups.
          </p>
        </div>

        {/* Search layout grid */}
        <div className="grid md:grid-cols-4 gap-8">
          {/* Left panel: Filters */}
          <div className="md:col-span-1">
            <form onSubmit={handleApplyFilters} className="glass-panel p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <Filter className="w-4.5 h-4.5" />
                  <span className="font-display font-bold text-sm">Filters</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-[10px] font-bold text-neutral-400 hover:text-red-500 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>

              {/* Text Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Name / Surname
                </label>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. Shaik"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white"
                />
              </div>

              {/* Generation dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Generation Tier
                </label>
                <select
                  value={generation}
                  onChange={(e) => setGeneration(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white text-neutral-500"
                >
                  <option value="">All Generations</option>
                  <option value="1">Gen 1 (Founder)</option>
                  <option value="2">Gen 2 (Children)</option>
                  <option value="3">Gen 3 (Grandchildren)</option>
                  <option value="4">Gen 4 (Great-grandchildren)</option>
                </select>
              </div>

              {/* Village / City */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Village / City
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Hyderabad"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white"
                />
              </div>

              {/* Occupation */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Occupation
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Engineer"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white"
                />
              </div>

              {/* Blood group dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none bg-white text-neutral-500"
                >
                  <option value="">Any Blood Group</option>
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

              {/* Deceased checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="deceasedCheckbox"
                  checked={isDeceased === 'true' || isDeceased === true}
                  onChange={(e) => setIsDeceased(e.target.checked ? 'true' : '')}
                  className="w-4 h-4 text-ancestral-500 border-neutral-300 rounded focus:ring-ancestral-400"
                />
                <label htmlFor="deceasedCheckbox" className="text-xs font-semibold text-neutral-700 select-none">
                  Show Deceased Only 🕊
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 forest-gradient text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition"
              >
                Apply Filters
              </button>
            </form>
          </div>

          {/* Right panel: Results */}
          <div className="md:col-span-3 space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
                <p className="mt-4 text-xs text-neutral-500">Searching records...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {results.map((result) => (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    familyId={familyId}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-panel p-16 rounded-3xl text-center max-w-md mx-auto space-y-4">
                <div className="inline-flex w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-100 items-center justify-center text-neutral-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-neutral-800 font-display">No Results Found</h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  No family members match your search criteria. Try modifying your filters or checking spelling.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
