# Market Basket Analysis Web Application

## 🛒 Overview
เว็บแอปพลิเคชันสำหรับการวิเคราะห์ตะกร้าสินค้า (Market Basket Analysis) ด้วยเทคโนโลยี mlxtend library และ Advanced Apriori Algorithm

### ✨ Key Features
- **🛒 Advanced Market Basket Analysis** - ใช้ mlxtend library และ Apriori algorithm
- **📊 Association Rules Mining** - คำนวณ Support, Confidence, Lift, Conviction
- **🔄 Real-time Processing** - ประมวลผลข้อมูลแบบเรียลไทม์
- **📱 Responsive Design** - ใช้งานได้ทุกอุปกรณ์
- **💾 Export Options** - ดาวน์โหลดได้ Excel และ CSV

## 🏗️ Architecture
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Flask + Python
- **Analysis Engine**: mlxtend, pandas, numpy
- **File Processing**: openpyxl, xlrd

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd market-basket-analysis
```

2. **Install Frontend Dependencies**
```bash
npm install
```

3. **Install Backend Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

4. **Start the Backend Server**
```bash
cd backend
python app.py
```

5. **Start the Frontend Development Server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to `http://localhost:5173`

## 📊 Market Basket Analysis Features

### 🛒 Advanced Analysis
- **Apriori Algorithm** with mlxtend library
- **Association Rules Mining** with Support, Confidence, Lift
- **Frequent Itemsets Detection**
- **Single Item Rules** (optional)
- **Automatic transaction detection**

**Example Use Cases:**
- E-commerce product recommendations
- Retail store layout optimization
- Cross-selling strategies
- Inventory management

### 📈 Results & Metrics
- **Support**: How frequently items appear together
- **Confidence**: Likelihood of consequent given antecedent
- **Lift**: Strength of association rule
- **Conviction**: Measure of rule implication

## 🔧 Technical Details

### Backend API Endpoints
- `GET /api/health` - Health check
- `POST /api/upload` - File upload
- `POST /api/process` - Market Basket Analysis processing
- `GET /api/download/<format>/<filename>` - File download

### Data Processing Pipeline
1. **File Upload & Validation**
2. **Automatic Column Detection** (transaction_id, item_description)
3. **Data Cleaning & Preprocessing**
4. **Crosstab Matrix Creation**
5. **Apriori Algorithm Execution**
6. **Association Rules Generation**
7. **Multi-format Export**

### Supported File Formats
- **Input**: .xlsx, .xls, .csv
- **Output**: .xlsx, .csv

## 📁 Project Structure
```
market-basket-analysis/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── FileUpload.tsx
│   │   ├── ColumnSelector.tsx
│   │   ├── DataProcessor.tsx
│   │   └── ResultsDownload.tsx
│   ├── App.tsx
│   └── main.tsx
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── data_processors/
│       └── basket_analyzer.py
└── README.md
```

## 🎯 Usage Examples

### Market Basket Analysis
1. Upload your transaction data (CSV/Excel)
2. Select columns: Transaction ID, Item/Product
3. System automatically processes with mlxtend
4. Get association rules with Support, Confidence, Lift metrics
5. Download results in Excel or CSV format

### Expected Data Format
```csv
transaction_id,item_description
T001,milk
T001,bread
T001,butter
T002,milk
T002,eggs
```

## 🔒 Security Features
- **File validation** and size limits
- **Automatic cleanup** of uploaded files
- **Secure file handling**
- **No data persistence** (privacy-focused)

## 🚀 Performance
- **Optimized mlxtend algorithms** for large datasets
- **Memory-efficient processing**
- **Chunked file uploads** for large files
- **Background processing**

## 🛠️ Development

### Adding New Features
1. Modify analyzer class in `backend/data_processors/basket_analyzer.py`
2. Update API endpoints in `app.py`
3. Add UI components in frontend

### Customization
- Modify analysis parameters (min_support, min_lift)
- Customize UI themes in Tailwind config
- Add new export formats

## 📈 Algorithm Details

### Apriori Algorithm
- **Frequent Itemsets**: Items that appear together frequently
- **Association Rules**: If-then relationships between items
- **Support**: P(A ∩ B) - Probability of items appearing together
- **Confidence**: P(B|A) - Probability of B given A
- **Lift**: P(B|A) / P(B) - Strength of association

### mlxtend Integration
- Uses optimized C implementations
- Memory-efficient sparse matrix operations
- Scalable to large datasets
- Professional-grade algorithms

## 🤝 Contributing
1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License
MIT License - see LICENSE file for details

## 🆘 Support
For support and questions:
- Create an issue on GitHub
- Check documentation
- Review example datasets

## 🎉 Acknowledgments
- mlxtend library for advanced basket analysis
- React and Flask communities
- Open source contributors

---

**Market Basket Analysis** - Discover hidden patterns in your data! 🛒