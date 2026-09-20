const OUTCOME_MAP = {
  ELIGIBLE: {
    label: 'Eligible',
    cls: 'bg-green-100 text-green-800 border border-green-200',
    dot: 'bg-green-500',
  },
  POTENTIALLY_ELIGIBLE: {
    label: 'Potentially Eligible',
    cls: 'bg-amber-100 text-amber-800 border border-amber-200',
    dot: 'bg-amber-500',
  },
  NOT_ELIGIBLE: {
    label: 'Not Eligible',
    cls: 'bg-red-100 text-red-800 border border-red-200',
    dot: 'bg-red-500',
  },
};

export default function EligibilityBadge({ outcome, size = 'sm' }) {
  const map = OUTCOME_MAP[outcome] || {
    label: outcome || 'Unknown',
    cls: 'bg-gray-100 text-gray-700 border border-gray-200',
    dot: 'bg-gray-400',
  };
  const textSize = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${map.cls} ${textSize}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}
