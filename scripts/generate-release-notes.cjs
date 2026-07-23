const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const rootDir = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
const version = pkg.version
const date = new Date().toISOString().split('T')[0]
const releaseDir = path.join(rootDir, 'release')

function sha256(filePath) {
  const data = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(data).digest('hex')
}

function fileSize(filePath) {
  const bytes = fs.statSync(filePath).size
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / 1024).toFixed(2)} KB`
}

function getGitLog(fromRef, toRef) {
  try {
    const range = fromRef ? `${fromRef}..${toRef}` : toRef
    return execSync(`git log ${range} --pretty=format:"- %s" --no-merges`, {
      encoding: 'utf8',
      cwd: rootDir,
    })
  } catch {
    return '- Initial release'
  }
}

function getPreviousTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf8', cwd: rootDir }).trim()
  } catch {
    return null
  }
}

const previousTag = getPreviousTag()
const changes = getGitLog(previousTag, 'HEAD')

// Collect release artifacts
const artifacts = []
if (fs.existsSync(releaseDir)) {
  const files = fs.readdirSync(releaseDir)
  for (const file of files) {
    if (/\.(exe|msi|zip|AppImage|deb|rpm|tar\.gz|apk|aab)$/i.test(file)) {
      const filePath = path.join(releaseDir, file)
      artifacts.push({
        name: file,
        size: fileSize(filePath),
        sha256: sha256(filePath),
      })
    }
  }
}

let notes = `# Zetass Pos v${version}\n\n`
notes += `**Release Date:** ${date}\n\n`
notes += `---\n\n`
notes += `## What's Changed\n\n`
notes += `${changes}\n\n`
notes += `---\n\n`

// Windows
const windowsArtifacts = artifacts.filter(a => /\.(exe|msi|zip)$/i.test(a.name) && !/linux|android/i.test(a.name))
if (windowsArtifacts.length > 0) {
  notes += `## \uD83D\uDDA5\uFE0F Windows\n\n`
  notes += `### Installation\n\n`
  notes += `1. Download the installer \`.exe\` file below\n`
  notes += `2. Run the installer and follow the wizard\n`
  notes += `3. Choose installation directory\n`
  notes += `4. Launch Zetass Pos from Desktop or Start Menu\n\n`
  notes += `### Minimum Requirements\n\n`
  notes += `- Windows 10 or later\n`
  notes += `- 4 GB RAM\n`
  notes += `- 500 MB free disk space\n\n`
  notes += `### Files\n\n`
  notes += `| File | Size | SHA256 |\n`
  notes += `|------|------|--------|\n`
  for (const a of windowsArtifacts) {
    notes += `| ${a.name} | ${a.size} | \`${a.sha256}\` |\n`
  }
  notes += `\n`
}

// Linux
const linuxArtifacts = artifacts.filter(a => /\.(AppImage|deb|rpm|tar\.gz)$/i.test(a.name))
if (linuxArtifacts.length > 0) {
  notes += `## \uD83D\uDC27 Linux\n\n`
  notes += `### Installation\n\n`
  notes += `**AppImage:**\n\`\`\`bash\nchmod +x Zetass*.AppImage\n./Zetass*.AppImage\n\`\`\`\n\n`
  notes += `**Debian/Ubuntu (.deb):**\n\`\`\`bash\nsudo dpkg -i Zetass*.deb\nsudo apt-get install -f\n\`\`\`\n\n`
  notes += `**Fedora/RHEL (.rpm):**\n\`\`\`bash\nsudo rpm -i Zetass*.rpm\n\`\`\`\n\n`
  notes += `**Tarball (.tar.gz):**\n\`\`\`bash\ntar -xzf Zetass*.tar.gz\ncd Zetass*\n./zetass-pos\n\`\`\`\n\n`
  notes += `### Minimum Requirements\n\n`
  notes += `- Ubuntu 20.04+ / Fedora 35+ / Debian 11+\n`
  notes += `- 4 GB RAM\n`
  notes += `- 500 MB free disk space\n\n`
  notes += `### Files\n\n`
  notes += `| File | Size | SHA256 |\n`
  notes += `|------|------|--------|\n`
  for (const a of linuxArtifacts) {
    notes += `| ${a.name} | ${a.size} | \`${a.sha256}\` |\n`
  }
  notes += `\n`
}

// Android
const androidArtifacts = artifacts.filter(a => /\.(apk|aab)$/i.test(a.name))
if (androidArtifacts.length > 0) {
  notes += `## \uD83D\uDCF1 Android\n\n`
  notes += `### Installation\n\n`
  notes += `**APK:**\n`
  notes += `1. Enable "Install from Unknown Sources" in Settings\n`
  notes += `2. Download the \`.apk\` file\n`
  notes += `3. Open the APK file and install\n\n`
  notes += `**AAB (Google Play):**\n`
  notes += `- Upload \`.aab\` to Google Play Console for distribution\n\n`
  notes += `### Minimum Requirements\n\n`
  notes += `- Android 8.0 (API 26) or later\n`
  notes += `- 3 GB RAM\n`
  notes += `- 200 MB free storage\n\n`
  notes += `### Files\n\n`
  notes += `| File | Size | SHA256 |\n`
  notes += `|------|------|--------|\n`
  for (const a of androidArtifacts) {
    notes += `| ${a.name} | ${a.size} | \`${a.sha256}\` |\n`
  }
  notes += `\n`
}

notes += `---\n\n`
notes += `**Full Changelog:** [CHANGELOG.md](CHANGELOG.md)\n`

const outputPath = path.join(rootDir, 'release', 'RELEASE_NOTES.md')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, notes)
console.log(`Release notes generated: ${path.relative(rootDir, outputPath)}`)
