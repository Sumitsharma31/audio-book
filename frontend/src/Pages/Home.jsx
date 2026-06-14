import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 md:px-12 text-center max-w-5xl mx-auto py-12">
      

      {/* Hero Headline */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight text-white mb-6 leading-tight max-w-4xl">
        Transform Your PDFs Into{' '}
        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-orange-500 bg-clip-text text-transparent">
           Audiobooks
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
        Upload any PDF, parse it page-by-page, and listen aloud with high-fidelity, naturally spoken voice models using Google Text-to-Speech.
      </p>

      {/* CTA Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-20">
        <Link 
          to="/dashboard" 
          className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden"
        >
          <span>Get Started - It's Free</span>
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>

      
    </div>
  )
}

export default Home