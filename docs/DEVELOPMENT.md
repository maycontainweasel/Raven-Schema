# Development Workflow Guide

This guide outlines the recommended development workflow for building applications with this Node.js TypeScript template.

## 🚀 Getting Started Workflow

### 1. Project Setup
```bash
# Copy template to new project
cp -r node-ts-base my-new-project
cd my-new-project

# Update project information
# Edit package.json: name, description, author

# Install dependencies
npm install

# Verify setup
npm run dev
```

### 2. Development Environment
```bash
# Start development with auto-reload
npm run watch

# In another terminal (optional)
npm run type-check  # Continuous type checking
```

## 📁 Project Organization

### Recommended Structure
```
src/
├── main.ts              # Entry point - keep minimal
├── config/
│   ├── database.ts      # Database configuration
│   ├── api.ts          # API configuration
│   └── env.ts          # Environment variables
├── services/
│   ├── scraper.ts      # Web scraping logic
│   ├── database.ts     # Database operations
│   └── api-client.ts   # External API calls
├── utils/
│   ├── file-helpers.ts # File operations
│   ├── logger.ts       # Logging utilities
│   └── validators.ts   # Data validation
├── types/
│   ├── api.ts          # API response types
│   ├── database.ts     # Database entity types
│   └── common.ts       # Shared types
└── cli/                # CLI command handlers (if applicable)
    ├── commands/
    └── index.ts
```

## 🔄 Development Cycle

### Daily Development Process
1. **Start Development**
   ```bash
   npm run watch  # Auto-restart on file changes
   ```

2. **Write Code**
   - Edit files in `src/`
   - See changes immediately
   - Fix TypeScript errors as they appear

3. **Test Changes**
   ```bash
   # Code runs automatically with watch mode
   # Or run manually:
   npm run dev
   ```

4. **Quality Check**
   ```bash
   npm run lint        # Check code quality
   npm run type-check  # Verify types
   npm run format      # Format code
   ```

5. **Build (when ready)**
   ```bash
   npm run build  # Compile for production
   npm start      # Test production build
   ```

## 🛠️ Adding Features

### Step-by-Step Feature Addition

1. **Plan the Feature**
   - Identify required dependencies
   - Plan file structure
   - Define TypeScript interfaces

2. **Install Dependencies**
   ```bash
   # Example: Adding web scraping capability
   npm install axios cheerio
   npm install -D @types/cheerio
   ```

3. **Create Types First**
   ```typescript
   // src/types/scraper.ts
   export interface ScrapedData {
     title: string;
     url: string;
     description?: string;
   }
   ```

4. **Implement Core Logic**
   ```typescript
   // src/services/scraper.ts
   import type { ScrapedData } from '@/types/scraper';
   
   export async function scrapeWebsite(url: string): Promise<ScrapedData[]> {
     // Implementation here
   }
   ```

5. **Update Main Entry Point**
   ```typescript
   // src/main.ts
   import { scrapeWebsite } from '@/services/scraper';
   
   async function main(): Promise<void> {
     const data = await scrapeWebsite('https://example.com');
     console.log('Scraped data:', data);
   }
   ```

## 📦 Dependency Management

### Adding New Dependencies

**Runtime Dependencies**:
```bash
npm install package-name
```

**Type Definitions**:
```bash
npm install -D @types/package-name
```

**Development Tools**:
```bash
npm install -D dev-tool-name
```

### Common Dependencies by Use Case

**Web Scraping**:
```bash
npm install axios cheerio puppeteer
npm install -D @types/cheerio
```

**Database Operations**:
```bash
# MySQL
npm install mysql2
npm install -D @types/mysql2

# PostgreSQL
npm install pg
npm install -D @types/pg

# MongoDB
npm install mongodb
npm install -D @types/mongodb
```

**File Processing**:
```bash
npm install csv-parse csv-stringify fs-extra
npm install -D @types/fs-extra
```

**CLI Applications**:
```bash
npm install commander inquirer chalk
npm install -D @types/inquirer
```

## 🎯 Code Quality Workflow

### Linting and Formatting
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

### Pre-commit Checklist
- [ ] Code runs without errors (`npm run dev`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Types are correct (`npm run type-check`)

## 🐛 Debugging Workflow

### TypeScript Issues
1. **Check compilation**:
   ```bash
   npm run build
   ```

2. **Detailed type checking**:
   ```bash
   npm run type-check
   ```

3. **Common fixes**:
   - Add missing type imports
   - Fix interface definitions
   - Add proper return types

### Runtime Issues
1. **Use descriptive logging**:
   ```typescript
   console.log('🔍 Debug: Processing file:', filename);
   console.error('❌ Error occurred:', error.message);
   ```

2. **Add try-catch blocks**:
   ```typescript
   try {
     const result = await riskyOperation();
   } catch (error) {
     console.error('Operation failed:', error);
     // Handle error appropriately
   }
   ```

3. **Check environment variables**:
   ```typescript
   const requiredEnvVars = ['API_KEY', 'DATABASE_URL'];
   requiredEnvVars.forEach(varName => {
     if (!process.env[varName]) {
       console.warn(`⚠️  Missing environment variable: ${varName}`);
     }
   });
   ```

## 🚀 Production Deployment

### Build Process
```bash
# Clean previous build
npm run clean

# Create production build
npm run build

# Test production build
npm start
```

### Environment Configuration
```typescript
// src/config/env.ts
export const config = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  apiKey: process.env.API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'sqlite://./data.db'
};

// Validate required environment variables
const required = ['API_KEY'];
required.forEach(key => {
  if (!process.env[key] && config.environment === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});
```

## 📊 Performance Optimization

### Code Organization
- Keep modules small and focused
- Use appropriate imports (avoid importing entire libraries)
- Implement proper error handling
- Use TypeScript's strict mode features

### Runtime Performance
```typescript
// Use streams for large data processing
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

// Implement proper async/await patterns
async function processLargeDataset(data: LargeData[]): Promise<void> {
  // Process in batches to avoid memory issues
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await processBatch(batch);
  }
}
```

## 🔄 Version Control Workflow

### Git Best Practices
```bash
# Initialize repository (if needed)
git init
git add .
git commit -m "Initial commit: Node.js TypeScript template"

# Development workflow
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "feat: add web scraping functionality"

# Before merging
npm run lint
npm run build
npm run type-check
```

### Gitignore is Pre-configured
The template includes a comprehensive `.gitignore` that covers:
- Node.js artifacts (`node_modules/`, `*.log`)
- Build outputs (`dist/`, `build/`)
- Environment files (`.env*`)
- Editor files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)

---

*This workflow guide ensures consistent, efficient development practices when using this template.*