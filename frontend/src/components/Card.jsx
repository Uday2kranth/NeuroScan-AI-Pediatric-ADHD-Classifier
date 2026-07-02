export default function Card({ children, className = '', noPadding = false }) {
  return (
    <div className={`card ${noPadding ? 'card--no-padding' : ''} ${className}`}>
      <div className="card-shine" />
      {children}
    </div>
  )
}
