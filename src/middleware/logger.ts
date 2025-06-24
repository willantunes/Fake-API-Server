import { logger } from "hono/middleware.ts";

// Logger middleware for all requests
export const loggerMiddleware = logger(); 