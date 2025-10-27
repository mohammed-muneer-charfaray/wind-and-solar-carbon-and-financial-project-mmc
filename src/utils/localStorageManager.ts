export interface StorageConfig {
  dbName: string;
  version: number;
  stores: string[];
}

export interface DataRecord {
  id: string;
  timestamp: Date;
  type: 'weather' | 'usage' | 'financial' | 'system' | 'results' | 'ml_model';
  data: any;
  metadata?: {
    source?: string;
    version?: string;
    checksum?: string;
  };
}

export interface StorageStats {
  totalRecords: number;
  storageUsed: number; // in bytes
  lastBackup?: Date;
  dataTypes: { [key: string]: number };
}

export class LocalStorageManager {
  private static instance: LocalStorageManager;
  private db: IDBDatabase | null = null;
  private config: StorageConfig;
  private isInitialized = false;

  private constructor() {
    this.config = {
      dbName: 'SolarWindAnalysisDB',
      version: 1,
      stores: [
        'weather_data',
        'usage_data', 
        'financial_data',
        'system_configurations',
        'calculation_results',
        'ml_models',
        'user_preferences',
        'backup_data'
      ]
    };
  }

  public static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  /**
   * Initialize the local storage system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.initializeIndexedDB();
      await this.createStorageDirectories();
      this.isInitialized = true;
      console.log('Local storage system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize local storage:', error);
      throw error;
    }
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        this.config.stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('type', 'type', { unique: false });
          }
        });
      };
    });
  }

  private async createStorageDirectories(): Promise<void> {
    // Create directory structure in localStorage for organization
    const directories = [
      'weather_cache',
      'usage_imports',
      'financial_models',
      'system_backups',
      'ml_checkpoints',
      'export_data'
    ];

    directories.forEach(dir => {
      const key = `directory_${dir}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({
          created: new Date().toISOString(),
          files: []
        }));
      }
    });
  }

  /**
   * Store data with automatic organization
   */
  async storeData(type: DataRecord['type'], data: any, metadata?: DataRecord['metadata']): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const record: DataRecord = {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      data,
      metadata
    };

    try {
      // Store in IndexedDB
      await this.storeInIndexedDB(this.getStoreNameForType(type), record);
      
      // Also cache in localStorage for quick access
      await this.cacheInLocalStorage(record);
      
      // Update directory index
      await this.updateDirectoryIndex(type, record.id);

      return record.id;
    } catch (error) {
      console.error('Failed to store data:', error);
      throw error;
    }
  }

  private async storeInIndexedDB(storeName: string, record: DataRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store in IndexedDB'));
    });
  }

  private async cacheInLocalStorage(record: DataRecord): Promise<void> {
    const cacheKey = `cache_${record.type}_${record.id}`;
    const cacheData = {
      id: record.id,
      timestamp: record.timestamp,
      dataSize: JSON.stringify(record.data).length,
      metadata: record.metadata
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  }

  private async updateDirectoryIndex(type: DataRecord['type'], recordId: string): Promise<void> {
    const dirKey = `directory_${this.getDirectoryForType(type)}`;
    const dirData = JSON.parse(localStorage.getItem(dirKey) || '{"files": []}');
    
    dirData.files.push({
      id: recordId,
      timestamp: new Date().toISOString(),
      type
    });
    
    localStorage.setItem(dirKey, JSON.stringify(dirData));
  }

  /**
   * Retrieve data by ID or criteria
   */
  async retrieveData(id: string): Promise<DataRecord | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Try cache first
      const cached = await this.getFromCache(id);
      if (cached) return cached;

      // Search in all stores
      for (const storeName of this.config.stores) {
        const record = await this.getFromIndexedDB(storeName, id);
        if (record) return record;
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return null;
    }
  }

  private async getFromCache(id: string): Promise<DataRecord | null> {
    // Check localStorage cache
    const cacheKeys = Object.keys(localStorage).filter(key => key.includes(id));
    if (cacheKeys.length === 0) return null;

    // This is a simplified cache check - in practice, you'd store the full record
    return null;
  }

  private async getFromIndexedDB(storeName: string, id: string): Promise<DataRecord | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  }

  /**
   * Query data by type and date range
   */
  async queryData(
    type: DataRecord['type'], 
    startDate?: Date, 
    endDate?: Date,
    limit?: number
  ): Promise<DataRecord[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const storeName = this.getStoreNameForType(type);
    return this.queryIndexedDB(storeName, startDate, endDate, limit);
  }

  private async queryIndexedDB(
    storeName: string, 
    startDate?: Date, 
    endDate?: Date,
    limit?: number
  ): Promise<DataRecord[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      
      let range: IDBKeyRange | undefined;
      if (startDate && endDate) {
        range = IDBKeyRange.bound(startDate, endDate);
      } else if (startDate) {
        range = IDBKeyRange.lowerBound(startDate);
      } else if (endDate) {
        range = IDBKeyRange.upperBound(endDate);
      }

      const request = index.openCursor(range);
      const results: DataRecord[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && (!limit || count < limit)) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to query IndexedDB'));
      };
    });
  }

  /**
   * Export data to file
   */
  async exportData(type?: DataRecord['type'], format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const data = type ? await this.queryData(type) : await this.getAllData();
    
    if (format === 'json') {
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    } else {
      const csv = this.convertToCSV(data);
      return new Blob([csv], { type: 'text/csv' });
    }
  }

  private async getAllData(): Promise<DataRecord[]> {
    const allData: DataRecord[] = [];
    
    for (const storeName of this.config.stores) {
      const storeData = await this.queryIndexedDB(storeName);
      allData.push(...storeData);
    }
    
    return allData;
  }

  private convertToCSV(data: DataRecord[]): string {
    if (data.length === 0) return '';
    
    const headers = ['id', 'timestamp', 'type', 'data', 'metadata'];
    const rows = data.map(record => [
      record.id,
      record.timestamp.toISOString(),
      record.type,
      JSON.stringify(record.data),
      JSON.stringify(record.metadata || {})
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Import data from file
   */
  async importData(file: File): Promise<number> {
    const text = await file.text();
    let data: any[];
    
    if (file.name.endsWith('.json')) {
      data = JSON.parse(text);
    } else if (file.name.endsWith('.csv')) {
      data = this.parseCSV(text);
    } else {
      throw new Error('Unsupported file format');
    }
    
    let importedCount = 0;
    for (const item of data) {
      try {
        await this.storeData(item.type, item.data, item.metadata);
        importedCount++;
      } catch (error) {
        console.warn('Failed to import item:', error);
      }
    }
    
    return importedCount;
  }

  private parseCSV(text: string): DataRecord[] {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const record: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        if (header === 'timestamp') {
          record[header] = new Date(value);
        } else if (header === 'data' || header === 'metadata') {
          try {
            record[header] = JSON.parse(value);
          } catch {
            record[header] = value;
          }
        } else {
          record[header] = value;
        }
      });
      
      return record;
    });
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const stats: StorageStats = {
      totalRecords: 0,
      storageUsed: 0,
      dataTypes: {}
    };

    // Calculate IndexedDB usage
    for (const storeName of this.config.stores) {
      const storeData = await this.queryIndexedDB(storeName);
      stats.totalRecords += storeData.length;
      
      storeData.forEach(record => {
        stats.dataTypes[record.type] = (stats.dataTypes[record.type] || 0) + 1;
        stats.storageUsed += JSON.stringify(record).length;
      });
    }

    // Add localStorage usage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_') || key?.startsWith('directory_')) {
        const value = localStorage.getItem(key);
        if (value) {
          stats.storageUsed += value.length;
        }
      }
    }

    return stats;
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    // Clear IndexedDB
    for (const storeName of this.config.stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to clear store'));
      });
    }

    // Clear localStorage cache
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.startsWith('cache_') || key.startsWith('directory_')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Create backup of all data
   */
  async createBackup(): Promise<Blob> {
    const allData = await this.getAllData();
    const backup = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      data: allData,
      stats: await this.getStorageStats()
    };

    return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(file: File): Promise<void> {
    const text = await file.text();
    const backup = JSON.parse(text);
    
    // Clear existing data
    await this.clearAllData();
    
    // Import backup data
    for (const record of backup.data) {
      await this.storeData(record.type, record.data, record.metadata);
    }
  }

  // Helper methods
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStoreNameForType(type: DataRecord['type']): string {
    const mapping: { [key in DataRecord['type']]: string } = {
      weather: 'weather_data',
      usage: 'usage_data',
      financial: 'financial_data',
      system: 'system_configurations',
      results: 'calculation_results',
      ml_model: 'ml_models'
    };
    return mapping[type];
  }

  private getDirectoryForType(type: DataRecord['type']): string {
    const mapping: { [key in DataRecord['type']]: string } = {
      weather: 'weather_cache',
      usage: 'usage_imports',
      financial: 'financial_models',
      system: 'system_backups',
      results: 'export_data',
      ml_model: 'ml_checkpoints'
    };
    return mapping[type];
  }
}

export const localStorageManager = LocalStorageManager.getInstance();