// ไฟล์หลักของแอปพลิเคชัน - Market Basket Analysis เท่านั้น
import React, { useState } from 'react';                            // นำเข้า React และ hook useState สำหรับจัดการ state ภายในแอป
import Header from './components/Header';                           // นำเข้าคอมโพเนนต์ส่วนหัว (แถบเมนู/แบรนด์)
import Hero from './components/Hero';                               // นำเข้าคอมโพเนนต์หน้า Hero (หน้าลงจอด/คำโปรย/ปุ่มเริ่ม)
import FileUpload from './components/FileUpload';                   // นำเข้าคอมโพเนนต์อัปโหลดไฟล์ไปยัง Flask backend
import ColumnSelector from './components/ColumnSelector';           // นำเข้าคอมโพเนนต์เลือกคอลัมน์ที่จะใช้ในการวิเคราะห์
import DataProcessor from './components/DataProcessor';             // นำเข้าคอมโพเนนต์เรียก /api/process เพื่อประมวลผล
import ResultsDownload from './components/ResultsDownload';         // นำเข้าคอมโพเนนต์พรีวิวผลลัพธ์และดาวน์โหลดไฟล์

// กำหนดชนิดของสถานะหน้า/ขั้นตอนในแอป (ฟลว์แบบ step-by-step)
type AppStage = 'landing' | 'upload' | 'select' | 'process' | 'download';

function App() {
  // currentStage: ระบุว่าอยู่ขั้นตอนไหนของฟลว์ (หน้าแรก, อัปโหลด, เลือกคอลัมน์, ประมวลผล, ดาวน์โหลด)
  const [currentStage, setCurrentStage] = useState<AppStage>('landing');
  // uploadedFile: เก็บอ็อบเจ็กต์ไฟล์ที่ผู้ใช้อัปโหลด (DOM File) เพื่ออ้างอิงในฝั่งหน้าเว็บ (ไม่ใช้ส่ง backend ที่นี่)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  // uploadedFileName: เก็บชื่อไฟล์ที่ backend เซฟไว้ (Flask ส่งกลับจาก /api/upload) ใช้ต่อใน /api/process
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  // excelData: ข้อมูลพรีวิวที่ backend ส่งกลับมาเป็น [headers, ...rows] ใช้แสดงใน ColumnSelector
  const [excelData, setExcelData] = useState<any[][]>([]);
  // selectedColumns: ดัชนีคอลัมน์ที่ผู้ใช้เลือกเพื่อส่งให้ backend ประมวลผล
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  // processedData: อ็อบเจ็กต์ผลลัพธ์รวมจาก /api/process (มี results, summary, outputFiles ฯลฯ)
  const [processedData, setProcessedData] = useState<any>(null);
  // downloadUrls: รายชื่อไฟล์ที่ backend สร้างไว้สำหรับดาวน์โหลด เช่น { excel: 'xxx.xlsx', csv: 'yyy.csv' }
  const [downloadUrls, setDownloadUrls] = useState<any>({});

  // handleGetStarted: ถูกส่งลงไปยัง Hero → เมื่อผู้ใช้กด "Start Analysis" จะเปลี่ยนขั้นไปหน้าอัปโหลด
  const handleGetStarted = () => {
    setCurrentStage('upload');
  };

  // handleFileUploaded: callback ที่ส่งให้ FileUpload → เรียกเมื่อ /api/upload สำเร็จ
  // - รับ file (DOM), data (พรีวิว 2D array), filename (ชื่อไฟล์ที่เซฟในเซิร์ฟเวอร์)
  const handleFileUploaded = (file: File, data: any[][], filename: string) => {
    setUploadedFile(file);                // เก็บไฟล์ไว้เผื่อแสดงผลฝั่ง UI
    setUploadedFileName(filename);        // เก็บชื่อไฟล์ฝั่งเซิร์ฟเวอร์ไว้ใช้ในขั้น process
    setExcelData(data);                   // เก็บพรีวิวข้อมูลไว้ให้ ColumnSelector แสดง
    setCurrentStage('select');            // ไปขั้นตอน "เลือกคอลัมน์"
  };

  // handleColumnsSelected: callback ที่ส่งให้ ColumnSelector → รับดัชนีคอลัมน์ที่ผู้ใช้เลือก
  const handleColumnsSelected = (columns: number[]) => {
    setSelectedColumns(columns);          // บันทึกคอลัมน์ที่เลือก
    setCurrentStage('process');           // ไปขั้นตอน "ประมวลผล"
  };

  // handleProcessingComplete: callback ที่ส่งให้ DataProcessor → เรียกเมื่อ /api/process เสร็จ
  // - รับข้อมูลผลลัพธ์ทั้งหมด (data) และรายชื่อไฟล์สำหรับดาวน์โหลด (urls)
  const handleProcessingComplete = (data: any, urls: any) => {
    setProcessedData(data);               // เก็บผลลัพธ์รวมจากแบ็กเอนด์
    setDownloadUrls(urls);                // เก็บชื่อไฟล์สำหรับดาวน์โหลด (excel/csv)
    setCurrentStage('download');          // ไปขั้นตอน "ดาวน์โหลดผลลัพธ์"
  };

  // resetToStart: ปุ่มเริ่มใหม่หลังดาวน์โหลด/จบฟลว์ (รีเซ็ตทุก state กลับค่าเริ่มต้น)
  const resetToStart = () => {
    setCurrentStage('landing');           // กลับหน้าแรก
    setUploadedFile(null);                // ล้างไฟล์
    setUploadedFileName('');              // ล้างชื่อไฟล์ฝั่งเซิร์ฟเวอร์
    setExcelData([]);                     // ล้างข้อมูลพรีวิว
    setSelectedColumns([]);               // ล้างคอลัมน์ที่เลือก
    setProcessedData(null);               // ล้างผลลัพธ์
    setDownloadUrls({});                  // ล้างลิงก์ดาวน์โหลด
  };

  // goBackToPreviousStep: ปุ่ม "ย้อนกลับ" ในแต่ละขั้น → ย้อนทีละสเต็ปตามลอจิกนี้
  const goBackToPreviousStep = () => {
    switch (currentStage) {
      case 'upload':
        setCurrentStage('landing');       // จากอัปโหลด → ย้อนกลับไปหน้าแรก
        break;
      case 'select':
        setCurrentStage('upload');        // จากเลือกคอลัมน์ → ย้อนกลับไปอัปโหลด
        break;
      case 'process':
        setCurrentStage('select');        // จากประมวลผล → ย้อนกลับไปเลือกคอลัมน์
        break;
      case 'download':
        setCurrentStage('process');       // จากดาวน์โหลด → ย้อนกลับไปประมวลผล (เพื่อไล่เช็กสถานะ/แก้คอลัมน์ใหม่)
        break;
      default:
        break;                            // กรณีอื่น ๆ ไม่ทำอะไร
    }
  };

  return (
    <>
      {/* พื้นหลังหลักของทั้งแอป (gradient อ่อน ๆ) ครอบ Header, main, Footer */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Header />                         {/* แถบหัวของระบบ: โลโก้/เมนู (Upload / Analyze / Download) */}

        <main className="relative">        {/* โซนเนื้อหาหลัก */}
          {/* Background Pattern (ตกแต่งพื้นหลังด้วยวงกลมไล่สีและเบลอ) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-r from-blue-400/20 to-emerald-400/20 blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-r from-emerald-400/20 to-orange-400/20 blur-3xl"></div>
          </div>

          {/* ชั้นคอนเทนต์จริง (อยู่เหนือพื้นหลัง) */}
          <div className="relative z-10">
            {currentStage === 'landing' && (             // ถ้าอยู่หน้าแรก → แสดง Hero พร้อมปุ่มเริ่ม
              <Hero onGetStarted={handleGetStarted} />  // ส่ง callback ให้ Hero เรียกเมื่อกด "Start Analysis"
            )}

            {currentStage === 'upload' && (              // ขั้นตอนอัปโหลดไฟล์
              <div className="py-20">
                <div className="max-w-4xl mx-auto px-6 mb-4">
                  <button
                    onClick={goBackToPreviousStep}       // ปุ่มย้อนกลับ (กลับหน้า landing)
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span>←</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                <FileUpload onFileUploaded={handleFileUploaded} />  {/* เรนเดอร์คอมโพเนนต์อัปโหลดไฟล์ → เมื่อสำเร็จ callback จะพาไป select */}
              </div>
            )}

            {currentStage === 'select' && (              // ขั้นตอนเลือกคอลัมน์ที่จะใช้วิเคราะห์
              <div className="py-20">
                <div className="max-w-6xl mx-auto px-6 mb-4">
                  <button
                    onClick={goBackToPreviousStep}       // ปุ่มย้อนกลับ (กลับหน้า upload)
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span>←</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                <ColumnSelector 
                  data={excelData}                       // ส่งข้อมูลพรีวิว (headers + ตัวอย่างแถว) ให้ผู้ใช้เลือกคอลัมน์
                  onColumnsSelected={handleColumnsSelected} // เมื่อเลือกเสร็จ → เปลี่ยนไปขั้น process พร้อมเก็บ index คอลัมน์
                />
              </div>
            )}

            {currentStage === 'process' && (             // ขั้นตอนเรียกแบ็กเอนด์ให้ประมวลผล Apriori/Rules
              <div className="py-20">
                <div className="max-w-4xl mx-auto px-6 mb-4">
                  <button
                    onClick={goBackToPreviousStep}       // ปุ่มย้อนกลับ (กลับหน้า select)
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span>←</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                <DataProcessor
                  selectedColumns={selectedColumns}      // ส่ง index คอลัมน์ที่เลือก
                  originalData={excelData}               // (ตัวนี้ไม่ค่อยถูกใช้ในฝั่ง DataProcessor จริง ๆ แต่ส่งไว้สำหรับสรุปตัวเลข)
                  uploadedFileName={uploadedFileName}    // ส่งชื่อไฟล์ที่เซิร์ฟเวอร์เซฟ เพื่อให้แบ็กเอนด์รู้จะประมวลผลไฟล์ไหน
                  onProcessingComplete={handleProcessingComplete} // เมื่อ /api/process เสร็จ → รับผลลัพธ์และไฟล์ดาวน์โหลด
                />
              </div>
            )}

            {currentStage === 'download' && (            // ขั้นตอนแสดงผลลัพธ์ + ให้ดาวน์โหลดไฟล์
              <div className="py-20">
                <div className="max-w-4xl mx-auto px-6 mb-4">
                  <button
                    onClick={goBackToPreviousStep}       // ปุ่มย้อนกลับ (กลับหน้า process)
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <span>←</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
                <ResultsDownload 
                  processedData={processedData}          // ส่งผลลัพธ์รวม (รวมเมตริก, ตารางกฎ, meta)
                  downloadUrls={downloadUrls}            // ส่งชื่อไฟล์สำหรับดาวน์โหลด (excel/csv) ให้คอมโพเนนต์ไปยิง /api/download
                />
                <div className="text-center mt-8">
                  <button
                    onClick={resetToStart}               // ปุ่มเริ่มวิเคราะห์ไฟล์ใหม่ → รีเซ็ตทุกอย่างกลับหน้าแรก
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    ← Process Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer (ส่วนท้ายแบบโปร่งใส/เบลอเล็กน้อย) */}
        <footer className="bg-white/10 backdrop-blur-md border-t border-white/20 py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-600">
              {/* ใส่เครดิต/ลิขสิทธิ์/ลิงก์ได้ตามต้องการ */}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;                         // ส่งออกคอมโพเนนต์หลักของแอป
