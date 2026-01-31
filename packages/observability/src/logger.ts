import pino from "pino";

export function createLogger() {
  return pino({
    level: "info"
  });
}
