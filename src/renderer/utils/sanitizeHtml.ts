const ALLOWED_TAGS = new Set([
  'A',
  'B',
  'BR',
  'DIV',
  'EM',
  'I',
  'LI',
  'OL',
  'P',
  'SMALL',
  'SPAN',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
])

const DROP_WITH_CONTENT = new Set([
  'BUTTON',
  'EMBED',
  'FORM',
  'IFRAME',
  'INPUT',
  'MATH',
  'OBJECT',
  'SCRIPT',
  'STYLE',
  'SVG',
])

function isSafeHref(value: string) {
  try {
    const url = new URL(value, window.location.origin)
    return url.protocol === 'https:' || url.protocol === 'mailto:'
  } catch {
    return false
  }
}

function sanitizeElement(element: Element) {
  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase()
    const value = attr.value

    if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
      element.removeAttribute(attr.name)
      continue
    }

    if (element.tagName === 'A' && name === 'href') {
      if (isSafeHref(value)) {
        element.setAttribute('target', '_blank')
        element.setAttribute('rel', 'noopener noreferrer')
      } else {
        element.removeAttribute(attr.name)
      }
      continue
    }

    if ((element.tagName === 'TD' || element.tagName === 'TH') && ['colspan', 'rowspan'].includes(name)) {
      const numeric = Number(value)
      if (Number.isInteger(numeric) && numeric > 0 && numeric <= 12) continue
    }

    element.removeAttribute(attr.name)
  }
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof window === 'undefined') return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue

      const element = child as Element
      if (DROP_WITH_CONTENT.has(element.tagName)) {
        element.remove()
        continue
      }

      if (!ALLOWED_TAGS.has(element.tagName)) {
        const fragment = doc.createDocumentFragment()
        while (element.firstChild) fragment.appendChild(element.firstChild)
        element.replaceWith(fragment)
        walk(node)
        continue
      }

      sanitizeElement(element)
      walk(element)
    }
  }

  walk(root)
  return root.innerHTML
}
