import { logger } from "../../src/utils/logger";

describe("Logger Utils", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log info message", () => {
    logger.info("Test message", { key: "value" });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"level":"INFO"')
    );
  });

  it("should log warn message", () => {
    logger.warn("Warning message");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"level":"WARN"')
    );
  });

  it("should log error message", () => {
    logger.error("Error message");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"level":"ERROR"')
    );
  });

  it("should log debug message", () => {
    logger.debug("Debug message");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"level":"DEBUG"')
    );
  });
});