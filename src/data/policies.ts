export type Policy = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
};

export const policies: Policy[] = [
  {
    id: 'policy-001',
    title: 'Public Records Request Policy',
    category: 'Transparency',
    summary: 'Defines procedures for responding to public records requests and handling disclosures.',
    content:
      'All public records requests must be logged, tracked, and fulfilled within the statutory response time. Requests should be directed to the Records Office, which will coordinate with departments and redact exempt information as required.'
  },
  {
    id: 'policy-002',
    title: 'Workplace Conduct and Harassment',
    category: 'Human Resources',
    summary: 'Sets expectations for professional conduct and the reporting process for harassment.',
    content:
      'Employees must maintain a respectful workplace. Any form of harassment, discrimination, or retaliation is prohibited. Report concerns anonymously or directly to HR using the standard complaint process.'
  },
  {
    id: 'policy-003',
    title: 'Records Retention and Disposal',
    category: 'Records Management',
    summary: 'Covers retention schedules and secure disposal for official documents and electronic records.',
    content:
      'Official records must be retained in accordance with the approved retention schedule. Destroy records only after the retention period expires, and use secure disposal methods for confidential materials.'
  }
];
