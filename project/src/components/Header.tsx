// คอมโพเนนต์ส่วนหัวของเว็บไซต์ - Market Basket Analysis
import React from 'react';
import { ShoppingCart, Upload, BarChart3, Download } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <>
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-emerald-500 to-blue-500 p-2 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              <a href='/'>Data First</a>
              </h1>

            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-2 text-gray-600 hover:text-emerald-600 transition-colors">
                <Upload className="h-4 w-4" />
                <span className="font-medium">Upload</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 hover:text-emerald-600 transition-colors">
                <BarChart3 className="h-4 w-4" />
                <span className="font-medium">Analyze</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 hover:text-emerald-600 transition-colors">
                <Download className="h-4 w-4" />
                <span className="font-medium">Download</span>
              </div>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
