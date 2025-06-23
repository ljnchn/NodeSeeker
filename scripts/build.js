import esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'

// 清理 dist 目录
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true })
}
fs.mkdirSync('dist', { recursive: true })

// 复制静态资源
function copyStaticAssets() {
  // 复制 public 目录下的文件
  if (fs.existsSync('public')) {
    const copyRecursive = (src, dest) => {
      const stat = fs.statSync(src)
      if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true })
        }
        const files = fs.readdirSync(src)
        files.forEach(file => {
          copyRecursive(path.join(src, file), path.join(dest, file))
        })
      } else {
        fs.copyFileSync(src, dest)
      }
    }
    copyRecursive('public', 'dist/public')
  }
  
  // 复制 CSS 文件
  if (fs.existsSync('src/style.css')) {
    fs.copyFileSync('src/style.css', 'dist/style.css')
  }
}

async function build() {
  try {
    console.log('🏗️  开始构建...')
    
    // 复制静态资源
    copyStaticAssets()
    console.log('✅ 静态资源复制完成')
    
    // 构建主要应用
    await esbuild.build({
      entryPoints: ['src/index.tsx'],
      bundle: true,
      outfile: 'dist/index.js',
      format: 'esm',
      platform: 'neutral',
      target: 'es2022',
      minify: true,
      sourcemap: false,
      jsx: 'automatic',
      jsxImportSource: 'hono/jsx',
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      external: [
        // Cloudflare Workers 运行时提供的 API
        '__STATIC_CONTENT_MANIFEST'
      ],
      banner: {
        js: '// Built with esbuild for Cloudflare Workers'
      }
    })
    
    console.log('✅ 构建完成！输出目录: dist/')
  } catch (error) {
    console.error('❌ 构建失败:', error)
    process.exit(1)
  }
}

build() 