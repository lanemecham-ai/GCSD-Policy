export type Role = 'viewer' | 'editor' | 'admin';

export type User = {
  id: string;
  username: string;
  role: Role;
};

export type Policy = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type PolicyForm = {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
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
