import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFamilyDetails, updateFamilyVerification, flagFamilyQuality } from '../api/officer.api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { formatCurrency, formatDate, getAge } from '../utils/formatters';

const STATUS_BADGES = {
  VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  UNDER_REVIEW: 'bg-blue-50 text-blue-800 border-blue-300',
  REQUIRES_UPDATE: 'bg-amber-50 text-amber-800 border-amber-300',
  PENDING: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function OfficerFamilyDetails() {
  const { id } = useParams();

  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('VERIFIED');
  const [auditNotes, setAuditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [id]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFamilyDetails(id);
      const data = res.data?.data;
      setFamily(data);
      if (data?.verificationStatus) {
        setSelectedStatus(data.verificationStatus);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load authorized family records.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    try {
      await updateFamilyVerification(family.id, {
        verificationStatus: selectedStatus,
        notes: auditNotes,
      });

      setSuccessMsg(`Status updated to ${selectedStatus}. Audit history entry created.`);
      setStatusModalOpen(false);
      setAuditNotes('');
      await loadDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update verification status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Decrypting and loading authorized family files…</p>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="card text-center py-16 space-y-4 max-w-lg mx-auto">
        <div className="text-3xl">🏛️</div>
        <h2 className="text-xl font-bold text-gray-900">Household Record Not Found</h2>
        <p className="text-xs text-gray-500">The requested family does not exist in Gujarat registry.</p>
        <Link to="/officer/families" className="btn-primary inline-flex text-xs">
          ← Back to Registry Search
        </Link>
      </div>
    );
  }

  const members = family.members || [];
  const applications = family.applications || [];
  const auditLogs = family.auditLogs || [];
  const head = members.find((m) => m.isFamilyHead) || members[0];
  const badgeCls = STATUS_BADGES[family.verificationStatus] || 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/officer/dashboard" className="hover:text-purple-600">Officer Console</Link>
        <span>/</span>
        <Link to="/officer/families" className="hover:text-purple-600">Family Registry</Link>
        <span>/</span>
        <span className="text-gray-900 font-mono font-bold">{family.familyIdNumber}</span>
      </nav>

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

      {/* Header Banner: Family Info & Verification Action */}
      <div className="card space-y-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-lg sm:text-xl font-extrabold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                {family.familyIdNumber}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeCls}`}>
                {family.verificationStatus}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                Active Registry Record
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registered on {formatDate(family.createdAt)} • Last official update: {formatDate(family.updatedAt)}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setStatusModalOpen(true)}
              className="btn-primary text-xs py-2 px-4 bg-purple-600 hover:bg-purple-700 font-bold shadow-sm"
            >
              Change Verification Status ⚙
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Head of Family</span>
            <span className="text-sm font-bold text-gray-900 block mt-0.5">{head?.fullName || 'Not Designated'}</span>
            <span className="text-[11px] font-mono text-gray-500">{head?.mobileNumberMasked || 'No Phone'}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Household Annual Income</span>
            <span className="text-sm font-bold text-gray-900 block mt-0.5">
              {family.annualIncome ? formatCurrency(family.annualIncome) : 'Not Declared'}
            </span>
            <span className="text-[11px] text-gray-500">Self-attested revenue figure</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Location / Revenue Ward</span>
            <span className="text-sm font-bold text-gray-900 block mt-0.5">
              {family.district ? `${family.villageCity || ''}, ${family.district}` : family.addressId || 'Gujarat'}
            </span>
            <span className="text-[11px] font-mono text-gray-500">{family.addressId}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 block font-medium">Roster & Claims</span>
            <span className="text-sm font-bold text-gray-900 block mt-0.5">
              {members.length} Members • {applications.length} Applications
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">Government verified</span>
          </div>
        </div>
      </div>

      {/* FEATURE 3: Family Members Table with Sensitive Data Masking */}
      <div className="card space-y-3 p-0 overflow-hidden border border-gray-200 shadow-sm">
        <div className="p-4 sm:p-5 pb-0">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>👥</span>
            <span>Family Members Roster (Masked PII)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Aadhaar and personal phone numbers are masked in compliance with Government privacy directives.
          </p>
        </div>

        <div className="table-wrapper border-0 rounded-none">
          <table className="table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Relationship</th>
                <th>Age / Gender</th>
                <th>Occupation</th>
                <th>Education Status</th>
                <th>Aadhaar Token</th>
                <th>Mobile Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const age = getAge(member.dateOfBirth);
                return (
                  <tr key={member.id} className="hover:bg-gray-50/70 text-xs">
                    <td>
                      <div className="font-bold text-gray-900">{member.fullName}</div>
                      {member.isFamilyHead && (
                        <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.2 rounded">
                          HEAD
                        </span>
                      )}
                    </td>
                    <td className="text-gray-700 font-medium">{member.relationToHead}</td>
                    <td className="text-gray-600">
                      {age != null ? `${age} yrs` : 'N/A'} • {member.gender}
                    </td>
                    <td className="text-gray-600">{member.occupation || 'N/A'}</td>
                    <td className="text-gray-600">
                      {member.educationLevel ? (
                        <span className="font-semibold text-gray-800">{member.educationLevel}</span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          ⚠ Missing
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {member.aadhaarReferenceMasked || 'XXXX-XXXX-XXXX'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {member.mobileNumberMasked || 'XXXXXX'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Applications & Benefits Section */}
      <div className="card space-y-4 border border-gray-200 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span>📁</span>
          <span>Scheme Claims & Applications History ({applications.length})</span>
        </h2>

        {applications.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">No welfare scheme applications on file.</p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded text-[11px]">
                      {app.applicationId}
                    </span>
                    <h3 className="font-bold text-gray-900">{app.scheme?.name || 'Welfare Scheme'}</h3>
                  </div>
                  <p className="text-gray-500">
                    Dept: {app.scheme?.department} • Benefit: <strong className="text-emerald-800">{app.benefit || app.scheme?.benefit}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-bold px-2.5 py-1 rounded-full text-xs border ${
                    app.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                    app.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    'bg-gray-100 text-gray-800 border-gray-300'
                  }`}>
                    {app.status}
                  </span>
                  <span className="text-gray-400 font-mono text-[11px]">{formatDate(app.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FEATURE 4: Audit History Timeline */}
      <div className="card space-y-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>📜</span>
              <span>Official Verification & Modification Audit Trail</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Immutable ledger of all state officer status transitions, biometric verifications, and quality flags.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {auditLogs.length} Records
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">
            No audit log entries recorded yet for this household.
          </p>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {auditLogs.map((log) => (
              <div key={log.id} className="relative text-xs space-y-1">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-purple-600 ring-4 ring-purple-100" />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">
                    {log.action?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-400 font-mono text-[11px]">
                    {formatDate(log.createdAt)}
                  </span>
                </div>

                <p className="text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  {log.notes || 'Status updated by authorized officer.'}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-0.5">
                  <span>Officer: <strong className="text-gray-800">{log.officerName || 'Government Officer'}</strong></span>
                  <span>•</span>
                  <span>Role: <strong className="uppercase text-purple-700">{log.performedByRole || 'OFFICER'}</strong></span>
                  {log.newState?.verificationStatus && (
                    <>
                      <span>•</span>
                      <span>Result: <strong className="text-emerald-700">{log.newState.verificationStatus}</strong></span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Change Verification Status: ${family.familyIdNumber}`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="label">Verification Status *</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input text-xs font-bold"
              required
            >
              <option value="VERIFIED">VERIFIED — Validated against civil registry & documents</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW — In progress officer inspection</option>
              <option value="REQUIRES_UPDATE">REQUIRES_UPDATE — Discrepancy flagged to citizen</option>
            </select>
          </div>

          <div>
            <label className="label">Officer Verification Justification & Audit Notes *</label>
            <textarea
              rows={3}
              required
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="e.g., Verified citizen ration card and agricultural land records against revenue database…"
              className="input text-xs"
            />
          </div>

          <div className="p-2.5 bg-gray-50 rounded-lg text-[11px] text-gray-500 border border-gray-200 font-mono">
            This verification change will be logged with your Officer ID and an immutable timestamp.
          </div>

          <div className="modal-actions pt-2">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={updating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="btn-primary text-xs bg-purple-600 hover:bg-purple-700"
            >
              {updating ? <LoadingSpinner size="sm" color="text-white" /> : 'Confirm & Write Audit Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
