import { Bookmark, Clock3 } from "lucide-react";

export default function Reservations({ reservations }) {
  return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">HOLD REQUESTS</span><h1>Reservations</h1><p className="muted">Keep an eye on books requested by readers.</p></div><span className="count-pill">{reservations.length} requests</span></div>
    <div className="reservation-list">{reservations.map(r=><article className="reservation-card" key={r.id}><div className="reservation-icon"><Bookmark/></div><div className="reservation-info"><strong>{r.books?.title||"Book reservation"}</strong><span>{r.books?.author||""}{r.profiles?.full_name?` · ${r.profiles.full_name}`:""}</span><small>Requested {new Date(r.created_at).toLocaleDateString()}</small></div><span className="status status-amber"><Clock3 size={13}/>{r.status}</span></article>)}</div>
    {!reservations.length&&<div className="empty-state"><Bookmark/><strong>No reservations yet</strong><span>Unavailable books you reserve will appear here.</span></div>}
  </div>;
}
