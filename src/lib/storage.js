const KEY = "libraryhub-local-v1";
const now = () => new Date().toISOString();
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const seed = () => ({
  profiles: [{ id: "admin-local", full_name: "Library Admin", email: "admin@libraryhub.local", password: "Admin@123", role: "admin", created_at: now() }],
  books: [
    { id: "book-1", title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", category: "Programming", description: "A handbook of agile software craftsmanship.", total_copies: 5, available_copies: 5, created_at: now() },
    { id: "book-2", title: "The Pragmatic Programmer", author: "Andrew Hunt and David Thomas", isbn: "9780135957059", category: "Programming", description: "Practical advice for software developers.", total_copies: 4, available_copies: 4, created_at: now() },
    { id: "book-3", title: "Atomic Habits", author: "James Clear", isbn: "9780735211292", category: "Self Help", description: "Build good habits and break bad ones.", total_copies: 3, available_copies: 3, created_at: now() },
    { id: "book-4", title: "Introduction to Algorithms", author: "Thomas H. Cormen", isbn: "9780262046305", category: "Computer Science", description: "A comprehensive introduction to algorithms.", total_copies: 2, available_copies: 2, created_at: now() }
  ], borrowings: [], reservations: [], notifications: []
});

export function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) { console.error("Could not read LibraryHub data:", error); }
  const initial = seed();
  writeStore(initial);
  return initial;
}
export function writeStore(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
export function makeId() { return uid(); }
export function addNotification(store, userId, message) {
  store.notifications.unshift({ id: uid(), user_id: userId, message, is_read: false, created_at: now() });
}
export function getBooks() { return [...readStore().books].sort((a,b) => b.created_at.localeCompare(a.created_at)); }
export function getBorrowings(profile) {
  const s = readStore();
  return s.borrowings.filter(x => profile.role === "admin" || x.user_id === profile.id).map(x => ({ ...x, books: s.books.find(b => b.id === x.book_id) || x.book, profiles: s.profiles.find(p => p.id === x.user_id) })).sort((a,b) => b.created_at.localeCompare(a.created_at));
}
export function getReservations(profile) {
  const s = readStore();
  return s.reservations.filter(x => profile.role === "admin" || x.user_id === profile.id).map(x => ({ ...x, books: s.books.find(b => b.id === x.book_id) || x.book, profiles: s.profiles.find(p => p.id === x.user_id) })).sort((a,b) => b.created_at.localeCompare(a.created_at));
}
export function getNotifications(userId) { return readStore().notifications.filter(x => x.user_id === userId).sort((a,b) => b.created_at.localeCompare(a.created_at)); }
export function getProfiles() { return readStore().profiles.map(({password, ...p}) => p).sort((a,b) => b.created_at.localeCompare(a.created_at)); }
export function createAccount(fullName, email, password) {
  const s = readStore();
  if (s.profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) throw new Error("An account with this email already exists.");
  const profile = { id: uid(), full_name: fullName.trim(), email: email.trim().toLowerCase(), password, role: "student", created_at: now() };
  s.profiles.push(profile); writeStore(s);
  return { id: profile.id, full_name: profile.full_name, email: profile.email, role: profile.role, created_at: profile.created_at };
}
export function checkLogin(email, password) {
  const p = readStore().profiles.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
  if (!p) throw new Error("Incorrect email or password.");
  const { password: ignored, ...profile } = p;
  return profile;
}
export function addBookRecord(book) {
  const s = readStore();
  s.books.unshift({ ...book, id: uid(), created_at: now() }); writeStore(s);
}
export function removeBookRecord(id) {
  const s = readStore();
  if (s.borrowings.some(x => x.book_id === id) || s.reservations.some(x => x.book_id === id)) throw new Error("This book has borrowing or reservation history and cannot be deleted.");
  s.books = s.books.filter(x => x.id !== id); writeStore(s);
}
export function borrowBook(bookId, profile) {
  const s = readStore(); const book = s.books.find(x => x.id === bookId);
  if (!book) throw new Error("Book not found.");
  if (book.available_copies < 1) throw new Error("No copies are currently available.");
  if (s.borrowings.some(x => x.book_id === bookId && x.user_id === profile.id && x.status !== "returned")) throw new Error("You already have this book borrowed.");
  const issued = new Date(); const due = new Date(); due.setDate(due.getDate() + 14);
  const date = d => d.toISOString().slice(0,10);
  book.available_copies -= 1;
  s.borrowings.unshift({ id: uid(), user_id: profile.id, book_id: bookId, borrow_date: date(issued), due_date: date(due), return_date: null, status: "borrowed", created_at: now() });
  addNotification(s, profile.id, `You borrowed “${book.title}”. Please return it by ${date(due)}.`); writeStore(s);
}
export function returnBook(id) {
  const s = readStore(); const loan = s.borrowings.find(x => x.id === id);
  if (!loan || loan.status === "returned") throw new Error("Borrowing record not found or already returned.");
  loan.status = "returned"; loan.return_date = new Date().toISOString().slice(0,10);
  const book = s.books.find(x => x.id === loan.book_id); if (book) book.available_copies = Math.min(book.total_copies, book.available_copies + 1);
  addNotification(s, loan.user_id, `Your book “${book?.title || "Library book"}” has been marked as returned.`); writeStore(s);
}
export function reserveBook(bookId, profile) {
  const s = readStore(); const book = s.books.find(x => x.id === bookId);
  if (!book) throw new Error("Book not found.");
  if (book.available_copies > 0) throw new Error("This book is available. You can borrow it directly.");
  if (s.reservations.some(x => x.book_id === bookId && x.user_id === profile.id && x.status === "pending")) throw new Error("You already reserved this book.");
  s.reservations.unshift({ id: uid(), user_id: profile.id, book_id: bookId, status: "pending", created_at: now() });
  addNotification(s, profile.id, `Your reservation for “${book.title}” has been added.`); writeStore(s);
}
export function markNotificationsRead(userId) {
  const s = readStore(); s.notifications.forEach(n => { if (n.user_id === userId) n.is_read = true; }); writeStore(s);
}
