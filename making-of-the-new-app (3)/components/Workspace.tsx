
import React, { useState, useRef } from 'react';
import { Tool, ProcessingState, DuplicateOptions, CompressionLevel } from '../types';
import * as pdfService from '../services/pdfService';
import * as dataService from '../services/dataService';
import * as geminiService from '../services/gemini.ts';

interface WorkspaceProps {
  tool: Tool;
}

const LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'German', 
  'Chinese (Simplified)', 'Japanese', 'Arabic', 'Russian', 'Portuguese'
];

export const Workspace: React.FC<WorkspaceProps> = ({ tool }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle', message: '' });
  const [dupOptions, setDupOptions] = useState<DuplicateOptions>({ criteria: 'row', mode: 'remove' });
  const [compLevel, setCompLevel] = useState<CompressionLevel>('Standard');
  const [ocrLang, setOcrLang] = useState<string>('English');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => file && file.size > 0);
    setFiles(prev => tool.multiple ? [...prev, ...validFiles] : validFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFile = async () => {
    if (files.length === 0) return;
    setProcessing({ status: 'processing', message: 'The engine is warming up...' });

    try {
      let resultBlob: Blob | undefined;
      let resultFilename = 'result.pdf';

      switch (tool.id) {
        case 'jpg-to-pdf':
          setProcessing({ status: 'processing', message: 'Combining images and formatting PDF...' });
          resultBlob = await pdfService.imagesToPdf(files);
          resultFilename = 'combined_images.pdf';
          break;
        case 'compress-pdf':
          setProcessing({ status: 'processing', message: `Compressing PDF with ${compLevel} optimization...` });
          resultBlob = await pdfService.compressPdf(files[0], compLevel);
          resultFilename = `compressed_${compLevel.toLowerCase()}_${files[0].name}`;
          break;
        case 'pdf-to-jpg':
          setProcessing({ status: 'processing', message: 'Extracting pages as high-quality images...' });
          resultBlob = await pdfService.pdfToJpgs(files[0]);
          resultFilename = 'extracted_pages.zip';
          break;
        case 'excel-to-pdf':
          resultBlob = await dataService.excelToPdf(files[0]);
          resultFilename = 'spreadsheet.pdf';
          break;
        case 'clean-excel':
          resultBlob = await dataService.cleanExcel(files[0]);
          resultFilename = 'cleaned_data.xlsx';
          break;
        case 'duplicate-remover':
          resultBlob = await dataService.processDuplicates(files[0], dupOptions);
          resultFilename = `processed_${files[0].name}`;
          break;
        case 'ai-menu-fixer':
          setProcessing({ status: 'processing', message: 'Gemini AI is generating Short_Codes and mapping attributes...' });
          const buffer = await files[0].arrayBuffer();
          const wb = (window as any).XLSX.read(buffer);
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const gridData = (window as any).XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          const restructuredData = await geminiService.aiFixMenuData(gridData);
          
          dataService.exportToExcel(restructuredData, 'standardized_enterprise_menu.xlsx');
          setProcessing({ 
            status: 'success', 
            message: 'Menu Restructured Successfully!', 
            details: 'Columns populated: Name (with brackets & prefixes), Item_Online_DisplayName, Short_Code (1-AKM series), and Goods_Services (Services). Original column structure maintained.' 
          });
          return;

        case 'pdf-img-to-excel':
          setProcessing({ status: 'processing', message: `Performing AI OCR in ${ocrLang}...` });
          const reader = new FileReader();
          reader.readAsDataURL(files[0]);
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const extracted = await geminiService.aiExtractToExcel(base64, files[0].type, ocrLang);
            dataService.exportToExcel(extracted, 'extracted_data.xlsx');
            setProcessing({ status: 'success', message: 'Data extraction complete!', details: `The Excel file was generated using AI document analysis optimized for ${ocrLang}.` });
          };
          return;

        case 'ai-document-summary':
          setProcessing({ status: 'processing', message: 'Reading document context for intelligent summarization...' });
          const text = await pdfService.extractPdfText(files[0]);
          const summary = await geminiService.aiSummarizeDoc(text);
          setProcessing({ status: 'success', message: 'Summary Ready!', details: summary });
          return;

        default:
          throw new Error('This tool is currently in development.');
      }

      if (resultBlob) {
        setProcessing({ 
          status: 'success', 
          message: 'Process completed successfully!', 
          details: 'Your file is ready for download.',
          resultBlob,
          resultFilename
        });
      }
    } catch (err: any) {
      setProcessing({ status: 'error', message: 'Processing failed', details: err.message });
    }
  };

  const handleDownload = () => {
    if (processing.resultBlob && processing.resultFilename) {
      (window as any).saveAs(processing.resultBlob, processing.resultFilename);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-500">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{tool.title}</h2>
        <p className="text-slate-500">{tool.description}</p>
      </div>

      {processing.status === 'idle' && (
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group relative overflow-hidden
              ${isDragging 
                ? 'border-indigo-500 bg-indigo-50 scale-[1.02] shadow-inner' 
                : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}
            `}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-indigo-500/5 animate-pulse pointer-events-none"></div>
            )}
            
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${isDragging ? 'scale-110 bg-indigo-100 rotate-3' : 'bg-slate-100 group-hover:scale-110'}`}>
              <span className="text-3xl">{isDragging ? '📥' : '📤'}</span>
            </div>
            
            <p className="text-lg font-semibold text-slate-700">
              {isDragging ? 'Drop your files here' : 'Drop your file here or '}
              {!isDragging && <span className="text-indigo-600 underline decoration-indigo-200 decoration-2 underline-offset-4">click to browse</span>}
            </p>
            <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-medium">Supports: {tool.accept}</p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept={tool.accept}
              multiple={tool.multiple}
              onChange={handleFileChange} 
            />
          </div>

          {files.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center">
                  <span className="bg-slate-100 rounded-lg px-2 py-0.5 text-xs mr-2">{files.length}</span>
                  Selected Files
                </h3>
                <button onClick={() => setFiles([])} className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors">Clear all</button>
              </div>
              <div className="grid grid-cols-1 gap-2 mb-6">
                {files.map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm group/item">
                    <span className="truncate max-w-xs font-medium text-slate-700">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500 transition-colors ml-4 p-1">✕</button>
                  </div>
                ))}
              </div>

              {tool.id === 'compress-pdf' && (
                <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-indigo-900">Select Compression Strength</h4>
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      ✨ SHARP TEXT
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Standard', 'High', 'Maximum'] as CompressionLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setCompLevel(level)}
                        title={
                          level === 'Standard' ? 'Optimizes document assets while maintaining 100% text clarity and sharpness. Best for official documents.' :
                          level === 'High' ? 'Balanced optimization for faster sharing. Text remains crisp for printing and reading.' :
                          'Aggressive optimization for smallest possible size. Recommended for low-bandwidth mobile sharing.'
                        }
                        className={`p-4 rounded-xl border transition-all duration-200 text-xs font-bold flex flex-col items-center gap-1 group relative ${
                          compLevel === level 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg -translate-y-1' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                      >
                        <span className="uppercase tracking-wide">{level}</span>
                        <span className={`text-[10px] font-normal opacity-80`}>
                          {level === 'Standard' ? '~40% smaller' : level === 'High' ? '~70% smaller' : '~90% smaller'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tool.id === 'pdf-img-to-excel' && (
                <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100 mb-6 text-left shadow-sm">
                  <label className="block text-sm font-bold text-purple-900 mb-2">Document Language (for AI Accuracy):</label>
                  <select 
                    value={ocrLang} 
                    onChange={(e) => setOcrLang(e.target.value)}
                    className="w-full bg-white border border-purple-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none shadow-sm transition-all"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}

              {tool.id === 'duplicate-remover' && (
                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 mb-6">
                  <h4 className="text-sm font-bold text-orange-800 mb-4">Duplicate Detection Logic:</h4>
                  <div className="flex flex-wrap gap-4 text-sm mb-6">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="radio" checked={dupOptions.criteria === 'row'} onChange={() => setDupOptions(prev => ({...prev, criteria: 'row'}))} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-orange-200" />
                      <span className="text-orange-900 group-hover:text-indigo-600 transition-colors">Exact Full Row Match</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="radio" checked={dupOptions.criteria === 'col1'} onChange={() => setDupOptions(prev => ({...prev, criteria: 'col1'}))} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-orange-200" />
                      <span className="text-orange-900 group-hover:text-indigo-600 transition-colors">First Column Index Match</span>
                    </label>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => { setDupOptions(prev => ({...prev, mode: 'remove'})); processFile(); }}
                      className="flex-1 bg-white border border-orange-200 text-orange-700 font-bold py-3 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                    >
                      🗑️ Delete Duplicates
                    </button>
                    <button 
                      onClick={() => { setDupOptions(prev => ({...prev, mode: 'highlight'})); processFile(); }}
                      className="flex-1 bg-white border border-orange-200 text-orange-700 font-bold py-3 rounded-xl hover:bg-yellow-400 hover:text-black transition-all shadow-sm"
                    >
                      🟡 Highlight Rows
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={processFile}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-indigo-200 transition-all active:scale-[0.98] mt-4"
              >
                {tool.id === 'ai-menu-fixer' ? 'Apply Enterprise Formatting' : 'Start Processing Now'}
              </button>
            </div>
          )}
        </div>
      )}

      {processing.status === 'processing' && (
        <div className="py-16 text-center animate-in zoom-in duration-500">
          <div className="relative w-28 h-28 mx-auto mb-8">
             <div className="absolute inset-0 border-[6px] border-indigo-100 rounded-full"></div>
             <div className="absolute inset-0 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
                {tool.icon}
             </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{processing.message}</h3>
          <p className="text-slate-400 text-sm animate-pulse max-w-xs mx-auto">Gemini AI is generating Short_Codes and mapping Attributes...</p>
        </div>
      )}

      {processing.status === 'success' && (
        <div className="py-10 text-center animate-in bounce-in duration-500">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
            ✓
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Process Complete!</h3>
          <div className="bg-slate-50 p-6 rounded-2xl mb-10 max-h-64 overflow-auto border border-slate-100 text-left shadow-inner custom-scrollbar">
            <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{processing.details}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {processing.resultBlob && (
              <button 
                onClick={handleDownload}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl hover:-translate-y-1 transition-all"
              >
                📥 Download Standardized Menu
              </button>
            )}
            <button 
              onClick={() => { setProcessing({ status: 'idle', message: '' }); setFiles([]); }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all"
            >
              🔄 Start New Task
            </button>
          </div>
        </div>
      )}

      {processing.status === 'error' && (
        <div className="py-12 text-center animate-in shake duration-500">
          <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-8">
            !
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h3>
          <p className="text-slate-500 mb-10 max-w-sm mx-auto">{processing.details}</p>
          <button 
            onClick={() => setProcessing({ status: 'idle', message: '' })}
            className="w-full max-w-xs bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
