import { Context } from "hono/mod.ts";
import type { Variables } from "../main.tsx";
import type { TrafficLog } from "../types/MockApi.ts";
import type { MockApi } from "../types/MockApi.ts";

/**
 * Controller for the root dashboard route ('/')
 * @param c Hono context
 */
export async function dashboardController(c: Context<{ Variables: Variables }>) {
  const repo = c.get("mockApiRepository");
  const apis: MockApi[] = await repo.getAllApis();
  const logs: TrafficLog[] = (await repo.getTrafficLogs()).logs;

  // Calculate statistics
  const _totalApis = apis.length;
  const _totalRequests = logs.length;

  // Group APIs by method
  const methodCounts: Record<string, number> = {};
  apis.forEach((api: MockApi) => {
    const method = api.method;
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });

  // Group APIs by auth type
  const authCounts: Record<string, number> = {};
  apis.forEach((api: MockApi) => {
    const authType = api.auth.type;
    authCounts[authType] = (authCounts[authType] || 0) + 1;
  });

  // Get response code distribution
  const statusCounts: Record<string, number> = {};
  logs.forEach((log: TrafficLog) => {
    const statusGroup = Math.floor(log.response.status / 100) * 100;
    statusCounts[statusGroup] = (statusCounts[statusGroup] || 0) + 1;
  });

  // Get recent logs
  const _recentLogs = logs.slice(0, 5);

  c.set("title", "MockAPI Studio - Dashboard");

  return c.render(
    <div class="container mx-auto px-4 pt-4 pb-8">
      {/* TODO: Move dashboard JSX content here from main.tsx */}
    </div>
  );
} 