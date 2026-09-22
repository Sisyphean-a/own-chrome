import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist-extension')

async function buildExtension() {
  console.log('📦 开始构建Chrome扩展...')
  
  try {
    // 确保输出目录存在
    await fs.mkdir(distDir, { recursive: true })
    
    // 复制manifest.json
    console.log('📄 复制manifest.json...')
    await fs.copyFile(
      path.join(projectRoot, 'manifest.json'),
      path.join(distDir, 'manifest.json')
    )
    
    // 复制background.js
    console.log('📜 复制background.js...')
    await fs.copyFile(
      path.join(projectRoot, 'background.js'),
      path.join(distDir, 'background.js')
    )
    
    // 复制构建后的文件
    console.log('📁 复制构建文件...')
    const distSourceDir = path.join(projectRoot, 'dist')
    
    // 复制index.html
    await fs.copyFile(
      path.join(distSourceDir, 'index.html'),
      path.join(distDir, 'index.html')
    )
    
    // 复制assets目录
    const assetsSourceDir = path.join(distSourceDir, 'assets')
    const assetsTargetDir = path.join(distDir, 'assets')
    await copyDirectory(assetsSourceDir, assetsTargetDir)
    
    // 复制图标文件
    console.log('🖼️  复制图标文件...')
    await fs.mkdir(path.join(distDir, 'public'), { recursive: true })
    
    // 复制favicon文件
    const publicSourceDir = path.join(projectRoot, 'public')
    const publicTargetDir = path.join(distDir, 'public')
    
    try {
      await fs.copyFile(
        path.join(publicSourceDir, 'favicon.ico'),
        path.join(publicTargetDir, 'favicon.ico')
      )
    } catch (error) {
      console.warn('⚠️  favicon.ico文件未找到，跳过复制')
    }
    
    try {
      await fs.copyFile(
        path.join(publicSourceDir, 'favicon-s.ico'),
        path.join(publicTargetDir, 'favicon-s.ico')
      )
    } catch (error) {
      console.warn('⚠️  favicon-s.ico文件未找到，跳过复制')
    }
    
    // 清理不需要的文件
    console.log('🧹 清理不需要的文件...')
    try {
      // 移除根目录下的favicon文件（如果存在）
      await fs.unlink(path.join(distDir, 'favicon.ico')).catch(() => {})
      await fs.unlink(path.join(distDir, 'favicon-s.ico')).catch(() => {})
    } catch (error) {
      // 忽略删除错误
    }
    
    console.log('✅ Chrome扩展构建完成！')
    console.log(`📁 输出目录: ${distDir}`)
    console.log('\n🚀 安装步骤:')
    console.log('1. 打开Chrome浏览器')
    console.log('2. 访问 chrome://extensions/')
    console.log('3. 开启"开发者模式"')
    console.log('4. 点击"加载已解压的扩展程序"')
    console.log(`5. 选择文件夹: ${distDir}`)
    
  } catch (error) {
    console.error('❌ 构建失败:', error)
    process.exit(1)
  }
}

// 递归复制目录的辅助函数
async function copyDirectory(source, target) {
  try {
    await fs.mkdir(target, { recursive: true })
    const files = await fs.readdir(source)
    
    for (const file of files) {
      const sourcePath = path.join(source, file)
      const targetPath = path.join(target, file)
      const stat = await fs.stat(sourcePath)
      
      if (stat.isDirectory()) {
        await copyDirectory(sourcePath, targetPath)
      } else {
        await fs.copyFile(sourcePath, targetPath)
      }
    }
  } catch (error) {
    console.warn(`⚠️  复制目录失败: ${source} -> ${target}`, error.message)
  }
}

buildExtension()
