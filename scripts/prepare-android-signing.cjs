const { spawnSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const keysDir = path.join(rootDir, '.keys')
const keystorePath = path.join(keysDir, 'zetass-pos-release.keystore')
const envPath = path.join(keysDir, 'android-release.env')
const alias = 'zetass-pos'

function randomSecret() {
  return crypto.randomBytes(24).toString('hex')
}

function keytoolCandidates() {
  const names = process.platform === 'win32' ? ['keytool.exe'] : ['keytool']
  const candidates = []
  if (process.env.JAVA_HOME) {
    for (const name of names) candidates.push(path.join(process.env.JAVA_HOME, 'bin', name))
  }
  candidates.push(path.join(rootDir, '.local-jdk21', 'usr', 'lib', 'jvm', 'java-21-openjdk-amd64', 'bin', names[0]))
  candidates.push(names[0])
  return candidates
}

function findKeytool() {
  for (const candidate of keytoolCandidates()) {
    const result = spawnSync(candidate, ['-help'], { encoding: 'utf8', stdio: 'ignore' })
    if (result.status === 0 || result.status === 1) return candidate
  }
  return null
}

function writeEnv(storePassword) {
  const lines = [
    `ZETASS_POS_RELEASE_STORE_FILE=${keystorePath}`,
    `ZETASS_POS_RELEASE_STORE_PASSWORD=${storePassword}`,
    `ZETASS_POS_RELEASE_KEY_ALIAS=${alias}`,
    `ZETASS_POS_RELEASE_KEY_PASSWORD=${storePassword}`,
  ]
  fs.writeFileSync(envPath, `${lines.join('\n')}\n`, { mode: 0o600 })
}

fs.mkdirSync(keysDir, { recursive: true })

if (fs.existsSync(keystorePath) && fs.existsSync(envPath)) {
  console.log(`Android release signing already prepared: ${path.relative(rootDir, envPath)}`)
  process.exit(0)
}

const keytool = findKeytool()
if (!keytool) {
  console.error('keytool tidak ditemukan. Install JDK 17+ atau set JAVA_HOME.')
  process.exit(1)
}

const storePassword = randomSecret()
const result = spawnSync(keytool, [
  '-genkeypair',
  '-v',
  '-keystore', keystorePath,
  '-alias', alias,
  '-keyalg', 'RSA',
  '-keysize', '2048',
  '-validity', '10000',
  '-storepass', storePassword,
  '-keypass', storePassword,
  '-dname', 'CN=Zetass Pos, OU=POS, O=Zetass, L=Jakarta, ST=Jakarta, C=ID',
], {
  stdio: 'inherit',
})

if (result.status !== 0) process.exit(result.status ?? 1)

writeEnv(storePassword)
console.log(`Android release keystore dibuat: ${path.relative(rootDir, keystorePath)}`)
console.log(`Env signing dibuat: ${path.relative(rootDir, envPath)}`)
