import { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SearchBar = ({ familyId, placeholder = 'Search members...' }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/family/${familyId}/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs font-sans">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 border border-neutral-200 focus:border-ancestral-300 rounded-xl focus:outline-none text-xs bg-neutral-50/50 focus:bg-white transition duration-200"
      />
      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
    </form>
  );
};

export default SearchBar;
