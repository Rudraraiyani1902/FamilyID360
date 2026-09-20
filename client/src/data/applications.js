// Dummy applications data — used until a backend Applications API is created
export const DUMMY_APPLICATIONS = [
  {
    id: 'APP-2026-001',
    schemeCode: 'GJ-HEALTH-001',
    schemeName: 'Mukhyamantri Amrutam (MA) Yojana',
    department: 'Health & Family Welfare',
    appliedDate: '2026-08-10',
    status: 'approved',
    statusLabel: 'Approved',
    remarks: 'Documents verified. Card issued.',
    benefit: '₹10 lakh health coverage',
  },
  {
    id: 'APP-2026-002',
    schemeCode: 'GJ-WCD-001',
    schemeName: 'Beti Bachao Beti Padhao (BBBP)',
    department: 'Women & Child Development',
    appliedDate: '2026-08-22',
    status: 'pending',
    statusLabel: 'Pending Review',
    remarks: 'Application under review by officer.',
    benefit: 'Education support',
  },
  {
    id: 'APP-2026-003',
    schemeCode: 'GJ-AGRI-001',
    schemeName: 'Kisan Suryodaya Yojana',
    department: 'Energy & Petrochemicals',
    appliedDate: '2026-09-01',
    status: 'documents_required',
    statusLabel: 'Documents Required',
    remarks: 'Land ownership document missing. Please upload.',
    benefit: 'Free daytime electricity',
  },
];

export const APPLICATION_STATUS_MAP = {
  approved:           { label: 'Approved',           cls: 'badge-green'  },
  pending:            { label: 'Pending Review',      cls: 'badge-yellow' },
  documents_required: { label: 'Documents Required',  cls: 'badge-yellow' },
  rejected:           { label: 'Rejected',            cls: 'badge-red'    },
  processing:         { label: 'Processing',          cls: 'badge-blue'   },
};
