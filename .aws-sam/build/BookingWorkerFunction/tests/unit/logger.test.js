"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../src/utils/logger");
describe("Logger Utils", () => {
    let consoleSpy;
    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });
    afterEach(() => {
        consoleSpy.mockRestore();
    });
    it("should log info message", () => {
        logger_1.logger.info("Test message", { key: "value" });
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
    });
    it("should log warn message", () => {
        logger_1.logger.warn("Warning message");
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"WARN"'));
    });
    it("should log error message", () => {
        logger_1.logger.error("Error message");
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"ERROR"'));
    });
    it("should log debug message", () => {
        logger_1.logger.debug("Debug message");
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"DEBUG"'));
    });
});
//# sourceMappingURL=logger.test.js.map