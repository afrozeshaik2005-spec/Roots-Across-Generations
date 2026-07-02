import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Camera, Image, Film, FileText, BookOpen, Upload, Inbox } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import MemoryCard from './MemoryCard.jsx';
import MemoryUploadModal from './MemoryUploadModal.jsx';
import MemoryDetailPage from './MemoryDetailPage.jsx';

export const MemoriesPage = () => {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('PHOTO'); // PHOTO, VIDEO, DOCUMENT, STORY
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);

  // 1. Fetch family memories list
  const { data: memories = [], isLoading, refetch } = useQuery({
    queryKey: ['familyMemories', familyId],
    queryFn: async () => {
      const response = await api.get(`/memories/family/${familyId}`);
      return response.data?.memories || [];
    },
    enabled: !!familyId
  });

  // 2. Fetch family members list (to tag them in upload modal)
  const { data: treeData } = useQuery({
    queryKey: ['familyTree', familyId],
    queryFn: async () => {
      const response = await api.get(`/families/${familyId}/tree`);
      return response.data;
    },
    enabled: !!familyId
  });

  const members = treeData?.members || [];

  // Filter memories matching active tab
  const filteredMemories = memories.filter(m => m.type === activeTab);

  const tabs = [
    { key: 'PHOTO', label: 'Photos', icon: Image },
    { key: 'VIDEO', label: 'Videos', icon: Film },
    { key: 'DOCUMENT', label: 'Documents', icon: FileText },
    { key: 'STORY', label: 'Stories', icon: BookOpen }
  ];

  return (
    <div className="min-h-screen bg-ancestral-50/50 py-12 px-6 md:px-12 font-sans relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ancestral-100/30 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-50/20 blur-3xl"></div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        {/* Navigation header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/family/${familyId}/tree`)}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tree</span>
          </button>
          
          <button
            onClick={() => setUploadOpen(true)}
            className="px-4 py-2.5 forest-gradient hover:bg-ancestral-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Memory</span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ancestral-600">
            <Camera className="w-5 h-5" />
            <h1 className="text-3xl font-display font-bold text-ancestral-900">
              Archival Vault
            </h1>
          </div>
          <p className="text-sm text-neutral-500 font-light">
            Browse and log shared family photos, video clips, official document PDFs, and written stories.
          </p>
        </div>

        {/* Tabs navigation row */}
        <div className="flex border-b border-neutral-200 gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition duration-200 focus:outline-none ${
                  isActive
                    ? 'border-ancestral-600 text-ancestral-700'
                    : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Grid listing */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-ancestral-500" />
            <p className="mt-4 text-xs text-neutral-500">Unlocking vault contents...</p>
          </div>
        ) : filteredMemories.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMemories.map((mem) => (
              <MemoryCard
                key={mem.id}
                memory={mem}
                onClick={() => setSelectedMemory(mem)}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-16 rounded-3xl text-center max-w-md mx-auto space-y-4">
            <div className="inline-flex w-12 h-12 rounded-xl bg-ancestral-500/10 text-ancestral-600 items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-neutral-800 font-display">Archival Category Empty</h3>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              No items logged in this category. Click "Upload Memory" to register files in the vault.
            </p>
          </div>
        )}
      </div>

      {/* Upload memory modal */}
      {uploadOpen && (
        <MemoryUploadModal
          familyId={familyId}
          members={members}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Detail viewer modal */}
      <AnimatePresence>
        {selectedMemory && (
          <MemoryDetailPage
            memory={selectedMemory}
            currentUserMemberId={user?.memberId}
            isHistorian={user?.memberships?.some(m => m.familyId === familyId && ['FOUNDER', 'HISTORIAN'].includes(m.role))}
            onClose={() => setSelectedMemory(null)}
            onDeleteSuccess={() => refetch()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemoriesPage;
