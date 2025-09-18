// คอมโพเนนต์หน้าแรก - Market Basket Analysis เท่านั้น
import React from 'react';                                             // นำเข้า React เพื่อประกาศคอมโพเนนต์แบบฟังก์ชัน (FC)
import { ShoppingCart, Zap, Shield, ArrowRight } from 'lucide-react';  // นำเข้าไอคอนจากไลบรารี lucide-react สำหรับใช้ตกแต่ง UI

// กำหนดชนิดของพร็อพที่คอมโพเนนต์ Hero คาดหวัง
interface HeroProps {
  onGetStarted: () => void;                                            // ฟังก์ชัน callback เมื่อกดปุ่ม "Start Analysis" (ให้พาเรนต์เปลี่ยนหน้า/สกรอลล์)
}

// ประกาศคอมโพเนนต์ Hero แบบฟังก์ชัน รับพร็อพ onGetStarted จากพาเรนต์
const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <>                                                                  {/* Fragment: ครอบเนื้อหาทั้งหมดโดยไม่สร้างโหนด DOM เพิ่ม */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-20">
        {/*
          ส่วนฮีโร่ (แบนเนอร์ใหญ่บนสุดของหน้า)
          - relative: ให้บุตรตำแหน่ง absolute ยึดอ้างกับ section นี้
          - overflow-hidden: ซ่อนส่วนที่ล้น (เช่น ลวดลายพื้นหลัง)
          - bg-gradient-to-br ...: ไล่สีพื้นหลังจากมุมซ้ายบนไปขวาล่าง (ฟ้าอ่อน → ขาว → เขียวมรกตอ่อน)
          - py-20: เว้นระยะตั้งบน/ล่างเยอะเพื่อให้ดูโปร่ง
        */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        {/*
          เลเยอร์พื้นหลังแบบลวดลาย (grid) คลุมเต็มพื้นที่
          - absolute + inset-0: กินพื้นที่เท่ากับพ่อ
          - bg-grid-pattern: คลาสกำหนดรูปแบบพื้นหลัง (คุณนิยามไว้ใน CSS)
          - opacity-5: ความโปร่ง 5% ให้เห็นแผ่ว ๆ
        */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/*
            คอนเทนเนอร์เนื้อหาหลัก
            - relative: เพื่อวางซ้อนเหนือพื้นหลัง (absolute) ด้านบน
            - max-w-7xl: จำกัดความกว้างสูงสุด (อ่านง่ายบนจอใหญ่)
            - mx-auto: จัดกลางแนวนอน
            - px-4/sm:px-6/lg:px-8: ระยะขอบซ้ายขวาตาม breakpoint
          */}
          <div className="text-center">                               {/* จัดข้อความตรงกลาง */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {/*
                หัวข้อใหญ่ของหน้า
                - ขนาดตัวอักษรใหญ่ขึ้นบนจอ md ขึ้นไป (4xl → 6xl)
                - font-bold: ตัวหนา
                - text-gray-900: สีเข้ม อ่านง่าย
                - mb-6: ระยะห่างด้านล่าง
              */}
              Market{' '}                                              {/* ใส่ช่องว่างแบบ JSX ปลอดภัย */}
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                {/*
                  ทำข้อความ "Basket Analysis" เป็นไล่สี:
                  - bg-gradient-to-r: ไล่สีซ้าย→ขวา (เขียวมรกต → น้ำเงิน)
                  - bg-clip-text + text-transparent: ทำให้สีตัวอักษรโปร่งใสแล้ว "คลิป" ให้เห็นสีพื้นหลังเป็นตัวอักษร
                */}
                Basket Analysis
              </span>
              <br />                                                   {/* ตัดบรรทัดใหม่ */}
              Made Simple                                              {/* คำโปรยต่อท้าย */}
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {/*
                คำอธิบายสั้น ๆ ใต้หัวเรื่อง
                - text-xl: ใหญ่กว่าปกติ
                - text-gray-600: สีเทากลาง ดูซอฟต์
                - mb-8: เว้นด้านล่าง
                - max-w-3xl + mx-auto: จำกัดความกว้างและจัดกลางให้อ่านง่าย
                หมายเหตุ: ข้อความกล่าวถึง "Apriori with mlxtend" เป็นคำโปรย; ฝั่งแบ็กเอนด์ของโปรเจกต์คุณอาจใช้เอ็นจิ้น Apriori แบบ internal
              */}
              Upload your transaction data and discover hidden patterns in customer purchasing behavior using advanced Apriori algorithm with mlxtend library.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {/*
                แถวของปุ่ม CTA
                - บนจอเล็ก: เรียงตั้ง (flex-col), จอ sm ขึ้นไป: เรียงแถว (flex-row)
                - gap-4: ระยะห่างระหว่างปุ่ม
                - justify-center: จัดกลางแนวนอน
                - mb-12: เว้นล่าง
              */}
              <button
                onClick={onGetStarted}                                // เมื่อคลิก ให้เรียก callback จากพาเรนต์ (เช่น เปิดหน้าอัปโหลด/สกรอลล์ไปยังส่วนอัปโหลด)
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                {/*
                  ปุ่ม CTA "Start Analysis"
                  - ไล่สีเขียวมรกต, ตัวอักษรสีขาว
                  - padding แนวนอน 8 แนวตั้ง 3
                  - rounded-lg: มุมโค้ง
                  - font-semibold: หนาปานกลาง
                  - hover: เปลี่ยนเฉดสี + ขยายเล็กน้อย + เงาหนักขึ้น
                  - flex items-center justify-center space-x-2: จัดไอคอนและข้อความให้อยู่กลางและห่างกันพอเหมาะ
                */}
                <span>Start Analysis</span>                           {/* ข้อความบนปุ่ม */}
                <ArrowRight className="h-5 w-5" />                    {/* ไอคอนไปข้างหน้า ขนาด 20x20 */}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              {/*
                การ์ดฟีเจอร์ 3 ใบ เรียงเป็น 1 คอลัมน์บนจอเล็ก และ 3 คอลัมน์บนจอ md ขึ้นไป
                - gap-8: ระยะห่างระหว่างการ์ด
                - mt-16: เว้นบนจากส่วน CTA
              */}

              {/* การ์ดที่ 1: Advanced Basket Analysis */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                {/*
                  สไตล์การ์ดแบบแก้ว (glass):
                  - bg-white/60 + backdrop-blur-sm: พื้นหลังขาวโปร่ง + เบลอข้างหลัง
                  - rounded-xl: มุมโค้งใหญ่
                  - p-6: padding ภายใน
                  - border-white/20: ขอบสีขาวโปร่งบาง ๆ
                  - shadow-lg และ hover:shadow-xl: เงาเล็ก/ใหญ่เมื่อโฮเวอร์
                  - hover:scale-105: ขยายเล็กน้อยเวลาชี้
                */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-3 rounded-lg w-fit mx-auto mb-4">
                  {/* กล่องพื้นหลังไล่สีสำหรับไอคอน ตรงกลางการ์ด */}
                  <ShoppingCart className="h-6 w-6 text-white" />      {/* ไอคอนรถเข็น สื่อถึงตะกร้าสินค้า */}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Basket Analysis</h3>
                <p className="text-gray-600">
                  {/* คำอธิบายจุดเด่นของฟีเจอร์ใบนี้ */}
                  Discover association rules with Support, Confidence, and Lift metrics using mlxtend library.
                </p>
              </div>
              
              {/* การ์ดที่ 2: Lightning Fast */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Zap className="h-6 w-6 text-white" />               {/* ไอคอนสายฟ้า สื่อถึงความเร็ว */}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-gray-600">
                  {/* อธิบายว่าอัลกอริทึมได้รับการปรับปรุงให้ประมวลผลไว */}
                  Process thousands of transactions in seconds with optimized Apriori algorithm.
                </p>
              </div>
              
              {/* การ์ดที่ 3: Secure & Private */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Shield className="h-6 w-6 text-white" />            {/* ไอคอนโล่ สื่อถึงความปลอดภัย */}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
                <p className="text-gray-600">
                  {/* อธิบายแนวคิดการจัดการข้อมูลอย่างปลอดภัย (ฝั่งแบ็กเอนด์มีฟังก์ชันลบไฟล์เก่าตามเวลา) */}
                  Your data is processed securely and automatically deleted after analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

// ส่งออกคอมโพเนนต์ Hero เพื่อให้พาเรนต์ (เช่น หน้า Landing) นำไปใช้งาน
export default Hero;
