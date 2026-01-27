"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.validationError = validationError;
exports.notFoundError = notFoundError;
exports.conflictError = conflictError;
exports.internalError = internalError;
const CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
};
function successResponse(data, statusCode = 200) {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify(data),
    };
}
function errorResponse(message, statusCode = 400) {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            error: true,
            message,
        }),
    };
}
function validationError(message) {
    return errorResponse(message, 400);
}
function notFoundError(resource) {
    return errorResponse(`${resource} not found`, 404);
}
function conflictError(message) {
    return errorResponse(message, 409);
}
function internalError(message = "Internal server error") {
    return errorResponse(message, 500);
}
//# sourceMappingURL=response.js.map