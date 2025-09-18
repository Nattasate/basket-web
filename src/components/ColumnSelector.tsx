// คอมโพเนนต์สำหรับเลือกคอลัมน์สำหรับ Market Basket Analysis เท่านั้น
import React, { useState } from 'react';                     // นำเข้า React และ useState hook สำหรับจัดการ state ภายในคอมโพเนนต์
import { Check, Eye, EyeOff } from 'lucide-react';           // ไอคอนจากไลบรารี lucide-react สำหรับ UI (เครื่องหมายถูก/แสดง/ซ่อน)

// กำหนดชนิดของ props ที่คอมโพเนนต์นี้คาดหวังจะได้รับ
interface ColumnSelectorProps {
  data: any[][];                                             // ตารางข้อมูลในรูปแบบ array 2 มิติ: แถวแรกเป็น headers, แถวถัดไปเป็นข้อมูล
  onColumnsSelected: (selectedColumns: number[]) => void;    // ฟังก์ชัน callback เมื่อผู้ใช้กดเริ่มวิเคราะห์ โดยส่งดัชนีคอลัมน์ที่ถูกเลือกไปให้พาเรนต์
}

// ประกาศคอมโพเนนต์แบบฟังก์ชัน โดยบอกชนิด React.FC และผูกกับ props ข้างบน
const ColumnSelector: React.FC<ColumnSelectorProps> = ({ data, onColumnsSelected }) => {
  // สถานะเก็บรายการ “ดัชนีคอลัมน์” ที่ผู้ใช้เลือก (เช่น [0,2,5])
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  // สถานะควบคุมการแสดง/ซ่อนพื้นที่พรีวิวข้อมูล (true = แสดง)
  const [showPreview, setShowPreview] = useState(true);

  // headers คือแถวแรกของ data (ชื่อคอลัมน์) ถ้าไม่มีให้เป็น [] เพื่อกัน error
  const headers = data[0] || [];
  // previewData คือ 5 แถวถัดจาก header เอามาพรีวิวด้านล่างของหน้า
  const previewData = data.slice(1, 6);

  // ฟังก์ชันสลับสถานะเลือก/ยกเลิกเลือกของคอลัมน์ตามดัชนีที่คลิก
  const toggleColumn = (columnIndex: number) => {
    setSelectedColumns(prev => 
      prev.includes(columnIndex)                             // ถ้าดัชนีนี้ถูกเลือกอยู่แล้ว
        ? prev.filter(i => i !== columnIndex)                // เอาออก (ยกเลิกเลือก)
        : [...prev, columnIndex]                             // ถ้ายังไม่ถูกเลือก ให้เพิ่มเข้าไป
    );
  };

  // ฟังก์ชัน “เลือกทั้งหมด/ยกเลิกทั้งหมด”
  const selectAllColumns = () => {
    if (selectedColumns.length === headers.length) {         // ถ้าเลือกเท่าจำนวนคอลัมน์ทั้งหมดอยู่แล้ว
      setSelectedColumns([]);                                // กดซ้ำ = ยกเลิกทั้งหมด
    } else {
      setSelectedColumns(headers.map((_, index) => index));  // มิฉะนั้น เลือกทุกคอลัมน์ (แปลงเป็นลิสต์ของ index)
    }
  };

  // เมื่อกดปุ่ม “เริ่มวิเคราะห์” ให้เรียก callback พร้อมส่งดัชนีคอลัมน์ที่เลือก
  // หมายเหตุ: ฝั่งพาเรนต์มักจะนำ selectedColumns ไปเรียก API /api/process โดยส่งเป็น selectedColumns (index-based)
  const handleProceed = () => {
    if (selectedColumns.length > 0) {                        // ป้องกันเคสยังไม่เลือกอะไร
      onColumnsSelected(selectedColumns);                    // ยิง callback ไปยังพาเรนต์
    }
  };

  // เริ่มส่วน UI
  return (
    <div className="max-w-6xl mx-auto p-6">                  {/* คอนเทนเนอร์หลัก กำหนดความกว้างสูงสุด/กึ่งกลาง/ระยะขอบ */}
      <div className="text-center mb-8">                     {/* ส่วนหัวเรื่อง */}
        <h2 className="text-3xl font-bold text-gray-900 mb-4">เลือกคอลัมน์สำหรับ Market Basket Analysis</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          เลือกคอลัมน์ที่เกี่ยวข้องกับการวิเคราะห์ตะกร้าสินค้า เช่น transaction_id, item_description, product_name
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> {/* แบ่งหน้าจอเป็น 2 คอลัมน์บนจอกว้าง (ซ้าย: รายการคอลัมน์, ขวา: ข้อมูลอธิบาย) */}
        {/* Column Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200"> {/* การ์ดฝั่งซ้ายสำหรับเลือกคอลัมน์ */}
          <div className="p-6 border-b border-gray-200">      {/* เฮดเดอร์ของการ์ด */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">คอลัมน์ที่มีอยู่</h3>
              <div className="flex items-center space-x-4">   {/* ปุ่มยูทิลิตี้: เลือกทั้งหมด / สลับพรีวิว */}
                <button
                  onClick={selectAllColumns}                  // เรียกฟังก์ชันเลือก/ยกเลิกทั้งหมด
                  className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Check className="h-4 w-4" />              {/* ไอคอนเครื่องหมายถูก */}
                  <span className="text-sm">
                    {selectedColumns.length === headers.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                    {/* ถ้าเลือกครบทุกคอลัมน์แล้ว ให้แสดง “ยกเลิกทั้งหมด” ไม่งั้นแสดง “เลือกทั้งหมด” */}
                  </span>
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)} // สลับ state showPreview (แสดง/ซ่อนตัวอย่างตาราง)
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {/* แสดงไอคอน EyeOff หากกำลังแสดงตัวอย่าง (สื่อความหมายว่า “กดเพื่อซ่อน”)
                      และแสดง Eye หากซ่อนอยู่ (สื่อว่า “กดเพื่อแสดง”) */}
                  <span className="text-sm">{showPreview ? 'ซ่อน' : 'แสดง'} ตัวอย่าง</span>
                </button>
              </div>
            </div>
            <p className="text-gray-600 text-sm mt-2">
              เลือกแล้ว: {selectedColumns.length} จาก {headers.length} คอลัมน์
              {/* แสดงสถานะจำนวนคอลัมน์ที่เลือกเทียบกับทั้งหมด */}
            </p>
          </div>
          
          <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
            {/* พื้นที่รายการคอลัมน์ที่คลิกเลือกได้ เลื่อนแนวตั้งได้สูงสุด 500px */}
            {headers.map((header, index) => (                 // วนแสดงคอลัมน์ทุกชื่อ พร้อม index
              <div
                key={index}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedColumns.includes(index)
                    ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105' // ถ้าเลือกแล้ว: เน้นสี/เงา/ขยายเล็กน้อย
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'   // ถ้ายังไม่เลือก: สไตล์ปกติ + hover
                }`}
                onClick={() => toggleColumn(index)}          // คลิกเพื่อเลือก/ยกเลิกคอลัมน์นี้
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{header}</h4> {/* ชื่อคอลัมน์ */}
                    {showPreview && previewData.length > 0 && (              // ถ้าเปิดพรีวิว และมีข้อมูลตัวอย่าง
                      <p className="text-sm text-gray-500 mt-1">
                        ตัวอย่าง: {previewData[0]?.[index] || 'ไม่มีข้อมูล'}  {/* แสดงค่าในแถวแรกของตัวอย่างสำหรับคอลัมน์นี้ */}
                      </p>
                    )}
                  </div>
                  {selectedColumns.includes(index) && (      // ถ้าคอลัมน์นี้ถูกเลือก แสดงไอคอนเครื่องหมายถูกด้านขวา
                    <Check className="h-5 w-5 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Info */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          {/* การ์ดฝั่งขวา: อธิบายฟีเจอร์การวิเคราะห์และคำแนะนำ */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Market Basket Analysis</h3>
            <p className="text-gray-600 text-sm mt-2">
              การวิเคราะห์ตะกร้าสินค้าด้วย mlxtend library
              {/* ข้อความบรรยาย (เชิงการตลาด/ความสามารถ) — ในโปรเจกต์ของคุณจริง ๆ ฝั่งแบ็กเอนด์ใช้ตัววิเคราะห์ภายใน (flexible) */}
            </p>
          </div>
          
          <div className="p-6">
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
              {/* กล่องไฮไลต์คุณสมบัติหลักของระบบ */}
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🛒</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-emerald-900 mb-1">การวิเคราะห์ตะกร้าสินค้า</h4>
                  <p className="text-sm text-emerald-700 mb-3">
                    ค้นหาความสัมพันธ์ของสินค้าและรูปแบบการซื้อด้วย Advanced Apriori Algorithm
                    {/* อธิบายแนวคิดว่าใช้กฎสมาคมจาก Apriori เพื่อหา pattern ซื้อร่วมกัน */}
                  </p>
                  <div className="space-y-2 text-sm text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Association Rules พร้อม Support, Confidence, Lift</span>
                      {/* ค่าชี้วัดหลักที่จะแสดงผลในตารางผลลัพธ์ */}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Frequent Itemsets Analysis</span>
                      {/* การวิเคราะห์ชุดสินค้าที่พบบ่อย */}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Single Item Rules (ถ้ามี)</span>
                      {/* UI บางส่วนอาจแสดง top สินค้าเดี่ยว ๆ ตาม support */}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Export Excel และ CSV</span>
                      {/* ฝั่งแบ็กเอนด์มี endpoint โหลดไฟล์รายงานที่สร้างไว้ */}
                    </div>
                  </div>
                </div>
                <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" /> {/* ไอคอนยืนยันฟีเจอร์ */}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              {/* กล่องคำแนะนำการเลือกคอลัมน์ */}
              <h5 className="font-semibold text-blue-900 mb-2">💡 คำแนะนำการเลือกคอลัมน์:</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• เลือกคอลัมน์ที่มี transaction_id หรือ order_id</li>
                <li>• เลือกคอลัมน์ที่มีชื่อสินค้าหรือ item_description</li>
                <li>• สามารถเลือกคอลัมน์เพิ่มเติมได้ตามต้องการ</li>
                <li>• ระบบจะตรวจจับคอลัมน์ที่เหมาะสมอัตโนมัติ</li>
                {/* ข้อสุดท้ายสอดคล้องกับฮิวริสติกเดาคอลัมน์ของฝั่งแบ็กเอนด์ flexible_basket */}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Data Preview */}
      {showPreview && (                                      // แสดงส่วนพรีวิวตารางข้อมูลตัวอย่างเมื่อ showPreview = true
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">ตัวอย่างข้อมูล</h3>
            <p className="text-gray-600 text-sm mt-2">
              5 แถวแรกของข้อมูลของคุณ
            </p>
          </div>
          <div className="overflow-x-auto">                  {/* ทำให้ตารางเลื่อนแนวนอนได้กรณีคอลัมน์เยอะ */}
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (          // วนหัวตารางทุกคอลัมน์
                    <th
                      key={index}
                      className={`px-4 py-3 text-left text-sm font-medium transition-colors ${
                        selectedColumns.includes(index)
                          ? 'text-blue-700 bg-blue-50'        // ถ้าเลือกคอลัมน์นี้ ให้เน้นหัวตาราง
                          : 'text-gray-500'
                      }`}
                    >
                      {header}                                {/* ชื่อหัวคอลัมน์ */}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (        // วนแสดง 5 แถวตัวอย่าง (จาก slice ข้างบน)
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (          // วนทุกเซลล์ในแต่ละแถว
                      <td
                        key={cellIndex}
                        className={`px-4 py-3 text-sm transition-colors ${
                          selectedColumns.includes(cellIndex)
                            ? 'text-blue-900 bg-blue-25'      // ถ้าเซลล์นี้อยู่ในคอลัมน์ที่เลือก ให้เน้น (หมายเหตุ: bg-blue-25 อาจไม่มีใน Tailwind มาตรฐาน)
                            : 'text-gray-900'
                        }`}
                      >
                        {cell}                                {/* ค่าจริงของเซลล์ */}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-8 text-center">
        <button
          onClick={handleProceed}                             // เมื่อกดให้เรียกฟังก์ชันส่ง selectedColumns ขึ้นไปให้พาเรนต์
          disabled={selectedColumns.length === 0}             // ปิดปุ่มหากยังไม่เลือกคอลัมน์ใดเลย
          className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
            selectedColumns.length > 0
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          🛒 เริ่มวิเคราะห์ตะกร้าสินค้า ({selectedColumns.length} คอลัมน์)
          {/* ป้ายบนปุ่มแสดงจำนวนคอลัมน์ที่เลือกเพื่อความเข้าใจแบบเรียลไทม์ */}
        </button>
      </div>
    </div>
  );
};

// ส่งออกคอมโพเนนต์ เพื่อให้หน้า/คอมโพเนนต์อื่น import ไปใช้งานได้
export default ColumnSelector;
