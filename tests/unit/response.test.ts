import { successResponse, errorResponse, validationError, notFoundError, conflictError, internalError } from "../../src/utils/response";

describe("Response Utils", () => {
  it("should create success response", () => {
    const response = successResponse({ data: "test" }, 201);
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({ data: "test" });
  });

  it("should create error response", () => {
    const response = errorResponse("Test error", 500);
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: true, message: "Test error" });
  });

  it("should create validation error", () => {
    const response = validationError("Invalid input");
    expect(response.statusCode).toBe(400);
  });

  it("should create not found error", () => {
    const response = notFoundError("Resource");
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe("Resource not found");
  });

  it("should create conflict error", () => {
    const response = conflictError("Conflict occurred");
    expect(response.statusCode).toBe(409);
  });

  it("should create internal error with default message", () => {
    const response = internalError();
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe("Internal server error");
  });
});