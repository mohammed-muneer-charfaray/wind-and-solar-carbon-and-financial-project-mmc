import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  HardDrive, 
  FileText, 
  Archive,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Folder
} from 'lucide-react';
import { localStorageManager, StorageStats, DataRecord } from '../utils/localStorageManager';

const DataStorageManager: React.FC = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [recentData, setRecentData] = useState<DataRecord[]>([]);

  useEffect(() => {
    initializeStorage();
    loadStorageStats();
    loadRecentData();
  }, []);

  const initializeStorage = async () => {
    try {
      await localStorageManager.initialize();
      setMessage({ type: 'success', text: 'Storage system initialized successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to initialize storage system' });
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await localStorageManager.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const loadRecentData = async () => {
    try {
      // Get recent data from all types
      const types: DataRecord['type'][] = ['weather', 'usage', 'financial', 'system', 'results'];
      const allRecent: DataRecord[] = [];
      
      for (const type of types) {
        const recent = await localStorageManager.queryData(type, undefined, undefined, 5);
        allRecent.push(...recent);
      }
      
      // Sort by timestamp and take most recent 10
      const sorted = allRecent
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      
      setRecentData(sorted);
    } catch (error) {
      console.error('Failed to load recent data:', error);
    }
  };

  const handleExportData = async (type?: DataRecord['type'], format: 'json' | 'csv' = 'json') => {
    setIsLoading(true);
    try {
      const blob = await localStorageManager.exportData(type, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar-wind-data-${type || 'all'}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: `Data exported successfully as ${format.toUpperCase()}` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const importedCount = await localStorageManager.importData(file);
      setMessage({ type: 'success', text: `Successfully imported ${importedCount} records` });
      await loadStorageStats();
      await loadRecentData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const backup = await localStorageManager.createBackup();
      const url = URL.createObjectURL(backup);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar-wind-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Backup created successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create backup' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('This will replace all existing data. Are you sure?')) {
      return;
    }

    setIsLoading(true);
    try {
      await localStorageManager.restoreFromBackup(file);
      setMessage({ type: 'success', text: 'Backup restored successfully' });
      await loadStorageStats();
      await loadRecentData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to restore backup' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('This will permanently delete all stored data. Are you sure?')) {
      return;
    }

    setIsLoading(true);
    try {
      await localStorageManager.clearAllData();
      setMessage({ type: 'success', text: 'All data cleared successfully' });
      await loadStorageStats();
      setRecentData([]);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear data' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: DataRecord['type']) => {
    const icons = {
      weather: '🌤️',
      usage: '⚡',
      financial: '💰',
      system: '⚙️',
      results: '📊',
      ml_model: '🧠'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Database className="h-6 w-6 mr-2 text-blue-600" />
          Local Data Storage Manager
        </h2>
        <button
          onClick={loadStorageStats}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center ${
          message.type === 'success' ? 'bg-green-50 text-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> :
           message.type === 'error' ? <AlertCircle className="h-5 w-5 mr-2" /> :
           <AlertCircle className="h-5 w-5 mr-2" />}
          {message.text}
        </div>
      )}

      {/* Storage Statistics */}
      {storageStats && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <HardDrive className="h-5 w-5 mr-2" />
            Storage Statistics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {storageStats.totalRecords.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(storageStats.storageUsed)}
              </div>
              <div className="text-sm text-gray-600">Storage Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(storageStats.dataTypes).length}
              </div>
              <div className="text-sm text-gray-600">Data Types</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.entries(storageStats.dataTypes).map(([type, count]) => (
              <div key={type} className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-lg">{getTypeIcon(type as DataRecord['type'])}</div>
                <div className="font-semibold">{count}</div>
                <div className="text-xs text-gray-600 capitalize">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Management Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Folder className="h-5 w-5 mr-2" />
          Data Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Export Data */}
          <div className="space-y-2">
            <h4 className="font-medium">Export Data</h4>
            <div className="space-y-1">
              <button
                onClick={() => handleExportData(undefined, 'json')}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                All (JSON)
              </button>
              <button
                onClick={() => handleExportData(undefined, 'csv')}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                All (CSV)
              </button>
            </div>
          </div>

          {/* Import Data */}
          <div className="space-y-2">
            <h4 className="font-medium">Import Data</h4>
            <label className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer flex items-center justify-center text-sm">
              <Upload className="h-4 w-4 mr-1" />
              Import File
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleImportData}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Backup */}
          <div className="space-y-2">
            <h4 className="font-medium">Backup</h4>
            <div className="space-y-1">
              <button
                onClick={handleCreateBackup}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center text-sm"
              >
                <Archive className="h-4 w-4 mr-1" />
                Create Backup
              </button>
              <label className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 cursor-pointer flex items-center justify-center text-sm">
                <Upload className="h-4 w-4 mr-1" />
                Restore
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>
            </div>
          </div>

          {/* Clear Data */}
          <div className="space-y-2">
            <h4 className="font-medium">Clear Data</h4>
            <button
              onClick={handleClearAllData}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Recent Data */}
      {recentData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Recent Data
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Timestamp</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Size</th>
                </tr>
              </thead>
              <tbody>
                {recentData.map((record) => (
                  <tr key={record.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">
                      <span className="flex items-center">
                        <span className="mr-2">{getTypeIcon(record.type)}</span>
                        <span className="capitalize">{record.type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-600">
                      {record.id.substring(0, 12)}...
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatBytes(JSON.stringify(record.data).length)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataStorageManager;