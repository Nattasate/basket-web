// ไฟล์หลักของแอปพลิเคชัน - Market Basket Analysis เท่านั้น
import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import FileUpload from './components/FileUpload';
import ColumnSelector from './components/ColumnSelector';
import DataProcessor from './components/DataProcessor';
import ResultsDownload from './components/ResultsDownload';

type AppStage = 'landing' | 'upload' | 'select' | 'process' | 'download';

function App() {
  const [currentStage, setCurrentStage] = useState<AppStage>('landing');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [processedData, setProcessedData] = useState<any>(null);
  const [downloadUrls, setDownloadUrls] = useState<any>({});

  const handleGetStarted = () => {
    setCurrentStage('upload');
  };

  const handleFileUploaded = (file: File, data: any[][], filename: string) => {
    setUploadedFile(file);
    setUploadedFileName(filename);
    setExcelData(data);
    setCurrentStage('select');
  };

  const handleColumnsSelected = (columns: number[]) => {
    setSelectedColumns(columns);
    setCurrentStage('process');
  };

  const handleProcessingComplete = (data: any, urls: any) => {
    setProcessedData(data);
    setDownloadUrls(urls);
    setCurrentStage('download');
  };

  const resetToStart = () => {
    setCurrentStage('landing');
    setUploadedFile(null);
    setUploadedFileName('');
    setExcelData([]);
    setSelectedColumns([]);
    setProcessedData(null);
    setDownloadUrls({});
  };

  const goBackToPreviousStep = () => {
    switch (currentStage) {
      case 'upload':
        setCurrentStage('landing');
        break;
      case 'select':
        setCurrentStage('upload');
        break;
      case 'process':
        setCurrentStage('select');
        break;
      case 'download':
        setCurrentStage('process');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Header />
        
        <main className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-r from-blue-400/20 to-emerald-400/20 blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-r from-emerald-400/20 to-orange-400/20 blur-3xl"></div>
          </div>

          <div className="relative z-10">
            {currentStage === 'landing' && (
              <Hero onGetStarted={handleGetStarted} />
            )}

            {currentStage === 'upload' && (
              <div className="py-20">
                <div className="max-w-4xl mx-auto px-6 mb-4">
                  <button
                    onClick={goBackToPreviousStep}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span>←</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                <FileUpload onFileUploaded={handleFileUploaded} />
              </div>
            )}

            {currentStage === 'select' && (
              <div className="py-20">
                <div className="max-w-6xl mx-auto px-6 mb-4">
                  <button
                    onClick={goBackToPreviousStep}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span>←</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                <ColumnSelector 
                  data={excelData} 
                  onColumnsSelected={handleColumnsSelected} 
                />
              </div>
            )}

            {currentStage === 'process' && (
              <div className="py-20">
                <div className="max-w-4xl mx-auto px-6 mb-4">
                  <button
                    onClick={goBackToPreviousStep}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span>←</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                <DataProcessor
                  selectedColumns={selectedColumns}
                  originalData={excelData}
                  uploadedFileName={uploadedFileName}
                  onProcessingComplete={handleProcessingComplete}
                />
              </div>
            )}

            {currentStage === 'download' && (
              <div className="py-20">
                <div className="max-w-4xl mx-auto px-6 mb-4">
                  <button
                    onClick={goBackToPreviousStep}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span>←</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                <ResultsDownload 
                  processedData={processedData}
                  downloadUrls={downloadUrls}
                />
                <div className="text-center mt-8">
                  <button
                    onClick={resetToStart}
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    ← Process Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white/10 backdrop-blur-md border-t border-white/20 py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-600">
    
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;