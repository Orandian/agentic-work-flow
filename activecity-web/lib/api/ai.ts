/**
 * Axios instance for the FastAPI AI Search service (port 8000).
 *
 * Used exclusively in Next.js Route Handlers (server-side). The AI service
 * is never called directly from the browser — all requests flow through
 * the /api/ai/* proxy routes.
 */
import axios from "axios";

const AI_BASE_URL = process.env.AI_BASE_URL ?? "http://localhost:8000";

/**
 * Creates an AI service axios instance with the given JWT attached as a
 * Bearer token. Call this inside route handlers after reading the cookie.
 */
export function aiApiWithToken(token: string) {
  return axios.create({
    baseURL: AI_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export const aiApi = axios.create({
  baseURL: AI_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
