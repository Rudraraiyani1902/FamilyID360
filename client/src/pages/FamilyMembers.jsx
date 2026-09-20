import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { addMember, updateMember, removeMember } from '../api/members.api';
import FamilyMemberCard from '../components/FamilyMemberCard';
import Modal from '../components/Modal';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { getAge } from '../utils/formatters';

const INITIAL_FORM = {
  fullName: '',
  relationToHead: 'Child',
  dateOfBirth: '',
  gender: 'Male',
  occupation: '',
  educationLevel: 'High School',
  disabilityStatus: 'None',
  maritalStatus: 'Single',
  isFamilyHead: false,
};

export default function FamilyMembers() {
  const { family, members, loadFamily, loading: familyLoading, error: familyError, setError } = useFamily();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1 & 2. Load authenticated user's family and members roster on mount
  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const openAddModal = () => {
    setEditingMember(null);
    setFormData(INITIAL_FORM);
    setLocalError(null);
    setModalOpen(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setFormData({
      fullName: member.fullName || '',
      relationToHead: member.relationToHead || 'Child',
      dateOfBirth: member.dateOfBirth ? member.dateOfBirth.split('T')[0] : '',
      gender: member.gender || 'Male',
      occupation: member.occupation || '',
      educationLevel: member.educationLevel || '',
      disabilityStatus: member.disabilityStatus || 'None',
      maritalStatus: member.maritalStatus || 'Single',
      isFamilyHead: Boolean(member.isFamilyHead),
    });
    setLocalError(null);
    setModalOpen(true);
  };

  // 9. Validation for required fields, date of birth, age, relationship, gender, occupation
  const validateForm = () => {
    if (!formData.fullName.trim()) {
      return 'Full legal name is required.';
    }
    if (!formData.relationToHead) {
      return 'Relationship to head is required.';
    }
    if (!formData.dateOfBirth) {
      return 'Date of birth is required.';
    }

    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    if (isNaN(birthDate.getTime())) {
      return 'Please enter a valid date of birth.';
    }
    if (birthDate > today) {
      return 'Date of birth cannot be in the future.';
    }

    const age = getAge(formData.dateOfBirth);
    if (age == null || age < 0 || age > 125) {
      return 'Calculated age must be between 0 and 125 years.';
    }

    if (!formData.gender) {
      return 'Gender is required.';
    }

    if (!formData.occupation.trim()) {
      return 'Occupation is required (e.g. Farmer, Student, Homemaker, Self-employed).';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    if (!family?.id) {
      setLocalError('No active household profile found. Please create a family profile first.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        relationToHead: formData.relationToHead,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        occupation: formData.occupation.trim(),
        educationLevel: formData.educationLevel || null,
        disabilityStatus: formData.disabilityStatus || 'None',
        maritalStatus: formData.maritalStatus || 'Single',
        isFamilyHead: formData.isFamilyHead,
      };

      if (editingMember) {
        // 10. Edit Family Member
        await updateMember(family.id, editingMember.id, payload);
        setSuccessMsg(`Member "${payload.fullName}" details updated successfully.`);
      } else {
        // 9. Add Family Member
        await addMember(family.id, payload);
        setSuccessMsg(`Member "${payload.fullName}" added to household roster.`);
      }

      // 12. Refresh the family data after adding/editing
      await loadFamily();
      setModalOpen(false);
    } catch (err) {
      setLocalError(err.clientMessage || err.response?.data?.message || 'Operation failed. Please verify input.');
    } finally {
      setSubmitting(false);
    }
  };

  // 11. Delete/Remove Family Member functionality
  const handleDelete = async (memberId) => {
    const target = members.find((m) => m.id === memberId);
    if (target?.isFamilyHead) {
      setLocalError('The Head of Family cannot be removed.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove ${target?.fullName || 'this member'} from the household registry?`)) {
      return;
    }

    setLocalError(null);
    setSuccessMsg(null);

    try {
      // 13. Backend verifies family.createdBy === req.user.id
      await removeMember(family.id, memberId);
      setSuccessMsg(`Member "${target?.fullName || ''}" removed successfully.`);
      // 12. Refresh family data
      await loadFamily();
    } catch (err) {
      setLocalError(err.clientMessage || err.response?.data?.message || 'Failed to remove member.');
    }
  };

  if (familyLoading && !family) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Loading Household Members Roster…</p>
      </div>
    );
  }

  // 7. Empty State: Family profile does not exist
  if (!family) {
    return (
      <div className="card text-center py-16 px-6 max-w-2xl mx-auto border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl mb-4">
          👥
        </div>
        <h2 className="text-xl font-bold text-gray-900">Household Profile Required</h2>
        <p className="mt-2 text-sm text-gray-500">
          You must enroll a family household profile before adding members.
        </p>
        <Link to="/family" className="mt-5 btn-primary py-2.5 px-5 text-sm inline-flex">
          Go to Family Profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Household Members Roster</h1>
          <p className="page-subtitle">
            Registered individuals under Family ID <span className="font-mono font-bold text-gray-800">{family.familyIdNumber}</span>
          </p>
        </div>
        <button onClick={openAddModal} className="btn-primary self-start sm:self-auto shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add Family Member</span>
        </button>
      </div>

      <ErrorMessage
        message={localError || familyError}
        onClose={() => {
          setLocalError(null);
          setError(null);
        }}
      />

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold">✓</span>
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-green-600 font-bold hover:text-green-800 text-base"
          >
            ×
          </button>
        </div>
      )}

      {/* 7. Empty State: No members exist */}
      {members.length === 0 ? (
        <div className="card text-center py-16 px-6 border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-3xl mb-4">
            👨‍👩‍👧‍👦
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Family Members Registered Yet</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Add members of your household to enable the Gujarat automated entitlement engine to evaluate eligible schemes.
          </p>
          <button
            onClick={openAddModal}
            className="mt-5 btn-primary text-sm py-2.5 px-5 font-semibold shadow-md"
          >
            + Add First Family Member
          </button>
        </div>
      ) : (
        /* 4. Display every family member with name, relationship, age, gender, occupation, education status */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 9 & 10. Add / Edit Member Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? `Edit Member: ${editingMember.fullName}` : 'Register Family Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Legal Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="input"
                placeholder="Full Name as on Aadhaar"
              />
            </div>

            <div>
              <label className="label">Relationship to Head *</label>
              <select
                required
                value={formData.relationToHead}
                onChange={(e) => setFormData({ ...formData, relationToHead: e.target.value })}
                className="input"
              >
                <option value="Head">Head</option>
                <option value="Spouse">Spouse</option>
                <option value="Wife">Wife</option>
                <option value="Husband">Husband</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Grandmother">Grandmother</option>
                <option value="Grandfather">Grandfather</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Other">Other Relative</option>
              </select>
            </div>

            <div>
              <label className="label">Date of Birth *</label>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="input"
              />
              {formData.dateOfBirth && (
                <p className="text-[11px] text-primary-700 font-medium mt-1">
                  Age: {getAge(formData.dateOfBirth)} years
                </p>
              )}
            </div>

            <div>
              <label className="label">Gender *</label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="input"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Occupation *</label>
              <input
                type="text"
                required
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="input"
                placeholder="e.g. Farmer, Student, Homemaker"
              />
            </div>

            <div>
              <label className="label">Education Status</label>
              <select
                value={formData.educationLevel}
                onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                className="input"
              >
                <option value="None">None / Non-Formal</option>
                <option value="Primary School">Primary School (Class 1-5)</option>
                <option value="Middle School">Middle School (Class 6-8)</option>
                <option value="High School">High School (Class 9-10)</option>
                <option value="Higher Secondary (Science)">Higher Secondary (Science 11-12)</option>
                <option value="Higher Secondary (Commerce/Arts)">Higher Secondary (Commerce/Arts)</option>
                <option value="Diploma / ITI">Diploma / ITI</option>
                <option value="Graduate">Graduate / Degree</option>
                <option value="Post Graduate">Post Graduate</option>
              </select>
            </div>

            <div>
              <label className="label">Disability Status</label>
              <select
                value={formData.disabilityStatus}
                onChange={(e) => setFormData({ ...formData, disabilityStatus: e.target.value })}
                className="input"
              >
                <option value="None">None (General)</option>
                <option value="Locomotor Disability">Locomotor Disability</option>
                <option value="Visual Impairment">Visual Impairment</option>
                <option value="Hearing Impairment">Hearing Impairment</option>
                <option value="Other">Other Specified</option>
              </select>
            </div>

            <div>
              <label className="label">Marital Status</label>
              <select
                value={formData.maritalStatus}
                onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                className="input"
              >
                <option value="Single">Single / Unmarried</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isHeadCheck"
              checked={formData.isFamilyHead}
              onChange={(e) => setFormData({ ...formData, isFamilyHead: e.target.checked })}
              className="h-4 w-4 text-primary-600 rounded border-gray-300"
            />
            <label htmlFor="isHeadCheck" className="text-xs font-medium text-gray-700 select-none">
              Designate as Primary Head of Family
            </label>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving to Registry…</span>
                </>
              ) : editingMember ? (
                'Update Member'
              ) : (
                'Add Member'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
