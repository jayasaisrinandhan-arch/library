export default function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  return <article className="stat-card">
    <div className={`stat-icon ${tone}`}><Icon size={21} /></div>
    <div><p>{label}</p><strong>{value}</strong></div>
  </article>;
}
