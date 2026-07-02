import prisma from '../config/database.js';

const inferGender = async (memberId) => {
  // First: check if gender is explicitly set on the member record
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { gender: true }
  });
  if (member?.gender === 'M') return 'M';
  if (member?.gender === 'F') return 'F';
  if (member?.gender === 'Other') return 'O';

  // Fallback: infer gender from relationship graph
  // Male indicators (subject-based):
  // - Subject of FATHER, STEP_FATHER, HUSBAND, BROTHER
  //   (personId IS the father/husband/brother)
  // - Object of WIFE: the wife relationship goes FROM wife TO husband,
  //   so the object (relatedPersonId) of a WIFE relationship is the husband (male)
  const maleRel = await prisma.relationship.findFirst({
    where: {
      OR: [
        { personId: memberId, type: { in: ['FATHER', 'STEP_FATHER', 'HUSBAND', 'BROTHER'] } },
        { relatedPersonId: memberId, type: 'WIFE' }
      ]
    }
  });
  if (maleRel) return 'M';

  // Female indicators (subject-based):
  // - Subject of MOTHER, STEP_MOTHER, WIFE, SISTER
  //   (personId IS the mother/wife/sister)
  // - Object of HUSBAND: the husband relationship goes FROM husband TO wife,
  //   so the object (relatedPersonId) of a HUSBAND relationship is the wife (female)
  const femaleRel = await prisma.relationship.findFirst({
    where: {
      OR: [
        { personId: memberId, type: { in: ['MOTHER', 'STEP_MOTHER', 'WIFE', 'SISTER'] } },
        { relatedPersonId: memberId, type: 'HUSBAND' }
      ]
    }
  });
  if (femaleRel) return 'F';

  return 'O'; // Other/Unknown
};

const resolvePathToRelationship = (path, targetMember, targetGender) => {
  if (path.length === 0) return 'Self';

  // Join direction path to string pattern: e.g. "UP-DOWN"
  const pattern = path.map(edge => edge.dir).join('-');

  switch (pattern) {
    case 'UP': {
      const type = path[0].type;
      if (type === 'STEP_FATHER') return 'Step Father';
      if (type === 'STEP_MOTHER') return 'Step Mother';
      if (type === 'ADOPTED_CHILD') return targetGender === 'M' ? 'Adoptive Father' : targetGender === 'F' ? 'Adoptive Mother' : 'Adoptive Parent';
      if (type === 'GUARDIAN') return 'Guardian';
      return targetGender === 'M' ? 'Father' : targetGender === 'F' ? 'Mother' : 'Parent';
    }
    case 'DOWN': {
      const type = path[0].type;
      if (type === 'ADOPTED_CHILD') return targetGender === 'M' ? 'Adopted Son' : targetGender === 'F' ? 'Adopted Daughter' : 'Adopted Child';
      if (type === 'GUARDIAN') return 'Ward';
      if (type === 'STEP_FATHER' || type === 'STEP_MOTHER') return targetGender === 'M' ? 'Step Son' : targetGender === 'F' ? 'Step Daughter' : 'Step Child';
      return targetGender === 'M' ? 'Son' : targetGender === 'F' ? 'Daughter' : 'Child';
    }
    case 'SIDE': {
      return targetGender === 'M' ? 'Husband' : targetGender === 'F' ? 'Wife' : 'Spouse';
    }
    case 'UP-UP': {
      const parentType = path[0].type;
      if (parentType === 'FATHER') {
        return targetGender === 'M' ? 'Paternal Grandfather' : targetGender === 'F' ? 'Paternal Grandmother' : 'Paternal Grandparent';
      }
      if (parentType === 'MOTHER') {
        return targetGender === 'M' ? 'Maternal Grandfather' : targetGender === 'F' ? 'Maternal Grandmother' : 'Maternal Grandparent';
      }
      return targetGender === 'M' ? 'Grandfather' : targetGender === 'F' ? 'Grandmother' : 'Grandparent';
    }
    case 'UP-DOWN': {
      const p0Type = path[0].type;
      const p1Type = path[1].type;
      const isStep = ['STEP_FATHER', 'STEP_MOTHER'].includes(p0Type) || ['STEP_FATHER', 'STEP_MOTHER'].includes(p1Type);
      if (isStep) {
        return targetGender === 'M' ? 'Step Brother' : targetGender === 'F' ? 'Step Sister' : 'Step Sibling';
      }
      return targetGender === 'M' ? 'Brother' : targetGender === 'F' ? 'Sister' : 'Sibling';
    }
    case 'DOWN-DOWN': {
      return targetGender === 'M' ? 'Grandson' : targetGender === 'F' ? 'Granddaughter' : 'Grandchild';
    }
    case 'SIDE-UP': {
      return targetGender === 'M' ? 'Father-in-law' : targetGender === 'F' ? 'Mother-in-law' : 'Parent-in-law';
    }
    case 'SIDE-DOWN': {
      return 'Step-child';
    }
    case 'UP-UP-DOWN': {
      const parentType = path[0].type;
      if (parentType === 'FATHER') {
        return targetGender === 'M' ? 'Paternal Uncle' : targetGender === 'F' ? 'Paternal Aunt' : 'Paternal Aunt/Uncle';
      }
      if (parentType === 'MOTHER') {
        return targetGender === 'M' ? 'Maternal Uncle' : targetGender === 'F' ? 'Maternal Aunt' : 'Maternal Aunt/Uncle';
      }
      return targetGender === 'M' ? 'Uncle' : targetGender === 'F' ? 'Aunt' : 'Aunt/Uncle';
    }
    case 'UP-DOWN-DOWN': {
      return targetGender === 'M' ? 'Nephew' : targetGender === 'F' ? 'Niece' : 'Nibling';
    }
    case 'SIDE-UP-DOWN': {
      return targetGender === 'M' ? 'Brother-in-law' : targetGender === 'F' ? 'Sister-in-law' : 'Sibling-in-law';
    }
    case 'UP-DOWN-SIDE': {
      return targetGender === 'M' ? 'Brother-in-law' : targetGender === 'F' ? 'Sister-in-law' : 'Sibling-in-law';
    }
    case 'UP-UP-DOWN-DOWN': {
      const parentType = path[0].type;
      if (parentType === 'FATHER') {
        return 'Paternal Cousin';
      }
      if (parentType === 'MOTHER') {
        return 'Maternal Cousin';
      }
      return 'Cousin';
    }
    case 'UP-UP-UP': {
      return targetGender === 'M' ? 'Great-Grandfather' : targetGender === 'F' ? 'Great-Grandmother' : 'Great-Grandparent';
    }
    case 'DOWN-DOWN-DOWN': {
      return targetGender === 'M' ? 'Great-Grandson' : targetGender === 'F' ? 'Great-Granddaughter' : 'Great-Grandchild';
    }
    case 'UP-UP-UP-DOWN': {
      const p0Type = path[0].type;
      if (p0Type === 'FATHER') {
        return targetGender === 'M' ? 'Paternal Great-Uncle' : targetGender === 'F' ? 'Paternal Great-Aunt' : 'Paternal Great-Aunt/Uncle';
      }
      if (p0Type === 'MOTHER') {
        return targetGender === 'M' ? 'Maternal Great-Uncle' : targetGender === 'F' ? 'Maternal Great-Aunt' : 'Maternal Great-Aunt/Uncle';
      }
      return targetGender === 'M' ? 'Great-Uncle' : targetGender === 'F' ? 'Great-Aunt' : 'Great-Aunt/Uncle';
    }
    case 'UP-DOWN-DOWN-DOWN': {
      return targetGender === 'M' ? 'Grand-Nephew' : targetGender === 'F' ? 'Grand-Niece' : 'Grand-Nibling';
    }
    case 'UP-UP-DOWN-DOWN-DOWN': {
      return targetGender === 'M' ? 'First Cousin Once Removed' : targetGender === 'F' ? 'First Cousin Once Removed' : 'First Cousin Once Removed';
    }
    case 'UP-UP-UP-DOWN-DOWN': {
      return targetGender === 'M' ? 'First Cousin Once Removed' : targetGender === 'F' ? 'First Cousin Once Removed' : 'First Cousin Once Removed';
    }
    case 'UP-UP-UP-DOWN-DOWN-DOWN': {
      return 'Second Cousin';
    }
    case 'UP-DOWN-SIDE': {
      return targetGender === 'M' ? 'Brother-in-law' : targetGender === 'F' ? 'Sister-in-law' : 'Sibling-in-law';
    }
    case 'SIDE-DOWN': {
      return targetGender === 'M' ? 'Step Son' : targetGender === 'F' ? 'Step Daughter' : 'Step Child';
    }
    case 'DOWN-SIDE': {
      return targetGender === 'M' ? 'Son-in-law' : targetGender === 'F' ? 'Daughter-in-law' : 'Child-in-law';
    }
    default:
      return 'Relative';
  }
};

export const calculateRelationship = async (familyId, sourceId, targetId) => {
  if (!sourceId || !targetId) return '';
  if (sourceId === targetId) return 'Self';

  try {
    const relationships = await prisma.relationship.findMany({
      where: { familyId }
    });

    const memberships = await prisma.familyMembership.findMany({
      where: { familyId },
      include: { member: true }
    });

    const members = memberships.map(m => m.member);
    const targetMember = members.find(m => m.id === targetId);
    if (!targetMember) return 'External Member';

    const adj = {};
    for (const m of members) {
      adj[m.id] = [];
    }

    for (const r of relationships) {
      const { personId, relatedPersonId, type } = r;

      if (!adj[personId] || !adj[relatedPersonId]) continue;

      if (['FATHER', 'MOTHER', 'STEP_FATHER', 'STEP_MOTHER', 'ADOPTED_CHILD', 'GUARDIAN'].includes(type)) {
        // personId is parent, relatedPersonId is child
        adj[personId].push({ to: relatedPersonId, dir: 'DOWN', type });
        adj[relatedPersonId].push({ to: personId, dir: 'UP', type });
      } else if (['SPOUSE', 'HUSBAND', 'WIFE'].includes(type)) {
        adj[personId].push({ to: relatedPersonId, dir: 'SIDE', type });
        adj[relatedPersonId].push({ to: personId, dir: 'SIDE', type });
      }
    }

    // BFS Queue: [currentNodeId, currentPathList]
    const queue = [[sourceId, []]];
    const visited = new Set([sourceId]);

    while (queue.length > 0) {
      const [curr, path] = queue.shift();

      if (curr === targetId) {
        const targetGender = await inferGender(targetId);
        const label = resolvePathToRelationship(path, targetMember, targetGender);

        // Build readable relationship path nodes
        const pathNodes = [];
        const sourceMember = members.find(m => m.id === sourceId);
        pathNodes.push({ name: sourceMember ? sourceMember.fullName : 'Source' });

        let currentId = sourceId;
        for (const edge of path) {
          const nextId = edge.to;
          const nextMember = members.find(m => m.id === nextId);
          
          let stepLabel = 'Relative';
          const edgeType = edge.type;
          
          if (edge.dir === 'UP') {
            // Traversing UP: we went from child to parent; the edge type tells us how the parent is related
            stepLabel = edgeType === 'FATHER' ? 'Father'
              : edgeType === 'MOTHER' ? 'Mother'
              : edgeType === 'STEP_FATHER' ? 'Step Father'
              : edgeType === 'STEP_MOTHER' ? 'Step Mother'
              : edgeType === 'ADOPTED_CHILD' ? 'Adoptive Parent'
              : edgeType === 'GUARDIAN' ? 'Guardian'
              : 'Parent';
          } else if (edge.dir === 'DOWN') {
            // Traversing DOWN: we went from parent to child
            const childGender = await inferGender(nextId);
            const isStep = edgeType === 'STEP_FATHER' || edgeType === 'STEP_MOTHER';
            const isAdopted = edgeType === 'ADOPTED_CHILD';
            const isGuardian = edgeType === 'GUARDIAN';
            if (isStep) {
              stepLabel = childGender === 'M' ? 'Step Son' : childGender === 'F' ? 'Step Daughter' : 'Step Child';
            } else if (isAdopted) {
              stepLabel = childGender === 'M' ? 'Adopted Son' : childGender === 'F' ? 'Adopted Daughter' : 'Adopted Child';
            } else if (isGuardian) {
              stepLabel = 'Ward';
            } else {
              stepLabel = childGender === 'M' ? 'Son' : childGender === 'F' ? 'Daughter' : 'Child';
            }
          } else if (edge.dir === 'SIDE') {
            const spouseGender = await inferGender(nextId);
            stepLabel = spouseGender === 'M' ? 'Husband' : spouseGender === 'F' ? 'Wife' : 'Spouse';
          }
          
          pathNodes.push({ label: stepLabel });
          pathNodes.push({ name: nextMember ? nextMember.fullName : 'Relative' });
          currentId = nextId;
        }

        // Build natural language explanation
        let explanation = '';
        const sourceName = sourceMember ? sourceMember.fullName : 'you';
        const targetName = targetMember ? targetMember.fullName : 'relative';

        if (path.length === 1) {
          const relation = label.toLowerCase();
          explanation = `${targetName} is the ${relation} of ${sourceName}.`;
        } else if (path.length === 2) {
          const parentName = members.find(m => m.id === path[0].to)?.fullName || 'Parent';
          const parentRelation = path[0].dir === 'UP' ? (path[0].type === 'FATHER' ? 'father' : 'mother') : 'child';
          const grandRelation = path[1].dir === 'UP' ? (path[1].type === 'FATHER' ? 'father' : 'mother') : 'child';
          explanation = `${targetName} is your ${label.toLowerCase()} because they are the ${grandRelation} of ${parentName} (who is the ${parentRelation} of ${sourceName}).`;
        } else if (path.length === 3) {
          if (path[0].dir === 'UP' && path[1].dir === 'UP' && path[2].dir === 'DOWN') {
            const parentName = members.find(m => m.id === path[0].to)?.fullName || 'Parent';
            explanation = `${targetName} is your ${label.toLowerCase()} because they are the sibling of your parent ${parentName}.`;
          } else if (path[0].dir === 'SIDE' && path[1].dir === 'UP' && path[2].dir === 'DOWN') {
            const spouseName = members.find(m => m.id === path[0].to)?.fullName || 'Spouse';
            explanation = `${targetName} is your ${label.toLowerCase()} because they are the sibling of your spouse ${spouseName}.`;
          } else {
            explanation = `${targetName} is your ${label.toLowerCase()} via intermediate relative.`;
          }
        } else if (path.length === 4) {
          if (path[0].dir === 'UP' && path[1].dir === 'UP' && path[2].dir === 'DOWN' && path[3].dir === 'DOWN') {
            const parentName = members.find(m => m.id === path[0].to)?.fullName || 'Parent';
            const uncleName = members.find(m => m.id === path[2].to)?.fullName || 'Relative';
            explanation = `${targetName} is your ${label.toLowerCase()} because their parent ${uncleName} is the sibling of your parent ${parentName}.`;
          } else {
            explanation = `${targetName} is your ${label.toLowerCase()} via intermediate lineage.`;
          }
        } else {
          explanation = `${targetName} is a relative of ${sourceName}.`;
        }

        return { label, path: pathNodes, explanation };
      }

      if (path.length >= 8) continue; // Bounded search limit

      for (const edge of adj[curr] || []) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push([edge.to, [...path, edge]]);
        }
      }
    }

    return { label: 'No Direct Connection Found', path: [], explanation: 'No direct path found.' };
  } catch (err) {
    console.error('Error calculating relationship:', err);
    return { label: 'Relative', path: [], explanation: 'Calculation error occurred.' };
  }
};
