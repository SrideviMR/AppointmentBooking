"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function log(level, message, meta) {
    const logEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(meta ? { meta } : {}),
    };
    console.log(JSON.stringify(logEntry));
}
exports.logger = {
    info: (message, meta) => log("INFO", message, meta),
    warn: (message, meta) => log("WARN", message, meta),
    error: (message, meta) => log("ERROR", message, meta),
};
//# sourceMappingURL=logger.js.map