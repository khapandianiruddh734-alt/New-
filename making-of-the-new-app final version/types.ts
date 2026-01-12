
export type ToolId = 
  | 'jpg-to-pdf' 
  | 'word-to-pdf' 
  | 'pdf-to-jpg' 
  | 'compress-pdf' 
  | 'excel-to-pdf' 
  | 'clean-excel' 
  | 'duplicate-remover' 
  | 'pdf-img-to-excel' 
  | 'ai-menu-fixer'
  | 'ai-document-summary';

export interface Tool {
  id: ToolId;
  title: string;
  description: string;
  icon: string;
  category: 'PDF' | 'Data' | 'AI';
  accept: string;
  multiple?: boolean;
  color: string;
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message: string;
  details?: string;
  resultBlob?: Blob;
  resultFilename?: string;
}

export interface DuplicateOptions {
  criteria: 'row' | 'col1';
  mode: 'highlight' | 'remove';
}

export type CompressionLevel = 'Standard' | 'High' | 'Maximum';

export interface OCRConfig {
  language: string;
}

export interface ApiLog {
  id: string;
  timestamp: number;
  tool: string;
  model: string;
  status: 'success' | 'error';
  latency: number;
  fileCount: number;
  fileFormats: string[];
  errorMessage?: string;
  isAlert?: boolean;
}

export interface AdminSettings {
  alertEmail: string;
  threshold: number;
  lastAlertSent?: number;
}
