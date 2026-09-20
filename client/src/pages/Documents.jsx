import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApplications } from '../api/applications.api';
import { getDocumentFile, getDocumentRequirements, getMyDocuments, uploadDocument } from '../api/documents.api';
import { useFamily } from '../context/FamilyContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const STATUS_STYLES = {
  VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  UPLOADED: 'bg-slate-50 text-slate-700 border-slate-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-800 border-blue-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  EXPIRED: 'bg-orange-50 text-orange-800 border-orange-200',
  MISSING: 'bg-amber-50 text-amber-800 border-amber-200',
};
const formatType = (value = '') => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';

function StatusBadge({ status }) {
  return <span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-bold tracking-wide ${STATUS_STYLES[status] || STATUS_STYLES.UPLOADED}`}>{formatType(status)}</span>;
}

export default function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { members } = useFamily();
  const [documents, setDocuments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [requirements, setRequirements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [memberId, setMemberId] = useState('');
  const applicationId = searchParams.get('applicationId') || '';

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [documentResponse, applicationResponse] = await Promise.all([getMyDocuments(), getApplications()]);
      setDocuments(documentResponse.data?.data || []);
      setApplications(applicationResponse.data?.data || []);
    } catch (requestError) {
      setError(requestError.clientMessage || requestError.response?.data?.message || 'Unable to load documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  useEffect(() => {
    if (!applicationId) {
      setRequirements(null);
      return;
    }
    setRequirementsLoading(true);
    getDocumentRequirements(applicationId)
      .then((response) => setRequirements(response.data))
      .catch((requestError) => setError(requestError.clientMessage || requestError.response?.data?.message || 'Unable to load document requirements.'))
      .finally(() => setRequirementsLoading(false));
  }, [applicationId]);

  const openUpload = (type = '') => {
    setDocumentType(type);
    setSelectedFile(null);
    setProgress(0);
    setMessage(null);
  };

  const viewFile = async (id) => {
    try {
      const response = await getDocumentFile(id);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      setError(requestError.clientMessage || 'Unable to open the private demo file.');
    }
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile || !documentType.trim()) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(selectedFile.type)) return setError('Only PDF, JPG, JPEG, and PNG files are allowed.');
    if (selectedFile.size > 10 * 1024 * 1024) return setError('Document file must be 10 MB or smaller.');
    setUploading(true);
    setError(null);
    try {
      await uploadDocument({ file: selectedFile, documentType: documentType.trim(), memberId, applicationId }, (eventProgress) => setProgress(eventProgress.total ? Math.round((eventProgress.loaded / eventProgress.total) * 100) : 0));
      setMessage('Document uploaded and queued for officer review.');
      setSelectedFile(null);
      setDocumentType('');
      await loadDocuments();
      if (applicationId) {
        const response = await getDocumentRequirements(applicationId);
        setRequirements(response.data);
      }
    } catch (requestError) {
      setError(requestError.clientMessage || requestError.response?.data?.message || 'Document upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><span className="eyebrow">Secure demo document vault</span><h1 className="page-title">My Documents</h1><p className="page-subtitle">Upload synthetic documents and track officer verification for your family.</p></div><button type="button" onClick={() => openUpload()} className="btn-primary text-sm py-2.5 px-4">Upload document</button></div>
      <ErrorMessage message={error} onClose={() => setError(null)} />
      {message && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">{message}</div>}

      <div className="card space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="font-bold text-gray-900">Application document checklist</h2><p className="text-xs text-gray-500 mt-1">Requirements come from the scheme configuration.</p></div><select value={applicationId} onChange={(event) => setSearchParams(event.target.value ? { applicationId: event.target.value } : {})} className="input text-xs sm:max-w-xs"><option value="">Select an application</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.applicationId} · {application.scheme?.name}</option>)}</select></div>
        {requirementsLoading ? <LoadingSpinner size="sm" /> : requirements ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{requirements.requirements.map((requirement) => <div key={requirement.documentType} className="p-3 rounded-xl border border-gray-200 flex items-center justify-between gap-3"><div><p className="font-semibold text-sm text-gray-900">{formatType(requirement.documentType)}</p><p className="text-[11px] text-gray-500">{requirement.isRequired ? 'Required' : 'Optional'}</p></div><div className="flex items-center gap-2"><StatusBadge status={requirement.status} />{requirement.status === 'MISSING' || requirement.status === 'REJECTED' || requirement.status === 'EXPIRED' ? <button type="button" onClick={() => openUpload(requirement.documentType)} className="text-[11px] font-bold text-primary-700 hover:underline">Upload</button> : null}</div></div>)}</div> : <p className="text-sm text-gray-500">Select an application to view its configured document requirements.</p>}
      </div>

      {loading ? <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div> : documents.length === 0 ? <div className="card text-center py-16 border-2 border-dashed border-gray-200"><h2 className="font-bold text-gray-900">No documents uploaded</h2><p className="text-sm text-gray-500 mt-1">Synthetic demo uploads will appear here after submission.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{documents.map((document) => <div className="card space-y-4" key={document.id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-gray-900 text-sm break-words">{document.documentName}</h2><p className="text-xs text-gray-500 mt-1">{formatType(document.documentType)}</p></div><StatusBadge status={document.status} /></div><div className="text-xs text-gray-600 space-y-1"><p>Related member: <strong>{document.member?.fullName || 'Family profile'}</strong></p><p>Uploaded: {formatDate(document.uploadedAt)}</p><p>Expiry: {formatDate(document.expiryDate)}</p></div>{document.rejectionReason && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">Reason: {document.rejectionReason}</p>}{document.consistencyFlags?.some((flag) => flag.status === 'MISMATCH') && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">Potential inconsistency detected. An officer will review it.</p>}<button type="button" onClick={() => viewFile(document.id)} className="btn-secondary inline-flex text-xs py-1.5 px-3">View document</button></div>)}</div>}

      <div className="card border-primary-100 bg-primary-50/40"><h2 className="font-bold text-gray-900 text-sm">Upload demo document</h2><p className="text-xs text-gray-500 mt-1">Allowed formats: PDF, JPG, JPEG, PNG. Maximum size: 10 MB. Verification is always performed by an officer.</p><form onSubmit={submitUpload} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="label" htmlFor="document-type">Document type</label><input id="document-type" className="input text-sm" value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="e.g. income_certificate" required /></div><div><label className="label" htmlFor="document-member">Related member</label><select id="document-member" className="input text-sm" value={memberId} onChange={(event) => setMemberId(event.target.value)}><option value="">Family profile</option>{members.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></div><div className="md:col-span-2"><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-800" required />{selectedFile && <p className="text-xs text-gray-500 mt-1">{selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>}</div>{uploading && <div className="md:col-span-2"><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="text-xs text-gray-500 mt-1">Uploading {progress}%…</p></div>}<div className="md:col-span-2"><button type="submit" disabled={uploading || !selectedFile} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">{uploading ? 'Uploading…' : 'Upload for review'}</button></div></form></div>
      <p className="text-[11px] text-gray-400">Demo storage uses private server-side file references. Files are not publicly listed.</p>
    </div>
  );
}
