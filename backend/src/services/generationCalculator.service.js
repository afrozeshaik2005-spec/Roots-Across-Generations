import prisma from '../config/database.js';

/**
 * Recalculates generation numbers for all family members relative to the founder (Gen 1).
 * Handles disconnected components by running BFS from local roots of unvisited nodes.
 * Saves calculated values directly to the database.
 * @param {string} familyId
 */
export const recalculateFamilyGenerations = async (familyId) => {
  if (!familyId) return;

  try {
    console.log(`[recalculateFamilyGenerations] Starting generation calculation for family: ${familyId}`);

    // 1. Find the Founder of this family
    const founderMembership = await prisma.familyMembership.findFirst({
      where: { familyId, role: 'FOUNDER' }
    });

    if (!founderMembership) {
      console.warn(`[recalculateFamilyGenerations] No FOUNDER found for family: ${familyId}. Skipping calculation.`);
      return;
    }

    const founderId = founderMembership.memberId;

    // 2. Fetch all members and relationships
    const memberships = await prisma.familyMembership.findMany({
      where: { familyId },
      select: { memberId: true }
    });
    const memberIds = memberships.map(m => m.memberId);

    const relationships = await prisma.relationship.findMany({
      where: { familyId }
    });

    // 3. Build adjacency list for traversal and find parents
    const adj = {};
    const parentsOf = {};
    const childrenOf = {};
    for (const mId of memberIds) {
      adj[mId] = [];
      parentsOf[mId] = [];
      childrenOf[mId] = [];
    }

    const spouseOf = {};
    for (const r of relationships) {
      const { personId, relatedPersonId, type } = r;

      if (!adj[personId] || !adj[relatedPersonId]) continue;

      if (['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD', 'GUARDIAN'].includes(type)) {
        adj[personId].push({ to: relatedPersonId, dir: 'DOWN' });
        adj[relatedPersonId].push({ to: personId, dir: 'UP' });
        parentsOf[relatedPersonId].push(personId);
        childrenOf[personId].push(relatedPersonId);
      } else if (['SPOUSE', 'HUSBAND', 'WIFE'].includes(type)) {
        adj[personId].push({ to: relatedPersonId, dir: 'SIDE' });
        adj[relatedPersonId].push({ to: personId, dir: 'SIDE' });
        spouseOf[personId] = relatedPersonId;
        spouseOf[relatedPersonId] = personId;
      }
    }

    const calculatedGen = {};
    const visited = new Set();

    // Helper BFS to traverse a component and assign generations (loop-safe standard BFS)
    const traverseComponent = (startNodeId, startGen) => {
      const queue = [[startNodeId, startGen]];
      calculatedGen[startNodeId] = startGen;
      visited.add(startNodeId);

      while (queue.length > 0) {
        const [currId, gen] = queue.shift();

        // Traverse children, parents & spouses
        for (const edge of adj[currId] || []) {
          if (!visited.has(edge.to)) {
            let nextGen = gen;
            if (edge.dir === 'DOWN') nextGen = gen + 1;
            else if (edge.dir === 'UP') nextGen = gen - 1;
            else if (edge.dir === 'SIDE') nextGen = gen;

            calculatedGen[edge.to] = nextGen;
            visited.add(edge.to);
            queue.push([edge.to, nextGen]);
          }
        }
      }
    };

    // 4. Run BFS starting from the Founder
    traverseComponent(founderId, 1);

    // 5. Traverse disconnected components
    for (const mId of memberIds) {
      if (!visited.has(mId)) {
        console.warn(`[recalculateFamilyGenerations] Node ${mId} is disconnected from founder. Resolving component layout...`);
        
        // Find local root in this disconnected component (nodes with no parents within the component)
        // Collect all nodes in this component first
        const componentNodes = [];
        const tempQueue = [mId];
        const tempVisited = new Set([mId]);
        while (tempQueue.length > 0) {
          const curr = tempQueue.shift();
          componentNodes.push(curr);
          for (const edge of adj[curr] || []) {
            if (!tempVisited.has(edge.to)) {
              tempVisited.add(edge.to);
              tempQueue.push(edge.to);
            }
          }
        }

        // Find the node in the component with no parents (or minimum parents)
        let localRoot = mId;
        for (const node of componentNodes) {
          const nodeParents = parentsOf[node] || [];
          const hasParentsInComponent = nodeParents.some(p => componentNodes.includes(p));
          if (!hasParentsInComponent) {
            localRoot = node;
            break;
          }
        }

        // Run BFS starting from this local root at Gen 1
        traverseComponent(localRoot, 1);
      }
    }

    // 6. Shift generation numbers so that the minimum generation in the family is 1
    // (This guarantees Venkata/root ancestors sit at Gen 1 (y=0) while keeping relative spacing)
    const genValues = Object.values(calculatedGen);
    if (genValues.length > 0) {
      const minGen = Math.min(...genValues);
      const shift = 1 - minGen;
      if (shift !== 0) {
        console.log(`[recalculateFamilyGenerations] Shifting all generations by ${shift} to make minimum generation = 1`);
        for (const mId of Object.keys(calculatedGen)) {
          calculatedGen[mId] = calculatedGen[mId] + shift;
        }
      }
    }

    // 7. Update database in a transaction
    console.log(`[recalculateFamilyGenerations] Saving generations to DB for family: ${familyId}...`);
    await prisma.$transaction(
      memberIds.map(mId => {
        const gen = calculatedGen[mId] !== undefined ? calculatedGen[mId] : 1;
        return prisma.familyMember.update({
          where: { id: mId },
          data: { generationNumber: gen }
        });
      })
    );

    console.log(`[recalculateFamilyGenerations] Generation calculation complete for family: ${familyId}`);
  } catch (err) {
    console.error(`[recalculateFamilyGenerations] Failed to recalculate generations for family ${familyId}:`, err);
  }
};
