# 💰 AI Expense Tracker

A full-stack expense tracking application with AI-powered insights, group expense splitting, and comprehensive financial analytics.

## ✨ Features

### Core Features
- 📊 **Personal Expense Tracking** - Track individual expenses with categories and payment methods
- 👥 **Group Expense Management** - Split bills and track shared expenses with friends
- 🤖 **AI-Powered Insights** - Get intelligent spending analysis and savings recommendations
- 📈 **Analytics Dashboard** - Visualize spending patterns with interactive charts
- 💬 **AI Chatbot** - Ask questions about your finances and get personalized advice
- 📧 **Email Reports** - Automated weekly, monthly, and yearly expense reports
- 🌓 **Dark Mode** - Eye-friendly interface for day and night
- 📱 **PWA Support** - Install as a mobile app with offline capabilities

### Advanced Features
- 🔐 **Google OAuth** - Secure authentication
- 🌍 **Multi-currency Support** - INR, USD, EUR, GBP
- 📊 **Budget Goals** - Set and track budget targets
- 🔄 **Recurring Expenses** - Automate regular expense tracking
- 📱 **Responsive Design** - Works on all devices
- 🔔 **Smart Notifications** - Budget alerts and spending insights

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database with Motor async driver
- **Google Gemini AI** - AI-powered insights and chat
- **Google OAuth** - Authentication
- **JWT** - Secure token-based auth
- **Python 3.11+**

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **React Router** - Navigation
- **Lucide Icons** - Icon library

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)
- Google OAuth credentials
- Gemini API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/expense-tracker.git
   cd expense-tracker
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Create .env file (see backend/.env example)
   cp .env.example .env
   # Edit .env with your credentials
   
   # Run backend
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create .env.local file
   cp .env.example .env.local
   # Edit with your API URL and Google Client ID
   
   # Run frontend
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 📦 Deployment

### Deploy to Render

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**
1. Push code to GitHub
2. Connect to Render
3. Render will auto-detect `render.yaml`
4. Set environment variables
5. Deploy!

### Environment Variables

**Backend:**
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET_KEY` - Secret for JWT tokens
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GEMINI_API_KEY` - Google Gemini AI API key
- `GMAIL_USER` - Gmail for sending reports
- `GMAIL_PASSWORD` - Gmail app password
- `ALLOWED_ORIGINS` - CORS allowed origins

**Frontend:**
- `VITE_API_URL` - Backend API URL
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

## 📖 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

**Authentication:**
- `POST /api/auth/google-login` - Login with Google
- `GET /api/auth/me` - Get current user

**Expenses:**
- `POST /api/expenses` - Create expense
- `GET /api/expenses` - List expenses
- `DELETE /api/expenses/{id}` - Delete expense

**Groups:**
- `POST /api/groups` - Create group
- `GET /api/groups` - List groups
- `POST /api/groups/{id}/expenses` - Add group expense
- `POST /api/groups/{id}/settle` - Settle balance

**Analytics:**
- `GET /api/analytics/trends` - Spending trends
- `GET /api/analytics/category-breakdown` - Category analysis
- `GET /api/analytics/budget-progress` - Budget tracking

**AI Features:**
- `POST /api/ai/chat` - Chat with AI assistant
- `GET /api/ai/insights` - Get AI insights
- `GET /api/ai/suggestions/{item}` - Get item suggestions

## 🎨 Features Overview

### 1. Personal Expenses
- Add, edit, and delete expenses
- Categorize by type (food, travel, shopping, etc.)
- Track payment methods (UPI, card, cash, etc.)
- Search and filter expenses
- View spending summaries

### 2. Group Expenses
- Create groups with multiple members
- Split expenses equally or custom amounts
- Track who owes whom
- Settle balances
- View group summaries and history

### 3. AI Insights
- Spending pattern analysis
- Personalized savings tips
- Budget recommendations
- Health impact of purchases
- Smart alternatives suggestions

### 4. Analytics
- Interactive spending charts
- Category breakdowns
- Monthly/weekly trends
- Budget progress tracking
- Recurring expense detection

### 5. Settings
- Profile management
- Language preferences (EN, HI, ES, FR)
- Currency settings (INR, USD, EUR, GBP)
- Email notification preferences
- Dark mode toggle
- Report frequency settings

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📱 PWA Features

The app works offline and can be installed on mobile devices:
- Offline expense tracking
- Background sync when online
- Push notifications
- App shortcuts
- Native-like experience

## 🔒 Security

- JWT-based authentication
- Google OAuth 2.0
- Password hashing (for future email/password auth)
- CORS protection
- Input validation
- XSS prevention
- CSRF protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Your Name - [@yourhandle](https://twitter.com/yourhandle)

## 🙏 Acknowledgments

- Google Gemini AI for AI capabilities
- MongoDB for database
- React and FastAPI communities
- All open-source contributors

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Email: support@example.com
- Documentation: [Link to docs]

## 🗺️ Roadmap

- [ ] Receipt scanning with OCR
- [ ] Voice input for expenses
- [ ] Export to Excel/PDF
- [ ] Budget templates
- [ ] Investment tracking
- [ ] Bill reminders
- [ ] Multi-user family accounts
- [ ] Mobile app (React Native)
- [ ] Bank account integration
- [ ] Cryptocurrency tracking

---

Made with ❤️ by [Your Name]
