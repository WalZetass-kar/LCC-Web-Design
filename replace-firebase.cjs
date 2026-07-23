const fs = require('fs')
const path = require('path')

const directory = './src'

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let originalContent = content
  
  // Replace firebase imports
  content = content.replace(/shared\/firebase\//g, 'shared/supabase/')
  content = content.replace(/firebase-admin/g, '@supabase/supabase-js')
  content = content.replace(/firebase/g, 'supabase')
  content = content.replace(/Firebase/g, 'Supabase')
  
  // Custom auth fixes
  content = content.replace(/import\s*\{\s*tryCloudSignIn\s*\}\s*from\s*['"]\.\.\/\.\.\/shared\/supabase\/auth['"]/g, 
    'import { tryCloudSignIn } from "../../shared/supabase/auth"')

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`Updated ${filePath}`)
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      walkDir(fullPath)
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath)
    }
  }
}

walkDir(directory)
console.log('Done replacing Firebase references.')
