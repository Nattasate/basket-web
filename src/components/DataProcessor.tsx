import { api } from '../lib/api';                                  // ยูทิลิตี้ประกอบ URL ของแบ็กเอนด์ (เช่น เติม base URL/พอร์ต)
                                                                    // ใช้ด้านล่างตอน fetch(api('/api/process'))

// คอมโพเนนต์สำหรับประมวลผล Market Basket Analysis
import React, { useState, useEffect } from 'react';                // React + hooks: useState สำหรับ state ภายใน, useEffect สำหรับ side-effect
import { CheckCircle, Clock, Cog, BarChart3, TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react';
                                                                    // ไอคอนสวย ๆ จาก lucide-react ที่ใช้ใน UI สเต็ป/แจ้งเตือน/เสร็จสิ้น

// โครงสร้างพร็อพที่คอมโพเนนต์นี้ต้องรับจากพาเรนต์
interface DataProcessorProps {
  selectedColumns: number[];                                       // ดัชนีคอลัมน์ที่ผู้ใช้เลือก (เช่น [0,2,5]) จาก ColumnSelector
  originalData: any[][];                                           // ข้อมูลดิบทั้งตารางแบบ array 2 มิติ (แถวแรกคือ header)
  uploadedFileName: string;                                        // ชื่อไฟล์ที่อัปโหลดและถูกเซฟไว้ในฝั่ง Flask (/uploads/...)
  onProcessingComplete: (processedData: any, downloadUrls: any) => void;
                                                                    // callback แจ้งพาเรนต์เมื่อประมวลผลเสร็จ: ส่งผลลัพธ์ JSON + ลิงก์ดาวน์โหลด
}

// ประกาศคอมโพเนนต์หลัก
const DataProcessor: React.FC<DataProcessorProps> = ({
  selectedColumns,                                                  // array ดัชนีคอลัมน์ที่เลือก
  originalData,                                                     // ข้อมูลดิบทั้งหมด (เพื่อโชว์จำนวนแถวที่ประมวลผลเมื่อเสร็จ)
  uploadedFileName,                                                 // ชื่อไฟล์ในโฟลเดอร์ uploads ของแบ็กเอนด์
  onProcessingComplete                                              // ฟังก์ชันจากพาเรนต์ไว้รับผลลัพธ์
}) => {
  const [currentStep, setCurrentStep] = useState(0);                // สเต็ปปัจจุบัน (เริ่ม 0) ใช้ขยับแถบความคืบหน้า + สไตล์แต่ละสเต็ป
  const [isComplete, setIsComplete] = useState(false);              // ธงว่าประมวลผลเสร็จแล้วหรือยัง
  const [error, setError] = useState<string | null>(null);          // เก็บข้อความผิดพลาดหากเกิดข้อผิดพลาดช่วงประมวลผล
  const [isProcessing, setIsProcessing] = useState(false);          // ธงกำลังประมวลผล (ใช้คุม UI ให้รู้สถานะ)

  // รายการสเต็ปสำหรับแสดงใน UI (ชื่อ/คำอธิบาย/ไอคอน)
  const processingSteps = [
    { name: 'Connecting to Server', description: 'Establishing connection with Flask backend', icon: CheckCircle },
    { name: 'Data Validation', description: 'Validating uploaded data structure', icon: Cog },
    { name: 'Column Processing', description: 'Processing selected columns', icon: Cog },
    { name: 'Basket Analysis', description: 'Running Market Basket Analysis with mlxtend', icon: ShoppingCart },
    { name: 'Association Rules', description: 'Generating association rules and metrics', icon: TrendingUp },
    { name: 'File Preparation', description: 'Preparing Excel and CSV downloads', icon: BarChart3 }
  ];
  // หมายเหตุ: แม้คำบรรยายจะพูดถึง mlxtend แต่ในแบ็กเอนด์ของโปรเจกต์คุณใช้ตัวขุดกฎแบบ flexible (pure Python)
  // อย่างไรก็ตาม ไม่มีผลกับ UI: แค่ข้อความสื่อสารผู้ใช้

  // เมื่อ selectedColumns / uploadedFileName / onProcessingComplete เปลี่ยน → เริ่มกระบวนการประมวลผลใหม่
  useEffect(() => {
    // ฟังก์ชัน async ที่คุมลำดับสเต็ปและเรียกแบ็กเอนด์
    const processDataWithBackend = async () => {
      setIsProcessing(true);                                        // เริ่มสถานะกำลังประมวลผล
      setError(null);                                               // ล้าง error เก่า

      try {
        // Step 1: Connecting to Server (จำลองเวลาเพื่อให้ UI ดูมีขั้นตอน)
        setCurrentStep(1);                                          // อัปเดตสเต็ปเป็น 1 (index ฐาน 1)
        await new Promise(resolve => setTimeout(resolve, 500));     // หน่วง 0.5s เพื่อแสดงแอนิเมชัน/ความคืบหน้า

        // Step 2-3: Data Validation and Column Processing (จำลองเช่นกัน)
        setCurrentStep(2);                                          // ไปสเต็ป 2: ตรวจรูปแบบข้อมูล
        await new Promise(resolve => setTimeout(resolve, 800));     // หน่วง 0.8s
        setCurrentStep(3);                                          // ไปสเต็ป 3: ประมวลผลคอลัมน์ที่เลือก
        await new Promise(resolve => setTimeout(resolve, 600));     // หน่วง 0.6s

        // Step 4-6: ส่งคำขอจริงไปยัง Flask backend เพื่อประมวลผล
        setCurrentStep(4);                                          // ไปสเต็ป 4: รัน Basket Analysis ฝั่งแบ็กเอนด์

        // เรียก endpoint /api/process (POST) พร้อมไฟล์ที่อัปโหลดและดัชนีคอลัมน์ที่เลือก
        const response = await fetch(api('/api/process'), {         // api() จะประกอบ base URL เช่น http://localhost:5000 + path
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',                     // แจ้งว่า payload เป็น JSON
          },
          body: JSON.stringify({
            filename: uploadedFileName,                             // ชื่อไฟล์ที่อัปโหลด (แบ็กเอนด์จะอ่านจากโฟลเดอร์ uploads)
            selectedColumns: selectedColumns                        // ดัชนีคอลัมน์ที่เลือก (แบ็กเอนด์จะ df.iloc[:, selectedColumns])
          })
        });

        if (!response.ok) {                                         // ถ้าสถานะ HTTP ไม่ใช่ 2xx ให้โยน error
          const errorData = await response.json();                  // พยายามอ่านข้อความ error จากแบ็กเอนด์
          throw new Error(errorData.error || 'Processing failed');  // สร้าง Error พร้อมข้อความ
        }

        setCurrentStep(5);                                          // ไปสเต็ป 5: สร้างกฎสมาคม/คำนวณเมตริกต่าง ๆ เสร็จ
        await new Promise(resolve => setTimeout(resolve, 1000));    // หน่วง 1s เพื่อเอฟเฟกต์ความคืบหน้า

        const result = await response.json();                       // อ่านผลลัพธ์ JSON ที่แบ็กเอนด์ส่งกลับ
                                                                     // โครงสร้างตาม Flask: { success, results, outputFiles, summary, ... }

        setCurrentStep(6);                                          // ไปสเต็ป 6: เตรียมไฟล์ดาวน์โหลด (Excel/CSV) เสร็จ
        await new Promise(resolve => setTimeout(resolve, 500));     // หน่วง 0.5s ปิดท้าย

        // ดึงลิสต์ไฟล์สำหรับดาวน์โหลดจากผลลัพธ์ (เช่น { excel: 'basket_analysis_xxx.xlsx', csv: 'association_rules_xxx.csv' })
        const downloadUrls = result.outputFiles || {};              // หากไม่มี ให้เป็นอ็อบเจ็กต์ว่างเพื่อกัน error

        setIsComplete(true);                                        // ตั้งธงเสร็จสิ้นงาน
        onProcessingComplete(result, downloadUrls);                 // แจ้งพาเรนต์พร้อมข้อมูลผลลัพธ์ + ไฟล์ดาวน์โหลด

      } catch (err) {
        // หากเกิดข้อผิดพลาดระหว่างทาง (เช่น แบ็กเอนด์ไม่ตอบ, 500, JSON ไม่ถูกต้อง ฯลฯ)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
                                                                     // เก็บข้อความผิดพลาดไว้แสดงให้ผู้ใช้
        console.error('Processing error:', err);                    // พิมพ์ลงคอนโซลเพื่อดีบัก
      } finally {
        setIsProcessing(false);                                     // ไม่ว่าจะสำเร็จ/ล้มเหลว ให้ปิดสถานะกำลังประมวลผล
      }
    };

    processDataWithBackend();                                       // เรียกทำงานทันทีเมื่อ dependencies เปลี่ยน
  }, [selectedColumns, uploadedFileName, onProcessingComplete]);    // re-run เมื่อผู้ใช้เลือกคอลัมน์ใหม่/อัปโหลดใหม่/ส่ง callback ใหม่

  // ─────────────────────────────────────────────────────────────────────────────
  // สถานะ: แสดงข้อผิดพลาดถ้ามี (แทนทั้งหน้าด้วยการ์ดแจ้ง error)
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />   {/* ไอคอนแจ้งเตือน */}
          <h3 className="text-xl font-bold text-red-900 mb-2">Market Basket Analysis Error</h3>
          <p className="text-red-700 mb-4">{error}</p>                      {/* ข้อความ error ที่จับได้ */}

          {/* กล่องคำแนะนำแก้ปัญหาเบื้องต้น */}
          <div className="bg-red-100 rounded-lg p-4 text-left">
            <h4 className="font-semibold text-red-800 mb-2">Troubleshooting Tips:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Make sure Flask backend is running on http://localhost:5000</li>
              <li>• Check that mlxtend library is installed (pip install mlxtend)</li>
              <li>• Verify your data has transaction_id and item columns</li>
              <li>• Try with a smaller dataset first</li>
            </ul>
            {/* หมายเหตุ: ในโปรเจกต์คุณใช้ตัวขุดกฎภายใน ไม่จำเป็นต้องมี mlxtend ก็ได้ — ปรับข้อความได้ตามจริง */}
          </div>

          {/* ปุ่มรีโหลดหน้าเพื่อเริ่มใหม่อย่างสะอาด */}
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

  // ─────────────────────────────────────────────────────────────────────────────
  // สถานะปกติ: แสดงขั้นตอนการประมวลผล + แถบความคืบหน้า + ข้อความสำเร็จเมื่อเสร็จ
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ส่วนหัวเรื่อง */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">🛒 Market Basket Analysis</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          กำลังวิเคราะห์ความสัมพันธ์ของสินค้าและรูปแบบการซื้อด้วย Advanced Apriori Algorithm
        </p>
      </div>

      {/* การ์ดข้อมูลสรุปการประมวลผล */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 mb-8 border border-emerald-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />        {/* ไอคอนตะกร้า แสดงหมวดงาน */}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Market Basket Analysis</h3>
            <p className="text-gray-600">Processing {selectedColumns.length} columns with mlxtend library</p>
            {/* ข้อความสถานะ: บอกจำนวนคอลัมน์ที่เลือก (ข้อความ mlxtend เป็นคำโปรย UI) */}
          </div>
        </div>
        {/* ไฮไลต์สิ่งที่จะได้จากการประมวลผล */}
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

      {/* ลิสต์สเต็ปความคืบหน้าแบบการ์ด */}
      <div className="space-y-4 mb-8">
        {processingSteps.map((step, index) => {
          const StepIcon = step.icon;                                     // ไอคอนของแต่ละสเต็ป
          const isActive = index === currentStep - 1 && !isComplete && !error;
                                                                          // สเต็ปที่กำลังทำงาน: index เท่ากับ currentStep-1
          const isCompleted = index < currentStep || isComplete;           // สเต็ปที่เสร็จแล้ว: ต่ำกว่า currentStep หรือทั้งหมดเมื่อเสร็จสิ้น
          const isPending = index >= currentStep && !isComplete && !error; // สเต็ปที่ยังไม่ถึง

          return (
            <div
              key={index}
              className={`flex items-center p-4 rounded-lg border transition-all duration-500 ${
                isActive
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg transform scale-105' // เน้นสเต็ปปัจจุบัน
                  : isCompleted
                  ? 'border-green-500 bg-green-50'                                  // สเต็ปผ่านแล้ว = เขียว
                  : 'border-gray-200 bg-gray-50'                                    // รอทำ = เทา
              }`}
            >
              {/* จุดหน้าสเต็ป: สี/แอนิเมชันตามสถานะ */}
              <div className={`p-2 rounded-full mr-4 ${
                isActive
                  ? 'bg-emerald-500 text-white animate-pulse'                       // กำลังทำ = กระพริบ
                  : isCompleted
                  ? 'bg-green-500 text-white'                                       // เสร็จแล้ว
                  : 'bg-gray-300 text-gray-500'                                     // รอทำ
              }`}>
                <StepIcon className="h-5 w-5" />
              </div>

              {/* ข้อความชื่อสเต็ป + คำอธิบาย */}
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

              {/* ไอคอนสถานะฝั่งขวา: หมุน/ติ๊กถูก/นาฬิการอ */}
              <div className="ml-4">
                {isActive && (
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {isCompleted && (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                )}
                {isPending && (
                  <Clock className="h-6 w-6 text-gray-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* แถบความคืบหน้าโดยรวม */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Processing Progress</span>
          <span>{Math.round((currentStep / processingSteps.length) * 100)}%</span>
          {/* เปอร์เซ็นต์ = currentStep / จำนวนสเต็ปทั้งหมด (6) ปัดเป็นจำนวนเต็ม */}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / processingSteps.length) * 100}%` }}   // ความยาวแท่งตามเปอร์เซ็นต์
          ></div>
        </div>
      </div>

      {/* การ์ดแสดงผลสำเร็จเมื่อประมวลผลเสร็จ */}
      {isComplete && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center animate-fade-in">
          <div className="bg-green-500 p-3 rounded-full w-fit mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />             {/* ไอคอนติ๊กถูกใหญ่ */}
          </div>
          <h3 className="text-2xl font-bold text-green-900 mb-2">🛒 Market Basket Analysis Complete!</h3>
          <p className="text-green-700 mb-4">
            Association rules have been generated successfully and are ready for download.
            {/* แจ้งผู้ใช้ว่าพร้อมดาวน์โหลดไฟล์ผลลัพธ์ (ลิงก์ดาวน์โหลดมักจะแสดงในหน้าพาเรนต์ผ่าน onProcessingComplete) */}
          </p>
          {/* สรุปตัวชี้วัดสั้น ๆ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/70 rounded-lg p-3">
              <p className="font-semibold text-gray-700">Rows Processed</p>
              <p className="text-2xl font-bold text-green-600">{originalData.length - 1}</p>
              {/* จำนวนแถวที่ประมวลผล = ทั้งหมดลบ 1 (เฮดเดอร์) */}
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <p className="font-semibold text-gray-700">Columns Selected</p>
              <p className="text-2xl font-bold text-blue-600">{selectedColumns.length}</p>
              {/* จำนวนคอลัมน์ที่ถูกเลือก */}
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <p className="font-semibold text-gray-700">Analysis Status</p>
              <p className="text-2xl font-bold text-emerald-600">✓ Ready</p>
              {/* สถานะวิเคราะห์เสร็จพร้อม */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataProcessor;                                          // ส่งออกคอมโพเนนต์เพื่อให้พาเรนต์นำไปใช้งาน
