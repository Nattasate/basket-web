import { api } from '../lib/api';                                              // helper สำหรับประกอบ base URL ของแบ็กเอนด์ (ถึงแม้ไฟล์นี้จะยังไม่ใช้ api() ตอนดาวน์โหลด)
﻿// คอมโพเนนต์หน้าพรีวิวผลลัพธ์สำหรับหน้าดาวน์โหลด - แสดงเฉพาะข้อมูลที่ต้องการ
import React, { useState } from 'react';                                       // React + hook useState สำหรับเก็บสถานะรูปแบบไฟล์ที่เลือก
import { Download, FileText, Table, CheckCircle, ShoppingCart } from 'lucide-react';
                                                                               // ไอคอน UI จากไลบรารี lucide-react (ปุ่มดาวน์โหลด/สัญลักษณ์ไฟล์/ตาราง/ติ๊กถูก/รถเข็น)

interface ResultsDownloadProps {                                                // ชนิดพร็อพที่คอมโพเนนต์นี้คาดหวังจากพาเรนต์
  processedData: any;                                                           // อ็อบเจ็กต์ผลลัพธ์จากการประมวลผล (ฝั่ง Flask ส่งกลับมา) รวม summary/rules
  downloadUrls?: any;                                                           // รายชื่อไฟล์เอาต์พุตสำหรับดาวน์โหลด เช่น { excel: 'basket_analysis_xxx.xlsx', csv: 'association_rules_xxx.csv' }
}

const downloadFormats = [                                                       // รายการรูปแบบไฟล์ที่รองรับใน UI (ใช้เรนเดอร์การ์ดให้ผู้ใช้เลือก)
  {
    id: 'excel',                                                                // คีย์ที่ใช้แม็ปกับ downloadUrls.excel
    name: 'Excel (.xlsx)',                                                      // ชื่อที่โชว์ใน UI
    description: 'Complete analysis with multiple sheets',                      // คำอธิบายไฟล์ Excel (มีหลายชีต)
    icon: Table,                                                                // ไอคอนที่ใช้บนการ์ด (รูปร่างตาราง)
    recommended: true                                                           // ธง "แนะนำ" สำหรับติด badge
  },
  {
    id: 'csv',                                                                  // คีย์ที่ใช้แม็ปกับ downloadUrls.csv
    name: 'CSV (.csv)',                                                         // ชื่อที่โชว์ใน UI
    description: 'Association rules in CSV format',                             // คำอธิบายไฟล์ CSV (เฉพาะกฎสมาคม)
    icon: FileText,                                                             // ไอคอนไฟล์ข้อความ
    recommended: false                                                          // ไม่ติด badge แนะนำ
  }
];

const formatCount = (value: unknown) => {                                       // helper จัดรูปตัวเลขนับ (เช่น 12000 → "12,000")
  if (value === null || value === undefined) {                                  // ถ้าไม่มีค่า → คืน "0"
    return '0';
  }
  const numericValue = typeof value === 'string' ? Number(value) : (value as number); // พยายามแปลง string → number
  if (typeof numericValue === 'number' && Number.isFinite(numericValue)) {      // ถ้าเป็นตัวเลขปกติ
    return numericValue.toLocaleString();                                       // ใส่คอมมาแบ่งหลักตามโลแคล
  }
  return String(value);                                                         // กรณีอื่น ๆ คืนเป็นสตริงตรง ๆ
};

const formatDecimal = (value: unknown, digits: number) => {                     // helper ปัดเศษทศนิยมสำหรับ metrics (support/confidence/lift)
  if (value === null || value === undefined) {                                  // ถ้าไม่มีค่า → แสดง '-'
    return '-';
  }
  const numericValue = typeof value === 'string' ? Number(value) : (value as number); // แปลง string → number (ถ้าเป็นไปได้)
  if (typeof numericValue === 'number' && Number.isFinite(numericValue)) {      // ถ้าเป็นตัวเลขปกติ
    return numericValue.toFixed(digits);                                        // ปัดทศนิยมตาม digits ที่ส่งมา
  }
  return String(value);                                                         // กรณีอื่น ๆ คืนเป็นสตริง
};

const ResultsDownload: React.FC<ResultsDownloadProps> = ({ processedData, downloadUrls }) => {
  const results = processedData?.results;                                       // เจาะเข้าไปที่ results ภายใน processedData (รูปแบบมาจากฝั่ง Flask)

  const [selectedFormat, setSelectedFormat] = useState<string>('excel');        // สถานะรูปแบบไฟล์ที่ผู้ใช้เลือก (ดีฟอลต์: excel)
  const selectedFormatData =
    downloadFormats.find((format) => format.id === selectedFormat) ?? downloadFormats[0];
                                                                               // หาอ็อบเจ็กต์ข้อมูลของรูปแบบที่เลือก (ถ้าไม่เจอใช้ตัวแรก)

  const handleDownload = (format: string) => {                                  // ฟังก์ชันเมื่อกดปุ่มดาวน์โหลด
    if (!downloadUrls || !downloadUrls[format]) {                               // ถ้าไม่มีลิงก์ไฟล์ของรูปแบบนั้น
      alert('ไฟล์รูปแบบนี้ไม่พร้อมใช้งาน');                                  // แจ้งเตือนผู้ใช้
      return;
    }

    const link = document.createElement('a');                                   // สร้าง <a> ชั่วคราวสำหรับสั่งดาวน์โหลด
    link.href = `http://localhost:5000/api/download/${format}/${downloadUrls[format]}`;
                                                                               // URL ดาวน์โหลดจากแบ็กเอนด์ Flask (ฮาร์ดโค้ด localhost:5000)
                                                                               // หมายเหตุ: ถ้าคุณมี helper api() อาจสลับมาใช้เพื่อรองรับ base URL ที่เปลี่ยนได้
    link.download = downloadUrls[format];                                       // ตั้งชื่อไฟล์ปลายทาง
    document.body.appendChild(link);                                            // แทรก <a> เข้า DOM
    link.click();                                                               // คลิกลิงก์เพื่อเริ่มดาวน์โหลด
    document.body.removeChild(link);                                            // ลบ <a> ทิ้งเพื่อความสะอาด
  };

  if (!results || !results.success) {                                           // ถ้าไม่มีผลลัพธ์ หรือ success=false → แสดงการ์ดแจ้งปัญหา
    return (
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-white border border-red-100 text-center rounded-2xl shadow-sm p-10">
          <p className="text-lg font-semibold text-red-600">ไม่สามารถแสดงผลลัพธ์ได้</p>
          {results?.error && (
            <p className="text-sm text-red-500 mt-2">{results.error}</p>       // แสดงข้อความ error จากแบ็กเอนด์ถ้ามี
          )}
        </div>
      </div>
    );
  }

  const metrics = [                                                             // การ์ดสรุปตัวชี้วัดหลัก ๆ สำหรับโชว์บนสุด
    {
      label: 'Association Rules',                                               // จำนวนกฎสมาคมที่พบ
      helper: 'จำนวนกฎที่ค้นพบ',
      value: formatCount(results.totalRules ?? 0),                              // ใช้ formatCount ให้สวยงาม
      wrapper: 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100',     // คลาสตกแต่งกรอบการ์ด
      textColor: 'text-blue-600'                                               // สีตัวเลข
    },
    {
      label: 'Transactions',                                                    // จำนวนธุรกรรมทั้งหมด
      helper: 'จำนวนธุรกรรมทั้งหมด',
      value: formatCount(results.totalTransactions ?? 0),
      wrapper: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100',
      textColor: 'text-emerald-600'
    },
    {
      label: 'Unique Items',                                                    // จำนวนสินค้าไม่ซ้ำทั้งหมด
      helper: 'จำนวนสินค้าที่ต่างกัน',
      value: formatCount(results.totalItems ?? 0),
      wrapper: 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100',
      textColor: 'text-orange-600'
    },
    {
      label: 'Frequent Itemsets',                                               // จำนวนชุดสินค้าที่พบบ่อย (ทุกขนาด)
      helper: 'ชุดสินค้าที่พบบ่อย',
      value: formatCount(results.totalFrequentItemsets ?? 0),
      wrapper: 'bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-100',
      textColor: 'text-purple-600'
    }
  ];

  const topRules = Array.isArray(results.rulesTable)                            // ดึงกฎสมาคมมาโชว์ Top N (ที่นี่ 15 แถวแรก)
    ? results.rulesTable.slice(0, 15)
    : [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">                  {/* คอนเทนเนอร์หลักของหน้าแสดงผลดาวน์โหลด */}
      <div className="bg-white border border-emerald-200 rounded-2xl shadow-lg overflow-hidden">
        {/* การ์ดสรุปผลลัพธ์ */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white text-emerald-600 shadow-sm">
              <ShoppingCart className="h-5 w-5" />                              {/* ไอคอนตะกร้า สื่อถึง Basket Analysis */}
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700">ผลลัพธ์การวิเคราะห์ Basket Analysis</p>
              <h2 className="text-xl font-semibold text-gray-900">Market Basket Analysis Results</h2>
              <p className="text-xs text-gray-500 mt-1">
                แสดงข้อมูลสรุปจากการวิเคราะห์และกฎความสัมพันธ์ที่สำคัญ
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => (                                         // เรนเดอร์การ์ด metric ตามรายการด้านบน
              <div
                key={metric.label}
                className={`rounded-xl border ${metric.wrapper} p-4 shadow-sm`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {metric.label}                                               {/* ชื่อเมตริก */}
                </p>
                <p className={`mt-2 text-2xl font-bold ${metric.textColor}`}>
                  {metric.value}                                               {/* ค่าที่ฟอร์แมตแล้ว */}
                </p>
                <p className="text-xs text-gray-500 mt-1">{metric.helper}</p>  {/* คำอธิบายสั้น */}
              </div>
            ))}
          </div>

          {topRules.length > 0 ? (                                              // ถ้ามีกฎสมาคม → แสดงตาราง Top Rules
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Top Association Rules</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Analysis Method: {results.analysis?.method || 'mlxtend_apriori'}
                                                                                {/* แสดงชื่อเมธอดจากฝั่งผลลัพธ์ (ดีฟอลต์ข้อความโปรย) */}
                </p>
              </div>
              <div className="overflow-x-auto">                                 {/* ให้ตารางเลื่อนได้แนวนอนบนจอแคบ */}
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Rank</th>
                      <th className="px-4 py-3 text-left font-semibold">If Customer Buys</th>
                      <th className="px-4 py-3 text-left font-semibold">Then Also Buys</th>
                      <th className="px-4 py-3 text-left font-semibold">Support</th>
                      <th className="px-4 py-3 text-left font-semibold">Confidence</th>
                      <th className="px-4 py-3 text-left font-semibold">Lift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topRules.map((rule: any, index: number) => {               // เดินรายการกฎแต่ละแถว
                      const rank = rule.Rank ?? index + 1;                      // อันดับ (ถ้ามีฟิลด์ Rank ใช้เลย ไม่งั้น index+1)
                      const antecedent = rule.If_Customer_Buys ?? rule.Antecedents; // ฝั่งซ้าย (antecedents) รองรับหลายคีย์จากรูปแบบต่างกัน
                      const consequent = rule.Then_Also_Buys ?? rule.Consequents;   // ฝั่งขวา (consequents)
                      const support = rule.Support ?? rule.support;             // ตัวชี้วัด support (รองรับคีย์ตัวใหญ่/เล็ก)
                      const confidence = rule.Confidence ?? rule.confidence;    // confidence
                      const lift = rule.Lift ?? rule.lift;                      // lift

                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-800">{rank}</td>
                          <td className="px-4 py-3 font-semibold text-blue-700">
                            {antecedent}                                        {/* แสดง antecedents เป็นข้อความ */}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">
                            {consequent}                                        {/* แสดง consequents เป็นข้อความ */}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatDecimal(support, 4)}                         {/* ปัด support ทศนิยม 4 ตำแหน่ง */}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatDecimal(confidence, 3)}                      {/* ปัด confidence ทศนิยม 3 ตำแหน่ง */}
                          </td>
                          <td className="px-4 py-3 font-semibold text-orange-600">
                            {formatDecimal(lift, 3)}                             {/* ปัด lift ทศนิยม 3 ตำแหน่ง */}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (                                                                 // ถ้าไม่มีกฎให้โชว์
            <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-600">ยังไม่พบกฎความสัมพันธ์สำหรับการแสดงผล</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
          {/* แถบสรุปใต้การ์ด: รวมตัวเลขหลัก ๆ */}
          พบกฎความสัมพันธ์ทั้งหมด {formatCount(results.totalRules ?? topRules.length)} กฎ จากธุรกรรม {formatCount(results.totalTransactions ?? 0)} รายการ และสินค้าทั้งหมด {formatCount(results.totalItems ?? 0)} รายการ
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        {/* การ์ดส่วนดาวน์โหลดไฟล์ */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">📥 Download Your Results</h3>
          <p className="text-gray-600 text-sm mt-2">
            เลือกรูปแบบไฟล์ที่ต้องการดาวน์โหลด - ไฟล์พร้อมใช้งานทันที
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {downloadFormats.map((format) => {                                 // เรนเดอร์การ์ดตัวเลือกไฟล์ (Excel/CSV)
              const FormatIcon = format.icon;                                   // ไอคอนของการ์ด (Table/FileText)
              const isAvailable = Boolean(downloadUrls && downloadUrls[format.id]); // มีไฟล์พร้อมให้โหลดไหม (จากแบ็กเอนด์สร้างสำเร็จหรือยัง)

              return (
                <div
                  key={format.id}
                  className={`relative p-4 rounded-lg border transition-all duration-200 ${
                    selectedFormat === format.id
                      ? 'border-emerald-500 bg-emerald-50 shadow-lg'            // สถานะที่ถูกเลือก
                      : isAvailable
                      ? 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-25' // เลือกได้ (โฮเวอร์แล้วเน้น)
                      : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'    // ยังไม่พร้อม (ปิดใช้งาน)
                  }`}
                  onClick={() => isAvailable && setSelectedFormat(format.id)}   // คลิกเพื่อเลือกเฉพาะเมื่อไฟล์พร้อม
                >
                  <div className="text-center space-y-1">
                    <FormatIcon
                      className={`h-6 w-6 mx-auto ${
                        selectedFormat === format.id ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    />
                    <h4 className="font-semibold text-gray-900 text-sm">{format.name}</h4>
                    <p className="text-xs text-gray-600">{format.description}</p>
                    {format.recommended && (                                   // ติด badge "แนะนำ" เฉพาะ Excel
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-2">
                        แนะนำ
                      </span>
                    )}
                    {!isAvailable && (                                         // ถ้าไฟล์ยังไม่พร้อม
                      <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mt-2">
                        ไม่พร้อม
                      </span>
                    )}
                  </div>
                  {selectedFormat === format.id && isAvailable && (             // มุมขวาบน ใส่ไอคอนติ๊กเมื่อถูกเลือกและพร้อมดาวน์โหลด
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-2">
              <h4 className="font-semibold text-gray-900">📋 ไฟล์ที่จะดาวน์โหลด:</h4>
              {selectedFormat === 'excel' ? (                                 // คำอธิบายรายละเอียดไฟล์ตามรูปแบบที่เลือก
                <div className="space-y-1">
                  <p>• รายงานครบถ้วนหลาย sheets: Summary, Association Rules, Single Rules, Frequent Itemsets</p>
                  <p>• พร้อมใช้งานใน Microsoft Excel หรือ Google Sheets</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p>• Association Rules ในรูปแบบ CSV</p>
                  <p>• เปิดได้ใน Excel, Google Sheets, หรือโปรแกรมอื่นๆ</p>
                </div>
              )}
            </div>

            <button
              onClick={() => handleDownload(selectedFormat)}                   // เมื่อกด → เรียก handleDownload ไปยิง /api/download/{format}/{filename}
              disabled={!downloadUrls || !downloadUrls[selectedFormat]}        // ปิดปุ่มถ้ายังไม่มีไฟล์
              className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 mx-auto text-lg ${
                downloadUrls && downloadUrls[selectedFormat]
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Download className="h-6 w-6" />                                {/* ไอคอนดาวน์โหลดบนปุ่ม */}
              <span>ดาวน์โหลด {selectedFormatData?.name}</span>               {/* แสดงชื่อรูปแบบที่เลือก */}
            </button>

            <p className="text-sm text-gray-500">🛒 Market Basket Analysis Results - พร้อมใช้งานทันที</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDownload;                                                // ส่งออกคอมโพเนนต์เพื่อให้พาเรนต์ (หน้าดาวน์โหลด) นำไปใช้งาน
