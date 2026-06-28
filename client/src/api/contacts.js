const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiClientError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 204) {
    return null;
  }

  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message = body?.message || `Request failed with status ${res.status}.`;
    throw new ApiClientError(res.status, body?.code || 'UNKNOWN_ERROR', message, body?.details);
  }

  return body;
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const contactsApi = {
  list({ q, page, pageSize, sort, order } = {}) {
    return request(`/contacts${buildQuery({ q, page, pageSize, sort, order })}`);
  },

  get(id) {
    return request(`/contacts/${id}`);
  },

  create(payload) {
    return request('/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return request(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  patch(id, payload) {
    return request(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id) {
    return request(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },
};
