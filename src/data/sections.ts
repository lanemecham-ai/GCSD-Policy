export type Section = {
  code: string;
  title: string;
  description: string;
};

export const SECTIONS: Section[] = [
  {
    code: 'B',
    title: 'Board',
    description: 'Governance, meetings, officers, and superintendent relations',
  },
  {
    code: 'C',
    title: 'Finance & Operations',
    description: 'Budgeting, procurement, transportation, and school facilities',
  },
  {
    code: 'D',
    title: 'Personnel',
    description: 'Employment, conduct, benefits, leave, and evaluation',
  },
  {
    code: 'E',
    title: 'Instruction',
    description: 'Curriculum, assessment, special programs, and graduation',
  },
  {
    code: 'F',
    title: 'Students',
    description: 'Admission, health, activities, rights, and discipline',
  },
  {
    code: 'G',
    title: 'Community Relations',
    description: 'Public records, community use, parent rights, and partnerships',
  },
];

export const SECTION_TITLES = SECTIONS.map((s) => s.title);
