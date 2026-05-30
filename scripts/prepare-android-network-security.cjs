const fs = require('fs')
const path = require('path')

const domain = (process.env.MEDIASOFT_PINNED_DOMAIN || 'azhkvmkmimepmflzqqty.supabase.co').trim()
const pin = (process.env.MEDIASOFT_CERT_PIN_SHA256 || process.env.VITE_CERT_PIN_SHA256 || 'p51goejPCgGH+Oog/MU2k6PObcEfTrrr73jUcuWJ7w0=').trim()
const allowLanHttp = /^(1|true|yes)$/i.test((process.env.MEDIASOFT_ALLOW_LAN_HTTP || '').trim())
const out = path.join(process.cwd(), 'android/app/src/main/res/xml/network_security_config.xml')

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const pinningBlock = domain && pin
  ? `
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">${escapeXml(domain)}</domain>
        <pin-set expiration="2028-12-31">
            <pin digest="SHA-256">${escapeXml(pin)}</pin>
        </pin-set>
    </domain-config>`
  : ''

const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="${allowLanHttp ? 'true' : 'false'}">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>${pinningBlock}
</network-security-config>
`

fs.writeFileSync(out, xml)
console.log(domain && pin
  ? `Generated network_security_config.xml with certificate pinning for ${domain}`
  : `Generated network_security_config.xml without domain pinning; LAN HTTP ${allowLanHttp ? 'enabled' : 'disabled'}`)
