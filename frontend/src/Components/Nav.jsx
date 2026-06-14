import React from 'react'
import { Link, useLocation } from 'react-router-dom'

function Nav() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/50 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
      <Link to="/" className="flex items-center gap-2 group">
       
        <h1 className="text-2xl font-display font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-orange-500 bg-clip-text text-transparent tracking-tight">
          AudioBooks
        </h1>
      </Link>
      <div className="flex gap-1 md:gap-2">
        <Link 
          to="/" 
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
            isActive('/') 
              ? 'bg-white/10 text-white shadow-inner shadow-white/5' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Home
        </Link>
        <Link 
          to="/dashboard" 
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
            isActive('/dashboard') 
              ? 'bg-white/10 text-white shadow-inner shadow-white/5' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Dashboard
        </Link>
      </div>
    </nav>
  )
}

export default Nav