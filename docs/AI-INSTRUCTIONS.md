# AI Assistant Instructions for Node.js TypeScript Base

This document provides specific instructions for AI assistants working with this Node.js TypeScript template. Follow these guidelines to provide the most effective assistance.

## 🤖 Quick Recognition Guide

**When you encounter this template, you should immediately understand:**
- This is a Node.js TypeScript project with strict configuration
- Main entry point is `src/main.ts`
- Use `npm run watch` for development
- Use `npm run build` for production compilation
- ESLint and Prettier are configured and should be used
- Path aliases `@/*` map to `src/*`

## 🚦 Initial Assessment Protocol

When first opening this project, perform these checks:

1. **Verify Setup**:
   ```bash
   # Check if dependencies are installed
   ls node_modules/ || echo "Run: npm install"
   
   # Verify main files exist
   ls src/main.ts tsconfig.json package.json
   ```

2. **Understand Current State**:
   - Read `src/main.ts` to understand current functionality
   - Check `package.json` dependencies to see what's already available
   - Look for any custom modules in `src/` directory

3. **Prepare for Development**:
   - Always suggest starting with `npm run watch` for active development
   - Recommend `npm run type-check` if there are type concerns

## 📋 Development Workflow for AI

### Starting a New Feature
1. **Analyze Requirements**: Understand what the user wants to build
2. **Check Dependencies**: See if required packages are already installed
3. **Plan Architecture**: Decide if new files/modules are needed
4. **Start Development**: Use watch mode for immediate feedback
5. **Test Incrementally**: Run the code frequently during development

### Code Modification Process
1. **Read Existing Code**: Always understand current structure first
2. **Follow Patterns**: Match existing code style and patterns
3. **Use TypeScript**: Leverage strict typing and interfaces
4. **Maintain Quality**: Run lint/format checks before finishing

### Adding Dependencies
When you need to add packages:
```bash
# Runtime dependency
npm install package-name

# Type definitions (if needed)
npm install -D @types/package-name

# Development tool
npm install -D dev-package-name
```

## 🎯 Common Task Patterns

### Web Scraping Implementation
```typescript
// 1. Install required packages
// npm install axios cheerio
// npm install -D @types/cheerio

// 2. Create in src/main.ts or new module
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedData {
  title: string;
  url: string;
  // Add other fields as needed
}

async function scrapeWebsite(url: string): Promise<ScrapedData[]> {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const results: ScrapedData[] = [];
    // Your scraping logic here
    
    return results;
  } catch (error) {
    console.error('Scraping failed:', error);
    throw error;
  }
}
```

### Database Utility Implementation
```typescript
// 1. Install database driver
// npm install mysql2 (or pg, sqlite3, etc.)
// npm install -D @types/mysql2

// 2. Create connection module
interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
}

function getDbConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mydb'
  };
}
```

### File Processing Implementation
```typescript
// Use built-in Node.js modules
import { readFile, writeFile, readdir } from 'fs/promises';
import { join, extname } from 'path';

async function processFiles(inputDir: string, outputDir: string): Promise<void> {
  const files = await readdir(inputDir);
  
  for (const file of files) {
    if (extname(file) === '.txt') {
      const inputPath = join(inputDir, file);
      const outputPath = join(outputDir, `processed-${file}`);
      
      const content = await readFile(inputPath, 'utf-8');
      const processed = content.toLowerCase(); // Example processing
      await writeFile(outputPath, processed);
    }
  }
}
```

## ⚠️ Important Guidelines

### DO's
- ✅ Always run `npm install` if node_modules is missing
- ✅ Use `npm run watch` for development
- ✅ Follow existing code patterns and style
- ✅ Add proper TypeScript types and interfaces
- ✅ Handle errors appropriately with try/catch
- ✅ Use environment variables for configuration
- ✅ Log meaningful progress messages
- ✅ Check `package.json` for existing dependencies before adding new ones

### DON'Ts
- ❌ Don't modify `tsconfig.json` unless specifically requested
- ❌ Don't change ESLint/Prettier configuration without reason
- ❌ Don't use `any` type unless absolutely necessary
- ❌ Don't commit sensitive data (API keys, passwords)
- ❌ Don't install packages globally that should be project-local
- ❌ Don't ignore TypeScript errors - fix them properly

### Code Quality Standards
- Use explicit return types for all functions
- Prefer `const` over `let` when possible
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Handle async operations properly with await/try-catch
- Use path aliases (`@/`) when appropriate

## 🔧 Troubleshooting for AI

### Common Issues & Solutions

**TypeScript Errors**:
```bash
npm run type-check  # See detailed errors
npm run build       # Attempt compilation
```

**Missing Dependencies**:
```bash
npm install                    # Install all dependencies
npm install package-name       # Install specific package
npm install -D @types/package  # Add type definitions
```

**Linting Issues**:
```bash
npm run lint        # Check issues
npm run lint:fix    # Auto-fix what's possible
npm run format      # Format code with Prettier
```

**Runtime Issues**:
- Check console logs for specific error messages
- Verify environment variables are set correctly
- Ensure file paths are correct (use path.join())
- Check network connectivity for web scraping/API calls

## 📚 Reference Commands

### Development Commands
```bash
npm run watch       # Start development with auto-reload
npm run dev         # Run once in development mode
npm run build       # Compile TypeScript to JavaScript
npm start           # Run compiled JavaScript
npm run clean       # Remove dist directory
```

### Quality Commands
```bash
npm run type-check  # Type check without building
npm run lint        # Check code quality
npm run lint:fix    # Fix auto-fixable issues
npm run format      # Format code with Prettier
```

## 🎯 Success Criteria

An AI assistant should be considered successful when:
1. **Code runs without errors** in development mode
2. **TypeScript compiles** without type errors
3. **Linting passes** or only has acceptable warnings
4. **Code follows** existing patterns and style
5. **Functionality works** as requested by the user
6. **Dependencies are properly managed** and documented

## 📝 Communication Tips

When working with users:
- Explain what commands you're running and why
- Show progress with clear status updates
- Mention when you're installing new dependencies
- Explain any architectural decisions you make
- Provide clear instructions for testing the implementation
- Offer suggestions for extending or improving the code

---

*These instructions ensure consistent, high-quality assistance when working with this Node.js TypeScript template. Follow them to provide the best possible development experience.*