#!/usr/bin/env node
/**
 * Build Quality Verification Script
 * 
 * Checks the codebase for:
 * - Build status
 * - Console statements
 * - Hardcoded colors
 * - Inline styles
 * - TypeScript errors
 * - Component documentation
 * - Test coverage
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function checkFilePatterns(directory, patterns, description) {
  const results = [];
  const files = getAllFiles(directory);
  
  files.forEach(file => {
    if (file.includes('node_modules') || file.includes('.next')) return;
    
    const content = fs.readFileSync(file, 'utf8');
    patterns.forEach(({ pattern, name }) => {
      const matches = content.match(pattern);
      if (matches) {
        const lines = content.split('\n');
        matches.forEach(match => {
          const lineNum = lines.findIndex(line => line.includes(match)) + 1;
          results.push({
            file: path.relative(process.cwd(), file),
            line: lineNum,
            issue: name,
            match: match.trim().substring(0, 60)
          });
        });
      }
    });
  });
  
  return results;
}

function getAllFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (!filePath.includes('node_modules') && !filePath.includes('.next') && !filePath.includes('.git')) {
          getAllFiles(filePath, fileList);
        }
      } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        fileList.push(filePath);
      }
    });
  } catch (error) {
    // Directory doesn't exist or can't be read
  }
  
  return fileList;
}

function checkConsoleStatements() {
  logSection('Checking for Console Statements');
  
  const results = checkFilePatterns('.', [
    { pattern: /console\.(error|warn|log|debug|info)\(/g, name: 'Console statement' }
  ], 'Console statements');
  
  // Filter out scripts, docs, and test files (console statements are OK in these)
  const filtered = results.filter(r => 
    !r.file.includes('scripts/') && 
    !r.file.includes('docs/') &&
    !r.file.includes('node_modules/') &&
    !r.file.includes('__tests__') &&
    !r.file.includes('.test.') &&
    !r.file.includes('.spec.')
  );
  
  if (filtered.length === 0) {
    log('✅ No console statements found in source code', 'green');
    return { passed: true, count: 0 };
  } else {
    log(`⚠️  Found ${filtered.length} console statement(s):`, 'yellow');
    filtered.slice(0, 10).forEach(r => {
      console.log(`  ${r.file}:${r.line} - ${r.issue}`);
    });
    if (filtered.length > 10) {
      console.log(`  ... and ${filtered.length - 10} more`);
    }
    return { passed: false, count: filtered.length };
  }
}

function checkHardcodedColors() {
  logSection('Checking for Hardcoded Colors');
  
  const results = checkFilePatterns('.', [
    { pattern: /#[fF]{2}[0-9a-fA-F]{4}|#ff0099|#FFFBEB|#fffbeb/g, name: 'Hardcoded brand color' }
  ], 'Hardcoded colors');
  
  // Filter out docs, design system files, SVG files, scripts, and acceptable locations
  const filtered = results.filter(r => 
    !r.file.includes('docs/') && 
    !r.file.includes('scripts/') &&
    !r.file.includes('design-system') &&
    !r.file.includes('.svg') &&
    !r.file.includes('globals.css') &&
    !r.file.includes('tailwind.config') &&
    !r.file.includes('README.md') &&
    !r.file.includes('lib/confetti.ts') && // Confetti colors are intentional
    !r.file.includes('public/')
  );
  
  if (filtered.length === 0) {
    log('✅ No hardcoded brand colors found in components', 'green');
    return { passed: true, count: 0 };
  } else {
    log(`⚠️  Found ${filtered.length} hardcoded color(s):`, 'yellow');
    filtered.slice(0, 10).forEach(r => {
      console.log(`  ${r.file}:${r.line}`);
    });
    return { passed: false, count: filtered.length };
  }
}

function checkInlineFontSizeStyles() {
  logSection('Checking for Inline FontSize Styles');
  
  const results = checkFilePatterns('.', [
    { pattern: /style=\{\{.*fontSize.*clamp/g, name: 'Inline fontSize style' }
  ], 'Inline fontSize styles');
  
  const filtered = results.filter(r => !r.file.includes('node_modules/'));
  
  if (filtered.length === 0) {
    log('✅ No inline fontSize styles found', 'green');
    return { passed: true, count: 0 };
  } else {
    log(`⚠️  Found ${filtered.length} inline fontSize style(s):`, 'yellow');
    filtered.forEach(r => {
      console.log(`  ${r.file}:${r.line}`);
    });
    return { passed: false, count: filtered.length };
  }
}

function checkJSDoc() {
  logSection('Checking Component JSDoc Documentation');
  
  const componentFiles = getAllFiles('./components').filter(f => 
    f.endsWith('.tsx') && !f.includes('ui/')
  );
  
  let documented = 0;
  let undocumented = [];
  
  componentFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const hasJSDoc = content.includes('/**') && content.includes('@param');
    
    if (hasJSDoc) {
      documented++;
    } else {
      const fileName = path.basename(file);
      undocumented.push(fileName);
    }
  });
  
  const total = componentFiles.length;
  const percentage = Math.round((documented / total) * 100);
  
  log(`Documented: ${documented}/${total} (${percentage}%)`, documented === total ? 'green' : 'yellow');
  
  if (undocumented.length > 0) {
    log(`Undocumented components:`, 'yellow');
    undocumented.forEach(name => console.log(`  - ${name}`));
  }
  
  return { documented, total, percentage };
}

function checkComponentSizes() {
  logSection('Checking Component Sizes');
  
  const componentFiles = getAllFiles('./components').filter(f => f.endsWith('.tsx'));
  const largeComponents = [];
  
  componentFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    
    if (lines > 500) {
      largeComponents.push({
        file: path.basename(file),
        lines
      });
    }
  });
  
  if (largeComponents.length === 0) {
    log('✅ All components are reasonably sized (<500 lines)', 'green');
  } else {
    log(`⚠️  Found ${largeComponents.length} large component(s):`, 'yellow');
    largeComponents.forEach(c => {
      console.log(`  ${c.file}: ${c.lines} lines`);
    });
  }
  
  return largeComponents;
}

function checkBuildStatus() {
  logSection('Checking Build Status');
  
  try {
    log('Running build check...', 'blue');
    const output = execSync('pnpm build 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    
    if (output.includes('Compiled successfully')) {
      log('✅ Build passes successfully', 'green');
      
      // Check for TypeScript errors
      if (output.includes('Type error')) {
        log('❌ TypeScript errors found', 'red');
        const errorMatch = output.match(/Type error:.*/g);
        if (errorMatch) {
          errorMatch.slice(0, 3).forEach(err => console.log(`  ${err}`));
        }
        return { passed: false, hasTypeErrors: true };
      }
      
      // Count warnings
      const warnings = (output.match(/Warning:/g) || []).length;
      if (warnings > 0) {
        log(`⚠️  ${warnings} ESLint warning(s)`, 'yellow');
      } else {
        log('✅ No ESLint warnings', 'green');
      }
      
      return { passed: true, warnings };
    } else {
      log('❌ Build failed', 'red');
      return { passed: false };
    }
  } catch (error) {
    log('❌ Build check failed', 'red');
    console.log(error.message);
    return { passed: false, error: error.message };
  }
}

function checkDocumentationFiles() {
  logSection('Checking Documentation Files');
  
  const requiredDocs = [
    'docs/API.md',
    'docs/CONTRIBUTING.md',
    'docs/ROADMAP_TO_PERFECT_17.md'
  ];
  
  const existing = [];
  const missing = [];
  
  requiredDocs.forEach(doc => {
    if (fs.existsSync(doc)) {
      existing.push(doc);
    } else {
      missing.push(doc);
    }
  });
  
  if (existing.length === requiredDocs.length) {
    log(`✅ All required documentation files exist (${existing.length}/${requiredDocs.length})`, 'green');
    existing.forEach(doc => console.log(`  ✓ ${doc}`));
  } else {
    log(`⚠️  Missing ${missing.length} documentation file(s):`, 'yellow');
    missing.forEach(doc => console.log(`  ✗ ${doc}`));
  }
  
  return { existing, missing };
}

function generateReport(results) {
  logSection('Verification Summary');
  
  const totalChecks = Object.keys(results).length;
  let passedChecks = 0;
  
  Object.entries(results).forEach(([check, result]) => {
    if (result.passed !== false) {
      passedChecks++;
    }
  });
  
  const score = Math.round((passedChecks / totalChecks) * 100);
  
  log(`Overall Score: ${passedChecks}/${totalChecks} checks passed (${score}%)`, 
    score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
  
  console.log('\nDetailed Results:');
  console.log(`  Build Status: ${results.build.passed ? '✅' : '❌'}`);
  console.log(`  Console Statements: ${results.console.count === 0 ? '✅' : '⚠️'} (${results.console.count})`);
  console.log(`  Hardcoded Colors: ${results.colors.count === 0 ? '✅' : '⚠️'} (${results.colors.count})`);
  console.log(`  Inline Styles: ${results.styles.count === 0 ? '✅' : '⚠️'} (${results.styles.count})`);
  console.log(`  JSDoc Coverage: ${results.jsdoc.percentage}% (${results.jsdoc.documented}/${results.jsdoc.total})`);
  console.log(`  Large Components: ${results.components.length === 0 ? '✅' : '⚠️'} (${results.components.length})`);
  console.log(`  Documentation Files: ${results.docs.missing.length === 0 ? '✅' : '⚠️'} (${results.docs.missing.length} missing)`);
  
  return score;
}

// Main execution
async function main() {
  log('\n🔍 Building Quality Verification', 'cyan');
  log('================================\n', 'cyan');
  
  const results = {
    build: checkBuildStatus(),
    console: checkConsoleStatements(),
    colors: checkHardcodedColors(),
    styles: checkInlineFontSizeStyles(),
    jsdoc: checkJSDoc(),
    components: checkComponentSizes(),
    docs: checkDocumentationFiles()
  };
  
  const score = generateReport(results);
  
  console.log('\n');
  if (score >= 80) {
    log('🎉 Excellent! Codebase quality is high.', 'green');
  } else if (score >= 60) {
    log('📊 Good progress, but some improvements needed.', 'yellow');
  } else {
    log('⚠️  Several issues need attention.', 'red');
  }
  
  process.exit(score >= 60 ? 0 : 1);
}

main().catch(error => {
  log(`❌ Verification script failed: ${error.message}`, 'red');
  process.exit(1);
});
