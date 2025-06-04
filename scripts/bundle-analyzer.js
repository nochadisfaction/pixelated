#!/usr/bin/env node

/**
 * Bundle Analyzer for Astro Builds
 * 
 * Analyzes build output to identify optimization opportunities
 * and performance bottlenecks in the production bundle.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, extname, relative } from 'path'
import { gzipSync } from 'zlib'

class BundleAnalyzer {
  constructor(distPath = './dist') {
    this.distPath = distPath
    this.analysis = {
      summary: {},
      files: [],
      chunks: [],
      assets: [],
      recommendations: [],
      timestamp: new Date().toISOString()
    }
  }

  log(message, level = 'info') {
    const prefix = { info: '📊', success: '✅', warning: '⚠️', error: '❌' }[level] || '📊'
    console.log(`${prefix} ${message}`)
  }

  getFileSize(filePath) {
    try {
      const stats = statSync(filePath)
      return stats.size
    } catch {
      return 0
    }
  }

  getGzipSize(content) {
    try {
      return gzipSync(content).length
    } catch {
      return 0
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  analyzeFile(filePath) {
    const relativePath = relative(this.distPath, filePath)
    const ext = extname(filePath)
    const size = this.getFileSize(filePath)
    
    let content = null
    let gzipSize = 0
    
    // Read content for text files to calculate gzip size
    if (['.js', '.css', '.html', '.json'].includes(ext)) {
      try {
        content = readFileSync(filePath, 'utf8')
        gzipSize = this.getGzipSize(content)
      } catch {
        // Ignore read errors
      }
    }

    const analysis = {
      path: relativePath,
      type: this.getFileType(ext),
      size,
      gzipSize,
      compression: gzipSize > 0 ? ((size - gzipSize) / size * 100).toFixed(1) + '%' : 'N/A'
    }

    // Analyze JavaScript files
    if (ext === '.js' && content) {
      analysis.jsAnalysis = this.analyzeJavaScript(content, relativePath)
    }

    // Analyze CSS files
    if (ext === '.css' && content) {
      analysis.cssAnalysis = this.analyzeCSS(content)
    }

    return analysis
  }

  getFileType(ext) {
    const types = {
      '.js': 'JavaScript',
      '.css': 'Stylesheet',
      '.html': 'HTML',
      '.json': 'JSON',
      '.woff': 'Font',
      '.woff2': 'Font',
      '.ttf': 'Font',
      '.eot': 'Font',
      '.png': 'Image',
      '.jpg': 'Image',
      '.jpeg': 'Image',
      '.gif': 'Image',
      '.svg': 'Image',
      '.webp': 'Image',
      '.avif': 'Image',
      '.ico': 'Image'
    }
    return types[ext] || 'Other'
  }

  analyzeJavaScript(content, filePath) {
    const analysis = {
      lines: content.split('\n').length,
      minified: !content.includes('\n  ') && content.length > 1000,
      hasSourceMap: content.includes('//# sourceMappingURL='),
      dependencies: []
    }

    // Extract import statements (simplified)
    const importMatches = content.match(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g) || []
    analysis.dependencies = importMatches.map(match => {
      const moduleMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/)
      return moduleMatch ? moduleMatch[1] : null
    }).filter(Boolean)

    // Check for common heavy libraries
    const heavyLibraries = ['three', 'tensorflow', 'chart', 'framer-motion', 'react-router']
    analysis.heavyDependencies = analysis.dependencies.filter(dep => 
      heavyLibraries.some(heavy => dep.includes(heavy))
    )

    // Detect chunk type
    if (filePath.includes('react')) analysis.chunkType = 'React Core'
    else if (filePath.includes('vendor')) analysis.chunkType = 'Vendor'
    else if (filePath.includes('runtime')) analysis.chunkType = 'Runtime'
    else if (filePath.includes('polyfill')) analysis.chunkType = 'Polyfill'
    else analysis.chunkType = 'Application'

    return analysis
  }

  analyzeCSS(content) {
    const analysis = {
      lines: content.split('\n').length,
      rules: (content.match(/\{[^}]*\}/g) || []).length,
      selectors: (content.match(/[^{}]+\{/g) || []).length,
      hasSourceMap: content.includes('/*# sourceMappingURL='),
      minified: !content.includes('\n  ') && content.length > 1000
    }

    // Check for unused vendor prefixes
    const vendorPrefixes = ['-webkit-', '-moz-', '-ms-', '-o-']
    analysis.vendorPrefixes = vendorPrefixes.filter(prefix => 
      content.includes(prefix)
    )

    return analysis
  }

  walkDirectory(dir) {
    const files = []
    
    try {
      const items = readdirSync(dir)
      
      for (const item of items) {
        const fullPath = join(dir, item)
        const stat = statSync(fullPath)
        
        if (stat.isDirectory()) {
          files.push(...this.walkDirectory(fullPath))
        } else {
          files.push(fullPath)
        }
      }
    } catch (error) {
      this.log(`Error reading directory ${dir}: ${error.message}`, 'warning')
    }
    
    return files
  }

  generateRecommendations() {
    const { files } = this.analysis
    const recommendations = []

    // Large JavaScript files
    const largeJsFiles = files.filter(f => 
      f.type === 'JavaScript' && f.size > 500 * 1024 // 500KB
    )
    
    if (largeJsFiles.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Large JavaScript Files Detected',
        description: `Found ${largeJsFiles.length} JavaScript files larger than 500KB`,
        files: largeJsFiles.map(f => f.path),
        suggestion: 'Consider code splitting, lazy loading, or removing unused dependencies'
      })
    }

    // Uncompressed files
    const uncompressedFiles = files.filter(f => 
      ['JavaScript', 'Stylesheet'].includes(f.type) && 
      f.gzipSize > 0 && 
      parseFloat(f.compression) < 60
    )
    
    if (uncompressedFiles.length > 0) {
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        title: 'Poor Compression Ratio',
        description: `Found ${uncompressedFiles.length} files with poor compression`,
        files: uncompressedFiles.map(f => f.path),
        suggestion: 'Enable better minification or check for repetitive code'
      })
    }

    // Heavy dependencies
    const filesWithHeavyDeps = files.filter(f => 
      f.jsAnalysis?.heavyDependencies?.length > 0
    )
    
    if (filesWithHeavyDeps.length > 0) {
      recommendations.push({
        type: 'dependencies',
        priority: 'medium',
        title: 'Heavy Dependencies Detected',
        description: 'Found files importing heavy libraries',
        files: filesWithHeavyDeps.map(f => ({
          path: f.path,
          dependencies: f.jsAnalysis.heavyDependencies
        })),
        suggestion: 'Consider lazy loading heavy dependencies or finding lighter alternatives'
      })
    }

    // Many small files
    const smallFiles = files.filter(f => f.size < 10 * 1024) // 10KB
    if (smallFiles.length > 20) {
      recommendations.push({
        type: 'bundling',
        priority: 'low',
        title: 'Many Small Files',
        description: `Found ${smallFiles.length} files smaller than 10KB`,
        suggestion: 'Consider bundling small files to reduce HTTP requests'
      })
    }

    return recommendations
  }

  generateSummary() {
    const { files } = this.analysis
    
    const summary = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      totalGzipSize: files.reduce((sum, f) => sum + (f.gzipSize || 0), 0),
      byType: {}
    }

    // Group by file type
    files.forEach(file => {
      if (!summary.byType[file.type]) {
        summary.byType[file.type] = {
          count: 0,
          size: 0,
          gzipSize: 0
        }
      }
      
      summary.byType[file.type].count++
      summary.byType[file.type].size += file.size
      summary.byType[file.type].gzipSize += file.gzipSize || 0
    })

    // Add formatted sizes
    summary.totalSizeFormatted = this.formatBytes(summary.totalSize)
    summary.totalGzipSizeFormatted = this.formatBytes(summary.totalGzipSize)
    summary.overallCompression = summary.totalGzipSize > 0 
      ? ((summary.totalSize - summary.totalGzipSize) / summary.totalSize * 100).toFixed(1) + '%'
      : 'N/A'

    Object.keys(summary.byType).forEach(type => {
      const typeData = summary.byType[type]
      typeData.sizeFormatted = this.formatBytes(typeData.size)
      typeData.gzipSizeFormatted = this.formatBytes(typeData.gzipSize)
    })

    return summary
  }

  async analyze() {
    this.log('Starting bundle analysis...')
    
    if (!existsSync(this.distPath)) {
      throw new Error(`Distribution directory not found: ${this.distPath}`)
    }

    // Get all files
    const allFiles = this.walkDirectory(this.distPath)
    this.log(`Found ${allFiles.length} files to analyze`)

    // Analyze each file
    for (const filePath of allFiles) {
      const fileAnalysis = this.analyzeFile(filePath)
      this.analysis.files.push(fileAnalysis)
    }

    // Generate summary and recommendations
    this.analysis.summary = this.generateSummary()
    this.analysis.recommendations = this.generateRecommendations()

    this.log('Bundle analysis completed', 'success')
    return this.analysis
  }

  generateReport() {
    const reportPath = `reports/bundle-analysis-${Date.now()}.json`
    writeFileSync(reportPath, JSON.stringify(this.analysis, null, 2))
    
    this.log(`Detailed report saved to: ${reportPath}`, 'success')
    return reportPath
  }

  printSummary() {
    const { summary, recommendations } = this.analysis
    
    console.log('\n📊 BUNDLE ANALYSIS SUMMARY')
    console.log('=' .repeat(50))
    console.log(`Total Files: ${summary.totalFiles}`)
    console.log(`Total Size: ${summary.totalSizeFormatted}`)
    console.log(`Gzipped Size: ${summary.totalGzipSizeFormatted}`)
    console.log(`Compression: ${summary.overallCompression}`)
    
    console.log('\n📁 BY FILE TYPE:')
    Object.entries(summary.byType).forEach(([type, data]) => {
      console.log(`  ${type}: ${data.count} files, ${data.sizeFormatted} (${data.gzipSizeFormatted} gzipped)`)
    })

    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:')
      recommendations.forEach((rec, i) => {
        const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'
        console.log(`  ${i + 1}. ${priority} ${rec.title}`)
        console.log(`     ${rec.description}`)
        console.log(`     💡 ${rec.suggestion}`)
      })
    } else {
      console.log('\n✅ No major optimization opportunities found!')
    }
    
    console.log('=' .repeat(50))
  }

  async run() {
    try {
      await this.analyze()
      this.printSummary()
      this.generateReport()
    } catch (error) {
      this.log(`Analysis failed: ${error.message}`, 'error')
      process.exit(1)
    }
  }
}

// CLI
const distPath = process.argv[2] || './dist'
const analyzer = new BundleAnalyzer(distPath)
analyzer.run().catch(console.error) 