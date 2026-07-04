import { useCallback, useState, memo } from 'react';
import {
  getStraightPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from '@xyflow/react';

const TYPE_LABELS = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  HUSBAND: 'Husband',
  WIFE: 'Wife',
  SPOUSE: 'Spouse',
  STEP_FATHER: 'Step-Father',
  STEP_MOTHER: 'Step-Mother',
  ADOPTED_CHILD: 'Adoptive Parent',
  GUARDIAN: 'Guardian',
  BROTHER: 'Brother',
  SISTER: 'Sister',
  GRANDFATHER: 'Grandfather',
  GRANDMOTHER: 'Grandmother',
  UNCLE: 'Uncle',
  AUNT: 'Aunt',
  COUSIN: 'Cousin',
  NEPHEW: 'Nephew',
  NIECE: 'Niece'
};

export const TYPE_STYLES = {
  FATHER:        { color: '#2D5016', dash: 'solid',  strokeWidth: 2 },
  MOTHER:        { color: '#2D5016', dash: 'solid',  strokeWidth: 2 },
  HUSBAND:       { color: '#CCA05A', dash: 'solid',  strokeWidth: 4 },
  WIFE:          { color: '#CCA05A', dash: 'solid',  strokeWidth: 4 },
  SPOUSE:        { color: '#CCA05A', dash: 'solid',  strokeWidth: 4 },
  BROTHER:       { color: '#06B6D4', dash: 'dashed', strokeWidth: 2 },
  SISTER:        { color: '#06B6D4', dash: 'dashed', strokeWidth: 2 },
  STEP_FATHER:   { color: '#8B5CF6', dash: 'dashed', strokeWidth: 2 },
  STEP_MOTHER:   { color: '#8B5CF6', dash: 'dashed', strokeWidth: 2 },
  ADOPTED_CHILD: { color: '#F97316', dash: 'dotted', strokeWidth: 2 },
  GUARDIAN:      { color: '#14B8A6', dash: 'dotted', strokeWidth: 2 },
  GRANDFATHER:   { color: '#065f46', dash: 'solid',  strokeWidth: 2 },
  GRANDMOTHER:   { color: '#065f46', dash: 'solid',  strokeWidth: 2 },
  UNCLE:         { color: '#7c3aed', dash: 'solid',  strokeWidth: 2 },
  AUNT:          { color: '#7c3aed', dash: 'solid',  strokeWidth: 2 },
  COUSIN:        { color: '#0891b2', dash: 'solid',  strokeWidth: 2 },
  NEPHEW:        { color: '#be185d', dash: 'solid',  strokeWidth: 2 },
  NIECE:         { color: '#be185d', dash: 'solid',  strokeWidth: 2 }
};

const getStrokeDasharray = (dash) => {
  if (dash === 'dashed') return '6,3';
  if (dash === 'dotted') return '2,4';
  return undefined;
};

export const FamilyEdge = ({
  id,
  source,
  target,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data,
  style = {}
}) => {
  const isHovered = data?.isHovered ?? false;
  const isDimmed = data?.isDimmed ?? false;
  const onEdgeMouseEnter = data?.onEdgeMouseEnter;
  const onEdgeMouseLeave = data?.onEdgeMouseLeave;
  const onEdgeClick = data?.onEdgeClick;

  const [isTraversing, setIsTraversing] = useState(false);

  const isSpouse = ['HUSBAND', 'WIFE', 'SPOUSE'].includes(data?.type);
  const edgeStyle = TYPE_STYLES[data?.type] || TYPE_STYLES.FATHER;

  const [edgePath, labelX, labelY] = isSpouse
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getSmoothStepPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        borderRadius: 16
      });

  const buildLabel = useCallback(() => {
    if (!data?.type) return '';
    const sourceName = data.sourceName || 'Unknown';
    const targetName = data.targetName || 'Unknown';
    const relLabel = TYPE_LABELS[data.type] || data.type;
    return `${sourceName} is the ${relLabel} of ${targetName}`;
  }, [data?.type, data?.sourceName, data?.targetName]);

  const handleMouseEnter = useCallback(() => {
    if (onEdgeMouseEnter) onEdgeMouseEnter(id);
  }, [onEdgeMouseEnter, id]);

  const handleMouseLeave = useCallback(() => {
    if (onEdgeMouseLeave) onEdgeMouseLeave();
  }, [onEdgeMouseLeave]);

  const handleClick = useCallback(() => {
    if (onEdgeClick && source && target) {
      onEdgeClick(source, target);
      setIsTraversing(true);
      setTimeout(() => setIsTraversing(false), 1500);
    }
  }, [onEdgeClick, source, target]);

  // Compute visual styles based on hover state
  const baseWidth = edgeStyle.strokeWidth;
  const visualWidth = isHovered || isTraversing ? baseWidth + 3 : baseWidth;
  const visualOpacity = isDimmed ? 0.2 : 1;
  const glowFilter = isHovered || isTraversing ? 'drop-shadow(0 0 6px rgba(201,168,76,0.5))' : 'none';
  const strokeColor = isTraversing ? '#c9a84c' : edgeStyle.color;

  return (
    <>
      {/* Invisible fat hit-area for hover + click detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />
      {/* Visible styled path */}
      <path
        d={edgePath}
        fill="none"
        style={{
          stroke: strokeColor,
          strokeWidth: visualWidth,
          strokeDasharray: getStrokeDasharray(edgeStyle.dash),
          pointerEvents: 'none',
          opacity: visualOpacity,
          filter: glowFilter,
          transition: 'opacity 150ms ease, stroke-width 150ms ease, filter 150ms ease, stroke 300ms ease'
        }}
      />

      {/* Floating label pill on hover */}
      {isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              zIndex: 1000
            }}
            className="px-3 py-1.5 bg-white border border-ancestral-200 text-ancestral-800 text-[10px] font-semibold rounded-full shadow-lg whitespace-nowrap"
          >
            {buildLabel()}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(FamilyEdge);
