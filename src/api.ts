import type { Policy, PolicyForm, PolicyVersion, User } from './types';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:4001' : '';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('gcsd-policy-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }
  return response.json();
}

export async function login(username: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  return handleResponse<{ token: string; user: User }>(response);
}

export async function getMe() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { ...getAuthHeaders() } as HeadersInit,
  });
  return handleResponse<User>(response);
}

export async function fetchTopPolicies() {
  const response = await fetch(`${API_BASE_URL}/policies/top`, {
    headers: { ...getAuthHeaders() } as HeadersInit,
  });
  return handleResponse<Policy[]>(response);
}

export async function fetchPolicies() {
  const response = await fetch(`${API_BASE_URL}/policies`, {
    headers: { ...getAuthHeaders() } as HeadersInit,
  });
  return handleResponse<Policy[]>(response);
}

export async function fetchPolicy(id: string) {
  const response = await fetch(`${API_BASE_URL}/policies/${id}`, {
    headers: { ...getAuthHeaders() } as HeadersInit,
  });
  return handleResponse<Policy>(response);
}

export async function createPolicy(policy: PolicyForm) {
  const response = await fetch(`${API_BASE_URL}/policies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } as HeadersInit,
    body: JSON.stringify(policy),
  });
  return handleResponse<Policy>(response);
}

export async function updatePolicy(id: string, policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>) {
  const response = await fetch(`${API_BASE_URL}/policies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } as HeadersInit,
    body: JSON.stringify(policy),
  });
  return handleResponse<Policy>(response);
}

export async function deletePolicy(id: string) {
  const response = await fetch(`${API_BASE_URL}/policies/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() } as HeadersInit,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Delete request failed');
  }
}

export async function fetchPolicyVersions(id: string) {
  const response = await fetch(`${API_BASE_URL}/policies/${id}/versions`, {
    headers: { ...getAuthHeaders() } as HeadersInit,
  });
  return handleResponse<PolicyVersion[]>(response);
}

export async function aiSearch(query: string) {
  const response = await fetch(`${API_BASE_URL}/ai-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } as HeadersInit,
    body: JSON.stringify({ query }),
  });
  return handleResponse<{ summary: string; policyIds: string[] }>(response);
}
