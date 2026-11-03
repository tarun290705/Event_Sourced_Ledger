export default function MiniBarChart({ data, series, ariaLabel }) {
  const max = Math.max(0, ...data.flatMap((point) => point.values))

  const barHeight = (value) => {
    if (max === 0 || value === 0) return '0%'
    return `${Math.max((value / max) * 100, 3)}%`
  }

  return (
    <div className="chart">
      <div className="chart__legend">
        {series.map((item) => (
          <span key={item.name} className="chart__legend-item">
            <span className={`chart__swatch chart__swatch--${item.tone}`} aria-hidden="true" />
            {item.name}
          </span>
        ))}
        <span className="chart__peak text-muted">Peak: {max}</span>
      </div>

      <div className="chart__plot" aria-hidden="true">
        {data.map((point) => (
          <div
            key={point.key}
            className="chart__group"
            title={`${point.fullLabel}: ${series
              .map((item, index) => `${point.values[index]} ${item.name.toLowerCase()}`)
              .join(', ')}`}
          >
            <div className="chart__bars">
              {point.values.map((value, index) => (
                <span
                  key={series[index].name}
                  className={`chart__bar chart__bar--${series[index].tone}`}
                  style={{ height: barHeight(value) }}
                />
              ))}
            </div>
            <span className="chart__label">{point.label}</span>
          </div>
        ))}
      </div>

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {series.map((item) => (
              <th key={item.name} scope="col">
                {item.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.fullLabel}</th>
              {point.values.map((value, index) => (
                <td key={series[index].name}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}