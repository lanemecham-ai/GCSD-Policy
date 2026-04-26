export type Role = 'viewer' | 'editor' | 'admin';

export type Category = {
  id: string;
  code: string;
  name: string;
  description: string;
  policyCount?: number;
};

export type User = {
  id: string;
  username: string;
  role: Role;
};

export type FormLink = {
  id?: string;
  title: string;
  url: string;
};

export type Policy = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  forms: FormLink[];
};

export type PolicyForm = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  forms: FormLink[];
};

export type PolicyVersion = {
  versionNumber: number;
  title: string;
  category: string;
  summary: string;
  content: string;
  createdAt: string;
  author: string;
};
