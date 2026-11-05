import { BookOpen, BookmarkPlus } from "lucide-react";

export default function BookCard({ book, role, onBorrow, onReserve, onDelete }) {
  return <article className="book-card">
    <div className="book-cover">
      {book.cover_url ? <img src={book.cover_url} alt={book.title} /> : <div className="cover-placeholder"><BookOpen size={42}/><span>LIBRARYHUB</span></div>}
      <span className="cover-category">{book.category || "General"}</span>
    </div>
    <div className="book-content">
      <h3>{book.title}</h3>
      <p className="muted">by {book.author}</p>
      <p className="availability"><span className={book.available_copies > 0 ? "dot green" : "dot amber"} />{book.available_copies} of {book.total_copies} available</p>
      {role === "admin" ? <button className="button button-danger button-full" onClick={() => onDelete(book.id)}>Remove book</button> :
        book.available_copies > 0
          ? <button className="button button-primary button-full" onClick={() => onBorrow(book.id)}>Borrow book</button>
          : <button className="button button-secondary button-full" onClick={() => onReserve(book.id)}><BookmarkPlus size={16}/> Reserve book</button>}
    </div>
  </article>;
}
