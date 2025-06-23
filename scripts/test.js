#!/usr/bin/env node

/**
 * 测试脚本 - 用于本地测试和验证
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查文件结构
function checkFileStructure() {
  log('\n📁 检查项目文件结构...', 'blue');
  
  const requiredFiles = [
    'src/index.tsx',
    'src/services/database.ts',
    'src/services/rss.ts',
    'src/services/telegram.ts',
    'src/services/auth.ts',
    'src/services/matcher.ts',
    'src/routes/auth.ts',
    'src/routes/api.ts',
    'src/routes/telegram.ts',
    'src/routes/pages.ts',
    'src/middleware/auth.ts',
    'src/config/performance.ts',
    'migrations/0001_initial.sql',
    'wrangler.jsonc',
    'package.json'
  ];

  const requiredDirs = [
    'src',
    'src/services',
    'src/routes',
    'src/middleware',
    'src/config',
    'public',
    'public/js',
    'migrations'
  ];

  let allGood = true;

  // 检查目录
  log('检查目录结构:', 'cyan');
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      log(`  ✅ ${dir}`, 'green');
    } else {
      log(`  ❌ ${dir} - 缺失`, 'red');
      allGood = false;
    }
  });

  // 检查文件
  log('\n检查必需文件:', 'cyan');
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`  ✅ ${file}`, 'green');
    } else {
      log(`  ❌ ${file} - 缺失`, 'red');
      allGood = false;
    }
  });

  return allGood;
}

// 检查依赖
function checkDependencies() {
  log('\n📦 检查依赖包...', 'blue');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      'hono',
      'rss-parser'
    ];

    const requiredDevDeps = [
      '@cloudflare/vite-plugin',
      'vite',
      'wrangler'
    ];

    let allGood = true;

    log('检查生产依赖:', 'cyan');
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        log(`  ✅ ${dep}`, 'green');
      } else {
        log(`  ❌ ${dep} - 缺失`, 'red');
        allGood = false;
      }
    });

    log('\n检查开发依赖:', 'cyan');
    requiredDevDeps.forEach(dep => {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        log(`  ✅ ${dep}`, 'green');
      } else {
        log(`  ❌ ${dep} - 缺失`, 'red');
        allGood = false;
      }
    });

    return allGood;
  } catch (error) {
    log(`❌ 读取 package.json 失败: ${error.message}`, 'red');
    return false;
  }
}

// 检查配置文件
function checkConfiguration() {
  log('\n⚙️ 检查配置文件...', 'blue');
  
  let allGood = true;

  // 检查 wrangler.jsonc
  try {
    const wranglerConfig = fs.readFileSync('wrangler.jsonc', 'utf8');
    const config = JSON.parse(wranglerConfig.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''));
    
    log('检查 wrangler.jsonc:', 'cyan');
    
    if (config.name) {
      log(`  ✅ name: ${config.name}`, 'green');
    } else {
      log(`  ❌ name - 缺失`, 'red');
      allGood = false;
    }

    if (config.d1_databases && config.d1_databases.length > 0) {
      log(`  ✅ d1_databases 已配置`, 'green');
      if (config.d1_databases[0].database_id === 'your-database-id-here') {
        log(`  ⚠️ 需要更新实际的 database_id`, 'yellow');
      }
    } else {
      log(`  ❌ d1_databases - 缺失`, 'red');
      allGood = false;
    }

    if (config.triggers && config.triggers.crons) {
      log(`  ✅ cron 触发器已配置`, 'green');
    } else {
      log(`  ❌ cron 触发器 - 缺失`, 'red');
      allGood = false;
    }

  } catch (error) {
    log(`❌ 读取 wrangler.jsonc 失败: ${error.message}`, 'red');
    allGood = false;
  }

  return allGood;
}

// 语法检查
function checkSyntax() {
  log('\n🔍 检查 TypeScript 语法...', 'blue');
  
  try {
    // 检查是否有 TypeScript 编译错误
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    log('✅ TypeScript 语法检查通过', 'green');
    return true;
  } catch (error) {
    log('❌ TypeScript 语法检查失败:', 'red');
    log(error.stdout?.toString() || error.message, 'red');
    return false;
  }
}

// 安全检查
function checkSecurity() {
  log('\n🔒 安全检查...', 'blue');
  
  let allGood = true;
  const issues = [];

  // 检查敏感信息
  const sensitivePatterns = [
    { pattern: /password\s*[:=]\s*["'][^"']+["']/gi, message: '发现硬编码密码' },
    { pattern: /token\s*[:=]\s*["'][^"']+["']/gi, message: '发现硬编码 Token' },
    { pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi, message: '发现硬编码 API Key' },
    { pattern: /secret\s*[:=]\s*["'][^"']+["']/gi, message: '发现硬编码 Secret' }
  ];

  function checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      sensitivePatterns.forEach(({ pattern, message }) => {
        if (pattern.test(content)) {
          issues.push(`${filePath}: ${message}`);
        }
      });
    } catch (error) {
      // 忽略读取错误
    }
  }

  // 递归检查源文件
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
        checkFile(filePath);
      }
    });
  }

  walkDir('src');

  if (issues.length === 0) {
    log('✅ 未发现安全问题', 'green');
  } else {
    log('⚠️ 发现潜在安全问题:', 'yellow');
    issues.forEach(issue => log(`  - ${issue}`, 'yellow'));
    allGood = false;
  }

  return allGood;
}

// 性能检查
function checkPerformance() {
  log('\n⚡ 性能检查...', 'blue');
  
  let allGood = true;

  // 检查文件大小
  function getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  const mainFileSize = getFileSize('src/index.tsx');
  const maxMainFileSize = 50 * 1024; // 50KB

  if (mainFileSize > maxMainFileSize) {
    log(`⚠️ 主文件过大: ${(mainFileSize / 1024).toFixed(2)}KB (建议 < 50KB)`, 'yellow');
    allGood = false;
  } else {
    log(`✅ 主文件大小合适: ${(mainFileSize / 1024).toFixed(2)}KB`, 'green');
  }

  // 检查依赖数量
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    const maxDeps = 20;

    if (depCount > maxDeps) {
      log(`⚠️ 依赖包过多: ${depCount} (建议 < ${maxDeps})`, 'yellow');
      allGood = false;
    } else {
      log(`✅ 依赖包数量合适: ${depCount}`, 'green');
    }
  } catch (error) {
    log(`❌ 无法检查依赖数量: ${error.message}`, 'red');
    allGood = false;
  }

  return allGood;
}

// 生成测试报告
function generateReport(results) {
  log('\n📊 测试报告', 'magenta');
  log('='.repeat(50), 'magenta');
  
  const categories = [
    { name: '文件结构', result: results.fileStructure },
    { name: '依赖检查', result: results.dependencies },
    { name: '配置检查', result: results.configuration },
    { name: '语法检查', result: results.syntax },
    { name: '安全检查', result: results.security },
    { name: '性能检查', result: results.performance }
  ];

  let passedCount = 0;
  categories.forEach(({ name, result }) => {
    const status = result ? '✅ 通过' : '❌ 失败';
    const color = result ? 'green' : 'red';
    log(`${name}: ${status}`, color);
    if (result) passedCount++;
  });

  log('\n' + '='.repeat(50), 'magenta');
  log(`总体结果: ${passedCount}/${categories.length} 项检查通过`, 
      passedCount === categories.length ? 'green' : 'yellow');

  if (passedCount === categories.length) {
    log('\n🎉 所有检查都通过了！项目已准备好部署。', 'green');
  } else {
    log('\n⚠️ 请修复上述问题后再进行部署。', 'yellow');
  }

  return passedCount === categories.length;
}

// 主函数
async function main() {
  log('🚀 NodeSeek RSS 监控系统 - 测试脚本', 'cyan');
  log('='.repeat(50), 'cyan');

  const results = {
    fileStructure: checkFileStructure(),
    dependencies: checkDependencies(),
    configuration: checkConfiguration(),
    syntax: checkSyntax(),
    security: checkSecurity(),
    performance: checkPerformance()
  };

  const allPassed = generateReport(results);
  
  process.exit(allPassed ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  main().catch(error => {
    log(`❌ 测试脚本执行失败: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  checkFileStructure,
  checkDependencies,
  checkConfiguration,
  checkSyntax,
  checkSecurity,
  checkPerformance
};
