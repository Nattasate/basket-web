"""
Flask Backend สำหรับ Market Basket Analysis เท่านั้น
รองรับการวิเคราะห์ตะกร้าสินค้าด้วย mlxtend library
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import io
import os
from datetime import datetime
import tempfile
from werkzeug.utils import secure_filename
import logging
import traceback

# Import data processor
from data_processors.basket_analyzer import BasketAnalyzer

# สร้าง Flask app
app = Flask(__name__)
CORS(app)

# ตั้งค่า logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ตั้งค่าแอปพลิเคชัน
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

# สร้างโฟลเดอร์ uploads
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def read_file_safely(filepath):
    """อ่านไฟล์อย่างปลอดภัยด้วย encoding หลายแบบ"""
    try:
        if filepath.lower().endswith('.csv'):
            # ลอง encoding หลายแบบสำหรับ CSV
            encodings = ['utf-8', 'utf-8-sig', 'cp1252', 'iso-8859-1', 'tis-620', 'windows-1252']
            for encoding in encodings:
                try:
                    df = pd.read_csv(filepath, encoding=encoding)
                    print(f"✅ อ่าน CSV สำเร็จด้วย encoding: {encoding}")
                    return df
                except UnicodeDecodeError:
                    continue
            
            # ถ้าไม่ได้ ลองใช้ chardet
            try:
                import chardet
                with open(filepath, 'rb') as f:
                    raw_data = f.read()
                    detected = chardet.detect(raw_data)
                    if detected['encoding']:
                        df = pd.read_csv(filepath, encoding=detected['encoding'])
                        print(f"✅ อ่าน CSV สำเร็จด้วย detected encoding: {detected['encoding']}")
                        return df
            except:
                pass
                
        else:
            # สำหรับ Excel
            try:
                df = pd.read_excel(filepath, engine='openpyxl')
                print("✅ อ่าน Excel สำเร็จด้วย openpyxl")
                return df
            except:
                try:
                    df = pd.read_excel(filepath, engine='xlrd')
                    print("✅ อ่าน Excel สำเร็จด้วย xlrd")
                    return df
                except:
                    pass
        
        raise Exception("ไม่สามารถอ่านไฟล์ได้")
        
    except Exception as e:
        raise Exception(f"เกิดข้อผิดพลาดในการอ่านไฟล์: {str(e)}")

def create_download_files(results, filename):
    """สร้างไฟล์สำหรับดาวน์โหลด - เฉพาะ Excel และ CSV"""
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename
        
        output_files = {}
        
        # 1. Excel File - Complete Report
        excel_filename = f"basket_analysis_{base_name}_{timestamp}.xlsx"
        excel_filepath = os.path.join(UPLOAD_FOLDER, excel_filename)
        
        with pd.ExcelWriter(excel_filepath, engine='openpyxl') as writer:
            # Summary sheet
            summary_data = {
                'Metric': ['Analysis Type', 'Original File', 'Generated At', 'Total Rules', 'Total Transactions', 'Total Items'],
                'Value': [
                    'Market Basket Analysis',
                    filename,
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    results.get('totalRules', 0),
                    results.get('totalTransactions', 0),
                    results.get('totalItems', 0)
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
            
            # All Association Rules
            if 'rulesTable' in results and results['rulesTable']:
                rules_df = pd.DataFrame(results['rulesTable'])
                rules_df.to_excel(writer, sheet_name='Association Rules', index=False)
            
            # Single Item Rules (if available)
            if 'singleRulesTable' in results and results['singleRulesTable']:
                single_rules_df = pd.DataFrame(results['singleRulesTable'])
                single_rules_df.to_excel(writer, sheet_name='Single Item Rules', index=False)
            
            # Frequent Itemsets
            if 'frequentItemsetsTable' in results and results['frequentItemsetsTable']:
                frequent_df = pd.DataFrame(results['frequentItemsetsTable'])
                frequent_df.to_excel(writer, sheet_name='Frequent Itemsets', index=False)
        
        output_files['excel'] = excel_filename
        
        # 2. CSV File - Association Rules
        csv_filename = f"association_rules_{base_name}_{timestamp}.csv"
        csv_filepath = os.path.join(UPLOAD_FOLDER, csv_filename)
        
        if 'rulesTable' in results and results['rulesTable']:
            rules_df = pd.DataFrame(results['rulesTable'])
            rules_df.to_csv(csv_filepath, index=False, encoding='utf-8-sig')
        
        output_files['csv'] = csv_filename
        
        return True, output_files
        
    except Exception as e:
        print(f"❌ Error creating download files: {str(e)}")
        return False, str(e)

@app.route('/api/health', methods=['GET'])
def health_check():
    """ตรวจสอบสถานะของ API"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'message': 'Market Basket Analysis API is running successfully'
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """อัปโหลดไฟล์ Excel/CSV และแปลงเป็น JSON"""
    try:
        print("📁 Received upload request")
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Please upload Excel or CSV files.'}), 400
        
        print(f"📄 Processing file: {file.filename}")
        
        # บันทึกไฟล์
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{secure_filename(file.filename)}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        print(f"✅ File saved as: {filename}")
        
        # อ่านข้อมูลจากไฟล์
        df = read_file_safely(filepath)
        
        # ทำความสะอาดข้อมูลเบื้องต้น
        df = df.fillna('')
        
        # แปลงเป็น list of lists สำหรับ frontend
        headers = [str(col) for col in df.columns.tolist()]
        rows = []
        
        # จำกัดข้อมูลที่ส่งไปแสดงเป็น 1000 แถวแรก
        display_df = df.head(1000)
        
        for _, row in display_df.iterrows():
            row_data = []
            for value in row:
                if pd.isna(value) or value is None:
                    row_data.append('')
                else:
                    row_data.append(str(value))
            rows.append(row_data)
        
        data = [headers] + rows
        
        print(f"✅ File processed successfully. Total rows: {len(df)}, Display rows: {len(rows)}, Columns: {len(headers)}")
        
        response_data = {
            'success': True,
            'filename': filename,
            'data': data,
            'rows': len(df),
            'columns': len(headers),
            'column_names': headers,
            'file_size': os.path.getsize(filepath)
        }
        
        return jsonify(response_data)
            
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        print(f"❌ Upload error: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/api/process', methods=['POST'])
def process_data():
    """ประมวลผล Market Basket Analysis"""
    try:
        print("🔄 Starting Market Basket Analysis...")
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        filename = data.get('filename')
        selected_columns = data.get('selectedColumns', [])
        
        print(f"📊 Processing: {filename}, Columns: {len(selected_columns)}")
        
        if not filename:
            return jsonify({'error': 'Missing filename'}), 400
        
        # อ่านไฟล์ที่อัปโหลดไว้
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        # อ่านข้อมูลทั้งหมด
        df = read_file_safely(filepath)
        print(f"✅ File read successfully. Shape: {df.shape}")
        
        # เลือกเฉพาะคอลัมน์ที่ต้องการ (ถ้ามี)
        if selected_columns:
            try:
                selected_df = df.iloc[:, selected_columns]
                print(f"📋 Selected columns: {selected_df.columns.tolist()}")
            except IndexError:
                return jsonify({'error': 'Selected columns are out of range'}), 400
        else:
            selected_df = df
        
        # ประมวลผล Market Basket Analysis
        print(f"⚙️ Running Market Basket Analysis...")
        
        analyzer = BasketAnalyzer(min_support=0.001, min_lift=1.0)
        results = analyzer.analyze_basket(selected_df, df)
        
        if not results.get('success'):
            return jsonify({'error': results.get('error', 'Analysis failed')}), 500
        
        print("✅ Analysis completed")
        
        # สร้างไฟล์ผลลัพธ์
        print("💾 Creating download files...")
        success, output_files = create_download_files(results, filename)
        
        if not success:
            print(f"⚠️ Warning: Could not create all download files: {output_files}")
            output_files = {}
        
        print("🎉 Processing completed successfully")
        
        return jsonify({
            'success': True,
            'analysisType': 'basket',
            'selectedColumns': selected_columns,
            'results': results,
            'outputFiles': output_files,
            'summary': {
                'totalRows': len(df),
                'processedRows': len(selected_df),
                'selectedColumns': len(selected_columns) if selected_columns else len(df.columns),
                'totalColumns': len(df.columns),
                'processingTime': 'Completed',
                'completedAt': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        print(f"❌ Processing error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@app.route('/api/download/<format>/<filename>', methods=['GET'])
def download_file(format, filename):
    """ดาวน์โหลดไฟล์ผลลัพธ์"""
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(filepath, as_attachment=True)
        
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

# ทำความสะอาดไฟล์เก่า
def cleanup_old_files():
    """ลบไฟล์เก่าที่เก็บไว้เกิน 1 ชั่วโมง"""
    try:
        current_time = datetime.now().timestamp()
        max_age = 3600  # 1 ชั่วโมง
        
        for filename in os.listdir(UPLOAD_FOLDER):
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(filepath):
                file_age = current_time - os.path.getmtime(filepath)
                if file_age > max_age:
                    os.remove(filepath)
                    print(f"🗑️ Deleted old file: {filename}")
    except Exception as e:
        print(f"⚠️ Cleanup error: {str(e)}")

if __name__ == '__main__':
    print("🚀 Starting Market Basket Analysis Server...")
    print("🛒 Market Basket Analysis API is ready!")
    print("🌐 Frontend can connect to: http://localhost:5000")
    print("📁 Upload folder:", UPLOAD_FOLDER)
    
    # ทำความสะอาดไฟล์เก่า
    cleanup_old_files()
    
    # รันเซิร์ฟเวอร์
    app.run(debug=True, host='0.0.0.0', port=5000)