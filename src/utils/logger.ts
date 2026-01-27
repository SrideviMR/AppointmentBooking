type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
) {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };

  console.log(JSON.stringify(logEntry));
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    log("INFO", message, meta),

  warn: (message: string, meta?: Record<string, unknown>) =>
    log("WARN", message, meta),

  error: (message: string, meta?: Record<string, unknown>) =>
        log("ERROR", message, meta),
  
  debug: (message: string, meta?: Record<string, unknown>) =>
    log("DEBUG", message, meta),
};
