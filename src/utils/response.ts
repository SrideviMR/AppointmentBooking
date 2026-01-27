import { ApiResponse } from "../types";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export function successResponse<T>(data: T, statusCode: number = 200): ApiResponse<T> {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

export function errorResponse(message: string, statusCode: number = 400): ApiResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      error: true,
      message,
    }),
  };
}

export function validationError(message: string): ApiResponse {
  return errorResponse(message, 400);
}

export function notFoundError(resource: string): ApiResponse {
  return errorResponse(`${resource} not found`, 404);
}

export function conflictError(message: string): ApiResponse {
  return errorResponse(message, 409);
}

export function internalError(message: string = "Internal server error"): ApiResponse {
  return errorResponse(message, 500);
}