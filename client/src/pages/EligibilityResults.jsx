import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { getMyEligibility } from '../api/eligibility.api';
import { createApplication } from '../api/applications.api';
import EligibilityBadge from '../components/EligibilityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import VisualEligibilityExplainer from '../components/VisualEligibilityExplainer';

const COMMON_DOCUMENTS = [
  { id: 'income_certificate', label: 'Income Certificate (Revenue Dept)' },
  { id: 'aadhaar_card', label: 'Aadhaar Cards (All Members)' },
  { id: 'age_proof', label: 'Age Proof (Birth Certificate / School LC)' },
  { id: 'land_ownership_document', label: '7/12 Land Ownership Record' },
  { id: 'bank_passbook', label: 'Bank Passbook / Account Statement' },
  { id: 'class_10_marksheet', label: 'Class 10 Board Marksheet' },
  { id: 'school_enrollment_certificate', label: 'School / College Bonafide' },
  { id: 'birth_certificate', label: 'Girl Child Birth Certificate' },
];

export default function EligibilityResults() {
  const navigate = useNavigate();
  const { family, loading: familyLoading } = useFamily();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedScheme, setExpandedScheme] = useState(null);
  const [applyingSchemeId, setApplyingSchemeId] = useState(null);

  // Document checklist simulator
  const [suppliedDocs, setSuppliedDocs] = useState([
    'income_certificate',
    'aadhaar_card',
    'bank_passbook',
  ]);

  const runEvaluation = useCallback(async (docs) => {
    setLoading(true);
    setError(null);
    try {
      const docPayload = docs !== undefined ? docs : suppliedDocs;
      const res = await getMyEligibility(docPayload);
      const data = res.data?.results || [];
      setResults(data);
      if (data.length > 0 && !expandedScheme) {
        setExpandedScheme(data[0].schemeId || data[0].schemeCode);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setResults([]);
      } else {
        setError(err.response?.data?.message || 'Failed to evaluate eligibility against state engine.');
      }
    } finally {
      setLoading(false);
    }
  }, [suppliedDocs, expandedScheme]);

  useEffect(() => {
    runEvaluation();
  }, []);

  const toggleDoc = (docId) => {
    const updated = suppliedDocs.includes(docId)
      ? suppliedDocs.filter((d) => d !== docId)
      : [...suppliedDocs, docId];
    setSuppliedDocs(updated);
    runEvaluation(updated);
  };

  const handleStartApplication = async (result) => {
    setApplyingSchemeId(result.schemeId || result.schemeCode);
    setError(null);
    try {
      const missing = (result.missingDocuments || []).map((d) => d.documentType || d);
      await createApplication({
        schemeId: result.schemeId || result.schemeCode,
        missingDocuments: missing,
        benefit: result.benefit,
        remarks: 'Application initiated from Eligibility Dashboard.',
      });

      navigate('/applications', {
        state: { successMessage: `Application for "${result.schemeName}" submitted successfully!` },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start application.');
      setApplyingSchemeId(null);
    }
  };

  // Metric counts
  const eligibleCount = results.filter((r) => r.outcome === 'ELIGIBLE').length;
  const potentialCount = results.filter((r) => r.outcome === 'POTENTIALLY_ELIGIBLE').length;
  const notEligibleCount = results.filter((r) => r.outcome === 'NOT_ELIGIBLE').length;

  // Total missing document instances across all schemes
  const totalMissingDocs = useMemo(() => {
    let count = 0;
    results.forEach((r) => {
      count += (r.missingDocuments || []).length;
    });
    return count;
  }, [results]);

  // Filtered list
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const matchesOutcome = filter === 'ALL' || r.outcome === filter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.schemeName?.toLowerCase().includes(q) ||
        r.schemeCode?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q);
      return matchesOutcome && matchesSearch;
    });
  }, [results, filter, searchQuery]);

  if (!familyLoading && !family) {
    return (
      <div className="card text-center py-16 px-6 max-w-2xl mx-auto border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl mb-4">
          ⚡
        </div>
        <h2 className="text-xl font-bold text-gray-900">No Household Profile Found</h2>
        <p className="mt-2 text-sm text-gray-500">
          You must enroll a family household profile before running automated welfare scheme eligibility checks.
        </p>
        <Link to="/family" className="mt-5 btn-primary py-2.5 px-5 text-sm inline-flex">
          Go to Family Profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full font-semibold border border-primary-100 mb-1">
            <span>🛡️</span>
            <span>Deterministic Rule Engine v2.4</span>
          </div>
          <h1 className="page-title">Family Welfare Eligibility Engine</h1>
          <p className="page-subtitle">
            Automated entitlement assessment for Family ID{' '}
            <span className="font-mono font-bold text-gray-800">{family?.familyIdNumber}</span>
          </p>
        </div>

        <button
          onClick={() => runEvaluation()}
          disabled={loading}
          className="btn-primary self-start md:self-auto bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" color="text-white" />
              <span>Re-evaluating…</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Re-run Rule Engine</span>
            </>
          )}
        </button>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center justify-between shadow-sm">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-600 font-bold hover:text-green-800">×</button>
        </div>
      )}

      {/* FEATURE 3: Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setFilter('ELIGIBLE')}
          className={`card p-4 border-l-4 border-l-emerald-500 cursor-pointer transition hover:shadow-md ${
            filter === 'ELIGIBLE' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''
          }`}
        >
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
            Eligible
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {loading ? '…' : eligibleCount}
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">100% criteria satisfied</span>
        </div>

        <div
          onClick={() => setFilter('POTENTIALLY_ELIGIBLE')}
          className={`card p-4 border-l-4 border-l-amber-500 cursor-pointer transition hover:shadow-md ${
            filter === 'POTENTIALLY_ELIGIBLE' ? 'ring-2 ring-amber-500 bg-amber-50/20' : ''
          }`}
        >
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
            Potentially Eligible
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {loading ? '…' : potentialCount}
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Pending docs / verification</span>
        </div>

        <div
          onClick={() => setFilter('NOT_ELIGIBLE')}
          className={`card p-4 border-l-4 border-l-red-500 cursor-pointer transition hover:shadow-md ${
            filter === 'NOT_ELIGIBLE' ? 'ring-2 ring-red-500 bg-red-50/20' : ''
          }`}
        >
          <span className="text-xs font-semibold text-red-800 uppercase tracking-wider block">
            Not Eligible
          </span>
          <span className="text-2xl font-black text-red-600 mt-1 block">
            {loading ? '…' : notEligibleCount}
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Rule ceiling exceeded</span>
        </div>

        <div className="card p-4 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider block">
            Missing Documents
          </span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {loading ? '…' : totalMissingDocs}
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Across all state programs</span>
        </div>
      </div>

      {/* Interactive Document Simulation Banner */}
      <div className="card space-y-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-200/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span>📋</span>
              <span>Supplied Documents Simulator</span>
            </h3>
            <p className="text-xs text-gray-600">
              Toggle certificates below to simulate how document submission affects eligibility status in real-time.
            </p>
          </div>
          <span className="text-xs font-semibold text-primary-700 bg-white px-2.5 py-1 rounded-md border border-primary-200 self-start sm:self-auto">
            {suppliedDocs.length} Supplied
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {COMMON_DOCUMENTS.map((doc) => {
            const isSupplied = suppliedDocs.includes(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                  isSupplied
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{isSupplied ? '✓' : '+'}</span>
                <span>{doc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FEATURE 3: Filters & Search */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search evaluated schemes by name or code…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 text-sm"
            />
          </div>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="btn-secondary text-xs px-3">
              Clear Search
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'ALL', label: `All Schemes (${results.length})` },
            { key: 'ELIGIBLE', label: `Eligible (${eligibleCount})` },
            { key: 'POTENTIALLY_ELIGIBLE', label: `Potentially Eligible (${potentialCount})` },
            { key: 'NOT_ELIGIBLE', label: `Not Eligible (${notEligibleCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filter === tab.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Showing <strong className="text-gray-900">{filteredResults.length}</strong> evaluated schemes
        </span>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500 font-medium">Running deterministic eligibility rules…</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="card text-center py-16 border-2 border-dashed border-gray-200">
          <p className="text-gray-500 font-medium">No evaluated schemes match the selected filter.</p>
          <button onClick={() => { setFilter('ALL'); setSearchQuery(''); }} className="mt-3 btn-secondary text-xs">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result) => {
            const schemeKey = result.schemeId || result.schemeCode;
            const isExpanded = expandedScheme === schemeKey;
            const isEligible = result.outcome === 'ELIGIBLE';
            const isPotential = result.outcome === 'POTENTIALLY_ELIGIBLE';

            return (
              <div
                key={schemeKey}
                className="card p-5 border border-gray-200 hover:border-primary-300 transition shadow-sm space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {result.schemeName}
                      </h3>
                      <span className="font-mono text-xs text-gray-400">{result.schemeCode}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{result.department}</p>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <EligibilityBadge outcome={result.outcome} size="md" />
                    <button
                      onClick={() => setExpandedScheme(isExpanded ? null : schemeKey)}
                      className="btn-secondary text-xs py-1 px-2.5"
                    >
                      {isExpanded ? 'Hide Breakdown ▲' : 'Explain Breakdown ▼'}
                    </button>
                  </div>
                </div>

                {/* Summary Reason Box */}
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2 text-xs">
                  {/* Why qualifies */}
                  {result.satisfiedRules && result.satisfiedRules.length > 0 && (
                    <div>
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <span>✓</span>
                        <span>Why the family qualifies:</span>
                      </span>
                      <ul className="space-y-1 pl-5 pt-1 text-emerald-900">
                        {result.satisfiedRules.map((rule, idx) => (
                          <li key={idx} className="list-disc">
                            {rule.fieldName === 'annualIncome'
                              ? `Family income meets requirement (₹${rule.values?.[0]?.toLocaleString('en-IN')} ≤ ₹${rule.expectedValue?.toLocaleString('en-IN')})`
                              : rule.fieldName?.includes('age')
                              ? `Eligible member age found (${rule.values?.join(', ')} yrs satisfies condition)`
                              : rule.fieldName?.includes('occupation')
                              ? `Beneficiary occupation matched: ${rule.expectedValue}`
                              : rule.fieldName?.includes('gender')
                              ? `Eligible female member identified`
                              : `${rule.fieldName} requirement satisfied`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Conditions not satisfied */}
                  {result.failedConditions && result.failedConditions.length > 0 && (
                    <div>
                      <span className="font-bold text-red-800 flex items-center gap-1.5">
                        <span>✕</span>
                        <span>Conditions not satisfied:</span>
                      </span>
                      <ul className="space-y-1 pl-5 pt-1 text-red-900">
                        {result.failedConditions.map((rule, idx) => (
                          <li key={idx} className="list-disc">
                            {rule.fieldName === 'annualIncome'
                              ? `Household annual income (₹${rule.values?.[0]?.toLocaleString('en-IN')}) exceeds ceiling of ₹${rule.expectedValue?.toLocaleString('en-IN')}`
                              : rule.fieldName?.includes('age')
                              ? `No registered member falls within required age limit (${rule.operator} ${rule.expectedValue} yrs)`
                              : rule.reason || `${rule.fieldName} failed criteria`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Documents */}
                  {result.missingDocuments && result.missingDocuments.length > 0 && (
                    <div>
                      <span className="font-bold text-amber-800 flex items-center gap-1.5">
                        <span>⚠</span>
                        <span>Missing Documents:</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {result.missingDocuments.map((doc, idx) => (
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

                {/* FEATURE 5: Visual Eligibility Explainer (Collapsible / Expandable) */}
                {isExpanded && (
                  <div className="border-t border-gray-100 pt-3 animate-fadeIn">
                    <VisualEligibilityExplainer result={result} />
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 flex-wrap">
                  <span className="text-xs text-gray-500">
                    Next Action:{' '}
                    <strong className="text-gray-800">
                      {isEligible
                        ? 'Ready to apply — all criteria and documents verified.'
                        : isPotential
                        ? 'Upload missing documents to finalize claim.'
                        : 'Ineligible under current statutory income or age norms.'}
                    </strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/schemes/${schemeKey}`}
                      className="btn-secondary text-xs py-2 px-3.5"
                    >
                      View Details
                    </Link>

                    {(isEligible || isPotential) && (
                      <button
                        onClick={() => handleStartApplication(result)}
                        disabled={applyingSchemeId === schemeKey}
                        className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                      >
                        {applyingSchemeId === schemeKey ? (
                          <>
                            <LoadingSpinner size="sm" color="text-white" />
                            <span>Submitting…</span>
                          </>
                        ) : (
                          <>
                            <span>Start Application</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
