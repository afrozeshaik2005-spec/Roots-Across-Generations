import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow, Background,
  useNodesState, useEdgesState,
  useReactFlow, ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import api from '../../services/api.js';
import FamilyNode from './FamilyNode.jsx';
import FamilyEdge from './FamilyEdge.jsx';
import ProfileSidebar from './ProfileSidebar.jsx';
import AddRelativeModal from './AddRelativeModal.jsx';
import InviteModal from './InviteModal.jsx';
import SearchBar from '../search/SearchBar.jsx';
import NotificationBell from '../notifications/NotificationBell.jsx';
import RelativeCard from './RelativeCard.jsx';
import { computeLayout, buildEdges } from './treeLayout.js';
import ZoomSlider from './ZoomSlider.jsx';

export const FamilyTree = () => {
  return (
    <ReactFlowProvider>
      <FamilyTreeInner />
    </ReactFlowProvider>
  );
};

const FamilyTreeInner = () => {
  // useReactFlow() returns a NEW object every render (Zustand without selector).
  // Store API functions in refs so they are STABLE across renders.
  const reactFlow = useReactFlow();
  const fitViewRef = useRef(reactFlow.fitView);
  const zoomToRef = useRef(reactFlow.zoomTo);
  const getViewportRef = useRef(reactFlow.getViewport);

  // Keep refs in sync with latest React Flow API (runs AFTER render, before effects)
  useEffect(() => {
    fitViewRef.current = reactFlow.fitView;
    zoomToRef.current = reactFlow.zoomTo;
    getViewportRef.current = reactFlow.getViewport;
  });

  const { familyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const shareableLink = searchParams.get('shareableLink');
  const isLinkViewer = !!shareableLink && !user;

  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [compareSourceMember, setCompareSourceMember] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sourceId = searchParams.get('compareSourceId');
    const sourceName = searchParams.get('compareSourceName');
    if (sourceId && sourceName) {
      setCompareSourceMember({ id: sourceId, fullName: sourceName });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('compareSourceId');
      newParams.delete('compareSourceName');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [addingRelative, setAddingRelative] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const nodeTypes = useMemo(() => ({ familyNode: FamilyNode }), []);
  const edgeTypes = useMemo(() => ({ familyEdge: FamilyEdge }), []);

  // Fetch raw tree data (members + relationships) from backend
  const { data: treeData, isLoading, refetch, error: treeError } = useQuery({
    queryKey: ['familyTree', familyId, shareableLink],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (shareableLink) params.append('shareableLink', shareableLink);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/families/${familyId}/tree${qs}`);
      return response.data;
    },
    enabled: !!familyId
  });

  // Listen for real-time relationship updates via socket (authenticated users only)
  useEffect(() => {
    if (!socket || !familyId || isLinkViewer) return;

    const handleRelationshipUpdated = (payload) => {
      if (payload.familyId === familyId) {
        refetch();
      }
    };

    socket.on('relationship.updated', handleRelationshipUpdated);
    return () => socket.off('relationship.updated', handleRelationshipUpdated);
  }, [socket, familyId, refetch]);

  // Listen for contact request events via socket (authenticated users only)
  useEffect(() => {
    if (!socket || isLinkViewer) return;

    const handleContactRequestCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['contactRequests', 'received'] });
    };
    const handleContactRequestApproved = () => {
      queryClient.invalidateQueries({ queryKey: ['contactRequests'] });
      queryClient.invalidateQueries({ queryKey: ['contactRequestStatus'] });
    };
    const handleContactRequestRejected = () => {
      queryClient.invalidateQueries({ queryKey: ['contactRequests'] });
      queryClient.invalidateQueries({ queryKey: ['contactRequestStatus'] });
    };

    socket.on('contact.request.created', handleContactRequestCreated);
    socket.on('contact.request.approved', handleContactRequestApproved);
    socket.on('contact.request.rejected', handleContactRequestRejected);
    return () => {
      socket.off('contact.request.created', handleContactRequestCreated);
      socket.off('contact.request.approved', handleContactRequestApproved);
      socket.off('contact.request.rejected', handleContactRequestRejected);
    };
  }, [socket]);

  // Calculate roles from auth context
  const activeMembership = user?.memberships?.find(m => m.familyId === familyId);
  const isHistorian = activeMembership && ['FOUNDER', 'HISTORIAN'].includes(activeMembership.role);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Sync zoom state with React Flow viewport (READ-ONLY — never writes to viewport)
  // Uses refs so this interval is created ONCE and never recreated
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const viewport = getViewportRef.current();
        if (viewport && viewport.zoom !== undefined) {
          setZoom(prev => {
            const rounded = Math.round(viewport.zoom * 100) / 100;
            return prev === rounded ? prev : rounded;
          });
        }
      } catch {}
    }, 300);
    return () => clearInterval(timer);
  }, []); // EMPTY deps — uses refs, interval created once

  const handleZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
    zoomToRef.current(newZoom);
  }, []); // EMPTY deps — uses refs

  // Layout engine — runs ONLY when treeData changes (initial load + refetch with new data)
  // NO fitView, NO setViewport, NO getViewport in deps → no re-run on render
  const lastTreeDataRef = useRef(null);
  useEffect(() => {
    if (!treeData?.members || !treeData?.relationships) return;
    // Skip if this is the exact same data reference (React Query structural sharing)
    if (treeData === lastTreeDataRef.current) return;
    lastTreeDataRef.current = treeData;

    const { members, relationships } = treeData;

    // Compute positions using the Reingold-Tilford layout engine
    const { positions } = computeLayout(members, relationships);

    // Build React Flow node descriptors
    const rfNodes = members.map(m => ({
      id:       m.id,
      type:     'familyNode',
      position: positions[m.id] || { x: 0, y: 0 },
      data: {
        id:               m.id,
        fullName:         m.fullName,
        nickname:         m.nickname,
        profilePhoto:     m.profilePhoto,
        dob:              m.dob,
        deathDate:        m.deathDate,
        isLiving:         m.isLiving,
        email:            m.email,
        role:             m.role,
        generationNumber: m.generationNumber || 1
      }
    }));

    // Build React Flow edge descriptors (pass members for name lookup in hover labels)
    const rfEdges = buildEdges(relationships, positions, members);

    setNodes(rfNodes);
    setEdges(rfEdges);

    // One-time initial fitView after first data load — never re-trigger
    // Uses ref so it doesn't cause effect re-runs
    if (!lastTreeDataRef.current._initialFitDone) {
      lastTreeDataRef.current._initialFitDone = true;
      // Use setTimeout to ensure React Flow has rendered the nodes before fitting
      requestAnimationFrame(() => {
        fitViewRef.current({ padding: 0.15, duration: 0 });
      });
    }
  }, [treeData, setNodes, setEdges]); // NO fitView in deps

  const onNodeClick = useCallback((event, node) => {
    const targetId = node?.data?.id;
    if (!targetId) return;

    if (compareSourceMember) {
      const source = compareSourceMember;
      setCompareSourceMember(null);
      navigate(
        `/family/${familyId}/relationships?memberOneId=${source.id}&memberTwoId=${targetId}`
      );
    } else {
      setSelectedMemberId(targetId);
    }
  }, [compareSourceMember, familyId, navigate]);

  const handleResetView = useCallback(() => {
    fitViewRef.current({ duration: 500, padding: 0.15 });
  }, []); // EMPTY deps — uses ref

  const handleCloseSidebar = useCallback(() => setSelectedMemberId(null), []);

  const handleAddRelative = useCallback((relativeMetadata) => setAddingRelative(relativeMetadata), []);

  const handleStartCompare = useCallback((member) => {
    setCompareSourceMember({ id: member.id, fullName: member.fullName });
    setSelectedMemberId(null);
  }, []);

  const handleAddSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleEdgeMouseEnter = useCallback((edgeId) => {
    setHoveredEdgeId(edgeId);
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  // Annotate edges with hover state and reorder so hovered edge renders last (on top)
  const annotatedEdges = useMemo(() => {
    if (!edges.length) return edges;

    const result = edges.map(e => ({
      ...e,
      data: {
        ...e.data,
        isHovered: hoveredEdgeId === e.id,
        isDimmed: hoveredEdgeId !== null && hoveredEdgeId !== e.id,
        onEdgeMouseEnter: handleEdgeMouseEnter,
        onEdgeMouseLeave: handleEdgeMouseLeave
      }
    }));

    // Reorder: move hovered edge to end so SVG paints it on top
    if (hoveredEdgeId) {
      const hoveredIdx = result.findIndex(e => e.id === hoveredEdgeId);
      if (hoveredIdx > -1) {
        const [hovered] = result.splice(hoveredIdx, 1);
        result.push(hovered);
      }
    }

    return result;
  }, [edges, hoveredEdgeId, handleEdgeMouseEnter, handleEdgeMouseLeave]);

  // Find selected member data and relationship for link viewer overlay
  const selectedMemberData = useMemo(() => {
    if (!isLinkViewer || !selectedMemberId || !treeData?.members) return null;
    const member = treeData.members.find(m => m.id === selectedMemberId);
    if (!member) return null;

    // Find relationship type from relationships array
    let relationship = null;
    if (treeData.relationships) {
      const rel = treeData.relationships.find(
        r => r.personId === selectedMemberId || r.relatedPersonId === selectedMemberId
      );
      if (rel) {
        // Determine the label based on direction
        if (rel.personId === selectedMemberId) {
          relationship = rel.type; // This person IS the type (e.g., FATHER of someone)
        } else {
          // Reverse the relationship for the viewer's perspective
          const reverseMap = {
            FATHER: 'CHILD', MOTHER: 'CHILD',
            SON: 'PARENT', DAUGHTER: 'PARENT',
            HUSBAND: 'SPOUSE', WIFE: 'SPOUSE',
            BROTHER: 'SIBLING', SISTER: 'SIBLING',
            STEP_FATHER: 'STEP_CHILD', STEP_MOTHER: 'STEP_CHILD',
            STEP_SON: 'STEP_PARENT', STEP_DAUGHTER: 'STEP_PARENT',
          };
          relationship = reverseMap[rel.type] || rel.type;
        }
      }
    }

    return { member, relationship };
  }, [isLinkViewer, selectedMemberId, treeData]);

  return (
    <div className="h-screen w-screen flex flex-col bg-ancestral-50/50 font-sans relative overflow-hidden">
      {/* Top Bar Navigation */}
      <div className="h-14 border-b border-neutral-200/80 bg-white/70 backdrop-blur-md flex justify-between items-center px-6 relative z-30">
        <button
          onClick={() => {
            if (isLinkViewer) {
              navigate(-1);
            } else {
              navigate('/dashboard');
            }
          }}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-ancestral-800 transition duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isLinkViewer ? 'Back' : 'Dashboard'}</span>
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-ancestral-900 tracking-wide">
            {isLinkViewer ? 'Family Tree (View Only)' : 'Generational Tree'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {!isLinkViewer && <SearchBar familyId={familyId} />}
          {!isLinkViewer && <NotificationBell familyId={familyId} />}
          {!isLinkViewer && (
            <button
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-600 hover:bg-gold-550 text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition duration-200"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Relatives</span>
            </button>
          )}
          {!isLinkViewer && (
            <button
              onClick={() => navigate(`/family/${familyId}/contact-requests`)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-xl text-xs font-semibold shadow-sm transition duration-200"
            >
              <span>Contact Requests</span>
            </button>
          )}
          {!isLinkViewer && isHistorian && (
            <button
              onClick={() => navigate(`/family/${familyId}/admin`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow transition duration-200"
            >
              <span>Historian Admin</span>
            </button>
          )}
          {!isLinkViewer && (
            <button
              onClick={() => navigate(`/family/${familyId}/relationships`)}
              className="flex items-center gap-1.5 px-3 py-1.5 forest-gradient text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition duration-200"
            >
              <span>Relationship Explorer</span>
            </button>
          )}
          {!isLinkViewer && (
            <button
              onClick={() => navigate(`/family/${familyId}/messages`)}
              className="flex items-center gap-1.5 px-3 py-1.5 forest-gradient text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition duration-200"
            >
              <span>Family Chat</span>
            </button>
          )}
          {!isLinkViewer && (
            <button
              onClick={() => navigate(`/family/${familyId}/memories`)}
              className="flex items-center gap-1.5 px-3 py-1.5 forest-gradient text-white rounded-xl text-xs font-semibold shadow hover:shadow-md transition duration-200"
            >
              <span>Memories Vault</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-ancestral-500" />
          <p className="mt-4 text-xs text-neutral-500">Constructing interactive branches...</p>
        </div>
      ) : treeError ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <p className="text-sm text-neutral-600">Unable to load the family tree.</p>
          <p className="text-xs text-neutral-400">
            {treeError?.response?.status === 401
              ? 'This tree requires authentication. Please log in or use a valid share link.'
              : 'An error occurred while loading the tree.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 forest-gradient text-white text-xs font-semibold rounded-xl"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="flex-1 relative z-10">
          <ReactFlow
            nodes={nodes}
            edges={annotatedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            minZoom={0.1}
            maxZoom={2.5}
            nodesDraggable={true}
            nodesConnectable={false}
            onlyRenderVisibleElements={true}
          >
            <Background color="#cca05a" gap={24} size={1} className="opacity-15" />
          </ReactFlow>
          <ZoomSlider zoom={zoom} onZoomChange={handleZoomChange} onResetView={handleResetView} />
        </div>
      )}

      {/* Slide-out profile info (authenticated users only) */}
      {!isLinkViewer && (
        <AnimatePresence>
          {selectedMemberId && (
            <ProfileSidebar
              memberId={selectedMemberId}
              familyId={familyId}
              currentUserMemberId={user?.memberId}
              isHistorian={isHistorian}
              onClose={handleCloseSidebar}
              onAddRelative={handleAddRelative}
              onStartCompare={handleStartCompare}
              onRelationshipDeleted={handleAddSuccess}
            />
          )}
        </AnimatePresence>
      )}

      {/* Floating RelativeCard for link viewers */}
      {isLinkViewer && selectedMemberData && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40">
          <div className="relative">
            <RelativeCard
              member={selectedMemberData.member}
              relationship={selectedMemberData.relationship}
            />
            <button
              onClick={handleCloseSidebar}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center text-xs font-bold shadow transition"
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Comparison floating instruction banner */}
      {compareSourceMember && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-neutral-900 border border-neutral-800 text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-4 z-40 text-xs">
          <span>Comparing relationship with <strong>{compareSourceMember.fullName}</strong>. Select another member from the tree...</span>
          <button
            onClick={() => setCompareSourceMember(null)}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add Relative Modal */}
      {addingRelative && (
        <AddRelativeModal
          familyId={familyId}
          relative={addingRelative}
          onClose={() => setAddingRelative(null)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <InviteModal
          familyId={familyId}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </div>
  );
};

export default FamilyTree;
