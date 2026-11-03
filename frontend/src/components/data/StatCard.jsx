export default function StatCard({ label, value, caption, icon: Icon, loading = false }) {
  return (
    <div className="card stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {Icon && (
          <span className="stat-card__icon">
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="stat-card__value num">
        {loading ? <span className="skeleton skeleton--value" role="status" aria-label="Loading" /> : value}
      </div>
      {caption && <p className="stat-card__caption">{caption}</p>}
    </div>
  )
}