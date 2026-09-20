import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { searchFamilies, updateFamilyVerification, flagFamilyQuality } from '../api/officer.api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { formatDate } from '../utils/formatters';

const STATUS_BADGES = {
  VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  UNDER_REVIEW: 'bg-blue-50 text-blue-800 border-blue-300',
  REQUIRES_UPDATE: 'bg-amber-50 text-amber-800 border-amber-300',
  PENDING: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function OfficerFamilies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [families, setFamilies] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters State
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [villageCity, setVillageCity] = useState(searchParams.get('villageCity') || '');
  const [verificationStatus, setVerificationStatus] = useState(searchParams.get('verificationStatus') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page'), 10) || 1);

  // Quick Action Modal States
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [targetStatus, setTargetStatus] = useState('VERIFIED');
  const [actionNotes, setActionNotes] = useState('');
  const [flagCategory, setFlagCategory] = useState('Incomplete Documentation');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search: searchInput.trim(),
        district: district.trim(),
        villageCity: villageCity.trim(),
        verificationStatus,
        page,
        limit: 10,
      };

      const res = await searchFamilies(params);
      setFamilies(res.data?.data || []);
      setPagination(res.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search family registry.');
    } finally {
      setLoading(false);
    }
  }, [searchInput, district, villageCity, verificationStatus, page]);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    const newParams = {};
    if (searchInput.trim()) newParams.search = searchInput.trim();
    if (district.trim()) newParams.district = district.trim();
    if (villageCity.trim()) newParams.villageCity = villageCity.trim();
    if (verificationStatus) newParams.verificationStatus = verificationStatus;
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDistrict('');
    setVillageCity('');
    setVerificationStatus('');
    setPage(1);
    setSearchParams({});
  };

  // Open Verify Modal
  const openVerifyModal = (fam) => {
    setSelectedFamily(fam);
    setTargetStatus(fam.verificationStatus === 'VERIFIED' ? 'UNDER_REVIEW' : 'VERIFIED');
    setActionNotes('');
    setVerifyModalOpen(true);
  };

  // Submit Verification Change
  const submitVerification = async (e) => {
    e.preventDefault();
    if (!selectedFamily) return;

    setActionSubmitting(true);
    try {
      await updateFamilyVerification(selectedFamily.id, {
        verificationStatus: targetStatus,
        notes: actionNotes,
      });

      setSuccessMsg(`Family ${selectedFamily.familyIdNumber} status marked as ${targetStatus}. Audit logged.`);
      setVerifyModalOpen(false);
      await fetchFamilies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update verification status.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Open Flag Modal
  const openFlagModal = (fam) => {
    setSelectedFamily(fam);
    setActionNotes('');
    setFlagCategory('Missing Verification Files');
    setFlagModalOpen(true);
  };

  // Submit Data Quality Flag
  const submitFlag = async (e) => {
    e.preventDefault();
    if (!selectedFamily) return;

    setActionSubmitting(true);
    try {
      await flagFamilyQuality(selectedFamily.id, {
        reason: actionNotes,
        category: flagCategory,
      });

      setSuccessMsg(`Family ${selectedFamily.familyIdNumber} flagged for correction.`);
      setFlagModalOpen(false);
      await fetchFamilies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to flag family record.');
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-semibold border border-purple-200 mb-1">
            <span>🔍</span>
            <span>Server-Side Filtered Registry</span>
          </div>
          <h1 className="page-title">Gujarat Family Registry Search</h1>
          <p className="page-subtitle">
            Search, audit, verify, and flag official household records across talukas and districts.
          </p>
        </div>

        <Link to="/officer/dashboard" className="btn-secondary text-xs py-2 px-4 self-start sm:self-auto">
          ← Officer Dashboard
        </Link>
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

      {/* FEATURE 2: Search & Filter Controls */}
      <div className="card space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="label">Search Identifier / Citizen Name / Phone / Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="e.g. GJ-2026-001, Ramesh Patel, or Anand…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="input pl-9 text-xs"
                />
              </div>
            </div>

            {/* District Filter */}
            <div>
              <label className="label">District</label>
              <input
                type="text"
                placeholder="e.g. Anand, Ahmedabad…"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="input text-xs"
              />
            </div>

            {/* Verification Status Filter */}
            <div>
              <label className="label">Verification Status</label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="input text-xs"
              >
                <option value="">All Verification Statuses</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="REQUIRES_UPDATE">REQUIRES_UPDATE</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <span className="text-xs text-gray-500">
              Total Found: <strong className="text-gray-900">{pagination.total}</strong> households
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-secondary text-xs py-2 px-3"
              >
                Reset Filters
              </button>
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-5 bg-purple-600 hover:bg-purple-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* FEATURE 2: Family Registry Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500 font-medium">Querying server registry with pagination…</p>
        </div>
      ) : families.length === 0 ? (
        <div className="card text-center py-16 border-2 border-dashed border-gray-200">
          <div className="text-3xl text-gray-400 mb-2">🔍</div>
          <h3 className="text-base font-bold text-gray-900">No Family Records Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try adjusting search terms, clearing district filters, or reviewing verification status tabs.
          </p>
          <button onClick={handleResetFilters} className="mt-3 btn-secondary text-xs">
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden border border-gray-200 shadow-sm">
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>FamilyID</th>
                  <th>Family Head</th>
                  <th>Members</th>
                  <th>Location</th>
                  <th>Verification Status</th>
                  <th>Applications</th>
                  <th>Last Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {families.map((fam) => {
                  const badgeCls = STATUS_BADGES[fam.verificationStatus] || 'bg-gray-100 text-gray-700';

                  return (
                    <tr key={fam.id} className="hover:bg-gray-50/70 transition">
                      {/* FamilyID */}
                      <td className="whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {fam.familyIdNumber}
                        </span>
                      </td>

                      {/* Family Head */}
                      <td>
                        <div className="font-bold text-gray-900 text-sm">{fam.headName}</div>
                        {fam.headMobile && (
                          <div className="text-[11px] font-mono text-gray-500">{fam.headMobile}</div>
                        )}
                      </td>

                      {/* Members */}
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                          <span>👥</span>
                          <span>{fam.memberCount} members</span>
                        </span>
                      </td>

                      {/* Location */}
                      <td className="text-xs text-gray-600 max-w-xs truncate">
                        {fam.location}
                      </td>

                      {/* Verification Status */}
                      <td className="whitespace-nowrap">
                        <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeCls}`}>
                          {fam.verificationStatus}
                        </span>
                      </td>

                      {/* Applications */}
                      <td className="whitespace-nowrap text-xs text-gray-600 font-semibold">
                        {fam.applicationsCount} claims
                      </td>

                      {/* Last Updated */}
                      <td className="whitespace-nowrap text-xs text-gray-500">
                        {formatDate(fam.lastUpdated)}
                      </td>

                      {/* Actions: [View], [Verify], [Flag] */}
                      <td className="whitespace-nowrap text-right space-x-1.5">
                        <Link
                          to={`/officer/families/${fam.id}`}
                          className="btn-secondary text-xs py-1 px-2.5 hover:border-purple-300 hover:text-purple-700"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openVerifyModal(fam)}
                          className="btn-secondary text-xs py-1 px-2.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => openFlagModal(fam)}
                          className="btn-secondary text-xs py-1 px-2.5 border-amber-300 text-amber-800 hover:bg-amber-50"
                        >
                          Flag
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>
                Page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
                <strong className="text-gray-900">{pagination.totalPages}</strong> (Total {pagination.total} records)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verification Modal (Feature 4) */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title={`Verify Family: ${selectedFamily?.familyIdNumber}`}
      >
        <form onSubmit={submitVerification} className="space-y-4">
          <div>
            <label className="label">Target Verification Status *</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="input text-xs font-semibold"
              required
            >
              <option value="VERIFIED">VERIFIED (All Documents & Biometrics Validated)</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW (Pending Further Inspection)</option>
              <option value="REQUIRES_UPDATE">REQUIRES_UPDATE (Discrepancy Detected)</option>
            </select>
          </div>

          <div>
            <label className="label">Officer Verification Notes / Justification *</label>
            <textarea
              rows={3}
              required
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="State reason for verification status transition (e.g., Physical inspection of ration card completed at Taluka office)…"
              className="input text-xs"
            />
          </div>

          <div className="p-2.5 bg-gray-50 rounded-lg text-[11px] text-gray-500 border border-gray-200 font-mono">
            Audit log will record Officer ID and current timestamp permanently.
          </div>

          <div className="modal-actions pt-2">
            <button
              type="button"
              onClick={() => setVerifyModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={actionSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionSubmitting}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {actionSubmitting ? <LoadingSpinner size="sm" color="text-white" /> : 'Confirm Status Update'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Flag Modal */}
      <Modal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title={`Flag Data Issue: ${selectedFamily?.familyIdNumber}`}
      >
        <form onSubmit={submitFlag} className="space-y-4">
          <div>
            <label className="label">Issue Category</label>
            <select
              value={flagCategory}
              onChange={(e) => setFlagCategory(e.target.value)}
              className="input text-xs"
            >
              <option value="Missing Verification Files">Missing Verification Files</option>
              <option value="Income Certificate Discrepancy">Income Certificate Discrepancy</option>
              <option value="Duplicate Member Warning">Duplicate Member Warning</option>
              <option value="Invalid Demographic Records">Invalid Demographic Records</option>
            </select>
          </div>

          <div>
            <label className="label">Officer Remarks / Instructions for Citizen *</label>
            <textarea
              rows={3}
              required
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="e.g., Land ownership 7/12 record does not match registered revenue survey number…"
              className="input text-xs"
            />
          </div>

          <div className="modal-actions pt-2">
            <button
              type="button"
              onClick={() => setFlagModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={actionSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionSubmitting}
              className="btn-primary text-xs bg-amber-600 hover:bg-amber-700"
            >
              {actionSubmitting ? <LoadingSpinner size="sm" color="text-white" /> : 'Flag for Update'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
