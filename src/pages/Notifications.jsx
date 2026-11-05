import { Bell, CheckCheck } from "lucide-react";

export default function Notifications({ notifications, onReadAll }) {
  return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">STAY IN THE LOOP</span><h1>Notifications</h1><p className="muted">Updates about your library activity.</p></div><button className="button button-secondary" onClick={onReadAll}><CheckCheck size={16}/> Mark all read</button></div>
    <div className="notification-list">{notifications.map(n=><article className={`notification-card ${n.is_read?"read":""}`} key={n.id}><div className="notification-icon"><Bell size={18}/></div><div><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString()}</small></div>{!n.is_read&&<i className="unread-dot"/>}</article>)}</div>
    {!notifications.length&&<div className="empty-state"><Bell/><strong>You're all caught up</strong><span>New library updates will show up here.</span></div>}
  </div>;
}
