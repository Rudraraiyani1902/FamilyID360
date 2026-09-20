import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SchemeCard from '../components/SchemeCard';
import EligibilityBadge from '../components/EligibilityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { getSchemes } from '../api/schemes.api';
import { getMyEligibility } from '../api/eligibility.api';
import { createApplication } from '../api/applications.api';
import { useFamily } from '../context/FamilyContext';

export default function Schemes() {
  const navigate = useNavigate();
  const { family } = useFamily();

  const [schemes, setSchemes] = useState([]);
  const [eligibilityMap, setEligibilityMap] = useState({});
  const [eligibilityResults, setEligibilityResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [applyingSchemeId, setApplyingSchemeId] = useState(null);

  // Load schemes and family eligibility on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch active schemes from backend
      const schemesRes = await getSchemes();
      const schemeList = schemesRes.data?.data || schemesRes.data || [];
      setSchemes(schemeList);

      // 2. Fetch authenticated family's eligibility
      try {
        const elRes = await getMyEligibility();
        const results = elRes.data?.results || [];
        setEligibilityResults(results);

        // Map by schemeId and schemeCode for easy lookup
        const map = {};
        results.forEach((r) => {
          if (r.schemeId) map[r.schemeId] = r;
          if (r.schemeCode) map[r.schemeCode] = r;
        });
        setEligibilityMap(map);
      } catch (elErr) {
        // If family not enrolled yet or other issue, don't crash schemes display
        console.warn('Could not load family eligibility:', elErr.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load welfare schemes from state registry.');
    } finally {
      setLoading(false);
    }
  };

  // Feature 2: "Find Benefits For My Family" button action
  const handleFindBenefits = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const elRes = await getMyEligibility();
      const results = elRes.data?.results || [];
      setEligibilityResults(results);

      const map = {};
      results.forEach((r) => {
        if (r.schemeId) map[r.schemeId] = r;
        if (r.schemeCode) map[r.schemeCode] = r;
      });
      setEligibilityMap(map);
      setShowBenefitsModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run eligibility evaluation.');
    } finally {
      setEvaluating(false);
    }
  };

  // Direct application start
  const handleStartApplication = async (scheme) => {
    setApplyingSchemeId(scheme.id || scheme.code);
    setError(null);
    try {
      const el = eligibilityMap[scheme.id] || eligibilityMap[scheme.code];
      const missing = (el?.missingDocuments || []).map((d) => d.documentType || d);

      await createApplication({
        schemeId: scheme.id || scheme.code,
        missingDocuments: missing,
        benefit: scheme.benefit,
        remarks: 'Direct citizen application from Scheme Discovery portal.',
      });

      navigate('/applications', {
        state: { successMessage: `Application for "${scheme.name}" submitted successfully!` },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start application.');
      setApplyingSchemeId(null);
    }
  };

  // Departments list for filter tabs
  const departments = useMemo(() => {
    const set = new Set();
    schemes.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return ['All', ...Array.from(set)];
  }, [schemes]);

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter((scheme) => {
      const matchesDept = selectedDept === 'All' || scheme.department === selectedDept;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        scheme.name?.toLowerCase().includes(q) ||
        scheme.department?.toLowerCase().includes(q) ||
        scheme.description?.toLowerCase().includes(q) ||
        scheme.code?.toLowerCase().includes(q) ||
        scheme.targetBeneficiary?.toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [schemes, selectedDept, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner with Prominent "Find Benefits For My Family" Button */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold tracking-wide text-primary-200">
            <span>🏛️</span>
            <span>Government of Gujarat Citizen Welfare Services</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Scheme Discovery & Entitlement Portal
          </h1>

          <p className="text-sm sm:text-base text-primary-100/90 leading-relaxed">
            Explore state entitlement programs, subsidies, and health protections. Powered by the
            FamilyID 360 deterministic eligibility engine.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {/* FEATURE 2: Prominent "Find Benefits For My Family" Button */}
            <button
              onClick={handleFindBenefits}
              disabled={evaluating}
              className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-md border-0 text-sm flex items-center gap-2 transform active:scale-95 transition"
            >
              {evaluating ? (
                <>
                  <LoadingSpinner size="sm" color="text-white" />
                  <span>Evaluating Household Records…</span>
                </>
              ) : (
                <>
                  <span className="text-base">⚡</span>
                  <span>Find Benefits For My Family</span>
                </>
              )}
            </button>

            <Link
              to="/eligibility"
              className="btn-secondary bg-white/10 hover:bg-white/20 text-white border-white/30 text-sm py-3 px-5 rounded-xl font-semibold backdrop-blur"
            >
              View Full Eligibility Dashboard →
            </Link>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center justify-between shadow-sm">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-600 font-bold hover:text-green-800">×</button>
        </div>
      )}

      {/* Filter and Search Bar */}
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
              placeholder="Search by scheme name, department, code, or keyword…"
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

        {/* Departments Bar */}
        {departments.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <span className="text-xs font-semibold text-gray-400 mr-1 uppercase whitespace-nowrap">
              Department:
            </span>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedDept === dept
                    ? 'bg-primary-600 text-white shadow-sm font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Showing <strong className="text-gray-900">{filteredSchemes.length}</strong> welfare schemes
          {selectedDept !== 'All' ? ` under ${selectedDept}` : ''}
        </span>
        {family && (
          <span className="text-gray-500">
            Household: <span className="font-mono font-bold text-gray-800">{family.familyIdNumber}</span>
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-16 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : filteredSchemes.length === 0 ? (
        /* Empty State */
        <div className="card text-center py-16 border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-3xl mb-4">
            🔍
          </div>
          <h3 className="text-base font-bold text-gray-900">No Welfare Schemes Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            No active schemes matched your search query or department filter.
          </p>
          <button
            onClick={() => {
              setSelectedDept('All');
              setSearchQuery('');
            }}
            className="mt-4 btn-secondary text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* FEATURE 1: Grid of Scheme Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchemes.map((scheme) => {
            const el = eligibilityMap[scheme.id] || eligibilityMap[scheme.code];
            const outcome = el?.outcome;

            return (
              <SchemeCard
                key={scheme.id || scheme.code}
                scheme={scheme}
                outcome={outcome}
                onApply={handleStartApplication}
              />
            );
          })}
        </div>
      )}

      {/* FEATURE 2: "Find Benefits For My Family" Results Modal */}
      {showBenefitsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-primary-900 to-indigo-900 text-white flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                  <span>⚡</span>
                  <span>Deterministic Rule Evaluation Complete</span>
                </div>
                <h2 className="text-xl font-bold">Welfare Benefits for Your Household</h2>
                <p className="text-xs text-primary-200 mt-0.5">
                  Evaluated against Family ID: <span className="font-mono font-bold text-white">{family?.familyIdNumber}</span>
                </p>
              </div>
              <button
                onClick={() => setShowBenefitsModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl font-bold transition"
              >
                ×
              </button>
            </div>

            {/* Modal Body: List of evaluated schemes */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 divide-y divide-gray-100">
              {eligibilityResults.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No eligibility results returned.</p>
              ) : (
                eligibilityResults.map((result) => {
                  const isEligible = result.outcome === 'ELIGIBLE';
                  const isPotential = result.outcome === 'POTENTIALLY_ELIGIBLE';
                  const isNot = result.outcome === 'NOT_ELIGIBLE';

                  return (
                    <div key={result.schemeId || result.schemeCode} className="pt-4 first:pt-0 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">{result.schemeName}</h3>
                            <span className="text-[11px] font-mono text-gray-400">{result.schemeCode}</span>
                          </div>
                          <p className="text-xs text-gray-500">{result.department}</p>
                        </div>
                        <EligibilityBadge outcome={result.outcome} />
                      </div>

                      {/* Why qualifies or does not qualify */}
                      <div className="text-xs space-y-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        {/* Conditions Satisfied */}
                        {result.satisfiedRules && result.satisfiedRules.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-bold text-emerald-800 flex items-center gap-1">
                              <span>✓</span>
                              <span>Conditions Satisfied:</span>
                            </span>
                            <ul className="space-y-0.5 pl-4 text-emerald-900">
                              {result.satisfiedRules.map((rule, idx) => (
                                <li key={idx} className="list-disc">
                                  {rule.fieldName === 'annualIncome'
                                    ? `Family income meets requirement (₹${rule.values?.[0]?.toLocaleString('en-IN') || ''} ≤ ₹${rule.expectedValue?.toLocaleString('en-IN')})`
                                    : rule.fieldName === 'member.age'
                                    ? `Eligible member age found (${rule.values?.join(', ')} yrs satisfies condition)`
                                    : rule.fieldName === 'member.occupation'
                                    ? `Qualifying occupation found: ${rule.expectedValue}`
                                    : rule.fieldName === 'member.gender'
                                    ? `Qualifying gender found: ${rule.expectedValue}`
                                    : `${rule.fieldName} satisfied criteria`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Conditions Not Satisfied */}
                        {result.failedConditions && result.failedConditions.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-bold text-red-800 flex items-center gap-1">
                              <span>✕</span>
                              <span>Conditions Not Satisfied:</span>
                            </span>
                            <ul className="space-y-0.5 pl-4 text-red-900">
                              {result.failedConditions.map((rule, idx) => (
                                <li key={idx} className="list-disc">
                                  {rule.fieldName === 'annualIncome'
                                    ? `Family income exceeds ceiling (Current: ₹${rule.values?.[0]?.toLocaleString('en-IN') || ''}, Max: ₹${rule.expectedValue?.toLocaleString('en-IN')})`
                                    : rule.fieldName === 'member.age'
                                    ? `No member satisfies age requirement (${rule.operator} ${rule.expectedValue} yrs)`
                                    : rule.reason || `${rule.fieldName} did not satisfy requirement`}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Missing Documents */}
                        {result.missingDocuments && result.missingDocuments.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-bold text-amber-800 flex items-center gap-1">
                              <span>⚠</span>
                              <span>Missing Documents:</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
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

                      {/* Next Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Link
                          to={`/schemes/${result.schemeId || result.schemeCode}`}
                          onClick={() => setShowBenefitsModal(false)}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          View Details
                        </Link>

                        {(isEligible || isPotential) && (
                          <button
                            onClick={() => {
                              setShowBenefitsModal(false);
                              handleStartApplication(result);
                            }}
                            disabled={applyingSchemeId === (result.schemeId || result.schemeCode)}
                            className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {applyingSchemeId === (result.schemeId || result.schemeCode) ? (
                              <LoadingSpinner size="sm" color="text-white" />
                            ) : (
                              'Start Application →'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <Link
                to="/eligibility"
                onClick={() => setShowBenefitsModal(false)}
                className="text-xs text-primary-600 font-bold hover:underline"
              >
                Go to Detailed Eligibility Dashboard →
              </Link>
              <button
                onClick={() => setShowBenefitsModal(false)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
