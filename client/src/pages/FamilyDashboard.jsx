import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { createFamily } from '../api/family.api';
import { getMyEligibility } from '../api/eligibility.api';
import { getApplications } from '../api/applications.api';
import StatCard from '../components/StatCard';
import EligibilityBadge from '../components/EligibilityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import { formatCurrency, getAge } from '../utils/formatters';

export default function FamilyDashboard() {
  const { user } = useAuth();
  const { family, members, loading: familyLoading, error: familyError, loadFamily, setError } = useFamily();
  
  const [eligibilityData, setEligibilityData] = useState(null);
  const [loadingElig, setLoadingElig] = useState(false);
  const [eligError, setEligError] = useState(null);
  const [applications, setApplications] = useState([]);

  // Enroll Family modal state (for empty state when family profile does not exist)
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    addressId: '',
    annualIncome: '',
    headFullName: '',
    headDateOfBirth: '',
    headGender: 'Male',
    headOccupation: 'Farmer',
  });
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState(null);

  // 1 & 2. Load authenticated user's family via GET /api/families/me on mount
  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  // When family is loaded, evaluate live scheme eligibility
  useEffect(() => {
    if (!family?.id) {
      setEligibilityData(null);
      return;
    }

    const loadDashboardData = async () => {
      setLoadingElig(true);
      setEligError(null);
      try {
        const [elRes, appsRes] = await Promise.allSettled([
          getMyEligibility(),
          getApplications(),
        ]);

        if (elRes.status === 'fulfilled') {
          setEligibilityData(elRes.value.data?.results || []);
        } else {
          setEligError(elRes.reason?.response?.data?.message || 'Could not load live eligibility');
        }

        if (appsRes.status === 'fulfilled') {
          setApplications(appsRes.value.data?.data || []);
        }
      } catch (err) {
        setEligError('Could not load dashboard metrics');
      } finally {
        setLoadingElig(false);
      }
    };

    loadDashboardData();
  }, [family?.id]);

  // Handle creating household when profile does not exist
  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    setEnrollError(null);
    setEnrolling(true);

    try {
      const payload = {
        addressId: enrollForm.addressId.trim(),
        annualIncome: enrollForm.annualIncome ? Number(enrollForm.annualIncome) : null,
      };

      if (enrollForm.headFullName.trim() && enrollForm.headDateOfBirth) {
        payload.members = [
          {
            fullName: enrollForm.headFullName.trim(),
            relationToHead: 'Head',
            dateOfBirth: enrollForm.headDateOfBirth,
            gender: enrollForm.headGender,
            occupation: enrollForm.headOccupation.trim() || 'Resident',
            isFamilyHead: true,
          },
        ];
      }

      await createFamily(payload);
      await loadFamily();
      setEnrollModalOpen(false);
    } catch (err) {
      setEnrollError(err.clientMessage || err.response?.data?.message || 'Failed to create household record.');
    } finally {
      setEnrolling(false);
    }
  };

  if (familyLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-gray-500">Retrieving official family records from PostgreSQL…</p>
      </div>
    );
  }

  // ── 7. Empty State: Family Profile Does Not Exist ───────────────────────
  if (!family) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <ErrorMessage message={familyError} onClose={() => setError(null)} />

        <div className="card text-center py-16 px-6 sm:px-12 border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto text-3xl mb-4">
            🏛️
          </div>
          <h2 className="text-2xl font-bold text-gray-900">No Household Family Record Found</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
            Your citizen account (<span className="font-mono font-semibold text-gray-700">{user?.mobileNumber}</span>) is active,
            but no family profile has been created yet in the Gujarat Citizen Registry.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setEnrollModalOpen(true)}
              className="btn-primary py-2.5 px-5 font-semibold text-sm shadow-md"
            >
              <span>+ Enroll Household & Generate Family ID</span>
            </button>
            <button
              onClick={() => loadFamily()}
              className="btn-secondary py-2.5 px-4 text-sm"
            >
              ↻ Check Again
            </button>
          </div>
        </div>

        {/* Enroll Household Modal */}
        <Modal
          isOpen={enrollModalOpen}
          onClose={() => setEnrollModalOpen(false)}
          title="Enroll Household — Gujarat Civil Registry"
        >
          <form onSubmit={handleEnrollSubmit} className="space-y-4">
            <ErrorMessage message={enrollError} onClose={() => setEnrollError(null)} />

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
              <p className="text-[11px] text-gray-400 mt-1">Village code, ward, or revenue location token</p>
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

            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block mb-2">
                Designate Head of Family (Optional initial member)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Head Legal Name</label>
                  <input
                    type="text"
                    placeholder="Full Legal Name"
                    value={enrollForm.headFullName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, headFullName: e.target.value })}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={enrollForm.headDateOfBirth}
                    onChange={(e) => setEnrollForm({ ...enrollForm, headDateOfBirth: e.target.value })}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Gender</label>
                  <select
                    value={enrollForm.headGender}
                    onChange={(e) => setEnrollForm({ ...enrollForm, headGender: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="label">Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Farmer, Teacher"
                    value={enrollForm.headOccupation}
                    onChange={(e) => setEnrollForm({ ...enrollForm, headOccupation: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>
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
                {enrolling ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Creating Family ID…</span>
                  </>
                ) : (
                  'Create Household Record'
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ── 3. Real Dashboard Data Calculations ─────────────────────────────────
  const headMember = members.find((m) => m.isFamilyHead) || members[0];
  const totalMembers = members.length;
  
  // Potentially eligible schemes (OUTCOMES: POTENTIALLY_ELIGIBLE or ELIGIBLE)
  const potentiallyEligibleCount =
    eligibilityData?.filter((e) => e.outcome === 'POTENTIALLY_ELIGIBLE').length ?? 0;
  const eligibleSchemesCount =
    eligibilityData?.filter((e) => e.outcome === 'ELIGIBLE').length ?? 0;

  // Applications metrics from live database records
  const activeApplications = applications.filter(
    (a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW' || a.status === 'DOCUMENT_REQUIRED'
  );
  const benefitsReceivedList = applications.filter((a) => a.status === 'APPROVED');
  const benefitsReceivedCount = benefitsReceivedList.length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Real Family Details */}
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-primary-200 backdrop-blur-sm mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Verified State Registry Record
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Family Welfare Portal — Gujarat
          </h1>
          <p className="mt-2 text-sm text-primary-100/90 leading-relaxed">
            Head of Family: <span className="font-semibold text-white">{headMember?.fullName || 'Not Designated'}</span> | 
            Family ID: <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-white font-bold">{family.familyIdNumber}</span> | 
            Location: <span className="text-white/90">{family.addressId || 'Gujarat'}</span>
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/eligibility"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow transition"
            >
              <span>⚡ Check Scheme Eligibility</span>
            </Link>
            <Link
              to="/members"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg backdrop-blur-sm transition"
            >
              <span>+ Manage Members</span>
            </Link>
            <Link
              to="/family"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg backdrop-blur-sm transition"
            >
              <span>Edit Family Profile</span>
            </Link>
          </div>
        </div>
      </div>

      <ErrorMessage message={familyError || eligError} />

      {/* ── 3. All 8 Required Dashboard Data Fields ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Field 1: FamilyID */}
        <StatCard
          label="Family ID Number"
          value={family.familyIdNumber}
          sub="Official Civil Registry Key"
          color="indigo"
          icon={<span className="text-lg">🆔</span>}
        />

        {/* Field 2 & 3: Family name/head & Address */}
        <StatCard
          label="Head of Family"
          value={headMember?.fullName || 'Not Designated'}
          sub={family.addressId || 'Address Unregistered'}
          color="blue"
          icon={<span className="text-lg">👤</span>}
        />

        {/* Field 4: Number of members */}
        <StatCard
          label="Total Family Members"
          value={`${totalMembers} Member${totalMembers === 1 ? '' : 's'}`}
          sub={`${members.filter((m) => m.verificationStatus === 'verified').length} Biometrically Verified`}
          color="blue"
          icon={<span className="text-lg">👨‍👩‍👧‍👦</span>}
        />

        {/* Field 5: Annual income */}
        <StatCard
          label="Annual Household Income"
          value={family.annualIncome != null ? formatCurrency(family.annualIncome) : 'Not Declared'}
          sub="Declared for Welfare Ceilings"
          color="indigo"
          icon={<span className="text-lg">💰</span>}
        />

        {/* Field 6: Number of potentially eligible schemes */}
        <StatCard
          label="Potentially Eligible Schemes"
          value={loadingElig ? '…' : `${potentiallyEligibleCount} Scheme${potentiallyEligibleCount === 1 ? '' : 's'}`}
          sub={`${eligibleSchemesCount} Fully Qualified`}
          color="amber"
          icon={<span className="text-lg">⚡</span>}
        />

        {/* Field 7: Number of active applications */}
        <StatCard
          label="Active Applications"
          value={`${activeApplications.length} In Progress`}
          sub="Under review by desk officer"
          color="blue"
          icon={<span className="text-lg">📋</span>}
        />

        {/* Field 8: Number of benefits received */}
        <StatCard
          label="Benefits Received"
          value={`${benefitsReceivedCount} Disbursed`}
          sub={benefitsReceivedCount > 0 ? 'Cards Issued & Active' : 'No disbursements yet'}
          color="green"
          icon={<span className="text-lg">✅</span>}
        />

        {/* Household Status Indicator */}
        <StatCard
          label="Household Registry Status"
          value={family.status?.toUpperCase() || 'ACTIVE'}
          sub="Direct Benefit Transfer Ready"
          color={family.status === 'active' ? 'green' : 'amber'}
          icon={<span className="text-lg">🏛️</span>}
        />
      </div>

      {/* Two Column Layout: Members Roster & Live Entitlements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── 4 & 7. Members Roster Section with Empty State ─────────────── */}
        <div className="lg:col-span-2 card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Household Members Roster</h2>
              <p className="text-xs text-gray-500">Live records linked to this Family ID in PostgreSQL</p>
            </div>
            <Link to="/members" className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline">
              Manage Members →
            </Link>
          </div>

          {members.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-3">
              <span className="text-3xl block">👥</span>
              <p className="text-sm font-medium">No family members registered in this household yet.</p>
              <Link to="/members" className="btn-primary text-xs py-2 px-4 inline-flex">
                + Add First Member
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map((member) => {
                const age = getAge(member.dateOfBirth);
                return (
                  <div key={member.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-400 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                        {member.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{member.fullName}</span>
                          {member.isFamilyHead && (
                            <span className="text-[10px] bg-primary-100 text-primary-800 px-2 py-0.5 rounded font-bold uppercase">
                              Head
                            </span>
                          )}
                        </div>
                        {/* 4. Display name, relationship, age, gender, occupation, education */}
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{member.relationToHead}</span>
                          <span>•</span>
                          <span>{member.gender}</span>
                          {age != null && (
                            <>
                              <span>•</span>
                              <span>{age} yrs</span>
                            </>
                          )}
                          {member.occupation && (
                            <>
                              <span>•</span>
                              <span>{member.occupation}</span>
                            </>
                          )}
                          {member.educationLevel && (
                            <>
                              <span>•</span>
                              <span className="text-primary-700 font-medium">{member.educationLevel}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        member.verificationStatus === 'verified'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {member.verificationStatus ? member.verificationStatus.toUpperCase() : 'PENDING'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Scheme Entitlement Summary */}
        <div className="card space-y-4">
          <div className="pb-3 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Live Entitlement Status</h2>
            <p className="text-xs text-gray-500">Auto-evaluated against real Gujarat schemes</p>
          </div>

          {loadingElig ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-2">
              <LoadingSpinner size="md" />
              <p className="text-xs text-gray-400">Evaluating schemes…</p>
            </div>
          ) : !eligibilityData || eligibilityData.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              No scheme evaluation results available.
            </div>
          ) : (
            <div className="space-y-3">
              {eligibilityData.slice(0, 4).map((item) => (
                <div key={item.schemeId || item.schemeCode} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-xs text-gray-900 line-clamp-1">{item.schemeName}</h4>
                    <EligibilityBadge outcome={item.outcome} />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                    {item.satisfiedRules?.length || 0} rules passed • {item.missingDocuments?.length || 0} docs pending
                  </p>
                </div>
              ))}

              <Link
                to="/eligibility"
                className="w-full btn-secondary justify-center text-xs py-2 mt-2"
              >
                View Full Eligibility Report →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
