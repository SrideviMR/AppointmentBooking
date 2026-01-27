import { ApiResponse } from "../types";
export declare function successResponse<T>(data: T, statusCode?: number): ApiResponse<T>;
export declare function errorResponse(message: string, statusCode?: number): ApiResponse;
export declare function validationError(message: string): ApiResponse;
export declare function notFoundError(resource: string): ApiResponse;
export declare function conflictError(message: string): ApiResponse;
export declare function internalError(message?: string): ApiResponse;
//# sourceMappingURL=response.d.ts.map