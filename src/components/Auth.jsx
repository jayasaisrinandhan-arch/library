import { useState } from "react";
import { LibraryBig, ArrowRight } from "lucide-react";

export default function Auth({ onLogin, onRegister, busy }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    try {
      if (mode === "login") await onLogin(email, password);
      else {
        const result = await onRegister(name, email, password);
        setMessage(result || "Account created. Check your email if confirmation is enabled.");
      }
    } catch (error) { setMessage(error.message || "Something went wrong."); }
  }

  return <main className="auth-layout">
    <section className="auth-aside">
      <div className="brand brand-light"><span className="brand-mark"><LibraryBig/></span> LibraryHub</div>
      <div className="auth-aside-copy"><span className="eyebrow light">YOUR KNOWLEDGE, CONNECTED</span><h1>A quieter place<br/>to grow louder ideas.</h1><p>Discover your next great read, keep your learning organized, and make every page count.</p></div>
      <div className="auth-aside-foot">A modern digital library experience</div>
    </section>
    <section className="auth-main">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
        <h2>{mode === "login" ? "Sign in to your library" : "Create your account"}</h2>
        <p className="muted">{mode === "login" ? "Enter your details to continue." : "Student accounts are created with student access."}</p>{mode === "login" && <div className="notice">Demo admin: admin@libraryhub.local / Admin@123</div>}
        {mode === "register" && <label>Full name<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Your full name"/></label>}
        <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters"/></label>
        {message && <div className="notice">{message}</div>}
        <button className="button button-primary button-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17}/></button>
        <p className="auth-switch">{mode === "login" ? "New to LibraryHub?" : "Already have an account?"} <button type="button" className="link-button" onClick={()=>{setMode(mode==="login"?"register":"login");setMessage("");}}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
      </form>
    </section>
  </main>;
}
