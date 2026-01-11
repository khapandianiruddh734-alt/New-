
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ToolGrid } from './components/ToolGrid';
import { Workspace } from './components/Workspace';
import { Tool, ToolId } from './types';

const TOOLS: Tool[] = [
  // PDF Category
  { id: 'jpg-to-pdf', title: 'JPG to PDF', description: 'Combine multiple images into one clean PDF.', icon: '🖼️', category: 'PDF', accept: 'image/jpeg,image/png', multiple: true, color: 'bg-amber-100 text-amber-600 border-amber-500' },
  { id: 'word-to-pdf', title: 'WORD to PDF', description: 'Convert DOCX documents to high-quality PDF.', icon: '📝', category: 'PDF', accept: '.docx', color: 'bg-blue-100 text-blue-600' },
  { id: 'pdf-to-jpg', title: 'PDF to JPG', description: 'Extract all pages of a PDF as separate images.', icon: '📄', category: 'PDF', accept: '.pdf', color: 'bg-red-100 text-red-600' },
  { id: 'compress-pdf', title: 'Compress PDF', description: 'Reduce file size while keeping text clear.', icon: '📉', category: 'PDF', accept: '.pdf', color: 'bg-emerald-100 text-emerald-600' },
  
  // Data Category
  { id: 'excel-to-pdf', title: 'EXCEL to PDF', description: 'Convert spreadsheets to formatted PDF.', icon: '📊', category: 'Data', accept: '.xlsx,.xls', color: 'bg-green-100 text-green-600' },
  { id: 'clean-excel', title: 'Clean Excel', description: 'Remove special characters and fix spacing.', icon: '🧹', category: 'Data', accept: '.xlsx,.xls,.csv', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'duplicate-remover', title: 'Duplicate Finder', description: 'Identify and remove redundant data rows.', icon: '📋', category: 'Data', accept: '.xlsx,.xls,.csv', color: 'bg-orange-100 text-orange-600' },
  
  // AI Category
  { id: 'ai-menu-fixer', title: 'AI Menu Fixer', description: 'Smartly fix spelling & formatting in menus.', icon: '🍔', category: 'AI', accept: '.xlsx,.xls,.csv', color: 'bg-pink-100 text-pink-600 border-pink-500' },
  { id: 'pdf-img-to-excel', title: 'AI OCR to Excel', description: 'Extract complex tables using Gemini AI.', icon: '👁️', category: 'AI', accept: '.pdf,image/*', color: 'bg-purple-100 text-purple-600' },
  { id: 'ai-document-summary', title: 'AI Summarier', description: 'Get a concise summary of any document.', icon: '✨', category: 'AI', accept: '.pdf,.docx,.txt', color: 'bg-cyan-100 text-cyan-600' },
];

export default function App() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setSelectedTool(null);
  };

  return (
    <Layout onLogoClick={handleBack}>
      {!selectedTool ? (
        <div className="animate-in fade-in duration-700">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Data Entry Made <span className="text-indigo-600">Effortless</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Professional tools for PDF conversion, data cleaning, and AI-powered document intelligence.
            </p>
          </div>
          
          <ToolGrid tools={TOOLS} onSelect={handleToolSelect} />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={handleBack}
            className="flex items-center text-indigo-600 hover:text-indigo-700 font-medium mb-8 transition-colors group"
          >
            <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> 
            Back to Dashboard
          </button>
          <Workspace tool={selectedTool} />
        </div>
      )}
    </Layout>
  );
}
