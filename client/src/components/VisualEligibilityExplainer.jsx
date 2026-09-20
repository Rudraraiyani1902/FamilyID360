export default function VisualEligibilityExplainer({ result }) {
  if (!result) return null;

  const satisfied = result.satisfiedRules || [];
  const failed = result.failedConditions || [];
  const missing = result.missingConditions || [];
  const docs = result.missingDocuments || [];

  const formatFieldName = (fieldName) => {
    if (!fieldName) return 'Requirement';
    if (fieldName === 'annualIncome') return 'Family Annual Income';
    if (fieldName.includes('age')) return 'Beneficiary Age';
    if (fieldName.includes('occupation')) return 'Member Occupation';
    if (fieldName.includes('gender')) return 'Member Gender';
    return fieldName.replace(/^member\./, '').replace(/_/g, ' ');
  };

  const formatActual = (rule) => {
    if (rule.fieldName === 'annualIncome') {
      const val = rule.values?.[0];
      return val !== undefined ? `₹${Number(val).toLocaleString('en-IN')}` : 'Not Specified';
    }
    if (rule.values && rule.values.length > 0) {
      return rule.values.join(', ') + (rule.fieldName?.includes('age') ? ' years' : '');
    }
    return 'Present in household';
  };

  const formatRequired = (rule) => {
    const opSymbol =
      rule.operator === 'less_than_or_equal' ? '≤ ' :
      rule.operator === 'greater_than_or_equal' ? '≥ ' :
      rule.operator === 'equals' ? '= ' :
      rule.operator === 'less_than' ? '< ' :
      rule.operator === 'greater_than' ? '> ' : '';

    if (rule.fieldName === 'annualIncome') {
      return `Required: ${opSymbol}₹${Number(rule.expectedValue).toLocaleString('en-IN')}`;
    }
    if (rule.fieldName?.includes('age')) {
      return `Required: ${opSymbol}${rule.expectedValue} years`;
    }
    return `Required: ${opSymbol}${rule.expectedValue}`;
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          <span>🔍</span>
          <span>Deterministic Eligibility Evaluation Breakdown</span>
        </h4>
        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200">
          Rule-Based Engine
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Satisfied Rules */}
        {satisfied.map((rule, idx) => (
          <div
            key={`sat-${idx}`}
            className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col items-center text-center space-y-1 text-xs shadow-xs"
          >
            <span className="font-bold text-gray-800">{formatFieldName(rule.fieldName)}</span>
            <span className="font-mono text-emerald-900 font-semibold">{formatActual(rule)}</span>
            <span className="text-emerald-400 font-bold text-sm leading-none">↓</span>
            <span className="text-gray-600">{formatRequired(rule)}</span>
            <span className="text-emerald-400 font-bold text-sm leading-none">↓</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
              ✓ Condition satisfied
            </span>
          </div>
        ))}

        {/* Failed Conditions */}
        {failed.map((rule, idx) => (
          <div
            key={`fail-${idx}`}
            className="p-3 rounded-xl border border-red-200 bg-red-50/60 flex flex-col items-center text-center space-y-1 text-xs shadow-xs"
          >
            <span className="font-bold text-gray-800">{formatFieldName(rule.fieldName)}</span>
            <span className="font-mono text-red-900 font-semibold">{formatActual(rule)}</span>
            <span className="text-red-400 font-bold text-sm leading-none">↓</span>
            <span className="text-gray-600">{formatRequired(rule)}</span>
            <span className="text-red-400 font-bold text-sm leading-none">↓</span>
            <span className="inline-flex items-center gap-1 font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full text-[11px]">
              ✕ Condition not satisfied
            </span>
          </div>
        ))}

        {/* Missing Conditions */}
        {missing.map((rule, idx) => (
          <div
            key={`miss-${idx}`}
            className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col items-center text-center space-y-1 text-xs shadow-xs"
          >
            <span className="font-bold text-gray-800">{formatFieldName(rule.fieldName)}</span>
            <span className="font-mono text-amber-900">Missing in Registry</span>
            <span className="text-amber-400 font-bold text-sm leading-none">↓</span>
            <span className="text-gray-600">{formatRequired(rule)}</span>
            <span className="text-amber-400 font-bold text-sm leading-none">↓</span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
              ⚠ Missing information
            </span>
          </div>
        ))}

        {/* Missing Documents */}
        {docs.map((doc, idx) => {
          const docName = (doc.documentType || doc).replace(/_/g, ' ');
          return (
            <div
              key={`doc-${idx}`}
              className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col items-center text-center space-y-1 text-xs shadow-xs"
            >
              <span className="font-bold text-gray-800">Required Document</span>
              <span className="font-semibold text-gray-700 capitalize">{docName}</span>
              <span className="text-amber-400 font-bold text-sm leading-none">↓</span>
              <span className="text-gray-600">State Verification File</span>
              <span className="text-amber-400 font-bold text-sm leading-none">↓</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
                ⚠ Missing (Upload needed)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
