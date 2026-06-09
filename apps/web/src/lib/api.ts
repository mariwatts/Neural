import type {
  ActivityEvent,
  AgentCard,
  AgentDetail,
  Availability,
  ExploreResult,
  NameRecord,
  ProtocolStats,
  TimelinePoint,
} from './types';

// Public base — baked at build time, used by the browser.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Internal base — read at runtime, used for server-side (SSR) fetches so they
// hit the API directly over localhost instead of looping back through the proxy.
const INTERNAL_BASE = process.env.API_INTERNAL_URL || API_BASE;

function baseUrl(): string {
  return typeof window === 'undefined' ? INTERNAL_BASE : API_BASE;
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  stats: () => get<ProtocolStats>('/stats'),
  timeline: (days = 30) => get<TimelinePoint[]>(`/stats/timeline?days=${days}`),
  activity: (limit = 40, type = 'all') =>
    get<ActivityEvent[]>(`/activity?limit=${limit}&type=${type}`),
  leaderboard: (limit = 12) => get<NameRecord[]>(`/leaderboard?limit=${limit}`),
  categories: () => get<{ category: string; count: number }[]>('/categories'),
  explore: (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') q.set(k, String(v));
    }
    return get<ExploreResult>(`/explore?${q.toString()}`);
  },
  availability: (name: string, category?: string) =>
    get<Availability>(
      `/availability?name=${encodeURIComponent(name)}${
        category ? `&category=${category}` : ''
      }`,
    ),
  agent: (name: string) =>
    get<AgentDetail>(`/agent/${encodeURIComponent(name)}`),
  capabilities: (name: string) =>
    get<AgentCard>(`/agent/${encodeURIComponent(name)}/capabilities`),
  namesByWallet: (wallet: string) =>
    get<NameRecord[]>(`/names/${encodeURIComponent(wallet)}`),
  register: (body: {
    label: string;
    category?: string;
    owner?: string;
    capabilities?: string[];
    endpoint?: string;
    soulbound?: boolean;
  }) =>
    get<NameRecord>('/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
};
