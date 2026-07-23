const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
const version = pkg.version
const date = new Date().toISOString().split('T')[0]

function getGitLog(fromRef, toRef) {
  try {
    const range = fromRef ? `${fromRef}..${toRef}` : toRef
    const log = execSync(`git log ${range} --pretty=format:"%s|%h|%an" --no-merges`, {
      encoding: 'utf8',
      cwd: rootDir,
    })
    return log.split('\n').filter(Boolean).map(line => {
      const [subject, hash, author] = line.split('|')
      return { subject: subject.replace(/^"|"$/g, ''), hash, author }
    })
  } catch {
    return []
  }
}

function getPreviousTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8', cwd: rootDir }).trim()
  } catch {
    return null
  }
}

function categorizeCommit(subject) {
  const lower = subject.toLowerCase()
  if (/^feat|add|new|implement|introduce/.test(lower)) return 'features'
  if (/^fix|bug|patch|resolve|correct/.test(lower)) return 'fixes'
  if (/^perf|optim|speed|fast/.test(lower)) return 'performance'
  if (/^sec|vuln|auth|encrypt/.test(lower)) return 'security'
  if (/^refactor|clean|improv|update|enhance|chore|docs|style/.test(lower)) return 'improvements'
  return 'improvements'
}

const previousTag = getPreviousTag()
const commits = getGitLog(previousTag, 'HEAD')

const categories = {
  features: [],
  fixes: [],
  performance: [],
  security: [],
  improvements: [],
}

for (const commit of commits) {
  const cat = categorizeCommit(commit.subject)
  categories[cat].push(commit)
}

const categoryLabels = {
  features: '\u2728 New Features',
  fixes: '\uD83D\uDC1E Bug Fixes',
  performance: '\u26A1 Performance',
  security: '\uD83D\uDD12 Security',
  improvements: '\uD83D\uDEE0\uFE0F Improvements',
}

let changelog = `# Changelog\n\n`
changelog += `## [${version}] - ${date}\n\n`

let hasCommits = false
for (const [key, label] of Object.entries(categoryLabels)) {
  if (categories[key].length === 0) continue
  hasCommits = true
  changelog += `### ${label}\n\n`
  for (const commit of categories[key]) {
    changelog += `- ${commit.subject} (${commit.hash})\n`
  }
  changelog += `\n`
}

if (!hasCommits) {
  changelog += `- Initial release\n\n`
}

// Check if CHANGELOG.md exists and prepend
const changelogPath = path.join(rootDir, 'CHANGELOG.md')
let existing = ''
if (fs.existsSync(changelogPath)) {
  existing = fs.readFileSync(changelogPath, 'utf8')
}

// Remove old header if exists
const headerMatch = existing.match(/^# Changelog\s*\n/)
if (headerMatch) {
  existing = existing.slice(headerMatch[0].length)
}

fs.writeFileSync(changelogPath, changelog + existing)
console.log(`CHANGELOG.md updated for v${version}`)
