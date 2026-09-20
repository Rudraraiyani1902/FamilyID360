import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getOfficerDocuments, getOfficerDocumentFile, reviewDocument } from '../api/officerDocuments.api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';

const FILTERS = ['', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'];
const STATUS_STYLES = { UNDER_REVIEW: 'bg-blue-50 text-blue-800 border-blue-200', VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-200', REJECTED: 'bg-red-50 text-red-800 border-red-200', EXPIRED: 'bg-orange-50 text-orange-800 border-orange-200', UPLOADED: 'bg-slate-50 text-slate-700 border-slate-200' };
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
const formatType = (value = '') => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function OfficerDocuments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('VERIFIED');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const page = Number(searchParams.get('page')) || 1;

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOfficerDocuments({ search, status, page, limit: 10 });
      setDocuments(response.data?.data || []);
      setPagination(response.data?.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (requestError) {
      setError(requestError.clientMessage || requestError.response?.data?.message || 'Unable to load document review queue.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);
  const applyFilters = (event) => { event.preventDefault(); setSearchParams({ page: 1, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) }); };
  const changePage = (targetPage) => setSearchParams({ page: targetPage, ...(search ? { search } : {}), ...(status ? { status } : {}) });
  const openReview = (document) => { setSelected(document); setReviewStatus('VERIFIED'); setReason(''); };

  const viewFile = async (id) => {
    try {
      const response = await getOfficerDocumentFile(id);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) { setError(requestError.clientMessage || 'Unable to open the private demo file.'); }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!selected || (reviewStatus === 'REJECTED' && !reason.trim())) return;
    setSaving(true);
    try {
      await reviewDocument(selected.id, { status: reviewStatus, reason: reason.trim() });
      setSelected(null);
      setNotice(`Document ${reviewStatus.toLowerCase()} and audit entry recorded.`);
      loadDocuments();
    } catch (requestError) { setError(requestError.clientMessage || requestError.response?.data?.message || 'Unable to save document review.'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><span className="eyebrow">Officer workspace</span><h1 className="page-title">Document Verification</h1><p className="page-subtitle">Review synthetic uploads, inspect consistency flags, and record accountable decisions.</p></div><Link to="/officer/audit-logs" className="btn-secondary text-xs py-2 px-4">View audit log</Link></div>
      <ErrorMessage message={error} onClose={() => setError(null)} />{notice && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">{notice}</div>}
      <div className="card"><form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end"><div><label className="label" htmlFor="document-search">Search</label><input id="document-search" className="input text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="FamilyID, document type, application ID" /></div><div><label className="label" htmlFor="document-status">Status</label><select id="document-status" className="input text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All documents</option>{FILTERS.filter(Boolean).map((item) => <option key={item}>{item}</option>)}</select></div><button type="submit" className="btn-primary py-2.5 px-5 text-sm">Apply filters</button></form></div>
      {loading ? <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div> : documents.length === 0 ? <div className="card text-center py-16 border-2 border-dashed border-gray-200"><h2 className="font-bold text-gray-900">No documents require attention</h2><p className="text-sm text-gray-500 mt-1">Uploads will appear here when citizens submit demo documents.</p></div> : <div className="card p-0 overflow-hidden"><div className="table-wrapper border-0 rounded-none"><table className="table min-w-[950px]"><thead><tr><th>Document</th><th>FamilyID</th><th>Member</th><th>Scheme/Application</th><th>Uploaded</th><th>Status</th><th>Actions</th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}><td><p className="font-semibold text-xs text-gray-900">{document.documentName}</p><p className="text-[11px] text-gray-500">{formatType(document.documentType)}</p>{document.consistencyFlags?.some((flag) => flag.status === 'MISMATCH') && <span className="text-[10px] text-amber-700">Potential inconsistency</span>}</td><td className="font-mono text-xs">{document.family?.familyIdNumber || '—'}</td><td className="text-xs">{document.member?.fullName || 'Family profile'}</td><td className="text-xs">{document.application?.scheme?.name || '—'}<span className="block text-gray-500">{document.application?.applicationId || ''}</span></td><td className="text-xs">{formatDate(document.uploadedAt)}</td><td><span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-bold ${STATUS_STYLES[document.status] || STATUS_STYLES.UPLOADED}`}>{formatType(document.status)}</span></td><td><div className="flex gap-2"><button type="button" onClick={() => viewFile(document.id)} className="btn-secondary text-[11px] py-1.5 px-2.5">View</button>{['UNDER_REVIEW', 'UPLOADED'].includes(document.status) && <button type="button" onClick={() => openReview(document)} className="btn-primary text-[11px] py-1.5 px-2.5">Review</button>}</div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500"><span>{pagination.total} documents</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Previous</button><span>Page {page} of {pagination.totalPages || 1}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => changePage(page + 1)} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Next</button></div></div></div>}
      <Modal isOpen={Boolean(selected)} onClose={() => !saving && setSelected(null)} title="Review document"><form onSubmit={submitReview} className="space-y-4"><p className="text-sm text-gray-600">{selected?.documentName} for <strong>{selected?.family?.familyIdNumber}</strong>. AI extraction, when available, is advisory only.</p><div><label className="label" htmlFor="review-status">Decision</label><select id="review-status" className="input" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}><option value="VERIFIED">Verify document</option><option value="REJECTED">Reject document</option></select></div><div><label className="label" htmlFor="review-reason">Reason {reviewStatus === 'REJECTED' ? <span className="text-red-600">(required)</span> : '(optional)'}</label><textarea id="review-reason" className="input min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Document is unclear or incomplete" required={reviewStatus === 'REJECTED'} /></div><div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setSelected(null)} className="btn-secondary">Cancel</button><button type="submit" disabled={saving || (reviewStatus === 'REJECTED' && !reason.trim())} className="btn-primary">{saving ? 'Saving…' : 'Confirm decision'}</button></div></form></Modal>
    </div>
  );
}
