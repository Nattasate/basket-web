import { api } from '../lib/api';
// คอมโพเนนต์สำหรับอัปโหลดไฟล์ - Market Basket Analysis
import React, { useCallback, useState, useEffect } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileUploaded: (file: File, data: any[][], filename: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(api('/api/health'));
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch (error) {
      console.log('Backend connection error:', error);
      setBackendStatus('disconnected');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      await checkBackendStatus();
      await new Promise(resolve => setTimeout(resolve, 100));

      const formData = new FormData();
      formData.append('file', file);
      
      console.log(`Uploading file to Market Basket Analysis backend...`);
      
      const uploadResponse = await fetch(api('/api/upload'), {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await uploadResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await uploadResponse.json();
      console.log('Upload successful:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      if (!result.data) {
        throw new Error('Invalid data format received from server');
      }
      
      const dataToUse = result.data;
      
      if (!Array.isArray(dataToUse) || dataToUse.length === 0) {
        throw new Error('No data received from server');
      }
      
      onFileUploaded(file, dataToUse, result.filename);
      setUploadedFile(file);
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Please check your file and try again';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
        setError('Cannot connect to Flask backend. Please make sure the backend server is running on http://localhost:5000');
      } else if (errorMessage.includes('JSON')) {
        setError('Server response error. Please check the backend logs and try again.');
      } else {
        setError(`Upload failed: ${errorMessage}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const dataFile = files.find(file => 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv')
    );
    
    if (dataFile) {
      processFile(dataFile);
    } else {
      setError('กรุณาอัปโหลดไฟล์ Excel (.xlsx, .xls) หรือไฟล์ CSV สำหรับ Market Basket Analysis');
    }
  }, [onFileUploaded]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [onFileUploaded]);

  const removeFile = () => {
    setUploadedFile(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🛒 Upload Your Transaction Data</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload your transaction data for Market Basket Analysis. Supported formats: .xlsx, .xls, .csv
          <br />
          <span className="text-sm text-emerald-600 font-medium">
            Expected columns: transaction_id, item_description, product_name, etc.
          </span>
        </p>
        
        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium mt-2 ${
          backendStatus === 'connected' 
            ? 'bg-green-100 text-green-800' 
            : backendStatus === 'disconnected'
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            backendStatus === 'connected' 
              ? 'bg-green-500' 
              : backendStatus === 'disconnected'
              ? 'bg-red-500'
              : 'bg-yellow-500 animate-pulse'
          }`}></div>
          <span>
            {backendStatus === 'connected' && 'Backend Connected'}
            {backendStatus === 'disconnected' && 'Backend Disconnected'}
            {backendStatus === 'checking' && 'Checking Backend...'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4 text-red-500 hover:text-red-700" />
          </button>
        </div>
      )}

      {!uploadedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50 scale-105'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          
          <div className="space-y-4">
            {isProcessing ? (
              <div className="animate-spin mx-auto w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            ) : (
              <Upload className={`mx-auto h-12 w-12 ${isDragOver ? 'text-emerald-500' : 'text-gray-400'}`} />
            )}
            
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {isProcessing ? 'กำลังอัปโหลดไฟล์...' : 'วางไฟล์ข้อมูลการซื้อที่นี่'}
              </p>
              <p className="text-gray-500 mt-2">
                {isProcessing ? 'กรุณารอสักครู่ขณะที่เราอัปโหลดไฟล์ของคุณ' : 'หรือคลิกเพื่อเลือกไฟล์'}
              </p>
              <p className="text-sm text-emerald-600 mt-2">
                💡 ไฟล์ควรมี transaction_id และ item_description
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadedFile && !isProcessing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-semibold text-green-900">อัปโหลดไฟล์สำเร็จ!</p>
                <p className="text-green-700 text-sm">{uploadedFile.name}</p>
                <p className="text-xs text-green-600 mt-1">พร้อมสำหรับ Market Basket Analysis</p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;