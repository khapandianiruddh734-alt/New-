
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onLogoClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onLogoClick }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 glass-effect border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center cursor-pointer select-none group" 
              onClick={onLogoClick}
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold">A</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                The <span className="text-indigo-600">Achievers</span>
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Enterprise Productivity Suite</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto px-4 py-12 w-full">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} The Achievers. All rights reserved. 
            <span className="mx-2">|</span> 
            Processing is performed 100% locally for your privacy.
          </p>
        </div>
      </footer>
    </div>
  );
};
