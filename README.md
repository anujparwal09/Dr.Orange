# 🍊 Dr. Orange — AI-Powered Citrus Disease Detection

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Flask-3.0-black?logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TensorFlow-2.16-orange?logo=tensorflow&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_2.5_Flash-AI-blue?logo=google&logoColor=white" />
</p>

**Dr. Orange** is a full-stack AI-powered web application that diagnoses citrus (orange) diseases, grades fruit quality, estimates shelf life, and determines ripeness stage — all from a single image upload. Built for Indian farmers and agronomists.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔬 **Disease Detection** | Multi-Task Learning CNN classifies 6 disease categories with 97.7% accuracy |
| 📊 **Quality Grading** | AI-based quality score (1-10) for each scanned orange |
| 📅 **Shelf Life Prediction** | Estimates remaining shelf life in days |
| 🍑 **Ripeness Stage** | Classifies as Unripe, Near-Ripe, Ripe, or Overripe |
| 🤖 **Gemini AI Analysis** | Google Gemini 2.5 Flash provides detailed disease overview, treatment, and prevention |
| 💬 **AI Chat Assistant** | ChatGPT-like interface for citrus agronomy questions |
| 📄 **PDF Report Generation** | Professional bilingual reports (English + Hindi) with QR codes |
| 🔐 **Authentication** | Email/password + Google OAuth sign-in |
| 📈 **Dashboard** | Analytics with disease distribution charts, quality trends, and scan history |
| 👨‍💼 **Admin Panel** | User management and scan monitoring |

---

## 🏗️ Tech Stack

### Backend
- **Python 3.11** + **Flask 3.0**
- **SQLAlchemy** (PostgreSQL / SQLite)
- **Flask-JWT-Extended** (Authentication)
- **TensorFlow 2.16** (ML Model)
- **Google Gemini 2.5 Flash** (AI Analysis)
- **ReportLab** (PDF Generation)
- **Gunicorn** (Production Server)

### Frontend
- **Next.js 14** (React Framework)
- **Tailwind CSS** (Styling)
- **Framer Motion** (Animations)
- **Recharts** (Data Visualization)
- **Axios** (API Client)
- **jsPDF** (Client-side PDF)

### ML Model
- **MobileNetV2** backbone with Multi-Task Learning
- 4 output heads: Disease, Quality, Shelf Life, Ripeness
- Trained on custom orange disease dataset

---

## 📂 Project Structure

```
dr.orange/
├── backend/                    # Flask REST API
│   ├── app.py                  # Application factory
│   ├── config.py               # Configuration
│   ├── extensions.py           # Flask extensions
│   ├── models.py               # Database models
│   ├── model/                  # ML model files
│   │   ├── inference.py        # Gemini + local prediction pipeline
│   │   ├── model_loader.py     # Model loading & preprocessing
│   │   └── orange_mtl_model.keras  # Trained model (not in repo)
│   ├── routes/                 # API endpoints
│   │   ├── auth.py             # Authentication (email + Google OAuth)
│   │   ├── predict.py          # Image prediction
│   │   ├── history.py          # Scan history
│   │   ├── report.py           # PDF report generation
│   │   ├── chat.py             # AI chat assistant
│   │   └── admin.py            # Admin panel
│   ├── requirements.txt        # Python dependencies
│   ├── Procfile                # Deployment config
│   └── render.yaml             # Render deployment
├── frontend/                   # Next.js 14 Web App
│   ├── app/                    # App router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── about/              # About page
│   │   ├── analyze/            # Disease scanner
│   │   ├── dashboard/          # Analytics dashboard
│   │   ├── chat/               # AI chat assistant
│   │   ├── history/            # Scan history
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   └── admin/              # Admin panel
│   ├── components/             # Reusable components
│   └── lib/                    # Types & utilities
└── ml/                         # ML training scripts
    ├── model.py                # MTL model architecture
    ├── train.py                # Training pipeline
    ├── evaluate.py             # Evaluation metrics
    ├── data_loader.py          # Dataset loading
    └── inference.py            # Standalone inference
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/anujparwal09/Dr.Orange.git
cd Dr.Orange
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate    # Linux/Mac
.\venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env        # Or create .env with your values
# Edit .env with your API keys and database URL

# Run the server
python app.py
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create .env.local with:
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Run dev server
npm run dev
```

### 4. ML Model
Download the trained model (`orange_mtl_model.keras`) and place it in `backend/model/`.

---

## 🔧 Environment Variables

### Backend (`.env`)
| Variable | Description |
|---|---|
| `FLASK_ENV` | `development` or `production` |
| `FLASK_SECRET_KEY` | Flask secret key |
| `JWT_SECRET_KEY` | JWT signing key |
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `CORS_ORIGINS` | Allowed CORS origins |
| `MODEL_PATH` | Path to `.keras` model file |

### Frontend (`.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/google` | Google OAuth |
| `GET` | `/api/auth/profile` | Get user profile |
| `POST` | `/api/predict` | Upload image for analysis |
| `GET` | `/api/history` | Get scan history |
| `DELETE` | `/api/history/:id` | Delete a scan |
| `POST` | `/api/report` | Generate PDF report |
| `POST` | `/api/chat/message` | Send chat message |
| `GET` | `/api/chat/conversations` | Get chat history |
| `GET` | `/health` | Health check |

---

## 🧠 ML Model Details

- **Architecture**: MobileNetV2 + Multi-Task Learning (4 heads)
- **Disease Classes**: Healthy, Citrus Canker, Black Spot, Nutrient Deficiency, Multiple Diseases, Rotten
- **Ripeness Stages**: Unripe, Near-Ripe, Ripe, Overripe
- **Input**: 224×224 RGB images
- **Accuracy**: 97.7% disease classification
- **Inference**: <3 seconds on CPU

---

## 📋 License

This project is built for educational and agricultural research purposes.

---

## 👤 Author

**Anuj Parwal**

---

*Built with ❤️ for Indian Agriculture*
