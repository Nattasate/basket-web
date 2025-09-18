# -*- coding: utf-8 -*-  # ระบุ encoding เพื่อรองรับคอมเมนต์/สตริงภาษาไทย

"""
Flask Backend สำหรับ Market Basket Analysis เท่านั้น
รองรับการวิเคราะห์ตะกร้าสินค้าด้วย mlxtend library
"""  # ↑ docstring: อธิบายภาพรวมของบริการ (แม้ในโปรเจกต์นี้เราหุ้มด้วย BasketAnalyzer ที่พึ่งพา flexible_basket)

from flask import Flask, request, jsonify, send_file  # นำเข้า Flask และเครื่องมือหลักสำหรับสร้าง API/รับคำขอ/ตอบ JSON/ส่งไฟล์
from flask_cors import CORS                           # เปิดใช้ CORS เพื่อให้เว็บ frontend ต่าง origin เรียก API ได้
import pandas as pd                                   # ใช้จัดการข้อมูลตาราง
import numpy as np                                    # ใช้จัดการข้อมูลเชิงตัวเลข/ตรวจ NaN ในบางกรณี
import json                                           # (สำรอง) แปลง Python <-> JSON ถ้าต้องใช้เพิ่มเติม
import io                                             # (สำรอง) ทำงานกับสตรีม bytes ในหน่วยความจำ
import os                                             # ใช้จัดการไฟล์/โฟลเดอร์/เส้นทาง
from datetime import datetime                         # ใช้เวลาปัจจุบัน สร้าง timestamp
import tempfile                                       # (สำรอง) ทำไฟล์ชั่วคราวถ้าจำเป็น
from werkzeug.utils import secure_filename            # ทำชื่อไฟล์ให้ปลอดภัยจาก input ผู้ใช้
import logging                                        # ระบบบันทึก log
import traceback                                      # ใช้พิมพ์ stack trace เมื่อเกิดข้อผิดพลาด

# Import data processor
from data_processors.basket_analyzer import BasketAnalyzer  # นำเข้าคลาสตัวประมวลผลที่หุ้ม flexible_basket ให้มี API เดิม

# สร้าง Flask app
app = Flask(__name__)  # สร้างอินสแตนซ์แอป Flask โดยใช้ชื่อโมดูลเป็นตัวระบุ
CORS(app)              # เปิดใช้งาน CORS กับแอป (ค่าเริ่มต้นอนุญาตทุกโดเมน)

# ตั้งค่า logging
logging.basicConfig(level=logging.INFO)  # ตั้งค่าระดับ log ขั้นต่ำเป็น INFO (จะเห็น info/warning/error)
logger = logging.getLogger(__name__)     # สร้าง logger ตามชื่อโมดูลนี้

# ตั้งค่าแอปพลิเคชัน
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB  # จำกัดขนาดไฟล์อัปโหลดสูงสุด
UPLOAD_FOLDER = 'uploads'                              # โฟลเดอร์เก็บไฟล์ที่อัปโหลดและไฟล์รายงานที่สร้าง
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}           # ประเภทไฟล์ที่อนุญาตให้อัปโหลด

# สร้างโฟลเดอร์ uploads
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # สร้างโฟลเดอร์ถ้ายังไม่มี (ไม่ error ถ้ามีอยู่แล้ว)

def allowed_file(filename):
    # คืนค่า True ถ้าชื่อไฟล์มีนามสกุล และนามสกุลอยู่ในชุดที่อนุญาต
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def read_file_safely(filepath):
    """อ่านไฟล์อย่างปลอดภัยด้วย encoding หลายแบบ"""
    try:
        if filepath.lower().endswith('.csv'):  # ถ้าเป็นไฟล์ CSV
            # ลอง encoding หลายแบบสำหรับ CSV เพื่อรับมือไฟล์จริงหลายแหล่ง
            encodings = ['utf-8', 'utf-8-sig', 'cp1252', 'iso-8859-1', 'tis-620', 'windows-1252']
            for encoding in encodings:
                try:
                    df = pd.read_csv(filepath, encoding=encoding)  # พยายามอ่านด้วย encoding นี้
                    print(f"✅ อ่าน CSV สำเร็จด้วย encoding: {encoding}")   # log สั้น ๆ
                    return df  # ถ้าอ่านสำเร็จ คืน DataFrame ทันที
                except UnicodeDecodeError:
                    continue  # ถ้าอ่านไม่ได้ (ตัวอักษรเพี้ยน) ลอง encoding ตัวถัดไป
            
            # ถ้าทั้งหมดด้านบนไม่ได้ ลองใช้ chardet ตรวจจับ encoding อัตโนมัติ
            try:
                import chardet
                with open(filepath, 'rb') as f:
                    raw_data = f.read()                 # อ่านข้อมูลดิบ
                    detected = chardet.detect(raw_data) # ให้ chardet เดา encoding
                    if detected['encoding']:
                        df = pd.read_csv(filepath, encoding=detected['encoding'])  # อ่านด้วย encoding ที่ตรวจพบ
                        print(f"✅ อ่าน CSV สำเร็จด้วย detected encoding: {detected['encoding']}")
                        return df
            except:
                pass  # ถ้า chardet มีปัญหา ก็ปล่อยผ่านเพื่อไป raise ข้างล่าง
                
        else:
            # สำหรับ Excel (xlsx/xls)
            try:
                df = pd.read_excel(filepath, engine='openpyxl')  # ลองใช้ openpyxl (เหมาะกับ xlsx/xlsm)
                print("✅ อ่าน Excel สำเร็จด้วย openpyxl")
                return df
            except:
                try:
                    df = pd.read_excel(filepath, engine='xlrd')  # สำรอง: xlrd (บางเวอร์ชันรองรับ xls เก่า)
                    print("✅ อ่าน Excel สำเร็จด้วย xlrd")
                    return df
                except:
                    pass  # ถ้าอ่านไม่ได้ทั้งสองแบบ ให้ไป raise ด้านล่าง
        
        raise Exception("ไม่สามารถอ่านไฟล์ได้")  # ถ้าทดลองทั้งหมดแล้วยังไม่ได้ ให้ยกข้อผิดพลาด
        
    except Exception as e:
        # ห่อข้อความข้อผิดพลาดเพื่อบอกผู้ใช้/ฝั่งเรียก
        raise Exception(f"เกิดข้อผิดพลาดในการอ่านไฟล์: {str(e)}")

def create_download_files(results, filename):
    """สร้างไฟล์สำหรับดาวน์โหลด - เฉพาะ Excel และ CSV"""
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')  # ตีเวลาไว้ในชื่อไฟล์เพื่อไม่ชนกัน
        base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename  # ชื่อไฟล์ต้นฉบับไม่รวมนามสกุล
        
        output_files = {}  # เก็บชื่อไฟล์ผลลัพธ์ที่สร้างได้
        
        # 1. Excel File - Complete Report
        excel_filename = f"basket_analysis_{base_name}_{timestamp}.xlsx"  # ตั้งชื่อไฟล์รายงาน Excel
        excel_filepath = os.path.join(UPLOAD_FOLDER, excel_filename)       # path ปลายทางในโฟลเดอร์ uploads
        
        with pd.ExcelWriter(excel_filepath, engine='openpyxl') as writer:  # เปิด writer สำหรับ Excel
            # Summary sheet (สรุปผลรวม)
            summary_data = {
                'Metric': ['Analysis Type', 'Original File', 'Generated At', 'Total Rules', 'Total Transactions', 'Total Items'],
                'Value': [
                    'Market Basket Analysis',                 # ประเภทวิเคราะห์
                    filename,                                 # ชื่อไฟล์ต้นทาง
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),  # เวลาออกไฟล์
                    results.get('totalRules', 0),            # จำนวนกฎทั้งหมด
                    results.get('totalTransactions', 0),     # จำนวนธุรกรรมทั้งหมด
                    results.get('totalItems', 0)             # จำนวนสินค้าที่ไม่ซ้ำ
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)  # เขียนชีต Summary
            
            # All Association Rules (ทุกกฎความสัมพันธ์)
            if 'rulesTable' in results and results['rulesTable']:
                rules_df = pd.DataFrame(results['rulesTable'])         # แปลงลิสต์ dict → DataFrame
                rules_df.to_excel(writer, sheet_name='Association Rules', index=False)  # เขียนชีต Rules
            
            # Single Item Rules (ถ้ามี)
            if 'singleRulesTable' in results and results['singleRulesTable']:
                single_rules_df = pd.DataFrame(results['singleRulesTable'])
                single_rules_df.to_excel(writer, sheet_name='Single Item Rules', index=False)  # เขียนชีต Single
            
            # Frequent Itemsets
            if 'frequentItemsetsTable' in results and results['frequentItemsetsTable']:
                frequent_df = pd.DataFrame(results['frequentItemsetsTable'])
                frequent_df.to_excel(writer, sheet_name='Frequent Itemsets', index=False)  # เขียนชีต Itemsets
        
        output_files['excel'] = excel_filename  # จดชื่อไฟล์ Excel ไว้ให้ฝั่งหน้าเว็บโหลด
        
        # 2. CSV File - Association Rules (เฉพาะตารางกฎ)
        csv_filename = f"association_rules_{base_name}_{timestamp}.csv"  # ตั้งชื่อไฟล์ CSV
        csv_filepath = os.path.join(UPLOAD_FOLDER, csv_filename)         # path ปลายทาง
        
        if 'rulesTable' in results and results['rulesTable']:
            rules_df = pd.DataFrame(results['rulesTable'])
            rules_df.to_csv(csv_filepath, index=False, encoding='utf-8-sig')  # CSV ที่เปิดใน Excel ได้ดี (มี BOM)
        
        output_files['csv'] = csv_filename  # จดชื่อไฟล์ CSV
        
        return True, output_files  # ส่งสถานะสำเร็จ + รายชื่อไฟล์กลับไป
        
    except Exception as e:
        print(f"❌ Error creating download files: {str(e)}")  # log ข้อผิดพลาดกรณีสร้างไฟล์ล้มเหลว
        return False, str(e)                                  # ส่งสถานะล้มเหลว + ข้อความ error

@app.route('/api/health', methods=['GET'])
def health_check():
    """ตรวจสอบสถานะของ API"""
    # ส่งสถานะพื้นฐานให้ frontend เช็คว่า API ยังทำงานปกติไหม
    return jsonify({
        'status': 'healthy',                      # สถานะระบบ
        'timestamp': datetime.now().isoformat(),  # เวลาปัจจุบัน (ISO 8601)
        'message': 'Market Basket Analysis API is running successfully'  # ข้อความบอกพร้อมใช้งาน
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """อัปโหลดไฟล์ Excel/CSV และแปลงเป็น JSON"""
    try:
        print("📁 Received upload request")  # log ฝั่งเซิร์ฟเวอร์ว่ามีคำขออัปโหลด
        
        if 'file' not in request.files:  # ตรวจว่ามีพารามิเตอร์ 'file' ในฟอร์มมั้ย
            return jsonify({'error': 'No file provided'}), 400  # ถ้าไม่มี ให้ตอบ 400
        
        file = request.files['file']  # ดึงไฟล์จากคำขอ
        if file.filename == '':       # ถ้าชื่อไฟล์ว่าง
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):  # ตรวจนามสกุลไฟล์ว่าอนุญาตไหม
            return jsonify({'error': 'File type not allowed. Please upload Excel or CSV files.'}), 400
        
        print(f"📄 Processing file: {file.filename}")  # log ชื่อไฟล์ที่รับเข้ามา
        
        # บันทึกไฟล์ลงดิสก์
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')            # ทำ prefix เวลาเพื่อกันชื่อซ้ำ
        filename = f"{timestamp}_{secure_filename(file.filename)}"       # ทำชื่อไฟล์ให้ปลอดภัย
        filepath = os.path.join(UPLOAD_FOLDER, filename)                 # สร้าง path ปลายทาง
        file.save(filepath)                                              # เซฟไฟล์จริงลงดิสก์
        
        print(f"✅ File saved as: {filename}")  # log ว่าเซฟเรียบร้อย
        
        # อ่านข้อมูลจากไฟล์เป็น DataFrame (รองรับหลาย encoding/engine ตามประเภทไฟล์)
        df = read_file_safely(filepath)
        
        # ทำความสะอาดข้อมูลแบบง่าย: แทน NaN เป็นสตริงว่าง เพื่อแสดงผลได้ง่ายขึ้นในหน้าเว็บ
        df = df.fillna('')
        
        # แปลง DataFrame เป็น list-of-lists สำหรับ frontend แสดงตัวอย่าง (preview)
        headers = [str(col) for col in df.columns.tolist()]  # แปลงหัวตารางเป็นสตริงทั้งหมด
        rows = []                                            # จะเก็บแถวข้อมูล
        
        # จำกัดจำนวนแถวที่ส่งกลับหน้าเว็บเพื่อพรีวิว (ลดภาระเครือข่าย/เบราว์เซอร์)
        display_df = df.head(1000)  # เอาเฉพาะ 1000 แถวแรก
        
        for _, row in display_df.iterrows():  # วนอ่านทีละแถว
            row_data = []
            for value in row:                 # วนผ่านทุกเซลล์ในแถวนั้น
                if pd.isna(value) or value is None:
                    row_data.append('')       # ถ้าเป็น NaN/None → แทนเป็นว่าง
                else:
                    row_data.append(str(value))  # แปลงเป็นสตริงเพื่อส่งเป็น JSON ได้ง่าย
            rows.append(row_data)             # เพิ่มแถวลงลิสต์
        
        data = [headers] + rows  # รวม header + rows เป็นก้อนเดียวสำหรับ frontend
        
        print(f"✅ File processed successfully. Total rows: {len(df)}, Display rows: {len(rows)}, Columns: {len(headers)}")
        # ↑ log ข้อมูลสถิติโดยย่อ
        
        response_data = {
            'success': True,                         # ธงความสำเร็จ
            'filename': filename,                    # ชื่อไฟล์ที่เซฟไว้ (ให้ frontend ใช้เรียก process ต่อ)
            'data': data,                            # ตัวอย่างข้อมูล (header + 1000 แถวแรก)
            'rows': len(df),                         # จำนวนแถวทั้งหมดของไฟล์จริง
            'columns': len(headers),                 # จำนวนคอลัมน์
            'column_names': headers,                 # รายชื่อคอลัมน์
            'file_size': os.path.getsize(filepath)   # ขนาดไฟล์เป็นไบต์
        }
        
        return jsonify(response_data)  # ส่ง JSON กลับไปให้ UI
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")             # เขียน log error
        print(f"❌ Upload error: {str(e)}")                 # แสดงบนคอนโซลเพื่อดีบัก
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500  # ตอบ 500 พร้อมข้อความ

@app.route('/api/process', methods=['POST'])
def process_data():
    """ประมวลผล Market Basket Analysis"""
    try:
        print("🔄 Starting Market Basket Analysis...")  # log เริ่มขั้นตอนประมวลผล
        data = request.get_json()                      # รับ payload JSON จากคำขอ POST
        
        if not data:                                   # ต้องมี payload
            return jsonify({'error': 'No data provided'}), 400
        
        filename = data.get('filename')                # ชื่อไฟล์ (ที่เซฟไว้ใน /uploads ตอนอัปโหลด)
        selected_columns = data.get('selectedColumns', [])  # ดัชนีคอลัมน์ที่ผู้ใช้เลือก (optional)
        
        print(f"📊 Processing: {filename}, Columns: {len(selected_columns)}")  # log บอกพารามิเตอร์
        
        if not filename:                               # ถ้าไม่ส่งชื่อไฟล์มา ถือว่าใช้ต่อไม่ได้
            return jsonify({'error': 'Missing filename'}), 400
        
        # อ่านไฟล์ที่อัปโหลดไว้จากดิสก์
        filepath = os.path.join(UPLOAD_FOLDER, filename)  # path ของไฟล์ต้นฉบับ
        if not os.path.exists(filepath):                  # ถ้าไฟล์ไม่อยู่แล้ว (ถูกลบ/หมดอายุ)
            return jsonify({'error': 'File not found'}), 404
        
        # อ่านข้อมูลทั้งหมดสำหรับประมวลผล
        df = read_file_safely(filepath)
        print(f"✅ File read successfully. Shape: {df.shape}")  # log ขนาดข้อมูล
        
        # เลือกเฉพาะคอลัมน์ที่ต้องการ (ถ้าผู้ใช้เลือกไว้เป็นดัชนี)
        if selected_columns:
            try:
                selected_df = df.iloc[:, selected_columns]  # เลือกด้วยตำแหน่งคอลัมน์ (list ของ index)
                print(f"📋 Selected columns: {selected_df.columns.tolist()}")  # log รายชื่อคอลัมน์ที่ใช้จริง
            except IndexError:
                return jsonify({'error': 'Selected columns are out of range'}), 400  # กรณี index ผิดช่วง
        else:
            selected_df = df  # ถ้าไม่ระบุ → ใช้ทั้งตาราง
        
        # ประมวลผล Market Basket Analysis ด้วย BasketAnalyzer (หุ้ม flexible_basket)
        print(f"⚙️ Running Market Basket Analysis...")
        analyzer = BasketAnalyzer(min_support=0.001, min_lift=1.0)  # ตั้งค่าเกณฑ์พื้นฐาน
        results = analyzer.analyze_basket(selected_df, df)          # เรียกวิเคราะห์และได้ผลลัพธ์เป็น dict พร้อมใช้
        
        if not results.get('success'):  # หากการวิเคราะห์ล้มเหลว (เช่น df ว่าง/จับคอลัมน์ไม่ได้)
            return jsonify({'error': results.get('error', 'Analysis failed')}), 500
        
        print("✅ Analysis completed")  # log สำเร็จ
        
        # สร้างไฟล์ผลลัพธ์ (Excel+CSV) เพื่อให้ดาวน์โหลด
        print("💾 Creating download files...")
        success, output_files = create_download_files(results, filename)
        
        if not success:
            # ถ้าสร้างไฟล์ไม่ครบ/ไม่สำเร็จบางส่วน ก็แจ้งเตือนและส่ง outputFiles ว่างกลับไป
            print(f"⚠️ Warning: Could not create all download files: {output_files}")
            output_files = {}
        
        print("🎉 Processing completed successfully")  # log จบกระบวนการทั้งหมด
        
        return jsonify({
            'success': True,                         # ธงความสำเร็จ
            'analysisType': 'basket',                # ประเภทการวิเคราะห์ (เผื่อรองรับชนิดอื่นในอนาคต)
            'selectedColumns': selected_columns,     # ดัชนีคอลัมน์ที่ผู้ใช้เลือก
            'results': results,                      # ผลลัพธ์เต็มจาก BasketAnalyzer (rulesTable/fiTable/meta/สรุป)
            'outputFiles': output_files,             # ชื่อไฟล์สำหรับดาวน์โหลด (excel/csv) ในโฟลเดอร์ uploads
            'summary': {                             # ข้อมูลสรุปเพิ่มเติมสำหรับ UI
                'totalRows': len(df),                # จำนวนแถวทั้งหมด
                'processedRows': len(selected_df),   # จำนวนแถวที่ใช้วิเคราะห์จริง
                'selectedColumns': len(selected_columns) if selected_columns else len(df.columns),  # จำนวนคอลัมน์ที่ใช้
                'totalColumns': len(df.columns),     # จำนวนคอลัมน์ทั้งหมด
                'processingTime': 'Completed',       # (ตัวอย่าง) สถานะเวลา (ยังไม่ได้วัดจริง)
                'completedAt': datetime.now().isoformat()  # เวลาที่เสร็จงาน
            }
        })
        
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")  # บันทึก error ลง logger
        print(f"❌ Processing error: {str(e)}")      # พิมพ์ error บนคอนโซล
        traceback.print_exc()                        # แสดง stack trace เพื่อดีบัก
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500  # ตอบกลับสถานะ 500 พร้อมข้อความ

@app.route('/api/download/<format>/<filename>', methods=['GET'])
def download_file(format, filename):
    """ดาวน์โหลดไฟล์ผลลัพธ์"""
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)  # สร้าง path ของไฟล์ที่ผู้ใช้ร้องขอ
        if not os.path.exists(filepath):                  # ถ้าไม่พบไฟล์ในดิสก์
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(filepath, as_attachment=True)    # ส่งไฟล์ให้ดาวน์โหลดเป็นไฟล์แนบ
        
    except Exception as e:
        logger.error(f"Download error: {str(e)}")         # บันทึก error กรณีส่งไฟล์ล้มเหลว
        return jsonify({'error': f'Download failed: {str(e)}'}), 500  # ตอบ 500 พร้อมข้อความ

# ทำความสะอาดไฟล์เก่า
def cleanup_old_files():
    """ลบไฟล์เก่าที่เก็บไว้เกิน 1 ชั่วโมง"""
    try:
        current_time = datetime.now().timestamp()  # เวลาปัจจุบันในหน่วยวินาที (epoch)
        max_age = 3600  # 1 ชั่วโมง (วินาที)
        
        for filename in os.listdir(UPLOAD_FOLDER):        # ไล่ดูทุกไฟล์ในโฟลเดอร์ uploads
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(filepath):                  # สนใจเฉพาะ “ไฟล์” ไม่รวมโฟลเดอร์
                file_age = current_time - os.path.getmtime(filepath)  # อายุไฟล์ = ปัจจุบัน - เวลาแก้ไขล่าสุด
                if file_age > max_age:                    # ถ้าอายุมากกว่า 1 ชั่วโมง
                    os.remove(filepath)                   # ลบไฟล์เพื่อลดการกินพื้นที่
                    print(f"🗑️ Deleted old file: {filename}")  # log ว่าลบแล้ว
    except Exception as e:
        print(f"⚠️ Cleanup error: {str(e)}")              # log คำเตือนถ้าล้างไฟล์ล้มเหลว

if __name__ == '__main__':  # จุดเริ่มเมื่อรันไฟล์นี้โดยตรง (ไม่ใช่ถูก import)
    print("🚀 Starting Market Basket Analysis Server...")             # ข้อความเริ่มต้น
    print("🛒 Market Basket Analysis API is ready!")                 # แจ้งว่าพร้อมให้บริการ
    print("🌐 Frontend can connect to: http://localhost:5000")       # URL สำหรับเชื่อมจาก frontend
    print("📁 Upload folder:", UPLOAD_FOLDER)                        # แสดง path โฟลเดอร์อัปโหลด
    
    # ทำความสะอาดไฟล์เก่า
    cleanup_old_files()                                              # ลบไฟล์ที่เกินเวลาออกก่อนเริ่มเซิร์ฟเวอร์
    
    # รันเซิร์ฟเวอร์ Flask
    app.run(debug=True, host='0.0.0.0', port=5000)                   # รันที่โฮสต์ 0.0.0.0 พอร์ต 5000 เปิด debug mode
