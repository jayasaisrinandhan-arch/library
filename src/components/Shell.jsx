import { NavLink, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, LibraryBig, LogOut, ClipboardList, Bell, PlusCircle, Users, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Shell({ profile, onLogout, children, unread = 0 }) {
  const [open, setOpen] = useState(false);
  const links = [
    {to:"/",label:"Overview",icon:LayoutDashboard},
    {to:"/books",label:"Explore books",icon:BookOpen},
    {to:"/borrowings",label:profile.role==="admin"?"Borrowing desk":"My borrowings",icon:ClipboardList},
    {to:"/reservations",label:"Reservations",icon:LibraryBig},
    {to:"/notifications",label:"Notifications",icon:Bell,badge:unread},
    ...(profile.role==="admin" ? [{to:"/manage",label:"Manage books",icon:PlusCircle},{to:"/students",label:"Students",icon:Users}] : [])
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${open?"sidebar-open":""}`}>
      <div className="sidebar-brand"><span className="brand-mark"><LibraryBig size={22}/></span><span>Library<span className="brand-accent">Hub</span></span><button className="mobile-close" onClick={()=>setOpen(false)}><X/></button></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav>{links.map(({to,label,icon:Icon,badge})=><NavLink end={to==="/"} onClick={()=>setOpen(false)} className={({isActive})=>`nav-link ${isActive?"active":""}`} to={to} key={to}><Icon size={18}/><span>{label}</span>{badge>0&&<i className="nav-badge">{badge}</i>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="profile-mini"><div className="avatar">{profile.full_name?.[0]?.toUpperCase()||"U"}</div><div className="profile-mini-text"><strong>{profile.full_name}</strong><small>{profile.role==="admin"?"Administrator":"Student"}</small></div></div><button className="logout-link" onClick={onLogout}><LogOut size={17}/> Sign out</button></div>
    </aside>
    {open && <button className="sidebar-scrim" onClick={()=>setOpen(false)} aria-label="Close navigation"/>}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setOpen(true)}><Menu/></button><div><span className="topbar-kicker">DIGITAL LIBRARY</span><strong>Good to see you, {profile.full_name?.split(" ")[0] || "there"}</strong></div><div className="topbar-right"><span className="role-pill">{profile.role==="admin"?"Admin workspace":"Student workspace"}</span><div className="avatar">{profile.full_name?.[0]?.toUpperCase()||"U"}</div></div></header>
      <div className="page-content">{children}</div>
      <footer className="footer">© {new Date().getFullYear()} LibraryHub <span>Made for curious minds.</span></footer>
    </main>
  </div>;
}
