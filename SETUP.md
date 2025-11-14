# Complete Setup Guide

## 📋 File Structure
Your project should have this structure:

```
expense-tracker/
├── .gitignore
├── README.md
├── DEPLOYMENT.md
├── SETUP.md
├── render.yaml
├── build.sh
├── start.sh
├── backend/
│   ├── .env
│   ├── .renderignore
│   ├── Dockerfile
│   ├── Procfile
│   ├── runtime.txt
│   ├── requirements.txt
│   ├── main.py
│   ├── config/
│   │   └── settings.py
│   ├── database/
│   │   └── mongo.py
│   ├── models/
│   │   └── schemas.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── expenses.py
│   │   ├── groups.py
│   │   ├── analytics.py
│   │   ├── ai.py
│   │   └── settings.py
│   ├── services/
│   │   ├── ai_service.py
│   │   ├── email_service.py
│   │   ├── expense_service.py
│   │   └── cron_service.py
│   └── utils/
│       └── helpers.py
└── frontend/
    ├── .env.local
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   ├── manifest.json
    │   └── service-worker.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── components/
        │   ├── Chatbot.jsx
        │   ├── Header.jsx
        │   └── Sidebar.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx
        │   ├── Expenses.jsx
        │   ├── Groups.jsx
        │   ├── Analytics.jsx
        │   └── Settings.jsx
        ├── context/
        │   ├── AuthContext.jsx
        │   └── ThemeContext.jsx
        ├── hooks/
        │   ├── useExpenses.js
        │   └── useOffline.js
        └── utils/
            └── db.js
```

## 🔧 Step 1: Create Missing Files

Create the following files in your project:

1. **Root level files** (already provided in artifacts):
   - `.gitignore`
   - `render.yaml`
   - `build.sh` (make executable: `chmod +x build.sh`)
   - `start.sh` (make executable: `chmod +x start.sh`)
   - `README.md`
   - `DEPLOYMENT.md`

2. **Backend files**:
   - `backend/.renderignore`
   - `backend/Dockerfile`
   - `backend/Procfile`
   - `backend/runtime.txt`

3. **Frontend files**:
   - `frontend/Dockerfile`
   - `frontend/nginx.conf`

## 🗄️ Step 2: Setup MongoDB

### Option A: MongoDB Atlas (Recommended for Production)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (M0 Free tier)
4. Create a database user:
   - Database Access → Add New Database User
   - Username: `expense_user`
   - Password: Generate secure password
   - Privileges: Read and write to any database

5. Whitelist IP addresses:
   - Network Access → Add IP Address
   - For Render: Add `0.0.0.0/0` (allows all IPs)
   - For local: Add your current IP

6. Get connection string:
   - Clusters → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your password
   - Replace `<dbname>` with `expense_tracker`
   - Example: `mongodb+srv://expense_user:password@cluster0.xxxxx.mongodb.net/expense_tracker`

### Option B: Local MongoDB (Development Only)

```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
# Install and run as service
```

Connection string for local: `mongodb://localhost:27017/expense_tracker`

## 🔑 Step 3: Setup Google OAuth

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create a new project**:
   - Click "Select a project" → "New Project"
   - Name: "Expense Tracker"
   - Click "Create"

3. **Enable Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Expense Tracker Web Client"
   
5. **Add Authorized Redirect URIs**:
   ```
   http://localhost:5173
   http://localhost:3000
   https://your-app-name.onrender.com
   ```

6. **Save Client ID and Secret**:
   - Copy the Client ID (starts with something like `660588293356-...`)
   - Copy the Client Secret
   - Keep these secure!

## 🤖 Step 4: Setup Gemini API

You already have: `AIzaSyBcnPIGkKdkSpoJaPv3W3mw3uV7c9pH2QI`

If you need a new one:
1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. Copy and save securely

## 📧 Step 5: Setup Gmail for Reports

### Create App Password

1. Go to Google Account settings
2. Security → 2-Step Verification (enable if not already)
3. App passwords → Generate new app password
4. Select "Mail" and "Other (Custom name)"
5. Name it "Expense Tracker"
6. Copy the 16-character password
7. Remove spaces: `dvjj blxj zyde tukh` → `dvjjblxjzydetukh`

## 🔐 Step 6: Setup Environment Variables

### Backend (.env)

Create `backend/.env`:
```env
# MongoDB - Use your Atlas connection string
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/expense_tracker
DATABASE_NAME=expense_tracker

# JWT - Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET_KEY=your-generated-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Google OAuth - From Google Console
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173

# Gemini AI
GEMINI_API_KEY=AIzaSyBcnPIGkKdkSpoJaPv3W3mw3uV7c9pH2QI

# Gmail SMTP
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-16-char-app-password

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env.local)

Create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## 🚀 Step 7: Local Development

### Install Dependencies

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### Run the Application

**Option 1: Manual (Recommended for debugging)**
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option 2: Using start script**
```bash
chmod +x start.sh
./start.sh
```

### Access the Application
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## ☁️ Step 8: Deploy to Render

### 1. Prepare Repository

```bash
# Initialize git if not already
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for deployment"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/expense-tracker.git
git branch -M main
git push -u origin main
```

### 2. Create Render Account

1. Go to https://render.com/
2. Sign up with GitHub
3. Authorize Render to access your repositories

### 3. Deploy with Blueprint

1. In Render Dashboard, click "New" → "Blueprint"
2. Connect your GitHub repository
3. Render will detect `render.yaml`
4. Click "Apply"

### 4. Set Environment Variables

For **Backend Service**:
- Go to the backend service in Render
- Environment → Add Environment Variables
- Add all variables from `backend/.env` (except those auto-generated)

For **Frontend Static Site**:
- Go to the frontend site in Render
- Environment → Add Environment Variables
- Add:
  - `VITE_API_URL`: Your backend URL (e.g., `https://expense-tracker-api.onrender.com`)
  - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID

### 5. Update Google OAuth

After deployment, add Render URLs to Google Console:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Add to Authorized redirect URIs:
   ```
   https://your-frontend.onrender.com
   https://your-frontend.onrender.com/auth/callback
   ```

### 6. Update CORS

In Render backend environment variables, update:
```
ALLOWED_ORIGINS=https://your-frontend.onrender.com
```

### 7. Wait for Deployment

- Backend: ~5-10 minutes
- Frontend: ~2-5 minutes
- Check logs for any errors

### 8. Test Production

1. Visit your frontend URL
2. Try logging in with Google
3. Test all features
4. Check that API calls work

## 🔍 Troubleshooting

### MongoDB Connection Failed
```
Error: Authentication failed
```
**Solution**: 
- Check username/password in connection string
- Verify database user has correct privileges
- Ensure IP whitelist includes 0.0.0.0/0

### Google Login Not Working
```
Error: redirect_uri_mismatch
```
**Solution**:
- Add frontend URL to Google Console authorized URIs
- Check VITE_GOOGLE_CLIENT_ID matches backend GOOGLE_CLIENT_ID
- Clear browser cache

### CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**:
- Add frontend URL to ALLOWED_ORIGINS in backend
- Restart backend service
- Clear browser cache

### API Not Found (404)
```
Failed to fetch from API
```
**Solution**:
- Check VITE_API_URL is correct
- Verify backend service is running
- Check backend logs for errors

### Render Service Unavailable
```
Service Unavailable
```
**Solution**:
- Free tier spins down after 15 minutes inactivity
- First request after spin-down takes 30-60 seconds
- Check Render logs for actual errors

## 📊 Monitoring

### Check Health
```bash
# Backend health
curl https://your-backend.onrender.com/health

# Response should be:
{"status":"healthy","version":"1.0.0"}
```

### View Logs
1. Go to Render Dashboard
2. Select your service
3. Click "Logs" tab
4. Filter by severity if needed

### MongoDB Monitoring
1. Go to MongoDB Atlas
2. Your Cluster → Metrics
3. Check connections, operations, storage

## 🎉 Success Checklist

- [ ] MongoDB Atlas cluster created and connected
- [ ] Google OAuth configured with correct redirect URIs
- [ ] Environment variables set in Render
- [ ] Backend service deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] Can login with Google
- [ ] Can add expenses
- [ ] Can create groups
- [ ] AI chatbot responds
- [ ] Analytics dashboard loads
- [ ] Settings page works

## 📚 Next Steps

1. **Customize the app**:
   - Update branding
   - Modify colors in tailwind.config.js
   - Add custom features

2. **Monitor usage**:
   - Set up alerts in Render
   - Monitor MongoDB usage
   - Check API quotas

3. **Optimize performance**:
   - Consider upgrading to paid plan
   - Add caching
   - Optimize database queries

4. **Add features**:
   - Receipt scanning
   - Bank integration
   - Advanced analytics

## 🆘 Getting Help

If you encounter issues:

1. Check logs in Render Dashboard
2. Review MongoDB connection in Atlas
3. Verify all environment variables
4. Check Google OAuth configuration
5. Test API endpoints directly at `/docs`
6. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Screenshots if applicable

## 📞 Support Resources

- Render Docs: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com/
- FastAPI Docs: https://fastapi.tiangolo.com/
- React Docs: https://react.dev/

Good luck with your deployment! 🚀
