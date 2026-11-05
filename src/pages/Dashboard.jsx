import { useEffect, useState } from "react";
import { BookOpen, BookMarked, Users, Clock3, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import BookCard from "../components/BookCard";

export default function Dashboard({ profile, books, borrowings, reservations, onBorrow, onReserve, onDelete }) {
  const active = borrowings.filter(x=>["borrowed","overdue"].includes(x.status));
  const overdue = active.filter(x=>new Date(x.due_date+"T23:59:59") < new Date());
  const totalCopies = books.reduce((n,b)=>n+(b.total_copies||0),0);
  const available = books.reduce((n,b)=>n+(b.available_copies||0),0);
  const isAdmin = profile.role === "admin";
  return <div className="page-stack">
    <section className="welcome-banner"><div><span className="eyebrow light"><Sparkles size={13}/> YOUR DIGITAL READING SPACE</span><h1>{isAdmin?"Your library, at a glance.":"Make room for a new chapter."}</h1><p>{isAdmin?"Keep your collection organized and your library moving.":"Explore a world of ideas, one book at a time."}</p><Link to="/books" className="banner-link">Explore collection <ArrowUpRight size={16}/></Link></div><div className="banner-art"><div className="art-book book-one"/><div className="art-book book-two"/><div className="art-book book-three"/><div className="art-orbit"/></div></section>
    <div className="section-heading"><div><span className="eyebrow">OVERVIEW</span><h2>{isAdmin?"Library performance":"Your reading overview"}</h2></div><span className="live-indicator"><i/> Live data</span></div>
    <section className="stats-grid">
      <StatCard label={isAdmin?"Total copies":"Books in collection"} value={isAdmin?totalCopies:books.length} icon={BookOpen}/>
      <StatCard label="Available copies" value={available} icon={BookMarked} tone="mint"/>
      <StatCard label={isAdmin?"Active loans":"Currently borrowed"} value={active.length} icon={Clock3} tone="violet"/>
      <StatCard label={isAdmin?"Reservations":"Overdue books"} value={isAdmin?reservations.length:overdue.length} icon={Users} tone="amber"/>
    </section>
    {!isAdmin && <section className="panel reading-panel"><div><span className="eyebrow">KEEP ON TRACK</span><h3>Your borrowed books</h3><p className="muted">A quick look at the books currently with you.</p></div><Link to="/borrowings" className="text-link">View all <ArrowUpRight size={15}/></Link>{active.length===0?<div className="empty-state compact"><BookOpen/><strong>No active loans yet</strong><span>Find a book that catches your eye.</span></div>:<div className="loan-list">{active.slice(0,4).map(r=><div className="loan-row" key={r.id}><div className="loan-icon"><BookOpen/></div><div className="loan-title"><strong>{r.books?.title||"Library book"}</strong><span>Due {r.due_date}</span></div><span className={`status ${r.status==="overdue"?"status-red":"status-green"}`}>{r.status}</span></div>)}</div>}</section>}
    <section><div className="section-heading"><div><span className="eyebrow">HANDPICKED FOR YOU</span><h2>{isAdmin?"Recently added books":"Explore the collection"}</h2></div><Link to="/books" className="text-link">View all books <ArrowUpRight size={15}/></Link></div><div className="book-grid">{books.slice(0,4).map(b=><BookCard key={b.id} book={b} role={profile.role} onBorrow={onBorrow} onReserve={onReserve} onDelete={onDelete}/>)}</div></section>
  </div>;
}
