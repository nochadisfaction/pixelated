# Convert Mintlify frontmatter to Astro frontmatter
Get-ChildItem "src\content\docs" -Recurse -Include "*.md", "*.mdx" | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Extract title and description from existing frontmatter
    $title = ""
    $description = ""
    
    if ($content -match "title:\s*['\`"]([^'\`"]+)['\`"]") {
        $title = $matches[1]
    } elseif ($content -match "title:\s*([^\r\n]+)") {
        $title = $matches[1].Trim()
    } else {
        $title = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) -replace '-', ' '
        $title = (Get-Culture).TextInfo.ToTitleCase($title)
    }
    
    if ($content -match "description:\s*['\`"]([^'\`"]+)['\`"]") {
        $description = $matches[1]
    } elseif ($content -match "description:\s*([^\r\n]+)") {
        $description = $matches[1].Trim()
    }
    
    # Determine category based on path
    $category = "Documentation"
    $relativePath = $file.FullName.Replace((Get-Location).Path, "").Replace("\", "/")
    
    if ($relativePath -like "*getting-started*") { $category = "Getting Started" }
    elseif ($relativePath -like "*architecture*") { $category = "Architecture" }
    elseif ($relativePath -like "*development*") { $category = "Development" }
    elseif ($relativePath -like "*testing*") { $category = "Testing" }
    elseif ($relativePath -like "*deployment*") { $category = "Deployment" }
    elseif ($relativePath -like "*security*") { $category = "Security" }
    elseif ($relativePath -like "*integrations*") { $category = "Integrations" }
    elseif ($relativePath -like "*api*") { $category = "API Reference" }
    elseif ($relativePath -like "*guides*") { $category = "Guides" }
    elseif ($relativePath -like "*core*") { $category = "Core Concepts" }
    elseif ($relativePath -like "*compliance*") { $category = "Compliance" }
    elseif ($relativePath -like "*behavioral-analysis*") { $category = "Behavioral Analysis" }
    elseif ($relativePath -like "*analytics*") { $category = "Analytics" }
    elseif ($relativePath -like "*operations*") { $category = "Operations" }
    elseif ($relativePath -like "*protocols*") { $category = "Protocols" }
    elseif ($relativePath -like "*migration*") { $category = "Migration" }
    elseif ($relativePath -like "*implementation*") { $category = "Implementation" }
    elseif ($relativePath -like "*examples*") { $category = "Examples" }
    elseif ($relativePath -like "*essentials*") { $category = "Essentials" }
    elseif ($relativePath -like "*snippets*") { $category = "Code Snippets" }
    
    # Create new frontmatter
    $newFrontmatter = @"
---
title: '$title'
description: '$description'
pubDate: 2025-01-01
tags: ['documentation', 'pixelated']
author: 'Pixelated Team'
category: '$category'
draft: false
toc: true
share: true
---

"@
    
    # Remove old frontmatter
    $content = $content -replace "^---[\s\S]*?---\s*", ""
    
    # Convert Mintlify components to markdown
    $content = $content -replace "<CardGroup[^>]*>[\s\S]*?</CardGroup>", ""
    $content = $content -replace "<Card[^>]*>[\s\S]*?</Card>", ""
    $content = $content -replace "<Tip>([\s\S]*?)</Tip>", "> **💡 Tip**: `$1"
    $content = $content -replace "<Note>([\s\S]*?)</Note>", "> **📝 Note**: `$1"
    $content = $content -replace "<Info>([\s\S]*?)</Info>", "> **ℹ️ Info**: `$1"
    $content = $content -replace "<Warning>([\s\S]*?)</Warning>", "> **⚠️ Warning**: `$1"
    $content = $content -replace "<Check>([\s\S]*?)</Check>", "> **✅ Check**: `$1"
    $content = $content -replace "<Steps>([\s\S]*?)</Steps>", "`$1"
    
    # Combine new frontmatter with content
    $newContent = $newFrontmatter + $content
    
    # Change extension to .md if it was .mdx
    $newPath = $file.FullName -replace "\.mdx$", ".md"
    
    # Write the converted content
    $newContent | Out-File -FilePath $newPath -Encoding UTF8 -NoNewline
    
    # Remove original .mdx file if we created a .md version
    if ($newPath -ne $file.FullName -and (Test-Path $newPath)) {
        Remove-Item $file.FullName -Force
    }
    
    Write-Host "✅ Converted: $($file.Name)"
}

Write-Host "`n🎉 Frontmatter conversion completed!" 