import { api } from '../lib/api';
import { normalizeDownloadMap } from '../lib/downloads';
// คอมโพเนนต์สำหรับประมวลผล Market Basket Analysis
import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Cog, BarChart3, TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react';

interface DataProcessorProps {
  selectedColumns: number[];
  originalData: any[][];
  uploadedFileName: string;
  onProcessingComplete: (processedData: any, downloadUrls: any) => void;
}

const DataProcessor: React.FC<DataProcessorProps> = ({
  selectedColumns,
  originalData,
  uploadedFileName,
  onProcessingComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processingSteps = [
    { name: 'Connecting to Server', description: 'Establishing connection with Flask backend', icon: CheckCircle },
    { name: 'Data Validation', description: 'Validating uploaded data structure', icon: Cog },
    { name: 'Column Processing', description: 'Processing selected columns', icon: Cog },
    { name: 'Basket Analysis', description: 'Running Market Basket Analysis with mlxtend', icon: ShoppingCart },
    { name: 'Association Rules', description: 'Generating association rules and metrics', icon: TrendingUp },
    { name: 'File Preparation', description: 'Preparing Excel and CSV downloads', icon: BarChart3 }
  ];

  useEffect(() => {
    const processDataWithBackend = async () => {
      setIsProcessing(true);
      setError(null);
      
      try {
        // Step 1: Connecting to Server
        setCurrentStep(1);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 2-3: Data Validation and Column Processing
        setCurrentStep(2);
        await new Promise(resolve => setTimeout(resolve, 800));
        setCurrentStep(3);
        await new Promise(resolve => setTimeout(resolve, 600));

        // Step 4-6: Send request to Flask backend
        setCurrentStep(4);
        
        const response = await fetch(api('/api/process'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: uploadedFileName,
            selectedColumns: selectedColumns
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Processing failed');
        }

        setCurrentStep(5);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = await response.json();
        
        setCurrentStep(6);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Ensure output files are always present
        const normalizedDownloadUrls = normalizeDownloadMap(
          result?.downloadUrls,
          result?.outputFiles,
          result?.results?.downloadUrls,
          result?.results?.outputFiles
        );

        if (Object.keys(normalizedDownloadUrls).length === 0) {
          console.warn('No download files received from backend');
        }

        const augmentedResult = {
          ...result,
          downloadUrls: normalizedDownloadUrls,
          outputFiles: {
            ...(result?.outputFiles ?? {}),
            ...normalizedDownloadUrls
          },
          results: result?.results
            ? {
                ...result.results,
                downloadUrls: {
                  ...(result.results?.downloadUrls ?? {}),
                  ...normalizedDownloadUrls
                },
                outputFiles: {
                  ...(result.results?.outputFiles ?? {}),
                  ...normalizedDownloadUrls
                }
              }
            : result?.results
        };

        setIsComplete(true);
        onProcessingComplete(augmentedResult, normalizedDownloadUrls);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        console.error('Processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    processDataWithBackend();
  }, [selectedColumns, uploadedFileName, onProcessingComplete]);

  // แสดงข้อผิดพลาดถ้ามี
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-900 mb-2">Market Basket Analysis Error</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="bg-red-100 rounded-lg p-4 text-left">
            <h4 className="font-semibold text-red-800 mb-2">Troubleshooting Tips:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Make sure Flask backend is running on http://localhost:5000</li>
              <li>• Check that mlxtend library is installed (pip install mlxtend)</li>
              <li>• Verify your data has transaction_id and item columns</li>
              <li>• Try with a smaller dataset first</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🛒 Market Basket Analysis</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          กำลังวิเคราะห์ความสัมพันธ์ของสินค้าและรูปแบบการซื้อด้วย Advanced Apriori Algorithm
        </p>
      </div>

      {/* Analysis Info Card */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 mb-8 border border-emerald-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Market Basket Analysis</h3>
            <p className="text-gray-600">Processing {selectedColumns.length} columns with mlxtend library</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">🔍 Association Rules</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">📊 Support & Confidence</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">📈 Lift & Metrics</p>
          </div>
        </div>
      </div>

      {/* Processing Steps */}
      <div className="space-y-4 mb-8">
        {processingSteps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep - 1 && !isComplete && !error;
          const isCompleted = (index < currentStep - 1) || (isComplete && index <= currentStep - 1);
          const isPending = index >= currentStep && !isComplete && !error;
          
          return (
            <div
              key={index}
              className={`flex items-center p-4 rounded-lg border transition-all duration-500 ${
                isActive
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg transform scale-105'
                  : isCompleted
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-full mr-4 ${
                isActive
                  ? 'bg-emerald-500 text-white animate-pulse'
                  : isCompleted
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-500'
              }`}>
                <StepIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  isActive ? 'text-emerald-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                }`}>
                  {step.name}
                </h3>
                <p className={`text-sm ${
                  isActive ? 'text-emerald-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
              </div>
              <div className="ml-4 flex h-8 w-8 items-center justify-center">
                {isActive && (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                )}
                {!isActive && isCompleted && (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                )}
                {!isActive && isPending && (
                  <Clock className="h-6 w-6 text-blue-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Processing Progress</span>
          <span>{Math.round((currentStep / processingSteps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / processingSteps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center animate-fade-in">
          <div className="bg-green-500 p-3 rounded-full w-fit mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-green-900 mb-2">🛒 Market Basket Analysis Complete!</h3>
          <p className="text-green-700 mb-4">
            Association rules have been generated successfully and are ready for download.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/70 rounded-lg p-3">
              <p className="font-semibold text-gray-700">Rows Processed</p>
              <p className="text-2xl font-bold text-green-600">{originalData.length - 1}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <p className="font-semibold text-gray-700">Columns Selected</p>
              <p className="text-2xl font-bold text-blue-600">{selectedColumns.length}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <p className="font-semibold text-gray-700">Analysis Status</p>
              <p className="text-2xl font-bold text-emerald-600">✓ Ready</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataProcessor;
