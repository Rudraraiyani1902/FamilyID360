import { Link } from 'react-router-dom';
import EligibilityBadge from './EligibilityBadge';
import { truncate } from '../utils/formatters';

export default function SchemeCard({ scheme, outcome, onApply }) {
  if (!scheme) return null;

  // Extract criteria and documents
  const rules = scheme.rules || [];
  const docs = scheme.documents || [];

  return (
    <div className="card-hover flex flex-col justify-between h-full group border border-gray-200 hover:border-primary-300 transition-all shadow-sm">
      <div className="space-y-3">
        {/* Header: Department + Scheme Code + Outcome Badge */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100">
            {scheme.department || 'Government of Gujarat'}
          </span>
          <div className="flex items-center gap-1.5">
            {outcome && <EligibilityBadge outcome={outcome} size="sm" />}
            <span className="text-[11px] font-mono font-medium text-gray-400">{scheme.code}</span>
          </div>
        </div>

        {/* Scheme Name */}
        <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors leading-snug">
          {scheme.name}
        </h3>

        {/* Short Description */}
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
          {truncate(scheme.description, 120)}
        </p>

        {/* Target Beneficiary */}
        {scheme.targetBeneficiary && (
          <div className="text-xs bg-gray-50 rounded-lg p-2 border border-gray-100">
            <span className="font-semibold text-gray-700">Target Beneficiary: </span>
            <span className="text-gray-600">{scheme.targetBeneficiary}</span>
          </div>
        )}

        {/* Key Entitlement / Benefit */}
        {scheme.benefit && (
          <div className="bg-primary-50/70 rounded-lg p-2.5 border border-primary-100/60">
            <span className="block text-[10px] font-bold text-primary-900 uppercase tracking-wider">
              Entitlement / Benefit
            </span>
            <span className="text-xs font-semibold text-primary-800 mt-0.5 block line-clamp-1">
              {scheme.benefit}
            </span>
          </div>
        )}

        {/* Important Eligibility Criteria */}
        {rules.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block">
              Key Criteria:
            </span>
            <ul className="space-y-1 text-xs text-gray-600">
              {rules.slice(0, 2).map((rule, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-primary-600 font-bold">•</span>
                  <span className="truncate">
                    {rule.fieldName === 'annualIncome'
                      ? `Annual Household Income ≤ ₹${(rule.value || 0).toLocaleString('en-IN')}`
                      : rule.fieldName === 'member.age'
                      ? `Member Age ${rule.operator === 'greater_than_or_equal' ? '≥' : '≤'} ${rule.value} yrs`
                      : rule.fieldName === 'member.occupation'
                      ? `Occupation: ${rule.value}`
                      : rule.fieldName === 'member.gender'
                      ? `Gender: ${rule.value}`
                      : `${rule.fieldName} ${rule.operator} ${rule.value}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Required Documents */}
        {docs.length > 0 && (
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block">
              Mandatory Documents ({docs.length}):
            </span>
            <div className="flex flex-wrap gap-1">
              {docs.slice(0, 3).map((doc, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded"
                >
                  📄 {doc.documentType.replace(/_/g, ' ')}
                </span>
              ))}
              {docs.length > 3 && (
                <span className="text-[10px] text-gray-400 self-center">
                  +{docs.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
        <Link
          to={`/schemes/${scheme.id || scheme.code}`}
          className="btn-secondary flex-1 justify-center text-xs py-2 hover:border-primary-300 hover:text-primary-700"
        >
          View Details →
        </Link>
        {onApply && (outcome === 'ELIGIBLE' || outcome === 'POTENTIALLY_ELIGIBLE') && (
          <button
            onClick={() => onApply(scheme)}
            className="btn-primary text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-700"
          >
            Apply
          </button>
        )}
      </div>
    </div>
  );
}
