import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getScheme } from '../api/schemes.api';
import { getMySchemeEligibility } from '../api/eligibility.api';
import { createApplication } from '../api/applications.api';
import EligibilityBadge from '../components/EligibilityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import VisualEligibilityExplainer from '../components/VisualEligibilityExplainer';
import { useFamily } from '../context/FamilyContext';

export default function SchemeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { family } = useFamily();

  const [scheme, setScheme] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSchemeAndEligibility();
  }, [id]);

  const loadSchemeAndEligibility = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch scheme details
      const schemeRes = await getScheme(id);
      const schemeData = schemeRes.data?.data || schemeRes.data;
      setScheme(schemeData);

      // 2. Fetch authenticated family's eligibility for this scheme
      try {
        const elRes = await getMySchemeEligibility(id);
        const elResult = elRes.data?.result || elRes.data;
        setEligibility(elResult);
      } catch (elErr) {
        console.warn('Could not fetch family scheme eligibility:', elErr.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load welfare scheme details.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!scheme) return;
    setApplying(true);
    setError(null);
    try {
      const missing = (eligibility?.missingDocuments || []).map((d) => d.documentType || d);
      await createApplication({
        schemeId: scheme.id || scheme.code,
        missingDocuments: missing,
        benefit: scheme.benefit,
        remarks: `Direct application submitted from scheme details page for ${scheme.name}.`,
      });

      navigate('/applications', {
        state: { successMessage: `Application for "${scheme.name}" submitted successfully!` },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application.');
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Loading scheme information from state registry…</p>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="card text-center py-16 space-y-4 max-w-lg mx-auto">
        <div className="text-4xl text-gray-400">🏛️</div>
        <h2 className="text-xl font-bold text-gray-900">Scheme Not Found</h2>
        <p className="text-sm text-gray-500">The requested Gujarat government welfare scheme could not be located.</p>
        <Link to="/schemes" className="btn-primary inline-flex text-xs">
          ← Back to Schemes Registry
        </Link>
      </div>
    );
  }

  const rules = scheme.rules || [];
  const docs = scheme.documents || [];
  const outcome = eligibility?.outcome;
  const canApply = outcome === 'ELIGIBLE' || outcome === 'POTENTIALLY_ELIGIBLE';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/schemes" className="hover:text-primary-600 transition">Schemes</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{scheme.name}</span>
      </nav>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      {/* Header Banner */}
      <div className="card space-y-4 border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-200">
              {scheme.department || 'Government of Gujarat'}
            </span>
            <span className="font-mono text-xs text-gray-400">{scheme.code}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="badge-green">● Active State Scheme</span>
            {outcome && <EligibilityBadge outcome={outcome} size="md" />}
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
            {scheme.name}
          </h1>
          {scheme.targetBeneficiary && (
            <p className="text-sm text-gray-600 mt-1 font-medium">
              Target Beneficiary: <strong className="text-gray-900">{scheme.targetBeneficiary}</strong>
            </p>
          )}
        </div>

        <p className="text-sm text-gray-700 leading-relaxed pt-1">
          {scheme.description}
        </p>

        {/* Highlighted Key Benefit Box & Feature 4 Apply Now */}
        <div className="bg-gradient-to-r from-primary-50 to-indigo-50 p-5 rounded-xl border border-primary-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-primary-900 uppercase tracking-wider block">
              Entitlement & Financial Benefit
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-primary-800 mt-0.5 block">
              {scheme.benefit || 'Direct government entitlement'}
            </span>
          </div>

          {/* FEATURE 4 & 6: [Apply Now] button — ONLY show when backend allows application */}
          {canApply ? (
            <button
              onClick={handleApply}
              disabled={applying}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-3 px-6 font-bold shadow-md self-start sm:self-auto flex items-center gap-2"
            >
              {applying ? (
                <>
                  <LoadingSpinner size="sm" color="text-white" />
                  <span>Submitting Application…</span>
                </>
              ) : (
                <>
                  <span>Apply Now</span>
                  <span>→</span>
                </>
              )}
            </button>
          ) : outcome === 'NOT_ELIGIBLE' ? (
            <div className="text-xs font-semibold text-red-700 bg-red-100/70 px-3 py-2 rounded-lg border border-red-200 self-start sm:self-auto">
              Household does not satisfy eligibility criteria
            </div>
          ) : (
            <Link
              to="/eligibility"
              className="btn-secondary text-xs py-2.5 px-4 font-semibold"
            >
              Evaluate Family Eligibility →
            </Link>
          )}
        </div>
      </div>

      {/* Current Family's Eligibility Evaluation Card */}
      {eligibility && (
        <div className="card space-y-4 border border-indigo-200 bg-gradient-to-br from-indigo-50/30 to-white shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 block">
                Live Household Entitlement Check
              </span>
              <h2 className="text-base font-bold text-gray-900 mt-0.5">
                Eligibility Assessment for Family{' '}
                <span className="font-mono text-primary-700">{family?.familyIdNumber}</span>
              </h2>
            </div>
            <EligibilityBadge outcome={eligibility.outcome} size="md" />
          </div>

          {/* Reasons why qualifies or does not qualify */}
          <div className="text-xs space-y-2.5 bg-white rounded-xl p-4 border border-gray-200">
            {eligibility.satisfiedRules && eligibility.satisfiedRules.length > 0 && (
              <div>
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <span>✓</span>
                  <span>Eligibility conditions satisfied:</span>
                </span>
                <ul className="space-y-1 pl-5 pt-1 text-emerald-900">
                  {eligibility.satisfiedRules.map((rule, idx) => (
                    <li key={idx} className="list-disc">
                      {rule.fieldName === 'annualIncome'
                        ? `Annual income satisfies criterion (₹${rule.values?.[0]?.toLocaleString('en-IN')} ≤ ₹${rule.expectedValue?.toLocaleString('en-IN')})`
                        : rule.fieldName?.includes('age')
                        ? `Qualifying age found in registered members (${rule.values?.join(', ')} yrs)`
                        : rule.fieldName?.includes('occupation')
                        ? `Registered member matches required occupation: ${rule.expectedValue}`
                        : rule.fieldName?.includes('gender')
                        ? `Registered female beneficiary identified`
                        : `${rule.fieldName} satisfied requirement`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {eligibility.failedConditions && eligibility.failedConditions.length > 0 && (
              <div>
                <span className="font-bold text-red-800 flex items-center gap-1.5">
                  <span>✕</span>
                  <span>Disqualifying conditions:</span>
                </span>
                <ul className="space-y-1 pl-5 pt-1 text-red-900">
                  {eligibility.failedConditions.map((rule, idx) => (
                    <li key={idx} className="list-disc">
                      {rule.fieldName === 'annualIncome'
                        ? `Household income exceeds statutory limit (Current: ₹${rule.values?.[0]?.toLocaleString('en-IN')}, Limit: ₹${rule.expectedValue?.toLocaleString('en-IN')})`
                        : rule.fieldName?.includes('age')
                        ? `No member satisfies required age limit (${rule.operator} ${rule.expectedValue} yrs)`
                        : rule.reason || `${rule.fieldName} does not meet criteria`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {eligibility.missingDocuments && eligibility.missingDocuments.length > 0 && (
              <div>
                <span className="font-bold text-amber-800 flex items-center gap-1.5">
                  <span>⚠</span>
                  <span>Required documents to be submitted:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {eligibility.missingDocuments.map((doc, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-medium"
                    >
                      📄 {(doc.documentType || doc).replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FEATURE 5: Visual Eligibility Explainer inside Scheme Details */}
          <div className="border-t border-indigo-100 pt-3">
            <VisualEligibilityExplainer result={eligibility} />
          </div>
        </div>
      )}

      {/* Criteria & Documents Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Statutory Criteria */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              ✓
            </div>
            <h2 className="text-base font-bold text-gray-900">Statutory Eligibility Rules</h2>
          </div>

          {rules.length === 0 ? (
            <p className="text-xs text-gray-500">Universal Gujarat welfare program without restrictive caps.</p>
          ) : (
            <ul className="space-y-2.5 text-xs text-gray-700">
              {rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  <div>
                    <span className="font-semibold text-gray-800 block">
                      {rule.fieldName === 'annualIncome'
                        ? 'Household Annual Income Ceiling'
                        : rule.fieldName === 'member.age'
                        ? 'Beneficiary Age Requirement'
                        : rule.fieldName === 'member.occupation'
                        ? 'Eligible Member Occupation'
                        : rule.fieldName === 'member.gender'
                        ? 'Eligible Member Gender'
                        : rule.fieldName}
                    </span>
                    <span className="text-gray-600">
                      Must satisfy:{' '}
                      <strong className="text-gray-900">
                        {rule.operator === 'less_than_or_equal' ? '≤ ' :
                         rule.operator === 'greater_than_or_equal' ? '≥ ' :
                         rule.operator === 'equals' ? '= ' : ''}
                        {rule.fieldName === 'annualIncome'
                          ? `₹${Number(rule.value).toLocaleString('en-IN')}`
                          : rule.fieldName === 'member.age'
                          ? `${rule.value} years`
                          : rule.value}
                      </strong>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Required Documents */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              📄
            </div>
            <h2 className="text-base font-bold text-gray-900">Mandatory Verification Documents</h2>
          </div>

          {docs.length === 0 ? (
            <p className="text-xs text-gray-500">No special documents specified.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {docs.map((doc, idx) => (
                <li key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span>📄</span>
                    <span className="font-medium text-gray-800 capitalize">
                      {doc.documentType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    doc.isRequired ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {doc.isRequired ? 'Mandatory' : 'Optional'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Application Process Guidance */}
      <div className="card space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span>⚙️</span>
          <span>Application & DBT Disbursement Process</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <span className="font-bold text-primary-700 block">Step 1: Entitlement Check</span>
            <p className="text-gray-600">Automated verification of FamilyID and member demographics against scheme rules.</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <span className="font-bold text-primary-700 block">Step 2: Digital Application</span>
            <p className="text-gray-600">Click Apply Now to record your application with initial PENDING status.</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <span className="font-bold text-primary-700 block">Step 3: Officer Verification</span>
            <p className="text-gray-600">Taluka and District Welfare Officers inspect claims and verify supporting files.</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <span className="font-bold text-primary-700 block">Step 4: Approval & DBT</span>
            <p className="text-gray-600">Approval sanctioned and financial subsidy or card disbursed to beneficiary account.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
