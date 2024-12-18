"use server";

import { env } from "../../../config/env";
import { Logger } from "../../../utils/logger";

const logger = new Logger("make-api-request");

export type ApiResponse<T> = {
  data?: T;
  status: number;
  headers: Record<string, string>;
  ok: boolean;
  error?: string;
};

export async function makeApiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    const API_BASE_URL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : process.env.NEXT_PUBLIC_APP_URL;

    logger.info(`Making ${method} request to ${endpoint}`, { body });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      credentials: "include",
    });

    logger.info(`Response received for ${endpoint}`, {
      status: response.status,
      ok: response.ok,
    });

    if (response.status === 401) {
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        ok: false,
        error: "Unauthorized",
      };
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      logger.error(`Error parsing JSON response from ${endpoint}`, { error });
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        ok: false,
        error: "Invalid JSON response",
      };
    }

    return {
      data,
      status: response.status,
      headers: Object.fromEntries(response.headers),
      ok: response.ok,
      error: !response.ok ? data.error : undefined,
    };
  } catch (error) {
    logger.error(`Error making request to ${endpoint}`, { error });
    throw error;
  }
}
