import { getAge, getInitials } from '../utils/formatters';

export default function FamilyMemberCard({ member, onEdit, onDelete }) {
  if (!member) return null;

  const age = getAge(member.dateOfBirth);

  const verificationBadgeClass = {
    verified: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  }[member.verificationStatus] || 'bg-gray-50 text-gray-700 border-gray-200';

  const formatAadhaar = (ref) => {
    if (!ref) return 'Not Provided';
    const digits = ref.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `•••• •••• ${digits.slice(-4)}`;
    }
    return ref;
  };

  return (
    <div className="card hover:shadow-md transition-shadow relative overflow-hidden group">
      {member.isFamilyHead && (
        <div className="absolute top-0 right-0 bg-primary-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg tracking-wider uppercase">
          Head of Family
        </div>
      )}

      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-400 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
          {getInitials(member.fullName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap pr-16">
            <h4 className="font-semibold text-gray-900 truncate text-base">{member.fullName}</h4>
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
              {member.relationToHead || 'Member'}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
            <div>
              <span className="text-gray-400">Gender & Age: </span>
              <span className="font-medium text-gray-800">
                {member.gender || '—'} {age != null ? `(${age} yrs)` : ''}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Occupation: </span>
              <span className="font-medium text-gray-800">{member.occupation || '—'}</span>
            </div>
            <div>
              <span className="text-gray-400">Education: </span>
              <span className="font-medium text-gray-800">{member.educationLevel || '—'}</span>
            </div>
            <div>
              <span className="text-gray-400">Aadhaar: </span>
              <span className="font-mono text-gray-800">{formatAadhaar(member.aadhaarReference)}</span>
            </div>
            {member.mobileNumber && (
              <div>
                <span className="text-gray-400">Mobile: </span>
                <span className="font-medium text-gray-800">{member.mobileNumber}</span>
              </div>
            )}
            {member.disabilityStatus && member.disabilityStatus !== 'None' && (
              <div>
                <span className="text-gray-400">Disability: </span>
                <span className="font-medium text-amber-700">{member.disabilityStatus}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${verificationBadgeClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {member.verificationStatus ? member.verificationStatus.charAt(0).toUpperCase() + member.verificationStatus.slice(1) : 'Pending'}
            </span>

            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(member)}
                  className="text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline px-2 py-1 rounded"
                >
                  Edit
                </button>
              )}
              {onDelete && !member.isFamilyHead && (
                <button
                  onClick={() => onDelete(member.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline px-2 py-1 rounded"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
