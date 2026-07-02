import { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@radix-ui/react-popover';
import { Info } from 'lucide-react';
import { TYPE_STYLES } from './FamilyEdge.jsx';

// Legend items derived from the single source of truth (TYPE_STYLES)
const LEGEND_ITEMS = [
  { type: 'FATHER',        label: 'Parent (Father/Mother)', dash: 'solid' },
  { type: 'HUSBAND',       label: 'Spouse (Husband/Wife)',  dash: 'solid' },
  { type: 'BROTHER',       label: 'Sibling',                dash: 'solid' },
  { type: 'STEP_FATHER',   label: 'Step Parent',            dash: 'dashed' },
  { type: 'ADOPTED_CHILD', label: 'Adopted Child',          dash: 'dotted' },
  { type: 'GUARDIAN',      label: 'Guardian',               dash: 'dotted' },
  { type: 'COUSIN',        label: 'Cousin',                 dash: 'solid' },
  { type: 'UNCLE',         label: 'Uncle/Aunt',             dash: 'solid' },
  { type: 'NEPHEW',        label: 'Nephew/Niece',           dash: 'solid' }
];

function LineSample({ color, dash, strokeWidth = 3 }) {
  const dashStyle = dash === 'dashed' ? '6,3' : dash === 'dotted' ? '2,4' : undefined;
  return (
    <svg width="40" height="6" className="mr-3 inline-block align-middle shrink-0">
      <line x1="0" y1="3" x2="40" y2="3" stroke={color} strokeWidth={strokeWidth} strokeDasharray={dashStyle} />
    </svg>
  );
}

export default function EdgeLegend() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-[11px] font-semibold text-ancestral-700 bg-ancestral-100/80 hover:bg-ancestral-200 rounded-lg px-3 py-1.5 shadow-sm transition duration-200">
          <Info className="w-3.5 h-3.5" /> Legend
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-80 bg-white border border-ancestral-200 rounded-2xl shadow-xl p-4">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">Relationship Legend</p>
        <ul className="space-y-2 text-sm text-ancestral-800">
          {LEGEND_ITEMS.map((item, i) => {
            const style = TYPE_STYLES[item.type];
            if (!style) return null;
            return (
              <li key={i} className="flex items-center gap-1">
                <LineSample color={style.color} dash={item.dash} strokeWidth={style.strokeWidth} />
                <span className="text-xs font-medium">{item.label}</span>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
