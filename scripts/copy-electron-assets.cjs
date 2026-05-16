const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const preloadSource = path.join(rootDir, 'src', 'main', 'preload.cjs')
const preloadTargetDir = path.join(rootDir, 'dist-electron', 'main')
const preloadTarget = path.join(preloadTargetDir, 'preload.cjs')
const stalePreloadTarget = path.join(preloadTargetDir, 'preload.js')

if (!fs.existsSync(preloadSource)) {
  throw new Error(`Missing preload source: ${preloadSource}`)
}

fs.mkdirSync(preloadTargetDir, { recursive: true })
fs.copyFileSync(preloadSource, preloadTarget)

if (fs.existsSync(stalePreloadTarget)) {
  fs.rmSync(stalePreloadTarget)
}

console.log(`Copied Electron preload to ${path.relative(rootDir, preloadTarget)}`)
