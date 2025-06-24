// Simulation utilities for Mock API
import type { SimulationConfig } from '../types/MockApi.ts';

// Default set of error statuses for random simulation
const DEFAULT_ERROR_STATUSES = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];

// Default error messages for each status code
const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout'
};

export interface SimulationResult {
  simulatedError: boolean;
  errorStatus?: number;
  errorBody?: unknown;
  errorHeaders?: Record<string, string>;
  delayApplied: number;
}

/**
 * Applies simulation settings: delay, network errors, etc.
 * Returns a SimulationResult with details of what was simulated.
 */
export async function applySimulation(config?: SimulationConfig): Promise<SimulationResult> {
  let delayApplied = 0;
  let simulatedError = false;
  let errorStatus: number | undefined = undefined;
  let errorBody: unknown = undefined;
  let errorHeaders: Record<string, string> | undefined = undefined;

  // 1. Simulate delay
  if (config?.delay && config.delay > 0) {
    const start = performance.now();
    await new Promise(r => setTimeout(r, config.delay));
    delayApplied = performance.now() - start;
  }

  // 2. Simulate network error if enabled and based on errorChance
  if (config?.networkErrors) {
    const chance = typeof config.errorChance === 'number' ? config.errorChance : 0;
    if (chance > 0 && Math.random() * 100 < chance) {
      simulatedError = true;
      
      // Choose a random status code from configured list or default
      const statuses = (config.errorStatuses && config.errorStatuses.length > 0)
        ? config.errorStatuses!
        : DEFAULT_ERROR_STATUSES;
      
      errorStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Use custom error response if configured, otherwise use default
      if (config.errorResponses && config.errorResponses[errorStatus]) {
        const customResponse = config.errorResponses[errorStatus];
        errorBody = customResponse.body || {
          error: `Simulated Error ${errorStatus}`,
          message: DEFAULT_ERROR_MESSAGES[errorStatus] || `A network error was simulated with status ${errorStatus}`
        };
        errorHeaders = customResponse.headers;
      } else {
        errorBody = {
          error: `Simulated Error ${errorStatus}`,
          message: DEFAULT_ERROR_MESSAGES[errorStatus] || `A network error was simulated with status ${errorStatus}`
        };
      }
    }
  }

  // 3. (Future) Add more simulation types here (e.g., throttling, random status codes, etc.)

  return {
    simulatedError,
    errorStatus,
    errorBody,
    errorHeaders,
    delayApplied
  };
} 