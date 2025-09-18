// คอมโพเนนต์ส่วนหัวของเว็บไซต์ - Market Basket Analysis
import React from 'react';                                              // นำเข้า React เพื่อใช้ประกาศคอมโพเนนต์แบบฟังก์ชัน (FC)
import { ShoppingCart, Upload, BarChart3, Download } from 'lucide-react'; // นำเข้าไอคอนจากไลบรารี lucide-react สำหรับใช้ในแถบเมนู/แบรนด์

// ประกาศคอมโพเนนต์ Header แบบฟังก์ชัน โดยไม่รับพร็อพ (FC = React.FunctionComponent)
const Header: React.FC = () => {
  return (
    <>                                                                 // Fragment ครอบองค์ประกอบทั้งหมด (ไม่สร้าง DOM wrapper เพิ่ม)
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        {/* 
          <header> คือส่วน head bar ของหน้าเว็บ
          - bg-white/10: พื้นหลังสีขาวโปร่ง 10% (ทำให้ด้านหลังพอมองเห็น)
          - backdrop-blur-md: ทำเอฟเฟกต์เบลอพื้นหลัง (glassmorphism) เมื่อมีพื้นหลังเลื่อนผ่าน
          - border-b border-white/20: เส้นขอบล่างสีขาวโปร่ง 20% สร้างเส้นคั่น
          - sticky top-0: ทำให้ header “ติด” ด้านบนหน้าจอขณะเลื่อน (sticky header)
          - z-50: กำหนดลำดับซ้อน (z-index) สูง เพื่อให้ลอยเหนือคอนเทนต์อื่น
        */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 
            คอนเทนเนอร์ความกว้างสูงสุด (max-w-7xl) และกึ่งกลาง (mx-auto)
            มี padding ด้านข้างแตกต่างตาม breakpoint: base=4, sm=6, lg=8 
            ใช้เป็นกริดแนวนอนสำหรับโลโก้ (ซ้าย) และเมนู (ขวา)
          */}
          <div className="flex items-center justify-between h-16">
            {/* 
              แถวหลักภายในเฮดเดอร์:
              - flex: จัดวางแนวนอน
              - items-center: จัดกึ่งกลางแนวแกนตั้ง
              - justify-between: เว้นระยะซ้าย-ขวาให้ห่าง (โลโก้ซ้าย / เมนูขวา)
              - h-16: ความสูงแถบ header 64px
            */}
            <div className="flex items-center space-x-3">
              {/* กล่องฝั่งซ้าย: โลโก้/ไอคอน + ชื่อแบรนด์ */}
              <div className="bg-gradient-to-r from-emerald-500 to-blue-500 p-2 rounded-lg">
                {/* 
                  กล่องพื้นหลังไล่สี (เขียว → น้ำเงิน) สำหรับแบรนด์ไอคอน
                  - p-2: padding รอบไอคอน
                  - rounded-lg: มุมโค้ง
                */}
                <ShoppingCart className="h-6 w-6 text-white" />
                {/* ไอคอนรถเข็น เป็นสัญลักษณ์ของ Market Basket / e-commerce, กำหนดขนาด 24x24 และสีขาว */}
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                {/* 
                  ข้อความชื่อแบรนด์ "Data First"
                  - text-2xl font-bold: ตัวใหญ่และหนา
                  - bg-gradient-to-r ... : ไล่สีพื้นหลังข้อความ
                  - bg-clip-text text-transparent: ทำให้ “สีตัวอักษร” โปร่งใส แล้วโชว์สีจากพื้นหลังไล่สี (gradient text)
                */}
                Data First
              </h1>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              {/* 
                แถบนำทาง (เมนู) ฝั่งขวา:
                - hidden md:flex: ซ่อนบนจอเล็ก (มือถือ) และแสดงเป็น flex ตั้งแต่จอ md ขึ้นไป
                - items-center: จัดกลางแนวตั้ง
                - space-x-8: ระยะห่างระหว่างเมนูแต่ละอัน
                * ปัจจุบันเป็นลิงก์แบบ “สแตติก” (ไม่มี onClick/Link) ใช้เป็นตัวบอกขั้นตอน: Upload → Analyze → Download
                * โดยปกติจะเชื่อมกับระบบนำทาง (เช่น react-router) หรือสกรอลล์ไปยัง section ที่เกี่ยวข้อง
              */}
              <div className="flex items-center space-x-2 text-gray-600 hover:text-emerald-600 transition-colors">
                {/* เมนู Upload: โทนสีเทา และเมื่อ hover เปลี่ยนเป็นเขียวมรกต */}
                <Upload className="h-4 w-4" />                           {/* ไอคอนอัปโหลด ขนาดเล็ก 16x16 */}
                <span className="font-medium">Upload</span>               {/* ป้ายข้อความเมนู */}
              </div>
              <div className="flex items-center space-x-2 text-gray-600 hover:text-emerald-600 transition-colors">
                {/* เมนู Analyze: ขั้นตอนวิเคราะห์ */}
                <BarChart3 className="h-4 w-4" />                        {/* ไอคอนกราฟ แทนขั้นตอนการวิเคราะห์ */}
                <span className="font-medium">Analyze</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 hover:text-emerald-600 transition-colors">
                {/* เมนู Download: ขั้นตอนดาวน์โหลดผลลัพธ์ */}
                <Download className="h-4 w-4" />                         {/* ไอคอนดาวน์โหลด */}
                <span className="font-medium">Download</span>
              </div>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
};

// ส่งออกคอมโพเนนต์ Header เพื่อนำไปใช้ที่ส่วนบนของแอปลิเคชัน/หน้า (ให้ layout เรียบร้อยและคงที่)
export default Header;
