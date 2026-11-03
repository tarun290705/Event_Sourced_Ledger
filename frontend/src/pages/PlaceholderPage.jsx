// TEMPORARY: stands in for each Stage 4 page until it is built, then gets deleted.
import { Hammer } from 'lucide-react'
import { useParams } from 'react-router-dom'

export default function PlaceholderPage({ title }) {
  const params = Object.entries(useParams())

  return (
    <div className="card">
      <div className="state-panel">
        <Hammer className="state-panel__icon" size={32} aria-hidden="true" />
        <h2>{title}</h2>
        <p className="state-panel__text">
          This page is built in Stage 4. The route, layout and permissions already work.
        </p>
        {params.length > 0 && (
          <p className="mono text-muted">{params.map(([key, value]) => `${key}=${value}`).join('  ')}</p>
        )}
      </div>
    </div>
  )
}