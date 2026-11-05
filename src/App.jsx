import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { addBookRecord, borrowBook, checkLogin, createAccount, getBooks, getBorrowings, getNotifications, getProfiles, getReservations, markNotificationsRead, readStore, removeBookRecord, reserveBook, returnBook } from "./lib/storage";
import Auth from "./components/Auth";
import Shell from "./components/Shell";
import Dashboard from "./pages/Dashboard";
import Books from "./pages/Books";
import Borrowings from "./pages/Borrowings";
import Reservations from "./pages/Reservations";
import Notifications from "./pages/Notifications";
import ManageBooks from "./pages/ManageBooks";
import Students from "./pages/Students";

export default function App() {
  const [profile, setProfile] = useState(() => {
    try { const id = localStorage.getItem("libraryhub-session"); return id ? readStore().profiles.find(p => p.id === id) && (({password, ...p}) => p)(readStore().profiles.find(p => p.id === id)) : null; } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [books, setBooks] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const refreshBooks = useCallback(() => setBooks(getBooks()), []);
  const refreshUserData = useCallback((p) => {
    if (!p) return;
    setBorrowings(getBorrowings(p)); setReservations(getReservations(p)); setNotifications(getNotifications(p.id));
    if (p.role === "admin") setProfiles(getProfiles());
  }, []);
  useEffect(() => { refreshBooks(); if (profile) refreshUserData(profile); }, [profile, refreshBooks, refreshUserData]);

  async function login(email, password) {
    setBusy(true);
    try { const p = checkLogin(email, password); setProfile(p); localStorage.setItem("libraryhub-session", p.id); toast.success("Welcome back!"); }
    finally { setBusy(false); }
  }
  async function register(name, email, password) {
    setBusy(true);
    try { createAccount(name, email, password); toast.success("Account created. Please sign in."); return "Your student account is ready. Sign in with your email and password."; }
    finally { setBusy(false); }
  }
  function logout() { localStorage.removeItem("libraryhub-session"); setProfile(null); setBorrowings([]); setReservations([]); setNotifications([]); toast.success("Signed out."); }
  function doBorrow(id) { try { borrowBook(id, profile); refreshBooks(); refreshUserData(profile); toast.success("Book borrowed. Due in 14 days."); } catch(e) { toast.error(e.message); } }
  function doReserve(id) { try { reserveBook(id, profile); refreshUserData(profile); toast.success("Reservation added."); } catch(e) { toast.error(e.message); } }
  function doReturn(id) { if (!window.confirm("Confirm that this book has been returned?")) return; try { returnBook(id); refreshBooks(); refreshUserData(profile); toast.success("Book marked as returned."); } catch(e) { toast.error(e.message); } }
  function addBook(book) { addBookRecord(book); refreshBooks(); toast.success("Book added to catalog."); }
  function deleteBook(id) { if (!window.confirm("Remove this book from the catalog?")) return; try { removeBookRecord(id); refreshBooks(); toast.success("Book removed."); } catch(e) { toast.error(e.message); } }
  function readAll() { markNotificationsRead(profile.id); refreshUserData(profile); toast.success("Notifications marked as read."); }

  if (!profile) return <><Auth onLogin={login} onRegister={register} busy={busy}/><Toaster position="top-right"/></>;
  const unread = notifications.filter(n => !n.is_read).length;
  const protectedPage = (element, adminOnly=false) => adminOnly && profile.role !== "admin" ? <Navigate to="/" replace/> : element;
  return <Shell profile={profile} onLogout={logout} unread={unread}>
    <Routes>
      <Route path="/" element={<Dashboard profile={profile} books={books} borrowings={borrowings} reservations={reservations} onBorrow={doBorrow} onReserve={doReserve} onDelete={deleteBook}/>}/>
      <Route path="/books" element={<Books books={books} profile={profile} onBorrow={doBorrow} onReserve={doReserve} onDelete={deleteBook}/>}/>
      <Route path="/borrowings" element={<Borrowings profile={profile} borrowings={borrowings} onReturn={doReturn}/>}/>
      <Route path="/reservations" element={<Reservations reservations={reservations}/>}/>
      <Route path="/notifications" element={<Notifications notifications={notifications} onReadAll={readAll}/>}/>
      <Route path="/manage" element={protectedPage(<ManageBooks books={books} onAdd={addBook} onDelete={deleteBook}/>,true)}/>
      <Route path="/students" element={protectedPage(<Students profiles={profiles}/>,true)}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
    <Toaster position="top-right"/>
  </Shell>;
}
