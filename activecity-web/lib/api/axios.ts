/**
 * Axios instance for the Spring Boot backend (port 8080).
 *
 * Used exclusively in Next.js Route Handlers (server-side), where the
 * HttpOnly `ac_token` cookie is accessible. Client components must call
 * the Next.js proxy routes under /api/* instead of using this directly.
 */
import axios from "axios";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

export const springApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Creates a Spring Boot axios instance with the given JWT attached as a
 * Bearer token. Call this inside route handlers after reading the cookie.
 */
export function springApiWithToken(token: string) {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}
