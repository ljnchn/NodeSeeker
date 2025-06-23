#!/usr/bin/env node

/**
 * 部署脚本 - 自动化部署流程
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// 创建输入接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

// 检查前置条件
async function checkPrerequisites() {
  log('\n🔍 检查部署前置条件...', 'blue');

  const checks = [
    {
      name: 'Node.js',
      command: 'node --version',
      minVersion: '18.0.0'
    },
    {
      name: 'pnpm',
      command: 'pnpm --version',
      minVersion: '8.0.0'
    },
    {
      name: 'Wrangler CLI',
      command: 'npx wrangler --version',
      minVersion: '3.0.0'
    }
  ];

  let allGood = true;

  for (const check of checks) {
    try {
      const output = execSync(check.command, { encoding: 'utf8' }).trim();
      log(`✅ ${check.name}: ${output}`, 'green');
    } catch (error) {
      log(`❌ ${check.name}: 未安装或版本过低`, 'red');
      allGood = false;
    }
  }

  // 检查 Cloudflare 登录状态
  try {
    execSync('npx wrangler whoami', { stdio: 'pipe' });
    log('✅ Cloudflare 账户已登录', 'green');
  } catch (error) {
    log('❌ 未登录 Cloudflare 账户', 'red');
    log('请运行: npx wrangler login', 'yellow');
    allGood = false;
  }

  return allGood;
}

// 运行测试
async function runTests() {
  log('\n🧪 运行测试...', 'blue');

  try {
    execSync('node scripts/test.js', { stdio: 'inherit' });
    log('✅ 所有测试通过', 'green');
    return true;
  } catch (error) {
    log('❌ 测试失败，请修复问题后重试', 'red');
    return false;
  }
}

// 构建项目
async function buildProject() {
  log('\n🔨 构建项目...', 'blue');

  try {
    execSync('pnpm build', { stdio: 'inherit' });
    log('✅ 项目构建成功', 'green');
    return true;
  } catch (error) {
    log('❌ 项目构建失败', 'red');
    return false;
  }
}

// 配置数据库
async function setupDatabase(environment) {
  log('\n🗄️ 配置数据库...', 'blue');

  const configFile = environment === 'production' ? 'wrangler.prod.jsonc' : 'wrangler.jsonc';
  
  if (!fs.existsSync(configFile)) {
    log(`❌ 配置文件 ${configFile} 不存在`, 'red');
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''));
    const dbConfig = config.d1_databases[0];

    if (!dbConfig) {
      log('❌ 数据库配置不存在', 'red');
      return false;
    }

    // 检查数据库是否存在
    try {
      execSync(`npx wrangler d1 list | grep ${dbConfig.database_name}`, { stdio: 'pipe' });
      log(`✅ 数据库 ${dbConfig.database_name} 已存在`, 'green');
    } catch (error) {
      // 数据库不存在，创建新的
      log(`📝 创建数据库 ${dbConfig.database_name}...`, 'yellow');
      
      const createOutput = execSync(`npx wrangler d1 create ${dbConfig.database_name}`, { encoding: 'utf8' });
      log(createOutput, 'cyan');
      
      // 提取数据库 ID
      const idMatch = createOutput.match(/database_id = "([^"]+)"/);
      if (idMatch) {
        const databaseId = idMatch[1];
        log(`📋 数据库 ID: ${databaseId}`, 'cyan');
        log(`请更新 ${configFile} 中的 database_id`, 'yellow');
        
        const shouldUpdate = await question('是否自动更新配置文件？(y/N): ');
        if (shouldUpdate.toLowerCase() === 'y') {
          config.d1_databases[0].database_id = databaseId;
          fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
          log('✅ 配置文件已更新', 'green');
        }
      }
    }

    // 运行数据库迁移
    log('📊 运行数据库迁移...', 'yellow');
    execSync(`npx wrangler d1 execute ${dbConfig.database_name} --file=./migrations/0001_initial.sql`, { stdio: 'inherit' });
    log('✅ 数据库迁移完成', 'green');

    return true;
  } catch (error) {
    log(`❌ 数据库配置失败: ${error.message}`, 'red');
    return false;
  }
}

// 部署到 Cloudflare Workers
async function deployToWorkers(environment) {
  log('\n🚀 部署到 Cloudflare Workers...', 'blue');

  const configFile = environment === 'production' ? 'wrangler.prod.jsonc' : 'wrangler.jsonc';
  
  try {
    const deployCommand = `npx wrangler deploy --config ${configFile}`;
    execSync(deployCommand, { stdio: 'inherit' });
    log('✅ 部署成功', 'green');
    return true;
  } catch (error) {
    log('❌ 部署失败', 'red');
    return false;
  }
}

// 部署后验证
async function postDeploymentVerification(environment) {
  log('\n✅ 部署后验证...', 'blue');

  const configFile = environment === 'production' ? 'wrangler.prod.jsonc' : 'wrangler.jsonc';
  
  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''));
    const workerName = config.name;

    // 获取 Worker URL
    const urlOutput = execSync(`npx wrangler deployments list --name ${workerName} --format json`, { encoding: 'utf8' });
    const deployments = JSON.parse(urlOutput);
    
    if (deployments.length > 0) {
      const latestDeployment = deployments[0];
      const workerUrl = `https://${workerName}.${latestDeployment.environment || 'workers'}.dev`;
      
      log(`🌐 Worker URL: ${workerUrl}`, 'cyan');
      
      // 简单的健康检查
      log('🏥 执行健康检查...', 'yellow');
      
      try {
        const { default: fetch } = await import('node-fetch');
        const response = await fetch(workerUrl, { timeout: 10000 });
        
        if (response.ok) {
          log('✅ 健康检查通过', 'green');
        } else {
          log(`⚠️ 健康检查警告: HTTP ${response.status}`, 'yellow');
        }
      } catch (error) {
        log(`⚠️ 健康检查失败: ${error.message}`, 'yellow');
      }
      
      return workerUrl;
    } else {
      log('⚠️ 无法获取 Worker URL', 'yellow');
      return null;
    }
  } catch (error) {
    log(`⚠️ 部署后验证失败: ${error.message}`, 'yellow');
    return null;
  }
}

// 显示部署后说明
function showPostDeploymentInstructions(workerUrl, environment) {
  log('\n🎉 部署完成！', 'green');
  log('='.repeat(50), 'green');
  
  if (workerUrl) {
    log(`🌐 应用地址: ${workerUrl}`, 'cyan');
  }
  
  log('\n📋 后续步骤:', 'blue');
  log('1. 访问应用地址进行初始化', 'white');
  log('2. 创建管理员账户', 'white');
  log('3. 配置 Telegram Bot Token', 'white');
  log('4. 设置 Webhook', 'white');
  log('5. 添加订阅规则', 'white');
  log('6. 测试推送功能', 'white');
  
  log('\n🔧 管理命令:', 'blue');
  log(`查看日志: npx wrangler tail --name ${environment === 'production' ? 'nodeseeker-prod' : 'nodeseeker'}`, 'white');
  log('查看数据库: npx wrangler d1 execute <database-name> --command="SELECT * FROM base_config"', 'white');
  
  log('\n📚 更多信息请查看 deploy.md 文档', 'yellow');
}

// 主部署流程
async function main() {
  log('🚀 NodeSeek RSS 监控系统 - 部署脚本', 'cyan');
  log('='.repeat(50), 'cyan');

  try {
    // 选择环境
    const environment = await question('选择部署环境 (development/production) [development]: ') || 'development';
    
    if (!['development', 'production'].includes(environment)) {
      log('❌ 无效的环境选择', 'red');
      process.exit(1);
    }

    log(`📦 部署环境: ${environment}`, 'magenta');

    // 确认部署
    if (environment === 'production') {
      const confirm = await question('⚠️ 确定要部署到生产环境吗？(y/N): ');
      if (confirm.toLowerCase() !== 'y') {
        log('❌ 部署已取消', 'yellow');
        process.exit(0);
      }
    }

    // 执行部署步骤
    const steps = [
      { name: '检查前置条件', fn: () => checkPrerequisites() },
      { name: '运行测试', fn: () => runTests() },
      { name: '构建项目', fn: () => buildProject() },
      { name: '配置数据库', fn: () => setupDatabase(environment) },
      { name: '部署应用', fn: () => deployToWorkers(environment) }
    ];

    for (const step of steps) {
      log(`\n⏳ ${step.name}...`, 'blue');
      const success = await step.fn();
      
      if (!success) {
        log(`❌ ${step.name}失败，部署终止`, 'red');
        process.exit(1);
      }
    }

    // 部署后验证和说明
    const workerUrl = await postDeploymentVerification(environment);
    showPostDeploymentInstructions(workerUrl, environment);

  } catch (error) {
    log(`❌ 部署过程中发生错误: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 运行部署脚本
if (require.main === module) {
  main().catch(error => {
    log(`❌ 部署脚本执行失败: ${error.message}`, 'red');
    process.exit(1);
  });
}
