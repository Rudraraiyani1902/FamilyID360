import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { updateMyFamily, createFamily } from '../api/family.api';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { formatCurrency } from '../utils/formatters';

export default function FamilyProfile() {
  const { user } = useAuth();
  const { family, members, loading: familyLoading, error: familyError, loadFamily, setError } = useFamily();

  const [formData, setFormData] = useState({
    addressId: '',
    annualIncome: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [localError, setLocalError] = useState(null);

  // Enroll modal for when family profile does not exist
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    addressId: '',
    annualIncome: '',
  });
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  useEffect(() => {
    if (family) {
      setFormData({
        addressId: family.addressId || '',
        annualIncome: family.annualIncome != null ? String(family.annualIncome) : '',
        status: family.status || 'active',
      });
    }
  }, [family]);

  // 8. Edit Family Profile: only authorized fields
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const payload = {
        addressId: formData.addressId.trim(),
        annualIncome: formData.annualIncome ? Number(formData.annualIncome) : null,
        status: formData.status,
      };

      // 13. Calls PUT /api/families/me — backend enforces authorization for req.user.id
      await updateMyFamily(payload);
      await loadFamily();
      setSuccessMessage('Family profile details updated successfully in the state registry.');
    } catch (err) {
      setLocalError(err.clientMessage || err.response?.data?.message || 'Failed to update family profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setEnrolling(true);

    try {
      await createFamily({
        addressId: enrollForm.addressId.trim(),
        annualIncome: enrollForm.annualIncome ? Number(enrollForm.annualIncome) : null,
      });
      await loadFamily();
      setEnrollModalOpen(false);
      setSuccessMessage('Household enrolled successfully! Family ID generated.');
    } catch (err) {
      setLocalError(err.clientMessage || err.response?.data?.message || 'Failed to create family record.');
    } finally {
      setEnrolling(false);
    }
  };

  if (familyLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Loading Household Civil Profile…</p>
      </div>
    );
  }

  // 7. Empty State: family profile does not exist
  if (!family) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="page-header">
          <h1 className="page-title">Household & Family Profile</h1>
          <p className="page-subtitle">Official state civil registry record & socio-economic profile</p>
        </div>

        <ErrorMessage message={localError || familyError} onClose={() => { setLocalError(null); setError(null); }} />

        <div className="card text-center py-16 px-6 border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl mb-4">
            📋
          </div>
          <h2 className="text-xl font-bold text-gray-900">No Household Profile Registered</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
            You do not have a Family ID on file. Register your residential location to generate your household record.
          </p>
          <button
            onClick={() => setEnrollModalOpen(true)}
            className="mt-5 btn-primary py-2.5 px-5 font-semibold text-sm shadow-md"
          >
            + Create Household Profile
          </button>
        </div>

        <Modal
          isOpen={enrollModalOpen}
          onClose={() => setEnrollModalOpen(false)}
          title="Create Household Civil Record"
        >
          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <label className="label">Registered Address / Village Location ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. VILLAGE-ANAND-GJ-388001"
                value={enrollForm.addressId}
                onChange={(e) => setEnrollForm({ ...enrollForm, addressId: e.target.value })}
                className="input font-mono"
              />
            </div>
            <div>
              <label className="label">Annual Household Income (INR)</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 250000"
                value={enrollForm.annualIncome}
                onChange={(e) => setEnrollForm({ ...enrollForm, annualIncome: e.target.value })}
                className="input"
              />
            </div>
            <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={enrolling}
                className="btn-primary"
              >
                {enrolling ? 'Submitting…' : 'Create Record'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  const headMember = members.find((m) => m.isFamilyHead) || members[0];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <h1 className="page-title">Household & Family Profile</h1>
        <p className="page-subtitle">Official state civil registry record & socio-economic profile</p>
      </div>

      <ErrorMessage
        message={localError || familyError}
        onClose={() => {
          setLocalError(null);
          setError(null);
        }}
      />

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 font-bold hover:text-green-800 text-base"
          >
            ×
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Family ID Number</span>
          <p className="text-lg font-mono font-bold text-gray-900 mt-1">{family.familyIdNumber}</p>
          <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            ● {family.status ? family.status.toUpperCase() : 'ACTIVE'}
          </span>
        </div>

        <div className="card">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Household Head</span>
          <p className="text-lg font-bold text-gray-900 mt-1">{headMember?.fullName || 'Not Designated'}</p>
          <p className="text-xs text-gray-500 mt-1">
            {headMember ? `${headMember.relationToHead} • ${headMember.gender}` : 'Add head in members'}
          </p>
        </div>

        <div className="card">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Annual Household Income</span>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {family.annualIncome != null ? formatCurrency(family.annualIncome) : 'Not Declared'}
          </p>
          <p className="text-xs text-gray-500 mt-1">{members.length} Member{members.length === 1 ? '' : 's'} registered</p>
        </div>
      </div>

      {/* 8. Edit Family Profile Form */}
      <div className="card">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Edit Household Address & Socio-Economic Details
            </h2>
            <p className="text-xs text-gray-500">Authorized citizen updates will sync with civil registry records</p>
          </div>
          <span className="text-xs font-mono text-gray-400">ID: {family.id}</span>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="addressId">
                Address / Village Location ID *
              </label>
              <input
                id="addressId"
                type="text"
                required
                value={formData.addressId}
                onChange={(e) => setFormData({ ...formData, addressId: e.target.value })}
                className="input font-mono"
                placeholder="e.g. VILLAGE-ANAND-GJ-388001"
              />
              <p className="text-[11px] text-gray-400 mt-1">Village code, Taluka, or residential ward token</p>
            </div>

            <div>
              <label className="label" htmlFor="annualIncome">
                Annual Household Income (INR)
              </label>
              <input
                id="annualIncome"
                type="number"
                min={0}
                value={formData.annualIncome}
                onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                className="input"
                placeholder="e.g. 250000"
              />
              <p className="text-[11px] text-gray-400 mt-1">Used for welfare scheme income limit evaluations</p>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="status">
                Registry Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input"
              >
                <option value="active">Active (Eligible for all benefit disbursements)</option>
                <option value="inactive">Inactive (Temporarily suspended)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Last modified: {new Date(family.updatedAt || family.createdAt).toLocaleDateString('en-IN')}
            </span>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving to Registry…</span>
                </>
              ) : (
                'Save Profile Changes'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Read-Only State Civil Registry Details */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
          State Administrative Records
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <dt className="text-gray-500 font-medium">State Authority</dt>
            <dd className="font-semibold text-gray-900 mt-1">Government of Gujarat</dd>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <dt className="text-gray-500 font-medium">Family ID Number</dt>
            <dd className="font-mono font-semibold text-gray-900 mt-1">{family.familyIdNumber}</dd>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <dt className="text-gray-500 font-medium">Enrolled By User</dt>
            <dd className="font-mono text-gray-800 mt-1">{user?.mobileNumber}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
