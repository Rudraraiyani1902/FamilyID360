import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { getApplications, createApplication } from '../api/applications.api';
import { getSchemes } from '../api/schemes.api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatDate } from '../utils/formatters';

const STATUS_MAP = {
  PENDING: { label: 'Pending Review', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  UNDER_REVIEW: { label: 'Under Review', cls: 'bg-blue-50 text-blue-800 border-blue-300' },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-800 border-red-300' },
  DOCUMENT_REQUIRED: { label: 'Document Required', cls: 'bg-yellow-50 text-yellow-900 border-yellow-300' },
};

export default function Applications() {
  const location = useLocation();
  const { family, loading: familyLoading } = useFamily();

  const [applications, setApplications] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(location.state?.successMessage || null);

  const [filter, setFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsRes, schemesRes] = await Promise.all([
        getApplications(),
        getSchemes(),
      ]);

      const appList = appsRes.data?.data || appsRes.data || [];
      const schemeList = schemesRes.data?.data || schemesRes.data || [];

      setApplications(appList);
      setSchemes(schemeList);

      if (schemeList.length > 0 && !selectedSchemeId) {
        setSelectedSchemeId(schemeList[0].id || schemeList[0].code);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const schemeObj = schemes.find(
      (s) => s.id === selectedSchemeId || s.code === selectedSchemeId
    );

    try {
      const res = await createApplication({
        schemeId: selectedSchemeId,
        remarks: remarks || `Citizen application submitted via FamilyID 360 portal.`,
        benefit: schemeObj?.benefit,
      });

      setSuccessMsg(res.data?.message || 'Application submitted successfully!');
      setModalOpen(false);
      setRemarks('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (filter === 'ALL') return true;
      return app.status === filter;
    });
  }, [applications, filter]);

  if (!familyLoading && !family) {
    return (
      <div className="card text-center py-16 px-6 max-w-2xl mx-auto border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl mb-4">
          📁
        </div>
        <h2 className="text-xl font-bold text-gray-900">No Household Profile Found</h2>
        <p className="mt-2 text-sm text-gray-500">
          You must enroll a family household profile before tracking government welfare applications.
        </p>
        <Link to="/family" className="mt-5 btn-primary py-2.5 px-5 text-sm inline-flex">
          Go to Family Profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Welfare Scheme Applications</h1>
          <p className="page-subtitle">
            Track benefit claims, officer verification, and DBT disbursements for Family{' '}
            <span className="font-mono font-bold text-gray-800">{family?.familyIdNumber}</span>
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary self-start sm:self-auto shadow-sm">
          <span>+ Submit New Application</span>
        </button>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-green-600 font-bold hover:text-green-800 text-base">
            ×
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'DOCUMENT_REQUIRED', 'REJECTED'].map((statusKey) => {
          const count =
            statusKey === 'ALL'
              ? applications.length
              : applications.filter((a) => a.status === statusKey).length;

          const label = statusKey === 'ALL' ? 'All Applications' : (STATUS_MAP[statusKey]?.label || statusKey);

          return (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                filter === statusKey
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500 font-medium">Loading applications from state registry…</p>
        </div>
      ) : applications.length === 0 ? (
        /* Empty State 1: No applications exist yet */
        <div className="card text-center py-16 px-6 border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-3xl mb-4">
            📋
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Welfare Applications Yet</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Your family has not initiated any government scheme applications. Discover programs and apply to receive DBT benefits.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link to="/schemes" className="btn-primary text-xs py-2 px-4">
              Explore Available Schemes →
            </Link>
            <button onClick={() => setModalOpen(true)} className="btn-secondary text-xs py-2 px-4">
              Submit Application
            </button>
          </div>
        </div>
      ) : filteredApps.length === 0 ? (
        /* Empty State 2: Filter yielded 0 */
        <div className="card text-center py-12 border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No applications match status: <strong>{filter}</strong></p>
          <button onClick={() => setFilter('ALL')} className="mt-3 btn-secondary text-xs">
            Reset Filter
          </button>
        </div>
      ) : (
        /* FEATURE 7: Applications Table */
        <div className="card p-0 overflow-hidden border border-gray-200 shadow-sm">
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Scheme & Department</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th>Missing Documents</th>
                  <th>Last Updated</th>
                  <th>Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.map((app) => {
                  const statusConf = STATUS_MAP[app.status] || {
                    label: app.status,
                    cls: 'bg-gray-100 text-gray-800 border-gray-200',
                  };

                  const missing = Array.isArray(app.missingDocuments) ? app.missingDocuments : [];

                  return (
                    <tr key={app.id} className="hover:bg-gray-50/70 transition">
                      {/* Application ID */}
                      <td className="whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                          {app.applicationId || app.id.substring(0, 8)}
                        </span>
                      </td>

                      {/* Scheme & Department */}
                      <td>
                        <div className="font-bold text-gray-900 text-sm">
                          {app.scheme?.name || 'Welfare Scheme'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {app.scheme?.department || 'Government of Gujarat'}
                        </div>
                        {app.benefit && (
                          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                            Benefit: {app.benefit}
                          </div>
                        )}
                      </td>

                      {/* Applied Date */}
                      <td className="whitespace-nowrap text-xs text-gray-600">
                        {formatDate(app.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap">
                        <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${statusConf.cls}`}>
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Missing Documents */}
                      <td>
                        {missing.length === 0 ? (
                          <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                            <span>✓</span>
                            <span>All verified</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {missing.map((doc, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded"
                              >
                                ⚠ {String(doc.documentType || doc).replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="whitespace-nowrap text-xs text-gray-500">
                        {formatDate(app.updatedAt)}
                      </td>
                      <td>
                        <Link to={`/documents?applicationId=${app.id}`} className="btn-secondary text-[11px] py-1.5 px-2.5">
                          Manage documents
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FEATURE 6: Submit Application Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Government Scheme Application"
      >
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="label">Select Government Scheme *</label>
            <select
              value={selectedSchemeId}
              onChange={(e) => setSelectedSchemeId(e.target.value)}
              className="input text-sm"
              required
            >
              {schemes.map((s) => (
                <option key={s.id || s.code} value={s.id || s.code}>
                  [{s.code}] {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Scheme Benefit Preview */}
          {(() => {
            const current = schemes.find(
              (s) => s.id === selectedSchemeId || s.code === selectedSchemeId
            );
            return current?.benefit ? (
              <div className="bg-primary-50 p-3 rounded-lg border border-primary-100 text-xs">
                <span className="font-bold text-primary-900 block">Sanctioned Benefit:</span>
                <span className="text-primary-700 mt-0.5 block">{current.benefit}</span>
              </div>
            ) : null;
          })()}

          <div>
            <label className="label">Application Remarks / Additional Notes</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Applying for rural irrigation assistance under Kisan Suryodaya Yojana…"
              className="input text-sm"
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg text-[11px] text-gray-500 border border-gray-100">
            Household Family ID <strong className="font-mono text-gray-800">{family?.familyIdNumber}</strong> will be associated with this application. Status will initialize as <strong className="text-amber-700 font-bold">PENDING</strong>.
          </div>

          <div className="modal-actions pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSchemeId}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" color="text-white" />
                  <span>Submitting Claim…</span>
                </>
              ) : (
                <span>Confirm & Submit Application</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
