export interface ExcelUsageData {
  timestamp: string;
  energyConsumption: number;
  peakDemand: number;
  baseLoad: number;
  sector: 'residential' | 'commercial' | 'industrial';
  location?: string;
  notes?: string;
}

export interface ProcessedUsageData {
  timestamp: Date;
  energyConsumption: number;
  peakDemand: number;
  baseLoad: number;
  sector: 'residential' | 'commercial' | 'industrial';
}

export class ExcelDataProcessor {
  private static instance: ExcelDataProcessor;

  private constructor() {}

  public static getInstance(): ExcelDataProcessor {
    if (!ExcelDataProcessor.instance) {
      ExcelDataProcessor.instance = new ExcelDataProcessor();
    }
    return ExcelDataProcessor.instance;
  }

  /**
   * Process Excel data from CSV format
   */
  processCSVData(csvContent: string): ProcessedUsageData[] {
    try {
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const data: ProcessedUsageData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim();
        });
        
        // Map common column names
        const processedRow = this.mapColumnNames(row);
        if (processedRow) {
          data.push(processedRow);
        }
      }
      
      return data;
    } catch (error) {
      console.error('CSV processing error:', error);
      return [];
    }
  }

  /**
   * Process Excel data from JSON format (converted from Excel)
   */
  processJSONData(jsonData: any[]): ProcessedUsageData[] {
    try {
      const data: ProcessedUsageData[] = [];
      
      for (const row of jsonData) {
        const processedRow = this.mapColumnNames(row);
        if (processedRow) {
          data.push(processedRow);
        }
      }
      
      return data;
    } catch (error) {
      console.error('JSON processing error:', error);
      return [];
    }
  }

  private mapColumnNames(row: any): ProcessedUsageData | null {
    try {
      // Common column name mappings
      const timestampFields = ['timestamp', 'date', 'datetime', 'time', 'date_time'];
      const consumptionFields = ['energy_consumption', 'consumption', 'energy', 'kwh', 'usage'];
      const peakDemandFields = ['peak_demand', 'peak', 'max_demand', 'demand', 'kw'];
      const baseLoadFields = ['base_load', 'baseload', 'minimum', 'min_load'];
      const sectorFields = ['sector', 'type', 'category', 'customer_type'];

      // Find timestamp
      let timestamp: Date | null = null;
      for (const field of timestampFields) {
        if (row[field]) {
          timestamp = new Date(row[field]);
          if (!isNaN(timestamp.getTime())) break;
          timestamp = null;
        }
      }
      
      if (!timestamp) {
        // Generate timestamp if missing
        timestamp = new Date();
      }

      // Find energy consumption
      let energyConsumption = 0;
      for (const field of consumptionFields) {
        if (row[field] !== undefined && row[field] !== '') {
          energyConsumption = parseFloat(row[field]) || 0;
          break;
        }
      }

      // Find peak demand
      let peakDemand = 0;
      for (const field of peakDemandFields) {
        if (row[field] !== undefined && row[field] !== '') {
          peakDemand = parseFloat(row[field]) || 0;
          break;
        }
      }

      // If peak demand is missing, estimate from consumption
      if (peakDemand === 0 && energyConsumption > 0) {
        peakDemand = energyConsumption * 0.8; // Typical load factor
      }

      // Find base load
      let baseLoad = 0;
      for (const field of baseLoadFields) {
        if (row[field] !== undefined && row[field] !== '') {
          baseLoad = parseFloat(row[field]) || 0;
          break;
        }
      }

      // If base load is missing, estimate from peak demand
      if (baseLoad === 0 && peakDemand > 0) {
        baseLoad = peakDemand * 0.4; // Typical base load ratio
      }

      // Find sector
      let sector: 'residential' | 'commercial' | 'industrial' = 'residential';
      for (const field of sectorFields) {
        if (row[field]) {
          const sectorValue = row[field].toString().toLowerCase();
          if (sectorValue.includes('commercial') || sectorValue.includes('business')) {
            sector = 'commercial';
          } else if (sectorValue.includes('industrial') || sectorValue.includes('factory')) {
            sector = 'industrial';
          }
          break;
        }
      }

      // Validate data
      if (energyConsumption === 0 && peakDemand === 0) {
        return null; // Skip rows with no energy data
      }

      return {
        timestamp,
        energyConsumption,
        peakDemand,
        baseLoad,
        sector
      };
    } catch (error) {
      console.error('Row mapping error:', error);
      return null;
    }
  }

  /**
   * Generate sample data for testing
   */
  generateSampleData(days: number = 30): ProcessedUsageData[] {
    const data: ProcessedUsageData[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let day = 0; day < days; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const timestamp = new Date(startDate);
        timestamp.setDate(timestamp.getDate() + day);
        timestamp.setHours(hour, 0, 0, 0);

        // Simulate realistic usage patterns
        const isWeekday = timestamp.getDay() >= 1 && timestamp.getDay() <= 5;
        const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
        const isBusinessHour = hour >= 8 && hour <= 17;

        let baseConsumption = 30; // Base residential consumption
        if (isWeekday && isBusinessHour) baseConsumption *= 1.4;
        if (isPeakHour) baseConsumption *= 1.6;

        // Add some randomness
        const randomFactor = 0.8 + Math.random() * 0.4;
        const energyConsumption = baseConsumption * randomFactor;
        const peakDemand = energyConsumption * (0.7 + Math.random() * 0.3);
        const baseLoad = energyConsumption * (0.3 + Math.random() * 0.2);

        data.push({
          timestamp,
          energyConsumption,
          peakDemand,
          baseLoad,
          sector: Math.random() > 0.7 ? 'commercial' : 'residential'
        });
      }
    }

    return data;
  }

  /**
   * Validate and clean data
   */
  validateData(data: ProcessedUsageData[]): {
    valid: ProcessedUsageData[];
    errors: string[];
    warnings: string[];
  } {
    const valid: ProcessedUsageData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Check for valid timestamp
      if (!row.timestamp || isNaN(row.timestamp.getTime())) {
        errors.push(`Row ${i + 1}: Invalid timestamp`);
        continue;
      }

      // Check for negative values
      if (row.energyConsumption < 0 || row.peakDemand < 0 || row.baseLoad < 0) {
        errors.push(`Row ${i + 1}: Negative energy values not allowed`);
        continue;
      }

      // Check for unrealistic values
      if (row.energyConsumption > 10000) {
        warnings.push(`Row ${i + 1}: Very high energy consumption (${row.energyConsumption} kWh)`);
      }

      if (row.peakDemand > row.energyConsumption * 2) {
        warnings.push(`Row ${i + 1}: Peak demand seems too high compared to consumption`);
      }

      if (row.baseLoad > row.peakDemand) {
        warnings.push(`Row ${i + 1}: Base load higher than peak demand`);
        // Fix the data
        row.baseLoad = row.peakDemand * 0.6;
      }

      valid.push(row);
    }

    return { valid, errors, warnings };
  }

  /**
   * Aggregate data by time period
   */
  aggregateData(
    data: ProcessedUsageData[], 
    period: 'hour' | 'day' | 'week' | 'month'
  ): ProcessedUsageData[] {
    const aggregated = new Map<string, ProcessedUsageData[]>();

    // Group data by period
    for (const row of data) {
      let key: string;
      const date = new Date(row.timestamp);

      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
        default:
          key = date.toISOString();
      }

      if (!aggregated.has(key)) {
        aggregated.set(key, []);
      }
      aggregated.get(key)!.push(row);
    }

    // Calculate aggregated values
    const result: ProcessedUsageData[] = [];
    for (const [key, rows] of aggregated.entries()) {
      const avgConsumption = rows.reduce((sum, r) => sum + r.energyConsumption, 0) / rows.length;
      const maxPeakDemand = Math.max(...rows.map(r => r.peakDemand));
      const avgBaseLoad = rows.reduce((sum, r) => sum + r.baseLoad, 0) / rows.length;
      
      // Use the first timestamp as representative
      const timestamp = rows[0].timestamp;
      const sector = rows.find(r => r.sector === 'industrial')?.sector || 
                    rows.find(r => r.sector === 'commercial')?.sector || 
                    'residential';

      result.push({
        timestamp,
        energyConsumption: avgConsumption,
        peakDemand: maxPeakDemand,
        baseLoad: avgBaseLoad,
        sector
      });
    }

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const excelDataProcessor = ExcelDataProcessor.getInstance();