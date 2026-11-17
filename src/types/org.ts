export type DivisionId =
  | 'pimpinan'
  | 'komite'
  | 'tata_usaha'
  | 'kurikulum'
  | 'kesiswaan'
  | 'sarpras'
  | 'humas'
  | 'akademik';

export type EmploymentStatus =
  | 'PNS'
  | 'PPPK'
  | 'P3K PW'
  | 'GTT'
  | 'PTT'
  | 'Mitra';

export type EducationLevel = 'S3' | 'S2' | 'S1' | 'D3' | 'SMA';

export type RelationType = 'komando' | 'koordinasi';

export type ViewTab = 'bagan' | 'direktori' | 'tupoksi' | 'statistik';

export interface OrgNode {
  id: string;
  parentId: string | null;
  relationType: RelationType;
  roleTitle: string;
  shortCode: string;
  personName: string;
  nip: string;
  rank: string;
  education: EducationLevel;
  status: EmploymentStatus;
  division: DivisionId;
  tier: 1 | 2 | 3 | 4;
  room: string;
  email: string;
  phone: string;
  tupoksi: string[];
  unitHeadcount?: number;
  photoUrl?: string;
}

export interface SchoolProfile {
  schoolName: string;
  npsn: string;
  address: string;
  city: string;
  academicYear: string;
  decreeNumber: string;
  accreditation: string;
  headmasterName: string;
}

export interface DivisionMeta {
  id: DivisionId;
  label: string;
  shortLabel: string;
  description: string;
  legalBasis: string;
  accentHex: string;
  textClass: string;
  bgSubtleClass: string;
  borderClass: string;
}
