import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { getBooks, getBorrowings, getReservations, getNotifications } from "./lib/api";
import Auth from "./components/Auth";
import Shell from "./components/Shell";
import Dashboard from "./pages/Dashboard";
import Books from "./pages/Books";
import Borrowings from "./pages/Borrowings";
import Reservations from "./pages/Reservations";
import Notifications from "./pages/Notifications";
import ManageBooks from "./pages/ManageBooks";
import Students from "./pages/Students";

function SetupScreen() {
  return <div className="setup-screen"><div className="setup-card"><div className="brand-mark"><span>LH</span></div><span className="eyebrow">ONE LAST SETUP STEP</span><h1>Connect your Supabase project</h1><p>Create <code>.env.local</code> in the project root using <code>.env.example</code>, add your Supabase project URL and publishable key, then restart the dev server.</p><pre>VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co{"\n"}VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY</pre><p className="muted">Then run the SQL file at <code>supabase/schema.sql</code> in the Supabase SQL Editor.</p></div></div>;
}

export default function App() {
  const navigate=useNavigate();
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [books,setBooks]=useState([]);
  const [borrowings,setBorrowings]=useState([]);
  const [reservations,setReservations]=useState([]);
  const [notifications,setNotifications]=useState([]);
  const [profiles,setProfiles]=useState([]);

  const loadProfile=useCallback(async(user)=>{
    const {data,error}=await supabase.from("profiles").select("*").eq("id",user.id).single();
    if(error) throw error;
    setProfile(data);
    return data;
  },[]);

  const refreshBooks=useCallback(async()=>{setBooks(await getBooks());},[]);
  const refreshUserData=useCallback(async(p)=>{
    if(!p) return;
    const [loans,holds,alerts]=await Promise.all([getBorrowings(p),getReservations(p),getNotifications(p.id)]);
    setBorrowings(loans);setReservations(holds);setNotifications(alerts);
    if(p.role==="admin"){
      const {data,error}=await supabase.from("profiles").select("id,full_name,email,role,created_at").order("created_at",{ascending:false});
      if(error) throw error;
      setProfiles(data||[]);
    }
  },[]);

  useEffect(()=>{
    if(!isSupabaseConfigured){setLoading(false);return;}
    let alive=true;
    supabase.auth.getSession().then(async({data,error})=>{
      if(error) toast.error(error.message);
      if(!alive)return;
      setSession(data.session);
      if(data.session?.user){
        try{const p=await loadProfile(data.session.user);await Promise.all([refreshBooks(),refreshUserData(p)]);}
        catch(e){toast.error(e.message);}
      } else {try{await refreshBooks();}catch(e){toast.error(e.message);}}
      if(alive)setLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
      if(!alive)return;
      setSession(next);
      if(event==="SIGNED_OUT"){setProfile(null);setBorrowings([]);setReservations([]);setNotifications([]);navigate("/");}
      if(next?.user&&event==="SIGNED_IN"){
        setTimeout(async()=>{try{const p=await loadProfile(next.user);await Promise.all([refreshBooks(),refreshUserData(p)]);}catch(e){toast.error(e.message);}},0);
      }
    });
    return()=>{alive=false;subscription.unsubscribe();};
  },[loadProfile,refreshBooks,refreshUserData,navigate]);

  useEffect(()=>{
    if(!profile)return;
    const channel=supabase.channel(`library-events-${profile.id}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"books"},()=>refreshBooks())
      .on("postgres_changes",{event:"*",schema:"public",table:"borrowings"},()=>refreshUserData(profile))
      .on("postgres_changes",{event:"*",schema:"public",table:"reservations"},()=>refreshUserData(profile))
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${profile.id}`},()=>refreshUserData(profile))
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[profile,refreshBooks,refreshUserData]);

  async function login(email,password){
    setBusy(true);
    try{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;toast.success("Welcome back!");}
    finally{setBusy(false);}
  }
  async function register(name,email,password){
    setBusy(true);
    try{
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
      if(error)throw error;
      if(data.session){toast.success("Account created.");}
      return data.session?"Your account is ready.":"Registration received. Confirm your email if email confirmation is enabled, then sign in.";
    }finally{setBusy(false);}
  }
  async function logout(){const {error}=await supabase.auth.signOut();if(error)toast.error(error.message);else toast.success("Signed out.");}
  async function doBorrow(id){
    try{const {error}=await supabase.rpc("borrow_book",{p_book_id:id});if(error)throw error;toast.success("Book borrowed. Due in 14 days.");await Promise.all([refreshBooks(),refreshUserData(profile)]);}
    catch(e){toast.error(e.message);}
  }
  async function doReserve(id){
    try{const {error}=await supabase.rpc("reserve_book",{p_book_id:id});if(error)throw error;toast.success("Reservation added.");await refreshUserData(profile);}
    catch(e){toast.error(e.message);}
  }
  async function doReturn(id){
    if(!window.confirm("Confirm that this book has been returned?"))return;
    try{const {error}=await supabase.rpc("admin_return_book",{p_borrowing_id:id});if(error)throw error;toast.success("Book marked as returned.");await Promise.all([refreshBooks(),refreshUserData(profile)]);}
    catch(e){toast.error(e.message);}
  }
  async function addBook(book){
    const {error}=await supabase.from("books").insert(book);
    if(error)throw error;
    toast.success("Book added to catalog.");await refreshBooks();
  }
  async function deleteBook(id){
    if(!window.confirm("Remove this book from the catalog? Books with borrowing history cannot be deleted."))return;
    const {error}=await supabase.from("books").delete().eq("id",id);
    if(error)toast.error(error.message);else{toast.success("Book removed.");await refreshBooks();}
  }
  async function readAll(){
    const {error}=await supabase.from("notifications").update({is_read:true}).eq("user_id",profile.id);
    if(error)toast.error(error.message);else{toast.success("Notifications marked as read.");setNotifications(n=>n.map(x=>({...x,is_read:true})));}
  }

  if(!isSupabaseConfigured)return <SetupScreen/>;
  if(loading)return <div className="loading-screen"><div className="loader-mark">LH</div><span>Preparing your library…</span></div>;
  if(!session||!profile)return <><Auth onLogin={login} onRegister={register} busy={busy}/><Toaster position="top-right"/></>;

  const unread=notifications.filter(n=>!n.is_read).length;
  const protectedPage=(element,adminOnly=false)=>(adminOnly&&profile.role!=="admin"?<Navigate to="/" replace/>:element);
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
