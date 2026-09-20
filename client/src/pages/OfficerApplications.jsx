import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { getOfficerApplications, updateApplicationStatus } from '../api/officer.api';
import { formatDate } from '../utils/formatters';

const STATUSES = ['PENDING', 'UNDER_REVIEW', 'DOCUMENT_REQUIRED', 'APPROVED', 'REJECTED'];
const STATUS_BADGES = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-800 border-blue-200',
  DOCUMENT_REQUIRED: 'bg-orange-50 text-orange-800 border-orange-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
};

export default function OfficerApplications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const page = Number(searchParams.get('page')) || 1;
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOfficerApplications({ search, status, page, limit: 10 });
      setApplications(response.data?.data || []);
      setPagination(response.data?.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.clientMessage || err.response?.data?.message || 'Unable to load applications.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const applyFilters = (event) => {
    event.preventDefault();
    const params = { page: 1 };
    if (search.trim()) params.search = search.trim();
    if (status) params.status = status;
    setSearchParams(params);
  };

  const openStatusModal = (application) => {
    setSelected(application);
    setNextStatus(application.status);
    setReason('');
  };

  const saveStatus = async (event) => {
    event.preventDefault();
    if (!selected || (['REJECTED', 'DOCUMENT_REQUIRED'].includes(nextStatus) && !reason.trim())) return;
    setSaving(true);
    try {
      await updateApplicationStatus(selected.id, { status: nextStatus, reason: reason.trim() });
      setSelected(null);
      setToast('Application status updated and audit entry recorded.');
      fetchApplications();
    } catch (err) {
      setError(err.clientMessage || err.response?.data?.message || 'Unable to update application status.');
    } finally {
      setSaving(false);
    }
  };

  const goToPage = (targetPage) => setSearchParams({ page: targetPage, ...(search ? { search } : {}), ...(status ? { status } : {}) });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <span className="eyebrow">Officer workspace</span>
          <h1 className="page-title">Application Management</h1>
          <p className="page-subtitle">Review submitted welfare applications and record accountable decisions.</p>
        </div>
        <Link to="/officer/audit-logs" className="btn-secondary text-xs py-2 px-4">View Audit Log</Link>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />
      {toast && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">{toast}</div>}

      <div className="card">
        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
          <div>
            <label className="label" htmlFor="application-search">Search</label>
            <input id="application-search" className="input text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Application ID, FamilyID, or scheme" />
          </div>
          <div>
            <label className="label" htmlFor="application-status">Status</label>
            <select id="application-status" className="input text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <button className="btn-primary text-sm py-2.5 px-5" type="submit">Apply filters</button>
        </form>
      </div>

      {loading ? <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div> : applications.length === 0 ? (
        <div className="card text-center py-16 border-2 border-dashed border-gray-200">
          <h2 className="font-bold text-gray-900">No applications found</h2>
          <p className="text-sm text-gray-500 mt-1">Try a different search or status filter.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrapper border-0 rounded-none">
            <table className="table min-w-[800px]">
              <thead><tr><th>Application ID</th><th>FamilyID</th><th>Scheme</th><th>Submitted Date</th><th>Status</th><th>Last Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{applications.map((application) => (
                <tr key={application.id}>
                  <td className="font-mono text-xs font-semibold text-gray-900">{application.applicationId}</td>
                  <td className="font-mono text-xs">{application.family?.familyIdNumber || '—'}</td>
                  <td><span className="font-medium text-gray-900">{application.scheme?.name || '—'}</span><span className="block text-xs text-gray-500">{application.scheme?.code || ''}</span></td>
                  <td className="text-xs">{formatDate(application.createdAt)}</td>
                  <td><span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-bold tracking-wide ${STATUS_BADGES[application.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>{application.status}</span></td>
                  <td className="text-xs">{formatDate(application.updatedAt)}</td>
                  <td><button className="btn-secondary text-xs py-1.5 px-3" onClick={() => openStatusModal(application)}>Update status</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            <span>{pagination.total} applications</span>
            <div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => goToPage(page - 1)} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Previous</button><span>Page {page} of {pagination.totalPages || 1}</span><button disabled={page >= pagination.totalPages} onClick={() => goToPage(page + 1)} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Next</button></div>
          </div>
        </div>
      )}

      <Modal isOpen={Boolean(selected)} onClose={() => !saving && setSelected(null)} title="Confirm application status change">
        <form onSubmit={saveStatus} className="space-y-4">
          <p className="text-sm text-gray-600">Update <strong>{selected?.applicationId}</strong>. This action will be recorded in the audit log.</p>
          <div><label className="label" htmlFor="next-status">New status</label><select id="next-status" className="input" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="label" htmlFor="status-reason">Reason or comment {['REJECTED', 'DOCUMENT_REQUIRED'].includes(nextStatus) ? <span className="text-red-600">(required)</span> : '(optional)'}</label><textarea id="status-reason" className="input min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record the decision context" required={['REJECTED', 'DOCUMENT_REQUIRED'].includes(nextStatus)} /></div>
          <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setSelected(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving || (['REJECTED', 'DOCUMENT_REQUIRED'].includes(nextStatus) && !reason.trim())} className="btn-primary">{saving ? 'Saving…' : 'Confirm update'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
