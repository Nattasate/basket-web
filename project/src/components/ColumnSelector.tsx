// คอมโพเนนต์สำหรับเลือกคอลัมน์สำหรับ Market Basket Analysis เท่านั้น
import React, { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';

interface ColumnSelectorProps {
  data: any[][];
  onColumnsSelected: (selectedColumns: number[]) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({ data, onColumnsSelected }) => {
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  const headers = data[0] || [];
  const previewData = data.slice(1, 6);

  const toggleColumn = (columnIndex: number) => {
    setSelectedColumns(prev => 
      prev.includes(columnIndex)
        ? prev.filter(i => i !== columnIndex)
        : [...prev, columnIndex]
    );
  };

  const selectAllColumns = () => {
    if (selectedColumns.length === headers.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(headers.map((_, index) => index));
    }
  };

  const handleProceed = () => {
    if (selectedColumns.length > 0) {
      onColumnsSelected(selectedColumns);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">เลือกคอลัมน์สำหรับ Market Basket Analysis</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          เลือกคอลัมน์ที่เกี่ยวข้องกับการวิเคราะห์ตะกร้าสินค้า เช่น transaction_id, item_description, product_name
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">คอลัมน์ที่มีอยู่</h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={selectAllColumns}
                  className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedColumns.length === headers.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </span>
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="text-sm">{showPreview ? 'ซ่อน' : 'แสดง'} ตัวอย่าง</span>
                </button>
              </div>
            </div>
            <p className="text-gray-600 text-sm mt-2">
              เลือกแล้ว: {selectedColumns.length} จาก {headers.length} คอลัมน์
            </p>
          </div>
          
          <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
            {headers.map((header, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedColumns.includes(index)
                    ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => toggleColumn(index)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{header}</h4>
                    {showPreview && previewData.length > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        ตัวอย่าง: {previewData[0]?.[index] || 'ไม่มีข้อมูล'}
                      </p>
                    )}
                  </div>
                  {selectedColumns.includes(index) && (
                    <Check className="h-5 w-5 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Info */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Market Basket Analysis</h3>
            <p className="text-gray-600 text-sm mt-2">
              การวิเคราะห์ตะกร้าสินค้าด้วย mlxtend library
            </p>
          </div>
          
          <div className="p-6">
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🛒</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-emerald-900 mb-1">การวิเคราะห์ตะกร้าสินค้า</h4>
                  <p className="text-sm text-emerald-700 mb-3">
                    ค้นหาความสัมพันธ์ของสินค้าและรูปแบบการซื้อด้วย Advanced Apriori Algorithm
                  </p>
                  <div className="space-y-2 text-sm text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Association Rules พร้อม Support, Confidence, Lift</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Frequent Itemsets Analysis</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Single Item Rules (ถ้ามี)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span>Export Excel และ CSV</span>
                    </div>
                  </div>
                </div>
                <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h5 className="font-semibold text-blue-900 mb-2">💡 คำแนะนำการเลือกคอลัมน์:</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• เลือกคอลัมน์ที่มี transaction_id หรือ order_id</li>
                <li>• เลือกคอลัมน์ที่มีชื่อสินค้าหรือ item_description</li>
                <li>• สามารถเลือกคอลัมน์เพิ่มเติมได้ตามต้องการ</li>
                <li>• ระบบจะตรวจจับคอลัมน์ที่เหมาะสมอัตโนมัติ</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Data Preview */}
      {showPreview && (
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">ตัวอย่างข้อมูล</h3>
            <p className="text-gray-600 text-sm mt-2">
              5 แถวแรกของข้อมูลของคุณ
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className={`px-4 py-3 text-left text-sm font-medium transition-colors ${
                        selectedColumns.includes(index)
                          ? 'text-blue-700 bg-blue-50'
                          : 'text-gray-500'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={`px-4 py-3 text-sm transition-colors ${
                          selectedColumns.includes(cellIndex)
                            ? 'text-blue-900 bg-blue-25'
                            : 'text-gray-900'
                        }`}
                      >
                        {cell}
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
          onClick={handleProceed}
          disabled={selectedColumns.length === 0}
          className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
            selectedColumns.length > 0
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          🛒 เริ่มวิเคราะห์ตะกร้าสินค้า ({selectedColumns.length} คอลัมน์)
        </button>
      </div>
    </div>
  );
};

export default ColumnSelector;