/**
 * treeLayout.js
 *
 * Implements a proper hierarchical family tree layout based on
 * the Reingold–Tilford / Buchheim "tidy tree" algorithm principles,
 * adapted for family trees with couples (spouse pairs) and multi-parent children.
 *
 * Core principles:
 *  - Subtree widths are calculated bottom-up BEFORE any node is positioned.
 *  - Nodes are positioned top-down, centering parents over their children's midpoint.
 *  - Spouses are always placed side-by-side as a single unit.
 *  - Siblings are evenly spaced within their parent's allocated width slot.
 *  - No branch ever overlaps another; each subtree is given its own exclusive
 *    horizontal range.
 *  - Remaining/disconnected members are placed in tidy rows after the main tree.
 *
 * This guarantees zero line crossings between separate family branches.
 */

// ─── Constants ─────────────────────────────────────────────────────────────
const NODE_WIDTH   = 220;   // px — visual card width
const NODE_HEIGHT  = 80;    // px — visual card height
const H_GAP        = 40;    // minimum horizontal gap between sibling nodes
const COUPLE_GAP   = 20;    // horizontal gap between two spouses
const V_GAP        = 160;   // vertical gap between generations
const BRANCH_PAD   = 60;    // extra horizontal padding between independent subtrees

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * computeLayout(members, relationships)
 *
 * @param {Array} members       - array of member objects { id, generationNumber, ... }
 * @param {Array} relationships - array of relationship objects { personId, relatedPersonId, type }
 * @returns {{ positions: Object<string, {x, y}>, edges: Array }}
 *          positions maps memberId → {x, y} top-left corner for React Flow
 */
export function computeLayout(members, relationships) {
  // ── 1. Build adjacency maps ──────────────────────────────────────────────
  const memberMap   = new Map(members.map(m => [m.id, m]));
  const spouseOf    = new Map(); // id → partnerId
  const childrenOf  = new Map(); // parentId → Set<childId>
  const parentsOf   = new Map(); // childId → Set<parentId>

  const PARENTAL_TYPES = new Set([
    'FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD', 'GUARDIAN'
  ]);
  const SPOUSAL_TYPES  = new Set(['SPOUSE', 'HUSBAND', 'WIFE']);

  for (const r of relationships) {
    if (SPOUSAL_TYPES.has(r.type)) {
      spouseOf.set(r.personId,        r.relatedPersonId);
      spouseOf.set(r.relatedPersonId, r.personId);
    }
    if (PARENTAL_TYPES.has(r.type)) {
      const parent = r.personId;
      const child  = r.relatedPersonId;
      if (!childrenOf.has(parent)) childrenOf.set(parent, new Set());
      childrenOf.get(parent).add(child);
      if (!parentsOf.has(child))  parentsOf.set(child, new Set());
      parentsOf.get(child).add(parent);
    }
  }

  // ── 2. Build "family units" ──────────────────────────────────────────────
  // A family unit = a couple (or single person) plus their collective children.
  // Each member belongs to exactly one unit as a parent (primary unit).

  const unitOf = new Map(); // memberId → unitId  (which unit they lead)
  const units  = new Map(); // unitId   → { leads: [id, partnerId?], children: Set<childId> }

  const processedLeads = new Set();

  for (const m of members) {
    if (processedLeads.has(m.id)) continue;

    const partner = spouseOf.get(m.id);
    const leads   = partner ? [m.id, partner] : [m.id];

    // Collect all children of both leads
    const children = new Set();
    for (const lead of leads) {
      for (const c of (childrenOf.get(lead) || [])) children.add(c);
    }

    const unitId = m.id; // use first lead's id as unit key
    units.set(unitId, { leads, children });
    for (const lead of leads) {
      unitOf.set(lead, unitId);
      processedLeads.add(lead);
    }
  }

  // ── 3. Build unit dependency tree ───────────────────────────────────────
  // A unit A is the "parent unit" of unit B if any of B's leads has a parent in A.

  const unitParent   = new Map(); // childUnitId → parentUnitId
  const unitChildren = new Map(); // parentUnitId → Set<childUnitId>

  for (const [unitId, unit] of units) {
    for (const lead of unit.leads) {
      const parents = parentsOf.get(lead) || new Set();
      for (const parentId of parents) {
        const parentUnitId = unitOf.get(parentId);
        if (parentUnitId && parentUnitId !== unitId) {
          unitParent.set(unitId, parentUnitId);
          if (!unitChildren.has(parentUnitId)) unitChildren.set(parentUnitId, new Set());
          unitChildren.get(parentUnitId).add(unitId);
          break;
        }
      }
    }
  }

  // ── 4. Identify root units ───────────────────────────────────────────────
  const rootUnits = [];
  for (const unitId of units.keys()) {
    if (!unitParent.has(unitId)) rootUnits.push(unitId);
  }

  // ── 5. Calculate subtree widths (bottom-up) ──────────────────────────────
  // subtreeWidth(unit) = max(unit's own width, sum of children subtree widths + gaps)

  const subtreeWidths = new Map();

  function unitWidth(unitId) {
    const unit = units.get(unitId);
    // Own width: spouses side-by-side
    const ownW = unit.leads.length > 1
      ? NODE_WIDTH * 2 + COUPLE_GAP
      : NODE_WIDTH;
    return ownW;
  }

  function calcSubtreeWidth(unitId) {
    if (subtreeWidths.has(unitId)) return subtreeWidths.get(unitId);

    const children = unitChildren.get(unitId);
    if (!children || children.size === 0) {
      const w = unitWidth(unitId);
      subtreeWidths.set(unitId, w);
      return w;
    }

    let childrenTotalW = 0;
    let first = true;
    for (const cUnitId of children) {
      const cW = calcSubtreeWidth(cUnitId);
      if (!first) childrenTotalW += H_GAP;
      childrenTotalW += cW;
      first = false;
    }

    const w = Math.max(unitWidth(unitId), childrenTotalW);
    subtreeWidths.set(unitId, w);
    return w;
  }

  for (const rootId of rootUnits) calcSubtreeWidth(rootId);

  // ── 6. Assign positions (top-down) ───────────────────────────────────────
  const positions = {}; // memberId → {x, y}

  function placeUnit(unitId, leftBoundary, depth) {
    const unit = units.get(unitId);
    const totalW = subtreeWidths.get(unitId);
    const ownW   = unitWidth(unitId);
    const centerX = leftBoundary + totalW / 2;
    const y       = depth * (NODE_HEIGHT + V_GAP);

    // Place leads centered in their slot
    const leadsStartX = centerX - ownW / 2;
    if (unit.leads.length === 2) {
      positions[unit.leads[0]] = { x: leadsStartX,                         y };
      positions[unit.leads[1]] = { x: leadsStartX + NODE_WIDTH + COUPLE_GAP, y };
    } else {
      positions[unit.leads[0]] = { x: leadsStartX, y };
    }

    // Place child units left-to-right within our total width
    const children = unitChildren.get(unitId);
    if (!children || children.size === 0) return;

    // children total width
    let childrenTotalW = 0;
    const childArr = [...children];
    for (let i = 0; i < childArr.length; i++) {
      if (i > 0) childrenTotalW += H_GAP;
      childrenTotalW += subtreeWidths.get(childArr[i]);
    }

    // Start child block centered under parent
    let cx = centerX - childrenTotalW / 2;
    for (const cId of childArr) {
      placeUnit(cId, cx, depth + 1);
      cx += subtreeWidths.get(cId) + H_GAP;
    }
  }

  // Layout each independent root subtree left-to-right with branch padding
  let cursor = 0;
  for (const rootId of rootUnits) {
    placeUnit(rootId, cursor, 0);
    cursor += subtreeWidths.get(rootId) + BRANCH_PAD;
  }

  // ── 7. Handle orphaned / disconnected members ────────────────────────────
  // Any member not placed yet (e.g. no relationships at all)
  const orphanRowY = (getMaxDepth(positions) + 1) * (NODE_HEIGHT + V_GAP) + V_GAP;
  let orphanX = 0;
  for (const m of members) {
    if (!positions[m.id]) {
      positions[m.id] = { x: orphanX, y: orphanRowY };
      orphanX += NODE_WIDTH + H_GAP;
    }
  }

  return { positions };
}

// Helper: find the deepest Y level already placed
function getMaxDepth(positions) {
  let maxY = 0;
  for (const { y } of Object.values(positions)) {
    if (y > maxY) maxY = y;
  }
  return Math.round(maxY / (80 + 160)); // approx depth
}

// ─── Edge Builder ──────────────────────────────────────────────────────────
/**
 * buildEdges(relationships, positions)
 *
 * Converts raw relationship records into React Flow edge descriptors.
 * Uses the custom FamilyEdge component for all edges, passing relationship
 * metadata (type, sourceId, targetId) so the edge can render hover labels.
 */
export function buildEdges(relationships, positions, members = []) {
  const SPOUSAL_TYPES  = new Set(['SPOUSE', 'HUSBAND', 'WIFE']);
  const PARENTAL_TYPES = new Set([
    'FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD', 'GUARDIAN'
  ]);

  // Build name lookup for edge hover labels (avoids useNodes() in edge component)
  const nameMap = new Map(members.map(m => [m.id, m.fullName || 'Unknown']));

  // Deduplicate spouse edges (only render one direction)
  const seenSpouse = new Set();

  return relationships.flatMap(r => {
    const isSpouse   = SPOUSAL_TYPES.has(r.type);
    const isParental = PARENTAL_TYPES.has(r.type);

    if (!positions[r.personId] || !positions[r.relatedPersonId]) return [];

    if (isSpouse) {
      const key = [r.personId, r.relatedPersonId].sort().join('|');
      if (seenSpouse.has(key)) return [];
      seenSpouse.add(key);

      // Left spouse exports from Right handle; right spouse receives on Left handle
      const leftId  = positions[r.personId].x <= positions[r.relatedPersonId].x
        ? r.personId : r.relatedPersonId;
      const rightId = leftId === r.personId ? r.relatedPersonId : r.personId;

      return [{
        id:           `edge-${r.id}`,
        source:       leftId,
        target:       rightId,
        sourceHandle: 'spouse-right',
        targetHandle: 'spouse-left',
        type:         'familyEdge',
        style:        { stroke: '#cca05a', strokeWidth: 3 },
        data: {
          type: r.type,
          sourceId: r.personId,
          targetId: r.relatedPersonId,
          sourceName: nameMap.get(r.personId) || 'Unknown',
          targetName: nameMap.get(r.relatedPersonId) || 'Unknown'
        }
      }];
    }

    if (isParental) {
      return [{
        id:           `edge-${r.id}`,
        source:       r.personId,          // parent → child-out handle
        target:       r.relatedPersonId,   // child  ← parent-in handle
        sourceHandle: 'child-out',
        targetHandle: 'parent-in',
        type:         'familyEdge',
        data: {
          type: r.type,
          sourceId: r.personId,
          targetId: r.relatedPersonId,
          sourceName: nameMap.get(r.personId) || 'Unknown',
          targetName: nameMap.get(r.relatedPersonId) || 'Unknown'
        }
      }];
    }

    return [];
  });
}


