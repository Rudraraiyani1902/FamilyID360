const safeMember = (member) => ({
  id: member.id,
  fullName: member.fullName,
  relationToHead: member.relationToHead,
  dateOfBirth: member.dateOfBirth,
  gender: member.gender,
  occupation: member.occupation,
  educationLevel: member.educationLevel,
  disabilityStatus: member.disabilityStatus,
  maritalStatus: member.maritalStatus,
  isFamilyHead: member.isFamilyHead,
  verificationStatus: member.verificationStatus,
});

const safeFamily = (family) => ({
  id: family.id,
  familyIdNumber: family.familyIdNumber,
  status: family.status,
  createdAt: family.createdAt,
  updatedAt: family.updatedAt,
  members: family.members?.map(safeMember),
});

module.exports = { safeFamily, safeMember };