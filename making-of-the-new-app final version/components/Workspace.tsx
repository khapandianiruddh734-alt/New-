
import React, { useState, useRef } from 'react';
import { Tool, ProcessingState, DuplicateOptions, CompressionLevel } from '../types';
import * as pdfService from '../services/pdfService';
import * as dataService from '../services/dataService';
import * as geminiService from '../services/gemini.ts';
import { apiTracker } from '../services/apiTracker';

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

  const getLogMeta = () => ({
    fileCount: files.length,
    fileFormats: files.map(f => f.name.split('.').pop() || 'unknown')
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => file && file.size > 0);
    setFiles(prev => tool.multiple ? [...prev, ...validFiles] : validFiles);
  };

  const processFile = async () => {
    if (files.length === 0) return;
    const startTime = Date.now();
    setProcessing({ status: 'processing', message: 'Initiating operation...' });

    try {
      let resultBlob: Blob | undefined;
      let resultFilename = 'result.pdf';

      switch (tool.id) {
        case 'jpg-to-pdf':
          resultBlob = await pdfService.imagesToPdf(files);
          resultFilename = 'combined_images.pdf';
          break;
        case 'word-to-pdf':
          resultBlob = await pdfService.wordToPdf(files[0]);
          resultFilename = `${files[0].name.split('.')[0]}.pdf`;
          break;
        case 'compress-pdf':
          resultBlob = await pdfService.compressPdf(files[0], compLevel);
          resultFilename = `compressed_${compLevel.toLowerCase()}_${files[0].name}`;
          break;
        case 'pdf-to-jpg':
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
          const buffer = await files[0].arrayBuffer();
          const wb = (window as any).XLSX.read(buffer);
          const gridData = (window as any).XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
          const restructuredData = await geminiService.aiFixMenuData(gridData);
          dataService.exportToExcel(restructuredData, 'reformatted_enterprise_menu.xlsx');
          setProcessing({ status: 'success', message: 'Menu Formatting Complete!', details: 'Columns standardized via Gemini AI.' });
          return;

        case 'pdf-img-to-excel':
          const reader = new FileReader();
          reader.readAsDataURL(files[0]);
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const extracted = await geminiService.aiExtractToExcel(base64, files[0].type, ocrLang);
            dataService.exportToExcel(extracted, 'extracted_data.xlsx');
            setProcessing({ status: 'success', message: 'AI Extraction Complete!', details: 'Table data extracted to Excel.' });
          };
          return;

        case 'ai-document-summary':
          const text = await pdfService.extractPdfText(files[0]);
          const summary = await geminiService.aiSummarizeDoc(text);
          setProcessing({ status: 'success', message: 'Summary Ready!', details: summary });
          return;

        default: throw new Error('Tool logic not implemented.');
      }

      // Standard Log for non-AI tools (AI tools log inside their service)
      if (tool.category !== 'AI') {
        apiTracker.logRequest({
          tool: tool.title,
          model: 'Local Engine',
          status: 'success',
          latency: Date.now() - startTime,
          ...getLogMeta()
        });
      }

      if (resultBlob) {
        setProcessing({ status: 'success', message: 'Completed!', details: 'File ready.', resultBlob, resultFilename });
      }
    } catch (err: any) {
      apiTracker.logRequest({
        tool: tool.title,
        model: 'Error State',
        status: 'error',
        latency: Date.now() - startTime,
        errorMessage: err.message,
        ...getLogMeta()
      });
      setProcessing({ status: 'error', message: 'Failed', details: err.message });
    }
  };

  const handleDownload = () => processing.resultBlob && (window as any).saveAs(processing.resultBlob, processing.resultFilename);

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{tool.title}</h2>
        <p className="text-slate-500">{tool.description}</p>
      </div>

      {processing.status === 'idle' && (
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files)); }}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400'}`}
          >
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📤</span>
            </div>
            <p className="text-lg font-semibold text-slate-700">Drop files or <span className="text-indigo-600 underline">browse</span></p>
            <p className="text-xs text-slate-400 mt-2 uppercase">Supports: {tool.accept}</p>
            <input type="file" ref={fileInputRef} className="hidden" accept={tool.accept} multiple={tool.multiple} onChange={handleFileChange} />
          </div>

          {files.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 gap-2 mb-6">
                {files.map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                    <span className="truncate font-medium text-slate-700">{f.name}</span>
                    <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500">✕</button>
                  </div>
                ))}
              </div>

              {tool.id === 'compress-pdf' && (
                <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 mb-6 grid grid-cols-3 gap-3">
                  {(['Standard', 'High', 'Maximum'] as CompressionLevel[]).map((level) => (
                    <button key={level} onClick={() => setCompLevel(level)} className={`p-4 rounded-xl border text-xs font-bold transition-all ${compLevel === level ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600'}`}>{level}</button>
                  ))}
                </div>
              )}

              {tool.id === 'pdf-img-to-excel' && (
                <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Document Language</label>
                  <select 
                    value={ocrLang}
                    onChange={(e) => setOcrLang(e.target.value)}
                    className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>
              )}

              <button onClick={processFile} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all">
                {tool.id === 'ai-menu-fixer' ? 'Apply Enterprise Formatting' : 'Start Processing Now'}
              </button>
            </div>
          )}
        </div>
      )}

      {processing.status === 'processing' && (
        <div className="py-16 text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
          <h3 className="text-xl font-bold text-slate-900">{processing.message}</h3>
          <p className="text-slate-400 text-sm mt-2 italic">Converting your enterprise documents...</p>
        </div>
      )}

      {processing.status === 'success' && (
        <div className="py-10 text-center animate-in bounce-in">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✓</div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Task Completed!</h3>
          <div className="bg-slate-50 p-6 rounded-2xl mb-8 text-left border border-slate-100 max-h-48 overflow-auto">
            <p className="text-slate-600 text-sm whitespace-pre-wrap">{processing.details}</p>
          </div>
          <div className="flex gap-4">
            {processing.resultBlob && <button onClick={handleDownload} className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl">📥 Download Result</button>}
            <button onClick={() => { setProcessing({ status: 'idle', message: '' }); setFiles([]); }} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-2xl">🔄 New Task</button>
          </div>
        </div>
      )}

      {processing.status === 'error' && (
        <div className="py-12 text-center animate-in shake">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">!</div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Error Occurred</h3>
          <p className="text-slate-500 mb-10">{processing.details}</p>
          <button onClick={() => setProcessing({ status: 'idle', message: '' })} className="w-full max-w-xs bg-slate-900 text-white font-bold py-4 rounded-2xl">Try Again</button>
        </div>
      )}
    </div>
  );
};
