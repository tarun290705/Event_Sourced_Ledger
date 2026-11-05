import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Button from '../ui/Button'

export default function JsonViewer({ value, label = 'JSON' }) {
  const [status, setStatus] = useState('idle')
  const text = JSON.stringify(value, null, 2)

  useEffect(() => {
    if (status === 'idle') return undefined

    const timer = setTimeout(() => setStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [status])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="json-viewer">
      <div className="json-viewer__bar">
        <span className="json-viewer__label">{label}</span>
        <Button size="sm" variant="secondary" icon={status === 'copied' ? Check : Copy} onClick={copy}>
          {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy'}
        </Button>
      </div>
      <pre className="code-block" tabIndex={0} aria-label={label}>
        {text}
      </pre>
      <span className="sr-only" role="status">
        {status === 'copied' ? `${label} copied to clipboard` : ''}
      </span>
    </div>
  )
}