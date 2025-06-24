import type { 
  MockApi, 
  CreateMockApiRequest, 
  UpdateMockApiRequest, 
  ApiSearchOptions,
  TrafficLog
} from "../types/MockApi.ts";

// Constants
const KV_PATH = "./data/mock-api-store";
const API_PREFIX = "mock-api:";
const CHUNK_PREFIX = "chunk:";
const TRAFFIC_LOG_PREFIX = "traffic-log:";
const MAX_VALUE_SIZE = 60000; // Conservative limit, below 65536

/**
 * Response type for traffic logs with pagination
 */
export interface TrafficLogsResponse {
  logs: TrafficLog[];
  total: number;
  page: number;
  hasMore: boolean;
}

/**
 * Utility functions for chunking large data
 */
class ChunkingUtils {
  /**
   * Calculate the size of a value when serialized to JSON
   */
  static getValueSize(value: any): number {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  }

  /**
   * Check if a MockApi needs to be chunked
   */
  static needsChunking(api: MockApi): boolean {
    return this.getValueSize(api) > MAX_VALUE_SIZE;
  }

  /**
   * Split large response data into chunks
   */
  static chunkResponseData(data: any, maxChunkSize: number = 50000): string[] {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const chunks: string[] = [];
    
    for (let i = 0; i < dataString.length; i += maxChunkSize) {
      chunks.push(dataString.slice(i, i + maxChunkSize));
    }
    
    return chunks;
  }

  /**
   * Reconstruct data from chunks
   */
  static reconstructFromChunks(chunks: string[]): any {
    const reconstructed = chunks.join('');
    
    // Try to parse as JSON first
    try {
      return JSON.parse(reconstructed);
    } catch {
      // Return as string if not valid JSON
      return reconstructed;
    }
  }

  /**
   * Create a chunked version of MockApi
   */
  static createChunkedApi(api: MockApi): MockApi {
    const chunks = this.chunkResponseData(api.response.data);
    
    return {
      ...api,
      response: {
        ...api.response,
        data: {
          __chunked: true,
          totalChunks: chunks.length,
          originalType: typeof api.response.data,
          metadata: {
            size: this.getValueSize(api.response.data),
            contentType: api.response.contentType,
            type: api.response.type
          }
        }
      }
    };
  }
}

/**
 * Repository for managing Mock APIs using Deno KV
 */
export class MockApiRepository {
  private kv: Deno.Kv | null = null;
  
  /**
   * Initialize the KV store connection
   */
  async init(): Promise<void> {
    try {
      // Ensure data directory exists
      try {
        await Deno.mkdir("./data", { recursive: true });
        console.log("Data directory created or already exists");
      } catch (e) {
        console.warn("Could not create data directory:", e);
      }
      
      this.kv = await Deno.openKv();
      console.log("KV store initialized successfully");
    } catch (error) {
      console.error("Failed to initialize KV store:", error);
      throw error;
    }
  }
  
  /**
   * Get the KV instance, initializing if necessary
   */
  private async getKv(): Promise<Deno.Kv> {
    if (!this.kv) {
      await this.init();
    }
    return this.kv!;
  }

  /**
   * Generate a unique ID for new APIs
   */
  private generateId(): string {
    return crypto.randomUUID();
  }
  
  /**
   * Create a new API
   */
  async createApi(apiData: CreateMockApiRequest): Promise<MockApi> {
    const kv = await this.getKv();
    
    const now = new Date().toISOString();
    const id = this.generateId();
    
    const mockApi: MockApi = {
      ...apiData,
      active: apiData.active !== undefined ? apiData.active : true,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    // Check if the API needs chunking
    if (ChunkingUtils.needsChunking(mockApi)) {
      console.log(`API ${id} is too large (${ChunkingUtils.getValueSize(mockApi)} bytes), chunking...`);
      
      // Store chunks separately
      const chunks = ChunkingUtils.chunkResponseData(mockApi.response.data);
      const chunkKeys: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkKey = `${id}:${i}`;
        const chunkResult = await kv.set([CHUNK_PREFIX, chunkKey], chunks[i]);
        
        if (!chunkResult.ok) {
          // Clean up any chunks that were already stored
          for (const key of chunkKeys) {
            await kv.delete([CHUNK_PREFIX, key]);
          }
          throw new Error("Failed to save API chunk to KV store");
        }
        
        chunkKeys.push(chunkKey);
      }
      
      // Create chunked version for main storage
      const chunkedApi = ChunkingUtils.createChunkedApi(mockApi);
      chunkedApi.response.data.chunkKeys = chunkKeys;
      
      // Save chunked API to KV store
      const result = await kv.set([API_PREFIX, id], chunkedApi);
      
      if (!result.ok) {
        // Clean up chunks if main storage fails
        for (const key of chunkKeys) {
          await kv.delete([CHUNK_PREFIX, key]);
        }
        throw new Error("Failed to save chunked API to KV store");
      }
      
      // Add to API index by path and method for quick lookups
      await this.updateApiIndex(chunkedApi);
      
      return mockApi; // Return the original API with full data
    } else {
      // Save to KV store normally
      const result = await kv.set([API_PREFIX, id], mockApi);
      
      if (!result.ok) {
        throw new Error("Failed to save API to KV store");
      }
      
      // Add to API index by path and method for quick lookups
      await this.updateApiIndex(mockApi);
      
      return mockApi;
    }
  }
  
  /**
   * Get API by ID
   */
  async getApiById(id: string): Promise<MockApi | null> {
    const kv = await this.getKv();
    const result = await kv.get<MockApi>([API_PREFIX, id]);
    
    if (!result.value) {
      return null;
    }
    
    const api = result.value;
    
    // Check if this is a chunked API
    if (api.response.data && typeof api.response.data === 'object' && api.response.data.__chunked) {
      const chunkKeys = api.response.data.chunkKeys as string[];
      
      if (chunkKeys && chunkKeys.length > 0) {
        // Retrieve all chunks
        const chunks: string[] = [];
        
        for (const chunkKey of chunkKeys) {
          const chunkResult = await kv.get<string>([CHUNK_PREFIX, chunkKey]);
          
          if (!chunkResult.value) {
            console.warn(`Missing chunk: ${chunkKey} for API ${id}`);
            return null; // Return null if any chunk is missing
          }
          
          chunks.push(chunkResult.value);
        }
        
        // Reconstruct the original data
        const reconstructedData = ChunkingUtils.reconstructFromChunks(chunks);
        
        // Return the API with reconstructed data
        return {
          ...api,
          response: {
            ...api.response,
            data: reconstructedData
          }
        };
      }
    }
    
    return api;
  }
  
  /**
   * Get all APIs
   */
  async getAllApis(): Promise<MockApi[]> {
    const kv = await this.getKv();
    const entries = kv.list<MockApi>({ prefix: [API_PREFIX] });
    
    const apis: MockApi[] = [];
    for await (const entry of entries) {
      if (entry.value) {
        const api = entry.value;
        
        // Check if this is a chunked API and reconstruct if needed
        if (api.response.data && typeof api.response.data === 'object' && api.response.data.__chunked) {
          const chunkKeys = api.response.data.chunkKeys as string[];
          
          if (chunkKeys && chunkKeys.length > 0) {
            // Retrieve all chunks
            const chunks: string[] = [];
            let allChunksFound = true;
            
            for (const chunkKey of chunkKeys) {
              const chunkResult = await kv.get<string>([CHUNK_PREFIX, chunkKey]);
              
              if (!chunkResult.value) {
                console.warn(`Missing chunk: ${chunkKey} for API ${api.id}`);
                allChunksFound = false;
                break;
              }
              
              chunks.push(chunkResult.value);
            }
            
            if (allChunksFound) {
              // Reconstruct the original data
              const reconstructedData = ChunkingUtils.reconstructFromChunks(chunks);
              
              // Add the API with reconstructed data
              apis.push({
                ...api,
                response: {
                  ...api.response,
                  data: reconstructedData
                }
              });
            } else {
              // Skip APIs with missing chunks (they're corrupted)
              console.error(`Skipping API ${api.id} due to missing chunks`);
            }
          } else {
            // Chunked API without chunk keys, skip it
            console.error(`Skipping API ${api.id} - marked as chunked but no chunk keys found`);
          }
        } else {
          // Regular API, add as-is
          apis.push(api);
        }
      }
    }
    
    // Return all APIs sorted by updatedAt descending
    return apis
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  
  /**
   * Update API
   */
  async updateApi(id: string, apiData: UpdateMockApiRequest): Promise<MockApi> {
    const kv = await this.getKv();
    
    // Check if API exists
    const existingApi = await this.getApiById(id);
    if (!existingApi) {
      throw new Error(`API with ID ${id} not found`);
    }
    
    // Update API data
    const updatedApi: MockApi = {
      ...existingApi,
      ...apiData,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: existingApi.createdAt,
    };
    
    // Clean up old chunks if they exist
    await this.cleanupApiChunks(id);
    
    // Check if the updated API needs chunking
    if (ChunkingUtils.needsChunking(updatedApi)) {
      console.log(`Updated API ${id} is too large (${ChunkingUtils.getValueSize(updatedApi)} bytes), chunking...`);
      
      // Store chunks separately
      const chunks = ChunkingUtils.chunkResponseData(updatedApi.response.data);
      const chunkKeys: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkKey = `${id}:${i}`;
        const chunkResult = await kv.set([CHUNK_PREFIX, chunkKey], chunks[i]);
        
        if (!chunkResult.ok) {
          // Clean up any chunks that were already stored
          for (const key of chunkKeys) {
            await kv.delete([CHUNK_PREFIX, key]);
          }
          throw new Error("Failed to save API chunk to KV store");
        }
        
        chunkKeys.push(chunkKey);
      }
      
      // Create chunked version for main storage
      const chunkedApi = ChunkingUtils.createChunkedApi(updatedApi);
      chunkedApi.response.data.chunkKeys = chunkKeys;
      
      // Save chunked API to KV store
      const result = await kv.set([API_PREFIX, id], chunkedApi);
      
      if (!result.ok) {
        // Clean up chunks if main storage fails
        for (const key of chunkKeys) {
          await kv.delete([CHUNK_PREFIX, key]);
        }
        throw new Error("Failed to update chunked API in KV store");
      }
      
      // Update the API index
      await this.updateApiIndex(chunkedApi, existingApi);
      
      return updatedApi; // Return the original API with full data
    } else {
      // Save to KV store normally
      const result = await kv.set([API_PREFIX, id], updatedApi);
      
      if (!result.ok) {
        throw new Error("Failed to update API in KV store");
      }
      
      // Update the API index
      await this.updateApiIndex(updatedApi, existingApi);
      
      return updatedApi;
    }
  }
  
  /**
   * Delete API
   */
  async deleteApi(id: string): Promise<boolean> {
    const kv = await this.getKv();
    
    // Get the API first to remove it from indexes
    const api = await this.getApiById(id);
    if (!api) {
      return false;
    }
    
    // Remove from path index
    await this.removeFromApiIndex(api);
    
    // Clean up chunks if they exist
    await this.cleanupApiChunks(id);
    
    // Delete from main storage
    await kv.delete([API_PREFIX, id]);
    
    return true;
  }
  
  /**
   * Search APIs by criteria
   */
  async searchApis(options: ApiSearchOptions): Promise<MockApi[]> {
    const apis = await this.getAllApis();
    
    return apis.filter(api => {
      // Filter by query (path or description)
      if (options.query) {
        const query = options.query.toLowerCase();
        const matchesPath = api.path.toLowerCase().includes(query);
        const matchesDescription = (api.description || '').toLowerCase().includes(query);
        
        if (!matchesPath && !matchesDescription) {
          return false;
        }
      }
      
      // Filter by method
      if (options.method && api.method !== options.method && api.method !== '*') {
        return false;
      }
      
      // Filter by category
      if (options.category && api.category !== options.category) {
        return false;
      }
      
      // Filter by tag
      if (options.tag && !api.tags?.includes(options.tag)) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Find API by path and method
   */
  async findApiByPathAndMethod(path: string, method: string): Promise<MockApi | null> {
    const kv = await this.getKv();
    
    // Try to get exact match first
    const exactResult = await kv.get<string>([`${API_PREFIX}index:path`, path, method]);
    
    if (exactResult.value) {
      const api = await this.getApiById(exactResult.value);
      return api && api.active !== false ? api : null;
    }
    
    // Try wildcard method
    const wildcardResult = await kv.get<string>([`${API_PREFIX}index:path`, path, '*']);
    
    if (wildcardResult.value) {
      const api = await this.getApiById(wildcardResult.value);
      return api && api.active !== false ? api : null;
    }
    
    return null;
  }
  
  /**
   * Update API indexes for fast lookups
   */
  private async updateApiIndex(api: MockApi, oldApi?: MockApi): Promise<void> {
    const kv = await this.getKv();
    
    // Remove old index entries if this is an update
    if (oldApi) {
      await this.removeFromApiIndex(oldApi);
    }
    
    // Add path index for quick lookups
    await kv.set([`${API_PREFIX}index:path`, api.path, api.method], api.id);
    
    // Add category index if present
    if (api.category) {
      await kv.set([`${API_PREFIX}index:category`, api.category, api.id], true);
    }
    
    // Add tag indexes if present
    if (api.tags && api.tags.length > 0) {
      for (const tag of api.tags) {
        await kv.set([`${API_PREFIX}index:tag`, tag, api.id], true);
      }
    }
  }
  
  /**
   * Remove API from indexes
   */
  private async removeFromApiIndex(api: MockApi): Promise<void> {
    const kv = await this.getKv();
    
    // Remove path index
    await kv.delete([`${API_PREFIX}index:path`, api.path, api.method]);
    
    // Remove category index
    if (api.category) {
      await kv.delete([`${API_PREFIX}index:category`, api.category, api.id]);
    }
    
    // Remove tag indexes
    if (api.tags && api.tags.length > 0) {
      for (const tag of api.tags) {
        await kv.delete([`${API_PREFIX}index:tag`, tag, api.id]);
      }
    }
  }

  /**
   * Clean up chunks for an API (used during updates/deletes)
   */
  private async cleanupApiChunks(apiId: string): Promise<void> {
    const kv = await this.getKv();
    
    // Get the current API to check if it has chunks
    const currentApiResult = await kv.get<MockApi>([API_PREFIX, apiId]);
    
    if (currentApiResult.value) {
      const currentApi = currentApiResult.value;
      
      // Check if this is a chunked API
      if (currentApi.response.data && 
          typeof currentApi.response.data === 'object' && 
          currentApi.response.data.__chunked) {
        
        const chunkKeys = currentApi.response.data.chunkKeys as string[];
        
        if (chunkKeys && chunkKeys.length > 0) {
          // Delete all chunks
          for (const chunkKey of chunkKeys) {
            await kv.delete([CHUNK_PREFIX, chunkKey]);
          }
          
          console.log(`Cleaned up ${chunkKeys.length} chunks for API ${apiId}`);
        }
      }
    }
  }
  
  /**
   * Store a traffic log entry
   */
  async storeTrafficLog(log: TrafficLog): Promise<boolean> {
    const kv = await this.getKv();
    
    // Save the log with timestamp as part of the key for sorting
    const result = await kv.set([TRAFFIC_LOG_PREFIX, log.timestamp, log.id], log);
    
    return result.ok;
  }
  
  /**
   * Get all traffic logs, sorted by timestamp descending (newest first)
   */
  async getTrafficLogs(limit = 100, page = 1): Promise<TrafficLogsResponse> {
    const kv = await this.getKv();
    
    // List all logs
    const entries = kv.list<TrafficLog>({ 
      prefix: [TRAFFIC_LOG_PREFIX]
    });
    
    // Get all logs first
    const allLogs: TrafficLog[] = [];
    for await (const entry of entries) {
      if (entry.value) {
        allLogs.push(entry.value);
      }
    }
    
    // Sort by timestamp (newest first)
    const sortedLogs = allLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    // Count total
    const total = sortedLogs.length;
    
    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const pagedLogs = sortedLogs.slice(startIndex, endIndex);
    
    return {
      logs: pagedLogs,
      total,
      page,
      hasMore: endIndex < total
    };
  }
  
  /**
   * Clear all traffic logs
   */
  async clearTrafficLogs(): Promise<number> {
    const kv = await this.getKv();
    let count = 0;
    
    // List all logs
    const entries = kv.list<TrafficLog>({ 
      prefix: [TRAFFIC_LOG_PREFIX] 
    });
    
    // Delete each log
    for await (const entry of entries) {
      await kv.delete(entry.key);
      count++;
    }
    
    return count;
  }
  
  /**
   * Close the KV store connection
   */
  async close(): Promise<void> {
    if (this.kv) {
      this.kv.close();
      this.kv = null;
    }
  }
  
  /**
   * Export all APIs as a JSON-serializable object
   */
  async exportApis(): Promise<{ apis: MockApi[], timestamp: string, version: string }> {
    const apis = await this.getAllApis();
    
    return {
      apis,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
  }
  
  /**
   * Import APIs from a JSON object
   * @returns Object with counts of imported, skipped, and failed APIs
   */
  async importApis(data: { apis: MockApi[] }): Promise<{ 
    imported: number, 
    skipped: number, 
    failed: number,
    errors: string[]
  }> {
    if (!data.apis || !Array.isArray(data.apis)) {
      throw new Error("Invalid import data: expected an object with 'apis' array");
    }
    
    const result = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const apiData of data.apis) {
      try {
        // Check if API with same path and method already exists
        const existingApi = await this.findApiByPathAndMethod(apiData.path, apiData.method);
        
        if (existingApi) {
          // Skip this API
          result.skipped++;
          continue;
        }
        
        // Create a new API with this data
        // Strip ID, createdAt, and updatedAt as they will be regenerated
        const { id, createdAt, updatedAt, ...createApiData } = apiData;
        
        await this.createApi(createApiData);
        result.imported++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Error importing API ${apiData.method} ${apiData.path}: ${error.message}`);
      }
    }
    
    return result;
  }
} 