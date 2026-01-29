# Extension Guide for Common Use Cases

This guide provides ready-to-use templates and patterns for extending the Node.js TypeScript base for common application types.

## 🕷️ Web Scraping Applications

### Quick Setup
```bash
npm install axios cheerio puppeteer
npm install -D @types/cheerio
```

### Basic Web Scraper Template
```typescript
// src/types/scraper.ts
export interface ScrapedItem {
  title: string;
  url: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ScraperConfig {
  baseUrl: string;
  selectors: {
    container: string;
    title: string;
    link: string;
    description?: string;
  };
  requestDelay?: number;
}
```

```typescript
// src/services/scraper.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ScrapedItem, ScraperConfig } from '@/types/scraper';

export class WebScraper {
  constructor(private config: ScraperConfig) {}

  async scrape(url: string): Promise<ScrapedItem[]> {
    try {
      console.log(`🕷️  Scraping: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NodeBot/1.0)'
        }
      });
      
      const $ = cheerio.load(response.data);
      const items: ScrapedItem[] = [];
      
      $(this.config.selectors.container).each((_, element) => {
        const $el = $(element);
        
        const item: ScrapedItem = {
          title: $el.find(this.config.selectors.title).text().trim(),
          url: this.resolveUrl($el.find(this.config.selectors.link).attr('href') || ''),
        };
        
        if (this.config.selectors.description) {
          item.description = $el.find(this.config.selectors.description).text().trim();
        }
        
        if (item.title && item.url) {
          items.push(item);
        }
      });
      
      console.log(`📊 Found ${items.length} items`);
      return items;
      
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      throw error;
    }
  }
  
  private resolveUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return this.config.baseUrl + url;
    return this.config.baseUrl + '/' + url;
  }
}
```

```typescript
// src/main.ts - Usage example
import { WebScraper } from '@/services/scraper';

async function main(): Promise<void> {
  const scraper = new WebScraper({
    baseUrl: 'https://example.com',
    selectors: {
      container: '.item',
      title: '.title',
      link: 'a',
      description: '.description'
    }
  });
  
  const results = await scraper.scrape('https://example.com/products');
  console.log('Results:', results);
}
```

## 🗄️ Database Utilities

### MySQL Example
```bash
npm install mysql2
npm install -D @types/mysql2
```

```typescript
// src/config/database.ts
export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'myapp',
    port: parseInt(process.env.DB_PORT || '3306')
  };
}
```

```typescript
// src/services/database.ts
import mysql from 'mysql2/promise';
import type { DatabaseConfig } from '@/config/database';

export class DatabaseService {
  private connection: mysql.Connection | null = null;
  
  constructor(private config: DatabaseConfig) {}
  
  async connect(): Promise<void> {
    try {
      this.connection = await mysql.createConnection(this.config);
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      console.log('🔌 Database disconnected');
    }
  }
  
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }
    
    try {
      const [rows] = await this.connection.execute(sql, params);
      return rows as T[];
    } catch (error) {
      console.error('❌ Query failed:', sql, error);
      throw error;
    }
  }
  
  async insertMany<T>(table: string, data: T[]): Promise<void> {
    if (data.length === 0) return;
    
    const keys = Object.keys(data[0] as object);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    for (const item of data) {
      const values = keys.map(key => (item as any)[key]);
      await this.query(sql, values);
    }
    
    console.log(`📝 Inserted ${data.length} records into ${table}`);
  }
}
```

### PostgreSQL Example
```bash
npm install pg
npm install -D @types/pg
```

```typescript
// src/services/postgres.ts
import { Client } from 'pg';

export class PostgresService {
  private client: Client;
  
  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://user:pass@localhost/db'
    });
  }
  
  async connect(): Promise<void> {
    await this.client.connect();
    console.log('✅ PostgreSQL connected');
  }
  
  async disconnect(): Promise<void> {
    await this.client.end();
    console.log('🔌 PostgreSQL disconnected');
  }
  
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.client.query(text, params);
    return result.rows;
  }
}
```

## 📁 File Processing Tools

### CSV Processing
```bash
npm install csv-parse csv-stringify fs-extra
npm install -D @types/fs-extra
```

```typescript
// src/services/csv-processor.ts
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { readFile, writeFile } from 'fs-extra';

export class CSVProcessor {
  async readCSV<T = Record<string, string>>(filePath: string): Promise<T[]> {
    console.log(`📖 Reading CSV: ${filePath}`);
    
    const content = await readFile(filePath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      parse(content, {
        columns: true,
        skip_empty_lines: true
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
  
  async writeCSV<T = Record<string, any>>(filePath: string, data: T[]): Promise<void> {
    console.log(`📝 Writing CSV: ${filePath}`);
    
    return new Promise((resolve, reject) => {
      stringify(data, {
        header: true
      }, async (err, output) => {
        if (err) {
          reject(err);
        } else {
          await writeFile(filePath, output);
          resolve();
        }
      });
    });
  }
  
  async processCSV<T, U>(
    inputPath: string,
    outputPath: string,
    processor: (row: T) => U
  ): Promise<void> {
    const data = await this.readCSV<T>(inputPath);
    const processed = data.map(processor);
    await this.writeCSV(outputPath, processed);
    
    console.log(`✅ Processed ${data.length} rows`);
  }
}
```

### Image Processing
```bash
npm install sharp
npm install -D @types/sharp
```

```typescript
// src/services/image-processor.ts
import sharp from 'sharp';
import { readdir, ensureDir } from 'fs-extra';
import { join, extname, basename } from 'path';

export class ImageProcessor {
  private supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.tiff'];
  
  async processDirectory(
    inputDir: string,
    outputDir: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<void> {
    await ensureDir(outputDir);
    
    const files = await readdir(inputDir);
    const imageFiles = files.filter(file => 
      this.supportedFormats.includes(extname(file).toLowerCase())
    );
    
    console.log(`🖼️  Processing ${imageFiles.length} images...`);
    
    for (const file of imageFiles) {
      await this.processImage(
        join(inputDir, file),
        join(outputDir, this.getOutputFilename(file, options.format)),
        options
      );
    }
    
    console.log('✅ Image processing complete');
  }
  
  private async processImage(
    inputPath: string,
    outputPath: string,
    options: any
  ): Promise<void> {
    let processor = sharp(inputPath);
    
    if (options.width || options.height) {
      processor = processor.resize(options.width, options.height);
    }
    
    if (options.format) {
      processor = processor[options.format]({ quality: options.quality || 80 });
    }
    
    await processor.toFile(outputPath);
  }
  
  private getOutputFilename(originalName: string, format?: string): string {
    const name = basename(originalName, extname(originalName));
    const ext = format ? `.${format}` : extname(originalName);
    return `${name}${ext}`;
  }
}
```

## 🌐 API Client Tools

### REST API Client
```bash
npm install axios
```

```typescript
// src/services/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ApiConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  
  constructor(config: ApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
    
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
        return Promise.reject(error);
      }
    );
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}
```

## 🖥️ CLI Applications

### Command Line Interface
```bash
npm install commander inquirer chalk
npm install -D @types/inquirer
```

```typescript
// src/cli/index.ts
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';

export class CLIApp {
  private program: Command;
  
  constructor() {
    this.program = new Command();
    this.setupCommands();
  }
  
  private setupCommands(): void {
    this.program
      .name('my-tool')
      .description('CLI tool built with Node.js TypeScript template')
      .version('1.0.0');
    
    this.program
      .command('scrape')
      .description('Scrape a website')
      .argument('<url>', 'URL to scrape')
      .option('-o, --output <file>', 'Output file')
      .action(this.handleScrape.bind(this));
    
    this.program
      .command('process')
      .description('Process files')
      .option('-i, --input <dir>', 'Input directory')
      .option('-o, --output <dir>', 'Output directory')
      .action(this.handleProcess.bind(this));
    
    this.program
      .command('interactive')
      .description('Interactive mode')
      .action(this.handleInteractive.bind(this));
  }
  
  private async handleScrape(url: string, options: any): Promise<void> {
    console.log(chalk.blue(`🕷️  Scraping: ${url}`));
    // Implement scraping logic
  }
  
  private async handleProcess(options: any): Promise<void> {
    console.log(chalk.green('📁 Processing files...'));
    // Implement file processing logic
  }
  
  private async handleInteractive(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: ['Scrape website', 'Process files', 'Exit']
      }
    ]);
    
    switch (answers.action) {
      case 'Scrape website':
        const urlAnswer = await inquirer.prompt([
          {
            type: 'input',
            name: 'url',
            message: 'Enter URL to scrape:'
          }
        ]);
        await this.handleScrape(urlAnswer.url, {});
        break;
      
      case 'Process files':
        // Implement interactive file processing
        break;
    }
  }
  
  run(argv: string[]): void {
    this.program.parse(argv);
  }
}
```

```typescript
// src/main.ts - CLI usage
import { CLIApp } from '@/cli';

function main(): void {
  const cli = new CLIApp();
  cli.run(process.argv);
}

if (require.main === module) {
  main();
}
```

## 🎛️ Configuration Management

### Environment Configuration
```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3000),
  API_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

export type Environment = z.infer<typeof envSchema>;

export function loadEnvironment(): Environment {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    result.error.errors.forEach(error => {
      console.error(`  ${error.path.join('.')}: ${error.message}`);
    });
    process.exit(1);
  }
  
  return result.data;
}
```

## 📊 Logging and Monitoring

### Enhanced Logging
```bash
npm install winston
npm install -D @types/winston
```

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
```

---

*These extension patterns provide ready-to-use templates for common Node.js TypeScript application types. Copy and modify them to fit your specific needs.*