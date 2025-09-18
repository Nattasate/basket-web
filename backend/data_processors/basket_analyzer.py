"""
Basket analyzer (flex version): wraps flexible_basket to keep the same API that app.py expects.
- Auto-detects columns for item/order/customer/date (+list-mode via items/tags/categories)
- No mlxtend dependency
"""
# ↑ docstring อธิบายว่าไฟล์นี้เป็น "ตัวหุ้ม (wrapper)" สำหรับโมดูล flexible_basket
#   จุดประสงค์: คงรูปแบบ/สัญญา API ให้เข้ากับ app.py เดิม, เดาคอลัมน์อัตโนมัติ, และไม่พึ่ง mlxtend

import pandas as pd          # ใช้โครงสร้างข้อมูล DataFrame และการวนอ่านตาราง
import math                  # ใช้ตรวจสอบ NaN/Infinity และปัดทศนิยมอย่างปลอดภัย
import numpy as np           # ใช้ตรวจชนิดตัวเลขของ numpy (np.floating) เพื่อกัน NaN/Inf
from . import flexible_basket as fb  # นำเข้าโมดูลวิเคราะห์หลัก (pure-Python Apriori/Rules) ตั้งชื่อย่อ fb

class BasketAnalyzer:
    # ↑ คลาสตัวกลางระหว่าง Flask (หรือโค้ดส่วนอื่น) กับโมดูล flexible_basket
    #   หน้าที่: รับ DataFrame, เรียก fb.analyze_dataframe, แปลงผลเป็นรูปที่ frontend/exporter ใช้งานสะดวก

    def __init__(self, min_support: float = 0.001, min_lift: float = 1.0):
        # ↑ คอนสตรักเตอร์: กำหนดพารามิเตอร์ค่าเริ่มต้นสำหรับการวิเคราะห์
        self.min_support = float(min_support)  # เก็บค่า support ขั้นต่ำสำหรับ frequent itemsets (สัดส่วนธุรกรรม)
        self.min_lift = float(min_lift)        # เก็บค่า lift ขั้นต่ำสำหรับคัดกรองกฎความสัมพันธ์

    def analyze_basket(self, selected_df: pd.DataFrame, original_df: pd.DataFrame):
        """
        Keep signature compatible with the old app.py.
        Returns a dict with keys used by create_download_files():
          - success, type='basket', meta, rulesTable, singleRulesTable, frequentItemsetsTable
        """
        # ↑ เมธอดหลักที่ app.py เดิมคาดหวัง:
        #   รับ df ที่ผู้ใช้เลือกคอลัมน์ (selected_df) และ df เต็ม (original_df)
        #   คืน dict ที่มีคีย์สำหรับสรุปผล + ตารางที่ frontend/exporter ใช้ได้ทันที

        try:
            # If user selected subset columns, use that, else use original_df
            df = selected_df if selected_df is not None and not selected_df.empty else original_df
            # ↑ เลือก DataFrame ที่จะใช้วิเคราะห์:
            #   - ถ้ามี selected_df และไม่ว่าง → ใช้ selected_df (ผู้ใช้เลือกคอลัมน์ย่อย)
            #   - มิฉะนั้น → ใช้ original_df (ข้อมูลเต็ม)
            if df is None or df.empty:
                return {'success': False, 'error': 'Empty dataframe', 'type': 'basket'}
            # ↑ ถ้าไม่มีข้อมูลให้วิเคราะห์ → คืนผลล้มเหลว (success=False) พร้อมข้อความอธิบาย

            # Run analysis
            rules_df, fi_df, meta = fb.analyze_dataframe(
                df,
                min_support=self.min_support,
                min_lift=self.min_lift
            )
            # ↑ เรียก “เครื่องยนต์วิเคราะห์” จาก flexible_basket:
            #   - analyze_dataframe จะเดาคอลัมน์ (item/order/customer/date) อัตโนมัติ
            #   - สร้างธุรกรรม → รัน Apriori (pure Python) → สร้าง association rules
            #   - คืนค่า: rules_df (ตารางกฎ), fi_df (ตาราง frequent itemsets), meta (สรุป/ข้อมูลเดา)

            # Helper to make numbers JSON-safe (no NaN/Infinity)
            def safe_num(x, ndigits=6):
                # ↑ ฟังก์ชันช่วยทำให้ตัวเลข “ปลอดภัยสำหรับ JSON”:
                #   - พยายามแปลงเป็น float
                #   - ถ้าเป็น NaN/Infinity → คืน None (กลายเป็น null ใน JSON)
                #   - ถ้าปกติ → ปัดทศนิยมตาม ndigits
                try:
                    v = float(x)             # พยายามแปลงค่าใด ๆ เป็น float
                except Exception:
                    return None              # แปลงไม่ได้ → ให้ None
                # Treat NaN/inf as None to keep valid JSON
                if (isinstance(v, float) and (math.isnan(v) or math.isinf(v))) or (
                    isinstance(x, (np.floating,)) and (np.isnan(x) or np.isinf(x))
                ):
                    return None              # ถ้าเป็น NaN/Inf (ทั้งของ float และ np.floating) → None
                try:
                    return round(v, ndigits) # ปัดทศนิยม (ค่าเริ่มต้น 6 ตำแหน่ง)
                except Exception:
                    return v                 # ถ้าปัดไม่ได้ (กรณีแปลก) → คืนค่าดิบ

            # Prepare tables for frontend/exporter
            # Association Rules table
            rulesTable = []                  # ลิสต์ของ dict สำหรับ “กฎความสัมพันธ์” (อ่านง่ายใน UI/Excel/CSV)
            if not rules_df.empty:
                for i, row in rules_df.iterrows():  # วนทีละแถวใน DataFrame ของกฎ
                    # pretty print tuples
                    ant = ", ".join(list(row['antecedents'])) if isinstance(row['antecedents'], (list, tuple)) else str(row['antecedents'])
                    # ↑ antecedents อาจเป็น list/tuple → รวมเป็นสตริงด้วย ", " เพื่ออ่านง่าย (เช่น "Milk, Bread")
                    con = ", ".join(list(row['consequents'])) if isinstance(row['consequents'], (list, tuple)) else str(row['consequents'])
                    # ↑ consequents เช่นเดียวกัน
                    rulesTable.append({
                        "Antecedents": ant,                                  # ฝั่งซ้ายของกฎ (เงื่อนไข)
                        "Consequents": con,                                  # ฝั่งขวาของกฎ (สิ่งที่ตาม)
                        "Support": safe_num(row.get("support", 0.0)),        # สัดส่วนธุรกรรมที่มี A∪B
                        "Confidence": safe_num(row.get("confidence", 0.0)),  # P(B|A) = supp(A∪B)/supp(A)
                        "Lift": safe_num(row.get("lift", 0.0)),              # lift = confidence / supp(B)
                    })
            # ↑ ได้ rulesTable เป็นรูปพร้อมใช้งานสำหรับส่งกลับ UI หรือเขียนไฟล์รายงาน

            # Frequent Itemsets table
            frequentItemsetsTable = []       # ลิสต์ของ dict สำหรับ frequent itemsets
            if not fi_df.empty:
                for i, row in fi_df.iterrows():  # วนทุกแถวใน DataFrame ของ frequent itemsets
                    it = row.get("itemset")      # ค่าชุดสินค้า (tuple/list ของชื่อสินค้า)
                    if isinstance(it, (list, tuple)):
                        items = ", ".join(list(it))  # รวมเป็นสตริงอ่านง่าย
                    else:
                        items = str(it)             # ถ้าไม่ใช่ list/tuple → แปลงเป็นสตริงตรง ๆ
                    frequentItemsetsTable.append({
                        "Itemset": items,                           # ชุดสินค้า (เช่น "Milk, Bread")
                        "Length": int(row.get("length", 0)),        # จำนวนสินค้าภายในชุด
                        "Support": safe_num(row.get("support", 0.0))# สัดส่วนธุรกรรมที่พบชุดนั้น
                    })

            # Single item "rules" (optional, for UI compatibility) => Top-20 items by support as 1→null
            singleRulesTable = []               # “กฎเดี่ยว” ใช้ใน UI เดิม: แสดง top-20 สินค้ารายตัวตาม support
            if not fi_df.empty:
                single = fi_df[fi_df["length"]==1].head(20)  # คัดเฉพาะ itemset ขนาด 1 และเอา 20 รายการแรก
                for i, row in single.iterrows():
                    it = row.get("itemset")
                    items = ", ".join(list(it)) if isinstance(it, (list, tuple)) else str(it)  # ชื่อสินค้าชิ้นเดียว
                    singleRulesTable.append({
                        "Antecedents": items,                        # ใส่ชื่อสินค้าฝั่งซ้าย
                        "Consequents": "",                           # ฝั่งขวาว่าง (เพื่อความเข้ากันได้กับ UI เดิม)
                        "Support": round(float(row.get("support", 0.0)), 6),  # ปัด support 6 ตำแหน่ง
                        "Confidence": "",                            # ไม่คำนวณในโหมด “เดี่ยว”
                        "Lift": "",                                  # ไม่คำนวณในโหมด “เดี่ยว”
                    })

            # Totals for summary widgets/downloads
            total_rules = len(rulesTable)                                            # จำนวนกฎทั้งหมด
            total_freq_itemsets = int(len(fi_df)) if isinstance(fi_df, pd.DataFrame) else 0
            # ↑ ถ้า fi_df เป็น DataFrame จริง → นับจำนวนแถวทั้งหมด
            total_transactions = int(meta.get("n_transactions", 0))                 # จำนวนธุรกรรม (จาก meta)
            total_items = int(meta.get("n_unique_items", 0))                         # จำนวนสินค้าไม่ซ้ำ (จาก meta)

            output = {
                "success": True,                      # ธงสำเร็จ
                "type": "basket",                     # ประเภทวิเคราะห์ (ใช้กับ UI/Exporter)
                "meta": {                             # ข้อมูลเมตาไว้โชว์/ตรวจสอบ
                    "detectedItemCol": meta.get("detected_item_col"),     # คอลัมน์สินค้าที่ระบบเดา/ใช้จริง
                    "detectedTransCol": meta.get("detected_trans_col"),   # คอลัมน์ธุรกรรมที่ระบบเดา/ใช้จริง
                    "nTransactions": meta.get("n_transactions", 0),       # จำนวนธุรกรรมทั้งหมด
                    "nUniqueItems": meta.get("n_unique_items", 0),        # จำนวนสินค้าไม่ซ้ำ
                    "heuristics": meta.get("heuristics", {}),             # รายละเอียดการเดาคอลัมน์/โหมด list
                    "minSupport": self.min_support,                       # ค่าพารามิเตอร์ที่ใช้จริง
                    "minLift": self.min_lift
                },
                # analysis metadata (used by UI label)
                "analysis": {                       # บอก “เครื่องยนต์” ที่ใช้ เพื่อแสดงป้ายใน UI
                    "method": "flex_apriori",       # เมธอดวิเคราะห์ (Apriori แบบ flexible/pure Python)
                    "engine": "python",             # รันบน Python (ไม่พึ่งไลบรารีภายนอกอย่าง mlxtend)
                    "library": "internal"           # ไลบรารีภายในโปรเจ็กต์
                },
                # top-level totals for UI summary
                "totalRules": total_rules,                          # จำนวนกฎรวม
                "totalTransactions": total_transactions,            # จำนวนธุรกรรมรวม
                "totalItems": total_items,                          # จำนวนสินค้าไม่ซ้ำรวม
                "totalFrequentItemsets": total_freq_itemsets,       # จำนวน frequent itemsets รวม
                "rulesTable": rulesTable,                           # ตารางกฎ (พร้อมแสดง/ส่งออก)
                "singleRulesTable": singleRulesTable,               # ตาราง “กฎเดี่ยว” (Top-20 รายการเดี่ยว)
                "frequentItemsetsTable": frequentItemsetsTable      # ตาราง frequent itemsets (ชุดสินค้า)
            }
            return output  # ↑ คืนผลลัพธ์ให้ผู้เรียก (เช่น Flask endpoint จะ jsonify ส่งให้ frontend)

        except Exception as e:
            return {"success": False, "error": str(e), "type": "basket"}
            # ↑ หากเกิดข้อผิดพลาดระหว่างวิเคราะห์/จัดรูปข้อมูล:
            #   - ส่ง success=False และข้อความ error กลับไปให้ผู้ใช้/ระบบถัดไปจัดการ
