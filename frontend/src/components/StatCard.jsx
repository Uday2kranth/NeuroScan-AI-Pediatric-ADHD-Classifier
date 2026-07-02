export default function StatCard({ icon: Icon, label, value, subtext, accentColor }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: `${accentColor}15`, color: accentColor }}>
        <Icon size={20} />
      </div>
      <div className="stat-card-content">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value}</span>
        {subtext && <span className="stat-card-subtext">{subtext}</span>}
      </div>
    </div>
  )
}
