"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = require("../../src/utils/response");
describe("Response Utils", () => {
    it("should create success response", () => {
        const response = (0, response_1.successResponse)({ data: "test" }, 201);
        expect(response.statusCode).toBe(201);
        expect(JSON.parse(response.body)).toEqual({ data: "test" });
    });
    it("should create error response", () => {
        const response = (0, response_1.errorResponse)("Test error", 500);
        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body)).toEqual({ error: true, message: "Test error" });
    });
    it("should create validation error", () => {
        const response = (0, response_1.validationError)("Invalid input");
        expect(response.statusCode).toBe(400);
    });
    it("should create not found error", () => {
        const response = (0, response_1.notFoundError)("Resource");
        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body).message).toBe("Resource not found");
    });
    it("should create conflict error", () => {
        const response = (0, response_1.conflictError)("Conflict occurred");
        expect(response.statusCode).toBe(409);
    });
    it("should create internal error with default message", () => {
        const response = (0, response_1.internalError)();
        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body).message).toBe("Internal server error");
    });
});
//# sourceMappingURL=response.test.js.map