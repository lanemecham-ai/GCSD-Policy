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

export async function fetchUsers() {
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: { ...getAuthHeaders() } as HeadersInit,
  });
  return handleResponse<User[]>(response);
}

export async function createUser(data: { username: string; password: string; role: string }) {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } as HeadersInit,
    body: JSON.stringify(data),
  });
  return handleResponse<User>(response);
}

export async function updateUser(id: string, data: { username: string; role: string; password?: string }) {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } as HeadersInit,
    body: JSON.stringify(data),
  });
  return handleResponse<User>(response);
}

export async function deleteUser(id: string) {
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() } as HeadersInit,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Delete request failed');
  }
}

export type AISearchResult = { summary: string; policyIds: string[] };

// Splits the streamed text into a user-visible summary and the trailing
// "POLICIES: id1, id2" sentinel so the page can render the prose live.
export function parseAISearchText(text: string): AISearchResult {
  const match = text.match(/POLICIES:\s*([^\n]*)/i);
  if (!match || match.index === undefined) {
    return { summary: text.trim(), policyIds: [] };
  }
  const summary = text.slice(0, match.index).trim();
  const policyIds = match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { summary, policyIds };
}

export async function aiSearch(
  query: string,
  onText?: (fullText: string) => void,
): Promise<AISearchResult> {
  const response = await fetch(`${API_BASE_URL}/ai-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } as HeadersInit,
    body: JSON.stringify({ query }),
  });

  if (!response.ok || !response.body) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'AI search failed.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let streamError: string | null = null;

  // Parse Server-Sent Events frames as they arrive.
  // Each frame is "data: {json}\n\n".
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (!frame.startsWith('data:')) continue;
      const payload = frame.slice(5).trim();
      if (!payload) continue;
      let event: { type: string; text?: string; message?: string };
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }
      if (event.type === 'delta' && event.text) {
        fullText += event.text;
        if (onText) onText(fullText);
      } else if (event.type === 'error') {
        streamError = event.message || 'AI search failed.';
      }
    }
  }

  if (streamError) throw new Error(streamError);
  return parseAISearchText(fullText);
}
