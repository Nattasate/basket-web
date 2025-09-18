import { api } from '../lib/api';                                 // นำเข้า helper api() สำหรับต่อท้าย base URL ของแบ็กเอนด์ เช่น http://localhost:5000
// คอมโพเนนต์สำหรับอัปโหลดไฟล์ - Market Basket Analysis
import React, { useCallback, useState, useEffect } from 'react';  // นำเข้า React และ hooks: useState/useEffect/useCallback
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'; // ไอคอน UI จากไลบรารี lucide-react
// หมายเหตุ: การ import ชื่อ "File" (ไอคอน) อาจชนชื่อชนิด DOM File ใน TypeScript ถ้าตั้ง strict type; ถ้าจำเป็นควร alias เช่น { File as FileIcon }

interface FileUploadProps {
  onFileUploaded: (file: File, data: any[][], filename: string) => void; // ฟังก์ชัน callback ที่พาเรนต์ส่งมา เมื่ออัปโหลดสำเร็จ
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded }) => {  // คอมโพเนนต์อัปโหลดไฟล์หลัก รับพร็อพ onFileUploaded

  const [isDragOver, setIsDragOver] = useState(false);                   // state: อยู่ในสถานะลากไฟล์ค้างบน dropzone หรือไม่ (ไว้เปลี่ยนสไตล์เส้นประ)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);   // state: เก็บไฟล์ที่อัปโหลดสำเร็จ (DOM File)
  const [isProcessing, setIsProcessing] = useState(false);               // state: กำลังอัปโหลด/ประมวลผลอยู่หรือไม่ (แสดง spinner/ปิดปุ่ม)
  const [error, setError] = useState<string | null>(null);               // state: ข้อความผิดพลาดล่าสุด (ถ้ามี)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking'); 
                                                                         // state: สถานะการเชื่อมต่อแบ็กเอนด์ (/api/health)

  useEffect(() => {                                                       // เมื่อคอมโพเนนต์ถูก mount ครั้งแรก
    checkBackendStatus();                                                 // เรียกตรวจสุขภาพแบ็กเอนด์ (health check)
  }, []);                                                                 // ทำครั้งเดียว

  const checkBackendStatus = async () => {                                // ฟังก์ชัน async: ตรวจว่า Flask backend ออนไลน์ไหม
    try {
      const response = await fetch(api('/api/health'));                   // เรียก GET /api/health (Flask ส่ง JSON {status:'healthy',...})
      if (response.ok) {                                                  // ถ้า HTTP 200-299
        setBackendStatus('connected');                                    // ปักธง “connected” (แสดงป้ายเขียว)
      } else {
        setBackendStatus('disconnected');                                 // ถ้าไม่ ok → ถือว่า “disconnected”
      }
    } catch (error) {
      console.log('Backend connection error:', error);                    // log ข้อผิดพลาดไว้ดีบัก
      setBackendStatus('disconnected');                                   // เครือข่ายล้มเหลว → ถือว่า “disconnected”
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {            // ฮุกจัดการเมื่อมีการลากไฟล์มาค้างบน dropzone
    e.preventDefault();                                                   // ป้องกันเบราว์เซอร์เปิดไฟล์แทน
    setIsDragOver(true);                                                  // เปิดสไตล์ “ลากอยู่”
  }, []);                                                                 // ไม่มี dependency

  const handleDragLeave = useCallback((e: React.DragEvent) => {           // ฮุกเมื่อเมาส์/ไฟล์ลากออกจากพื้นที่ dropzone
    e.preventDefault();                                                   // ป้องกันพฤติกรรมดีฟอลต์
    setIsDragOver(false);                                                 // ปิดสไตล์ “ลากอยู่”
  }, []);                                                                 // ไม่มี dependency

  const processFile = async (file: File) => {                             // ฟังก์ชันหลัก: อัปโหลดไฟล์ไปแบ็กเอนด์ แล้วส่งข้อมูลพรีวิวกลับให้พาเรนต์
    setIsProcessing(true);                                                // เปิดสถานะกำลังทำงาน
    setError(null);                                                       // ล้าง error เก่า
    
    try {
      await checkBackendStatus();                                         // ตรวจสถานะแบ็กเอนด์ก่อน (เชิง UX)
      await new Promise(resolve => setTimeout(resolve, 100));             // หน่วงสั้น ๆ ให้ Badge/Spinner มีเวลาอัปเดต

      const formData = new FormData();                                    // สร้าง FormData สำหรับ multipart/form-data
      formData.append('file', file);                                      // แนบไฟล์ภายใต้คีย์ 'file' ให้ตรงกับ Flask ที่อ่าน request.files['file']
      
      console.log(`Uploading file to Market Basket Analysis backend...`); // log ฝั่ง client

      const uploadResponse = await fetch(api('/api/upload'), {            // POST /api/upload (Flask จะเซฟไฟล์เข้า /uploads และอ่าน DataFrame)
        method: 'POST',
        body: formData,                                                   // ไม่ต้องตั้ง Content-Type เอง ให้เบราว์เซอร์ตั้ง boundary ให้
      });

      console.log('Upload response status:', uploadResponse.status);      // log สถานะ HTTP
      
      if (!uploadResponse.ok) {                                           // ถ้าอัปโหลดไม่สำเร็จ (4xx/5xx)
        let errorMessage = 'Upload failed';                               // เตรียมข้อความดีฟอลต์
        try {
          const errorData = await uploadResponse.json();                  // พยายามอ่าน JSON error จากเซิร์ฟเวอร์
          errorMessage = errorData.error || errorMessage;                 // ใช้ข้อความ error ที่ส่งมาถ้ามี
        } catch (e) {
          errorMessage = `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`; // ถ้า parse JSON ไม่ได้ สร้างข้อความจากสถานะ
        }
        throw new Error(errorMessage);                                     // โยน Error ออกไปให้ catch ด้านล่างจัดการ
      }

      const result = await uploadResponse.json();                          // อ่านผลลัพธ์ JSON จาก /api/upload
      console.log('Upload successful:', result);                           // log ผล

      if (!result.success) {                                               // เซิร์ฟเวอร์แจ้งไม่ success
        throw new Error(result.error || 'Upload failed');                  // โยน Error พร้อมข้อความ
      }
      
      if (!result.data) {                                                  // โครงสร้างข้อมูลไม่ถูก (ต้องมี data เป็น [headers, ...rows])
        throw new Error('Invalid data format received from server');       // แจ้งโครงสร้างผิด
      }
      
      const dataToUse = result.data;                                       // เก็บข้อมูลพรีวิว (แถวแรก headers, ถัดไปคือ rows)
      
      if (!Array.isArray(dataToUse) || dataToUse.length === 0) {           // ตรวจความสมเหตุสมผลเบื้องต้น
        throw new Error('No data received from server');                   // ไม่มีข้อมูลเลย
      }
      
      onFileUploaded(file, dataToUse, result.filename);                    // แจ้งพาเรนต์ว่าอัปโหลดสำเร็จ + ส่ง data และชื่อไฟล์ที่เซฟใน /uploads
      setUploadedFile(file);                                               // เก็บไฟล์ไว้ใน state เพื่อแสดงการ์ด “อัปโหลดสำเร็จ”
    } catch (err) {
      console.error('Upload error:', err);                                 // log สำหรับดีบัก
      const errorMessage = err instanceof Error ? err.message : 'Please check your file and try again'; // สร้างข้อความ error ที่อ่านง่าย
      
      if (errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {                     // เคสเครือข่ายล้มเหลว
        setError('Cannot connect to Flask backend. Please make sure the backend server is running on http://localhost:5000');
      } else if (errorMessage.includes('JSON')) {                          // เคส response/parse JSON ล้มเหลว
        setError('Server response error. Please check the backend logs and try again.');
      } else {
        setError(`Upload failed: ${errorMessage}`);                        // อื่น ๆ แสดงข้อความที่ได้มา
      }
    } finally {
      setIsProcessing(false);                                              // ปิดสถานะกำลังประมวลผล ไม่ว่าผลจะสำเร็จ/ล้มเหลว
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {                 // เมื่อผู้ใช้ “ปล่อย” ไฟล์ลงบน dropzone
    e.preventDefault();                                                    // ป้องกันการเปิดไฟล์โดยเบราว์เซอร์
    setIsDragOver(false);                                                  // ปิดโหมดลากอยู่
    
    const files = Array.from(e.dataTransfer.files);                        // แปลง FileList → Array<File>
    const dataFile = files.find(file =>                                    // หาไฟล์แรกที่เป็นนามสกุลที่รองรับ
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv')
    );
    
    if (dataFile) {                                                         // ถ้าเจอไฟล์ที่รองรับ
      processFile(dataFile);                                                // ส่งไปอัปโหลด/อ่านข้อมูลที่แบ็กเอนด์
    } else {
      setError('กรุณาอัปโหลดไฟล์ Excel (.xlsx, .xls) หรือไฟล์ CSV สำหรับ Market Basket Analysis'); // แจ้งผู้ใช้ว่าไฟล์ไม่ตรงชนิด
    }
  }, [onFileUploaded]);                                                     // ผูก dependency กับ onFileUploaded (แม้ไม่ได้ใช้ตรง ๆ ในฟังก์ชันนี้)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { // เมื่อผู้ใช้คลิกเลือกไฟล์ผ่าน input type="file"
    const file = e.target.files?.[0];                                       // ดึงไฟล์แรกจากตัวเลือก
    if (file) {
      processFile(file);                                                    // ส่งไปประมวลผล/อัปโหลด
    }
  }, [onFileUploaded]);                                                     // dependency เช่นเดียวกัน

  const removeFile = () => {                                                // ฟังก์ชันล้างสถานะไฟล์อัปโหลดสำเร็จ (กลับไปอัปโหลดใหม่ได้)
    setUploadedFile(null);                                                  // เอาไฟล์ออก
    setError(null);                                                         // ล้าง error (ถ้ามี)
  };

  return (                                                                  // เริ่มส่วนแสดงผล UI
    <div className="max-w-4xl mx-auto p-6">                                 {/* คอนเทนเนอร์หลัก กึ่งกลาง กำหนด padding */}
      <div className="text-center mb-8">                                    {/* ส่วนหัว/คำอธิบาย */}
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
        }`}>                                                                {/* ป้ายแสดงสถานะแบ็กเอนด์ (เชื่อมต่อ/ตัด/กำลังเช็ค) */}
          <div className={`w-2 h-2 rounded-full ${
            backendStatus === 'connected' 
              ? 'bg-green-500' 
              : backendStatus === 'disconnected'
              ? 'bg-red-500'
              : 'bg-yellow-500 animate-pulse'
          }`}></div>                                                         {/* จุดไฟสถานะ (กระพริบตอน checking) */}
          <span>
            {backendStatus === 'connected' && 'Backend Connected'}
            {backendStatus === 'disconnected' && 'Backend Disconnected'}
            {backendStatus === 'checking' && 'Checking Backend...'}
          </span>
        </div>
      </div>

      {error && (                                                           // ถ้ามี error → แสดงกล่องแจ้งเตือนสีแดง
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />    {/* ไอคอนแจ้งเตือน */}
          <span className="text-red-700">{error}</span>                     {/* ข้อความผิดพลาด */}
          <button onClick={() => setError(null)} className="ml-auto">       {/* ปุ่มปิดข้อความผิดพลาด */}
            <X className="h-4 w-4 text-red-500 hover:text-red-700" />
          </button>
        </div>
      )}

      {!uploadedFile && (                                                   // ถ้ายังไม่มีไฟล์อัปโหลดสำเร็จ → แสดง dropzone ให้อัปโหลด
        <div
          onDragOver={handleDragOver}                                       // กำหนดอีเวนต์ลากไฟล์มาเหนือพื้นที่
          onDragLeave={handleDragLeave}                                     // ออกจากพื้นที่
          onDrop={handleDrop}                                               // ปล่อยไฟล์ลงพื้นที่
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50 scale-105'                // ระหว่างลากไฟล์อยู่: เส้นเขียว/พื้นหลังเขียวอ่อน/ขยายเล็กน้อย
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'   // ปกติ: เส้นเทา และ hover ให้เปลี่ยนเฉด
          }`}
        >
          <input
            type="file"                                                     // input ไฟล์
            accept=".xlsx,.xls,.csv"                                        // รับเฉพาะ Excel/CSV
            onChange={handleFileSelect}                                     // เมื่อผู้ใช้เลือกไฟล์จาก dialog
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" // input โปร่งใสครอบทั้งกล่อง (ให้คลิกได้ทั้งพื้นที่)
            disabled={isProcessing}                                         // ขณะกำลังอัปโหลด ปิดการเลือก
          />
          
          <div className="space-y-4">                                       {/* เนื้อหาภายใน dropzone */}
            {isProcessing ? (                                               // ระหว่างกำลังอัปโหลด
              <div className="animate-spin mx-auto w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            ) : (
              <Upload className={`mx-auto h-12 w-12 ${isDragOver ? 'text-emerald-500' : 'text-gray-400'}`} />
            )}
            
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {isProcessing ? 'กำลังอัปโหลดไฟล์...' : 'วางไฟล์ข้อมูลการซื้อที่นี่'}  {/* เปลี่ยนข้อความตามสถานะ */}
              </p>
              <p className="text-gray-500 mt-2">
                {isProcessing ? 'กรุณารอสักครู่ขณะที่เราอัปโหลดไฟล์ของคุณ' : 'หรือคลิกเพื่อเลือกไฟล์'}
              </p>
              <p className="text-sm text-emerald-600 mt-2">
                💡 ไฟล์ควรมี transaction_id และ item_description            {/* คำแนะนำให้ผู้ใช้เตรียมคอลัมน์ที่จำเป็น */}
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadedFile && !isProcessing && (                                   // ถ้าอัปโหลดสำเร็จ และไม่ได้กำลังประมวลผล
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500" />            {/* ไอคอนติ๊กถูก */}
              <div>
                <p className="font-semibold text-green-900">อัปโหลดไฟล์สำเร็จ!</p>
                <p className="text-green-700 text-sm">{uploadedFile.name}</p> {/* แสดงชื่อไฟล์ที่อัปโหลด */}
                <p className="text-xs text-green-600 mt-1">พร้อมสำหรับ Market Basket Analysis</p>
              </div>
            </div>
            <button
              onClick={removeFile}                                           // ปุ่มลบไฟล์ (รีเซ็ตสถานะเพื่ออัปโหลดใหม่)
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

export default FileUpload;                                                  // ส่งออกคอมโพเนนต์ให้พาเรนต์นำไปใช้
