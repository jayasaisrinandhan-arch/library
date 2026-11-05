import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import BookCard from "../components/BookCard";

export default function Books({ books, profile, onBorrow, onReserve, onDelete }) {
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("All");
  const categories=["All",...new Set(books.map(b=>b.category).filter(Boolean))];
  const filtered=useMemo(()=>books.filter(b=>
    `${b.title} ${b.author} ${b.category||""}`.toLowerCase().includes(search.toLowerCase()) &&
    (category==="All"||b.category===category)
  ),[books,search,category]);
  return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">THE COLLECTION</span><h1>Find your next read.</h1><p className="muted">Search across the library and discover something new.</p></div><span className="count-pill">{filtered.length} titles</span></div>
    <div className="catalog-toolbar"><div className="search-box"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title, author or category…"/></div><div className="filter-box"><SlidersHorizontal size={17}/><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div></div>
    {filtered.length?<div className="book-grid">{filtered.map(b=><BookCard key={b.id} book={b} role={profile.role} onBorrow={onBorrow} onReserve={onReserve} onDelete={onDelete}/>)}</div>:<div className="empty-state"><Search/><strong>No books match your search</strong><span>Try another title, author or category.</span></div>}
  </div>;
}
