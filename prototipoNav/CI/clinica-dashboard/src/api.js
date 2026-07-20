const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export function getToken() {
  return localStorage.getItem("clinica_token");
}

export function setToken(token) {
  localStorage.setItem("clinica_token", token);
}

export function clearToken() {
  localStorage.removeItem("clinica_token");
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }
    const error = new Error(data.detail || "No se pudo completar la operación.");
    if (data.errores) {
      error.fieldErrors = data.errores;
    }
    throw error;
  }
  return data;
}

export { API_URL };
