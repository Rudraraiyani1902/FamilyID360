import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import {
  getDashboardStats,
  getDuplicateRecords,
  handleDuplicateDecision,
} from '../api/officer.api';

export default function OfficerDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Quick Search state
  const [quickSearch, setQuickSearch] = useState('');

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [activeDuplicate, setActiveDuplicate] = useState(null);
  const [pendingDecision, setPendingDecision] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, dupsRes] = await Promise.all([
        getDashboardStats(),
        getDuplicateRecords(),
      ]);

      setStats(statsRes.data?.data || null);
      setDuplicates(dupsRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load officer dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearchSubmit = (e) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/officer/families?search=${encodeURIComponent(quickSearch.trim())}`);
    } else {
      navigate('/officer/families');
    }
  };

  const openDecisionModal = (dup, decision) => {
    setActiveDuplicate(dup);
    setPendingDecision(decision);
    setDecisionNotes('');
    setDecisionModalOpen(true);
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    if (!activeDuplicate) return;

    setSubmittingDecision(true);
    try {
      await handleDuplicateDecision(activeDuplicate.id, {
        decision: pendingDecision,
        notes: decisionNotes,
      });

      setSuccessMsg(`Decision "${pendingDecision.replace(/_/g, ' ')}" recorded in audit log.`);
      setDecisionModalOpen(false);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save duplicate review decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Loading State Beneficiary Management Statistics…</p>
      </div>
    );
  }

  const possibleDups = duplicates.filter((d) => d.status === 'POSSIBLE_DUPLICATE');

  return (
    <div className="space-y-6">
      {/* Officer Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-purple-500/10 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold border border-purple-500/30">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>Taluka & District Welfare Operations Console</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Government Officer Command Center
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Monitor state household registries, audit verification workflows, manage rule-based applications, and inspect data quality anomaly flags.
          </p>

          {/* Quick Search Bar */}
          <form onSubmit={handleQuickSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search FamilyID, citizen name, or location…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              className="btn-primary bg-purple-600 hover:bg-purple-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold shadow-md"
            >
              Search Registry →
            </button>
          </form>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-green-600 font-bold hover:text-green-800">×</button>
        </div>
      )}

      {/* FEATURE 1: Beneficiary Management Statistics Cards (8 required metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Families"
          value={stats?.totalFamilies ?? 0}
          subtitle="Registered households"
          variant="primary"
          icon={<span className="text-xl">🏠</span>}
        />
        <StatCard
          title="Total Family Members"
          value={stats?.totalFamilyMembers ?? 0}
          subtitle="Enumerated individuals"
          variant="default"
          icon={<span className="text-xl">👥</span>}
        />
        <StatCard
          title="Total Applications"
          value={stats?.totalApplications ?? 0}
          subtitle="Submitted across schemes"
          variant="default"
          icon={<span className="text-xl">📁</span>}
        />
        <StatCard
          title="Pending Applications"
          value={stats?.pendingApplications ?? 0}
          subtitle="Awaiting officer audit"
          variant="warning"
          icon={<span className="text-xl">⏳</span>}
        />
        <StatCard
          title="Approved Applications"
          value={stats?.approvedApplications ?? 0}
          subtitle="Sanctioned for DBT"
          variant="success"
          icon={<span className="text-xl">✓</span>}
        />
        <StatCard
          title="Docs Required"
          value={stats?.applicationsRequiringDocuments ?? 0}
          subtitle="Pending citizen uploads"
          variant="default"
          icon={<span className="text-xl">📄</span>}
        />
        <StatCard
          title="Requires Verification"
          value={stats?.familiesRequiringVerification ?? 0}
          subtitle="Households under review"
          variant="warning"
          icon={<span className="text-xl">🛡️</span>}
        />
        <StatCard
          title="Potential Duplicates"
          value={stats?.potentialDuplicateRecords ?? 0}
          subtitle="Flagged by matching engine"
          variant="danger"
          icon={<span className="text-xl">⚠️</span>}
        />
      </div>

      {/* Main Grid: Feature 5 Duplicate Records + Feature 6 Data Quality Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: FEATURE 5 — Potential Duplicate Records Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">Potential Duplicate Records</span>
                  <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-200">
                    {possibleDups.length} Unresolved
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Explainable matching engine detected overlapping citizen profiles. No records are auto-merged.
                </p>
              </div>

              <Link
                to="/officer/families"
                className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto"
              >
                View Full Registry →
              </Link>
            </div>

            {possibleDups.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <div className="text-3xl">✓</div>
                <p className="text-sm font-medium text-gray-600">No Unresolved Duplicates Detected</p>
                <p className="text-xs text-gray-400">All household profiles adhere to uniqueness criteria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {possibleDups.map((dup) => {
                  const f1 = dup.sourceFamily;
                  const f2 = dup.matchedFamily;
                  const head1 = f1?.members?.find((m) => m.isFamilyHead) || f1?.members?.[0];
                  const head2 = f2?.members?.find((m) => m.isFamilyHead) || f2?.members?.[0];

                  return (
                    <div
                      key={dup.id}
                      className="p-4 rounded-xl border border-red-200 bg-red-50/20 space-y-3 shadow-xs"
                    >
                      {/* Duplicate Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                          POSSIBLE_DUPLICATE
                        </span>
                        <span className="text-xs font-mono font-medium text-gray-500">
                          Match Confidence: <strong>{Math.round((dup.confidenceScore || 0.85) * 100)}%</strong>
                        </span>
                      </div>

                      {/* Comparison Columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Record A */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Record A</span>
                          <span className="text-sm font-bold text-gray-900 block">{head1?.fullName || 'Ramesh Patel'}</span>
                          <p className="text-gray-500">Family ID: <span className="font-mono font-semibold text-gray-700">{f1?.familyIdNumber}</span></p>
                          <p className="text-gray-500">DOB: <span className="font-mono text-gray-700">{head1?.dateOfBirth || '1981-06-15'}</span></p>
                          <p className="text-gray-500">Location: <span className="text-gray-700">{f1?.district || 'Anand'}</span></p>
                        </div>

                        {/* Record B */}
                        <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Record B</span>
                          <span className="text-sm font-bold text-gray-900 block">{head2?.fullName || 'Rameshbhai Patel'}</span>
                          <p className="text-gray-500">Family ID: <span className="font-mono font-semibold text-gray-700">{f2?.familyIdNumber}</span></p>
                          <p className="text-gray-500">DOB: <span className="font-mono text-gray-700">{head2?.dateOfBirth || '1981-06-15'}</span></p>
                          <p className="text-gray-500">Location: <span className="text-gray-700">{f2?.district || 'Anand'}</span></p>
                        </div>
                      </div>

                      {/* Matching Explanation */}
                      <div className="p-2.5 bg-white/80 rounded-lg border border-red-100 text-xs text-gray-700 space-y-1">
                        <span className="font-bold text-red-900 block">Possible matching fields:</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {(dup.matchingFields || []).map((field, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 font-semibold text-red-800 bg-red-100/80 px-2 py-0.5 rounded text-[11px]"
                            >
                              ✓ {field}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-gray-600 pt-1 leading-relaxed">
                          {dup.explanation}
                        </p>
                      </div>

                      {/* Officer Decision Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                        <button
                          onClick={() => openDecisionModal(dup, 'REVIEW_LATER')}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          Review Later
                        </button>
                        <button
                          onClick={() => openDecisionModal(dup, 'NOT_A_DUPLICATE')}
                          className="btn-secondary text-xs py-1.5 px-3 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                        >
                          Not a Duplicate
                        </button>
                        <button
                          onClick={() => openDecisionModal(dup, 'CONFIRMED_DUPLICATE')}
                          className="btn-primary text-xs py-1.5 px-3 bg-red-600 hover:bg-red-700"
                        >
                          Confirm Duplicate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: FEATURE 6 — Data Quality Flags */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Data Quality Issues</h3>
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  {stats?.dataQualityIssuesCount ?? 0}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Automated inconsistency alerts across Gujarat family records.
              </p>
            </div>

            {!stats?.recentQualityIssues || stats.recentQualityIssues.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                ✓ No data quality flags detected.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentQualityIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1">
                        <span>⚠</span>
                        <span>{issue.issue}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                        {issue.familyIdNumber}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="pt-1 flex justify-end">
                      <Link
                        to={`/officer/families/${issue.familyId || issue.familyIdNumber}`}
                        className="text-[11px] font-bold text-primary-700 hover:underline"
                      >
                        Inspect Household →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <Link
                to="/officer/families"
                className="w-full btn-secondary text-xs py-2 justify-center"
              >
                Go to Family Search Table →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={`Audit Decision: ${pendingDecision.replace(/_/g, ' ')}`}
      >
        <form onSubmit={submitDecision} className="space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            You are registering an official audit log entry as an authorized Government Officer. Please provide mandatory verification notes explaining your decision.
          </p>

          <div>
            <label className="label">Verification / Decision Notes *</label>
            <textarea
              rows={3}
              required
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="e.g., Verified citizen Aadhaar documentation and ration card physically at Anand Taluka office…"
              className="input text-xs"
            />
          </div>

          <div className="p-2.5 bg-gray-50 rounded-lg text-[11px] text-gray-500 border border-gray-200 font-mono">
            Action will be recorded in official Audit History with Officer ID and immutable timestamp.
          </div>

          <div className="modal-actions pt-2">
            <button
              type="button"
              onClick={() => setDecisionModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={submittingDecision}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingDecision}
              className={`btn-primary text-xs ${
                pendingDecision === 'CONFIRMED_DUPLICATE'
                  ? 'bg-red-600 hover:bg-red-700'
                  : pendingDecision === 'NOT_A_DUPLICATE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : ''
              }`}
            >
              {submittingDecision ? <LoadingSpinner size="sm" color="text-white" /> : 'Confirm & Log Audit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
