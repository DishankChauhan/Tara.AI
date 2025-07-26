# Railway Deployment Guide for Tara AI Backend

## Prerequisites
1. Railway account (sign up at railway.app)
2. GitHub repository with your backend code
3. Google Cloud Service Account JSON file
4. Firebase project credentials
5. OpenAI API key

## Step 1: Prepare Your Repository
1. Push your backend code to GitHub
2. Ensure all files are in the `/backend` directory

## Step 2: Deploy to Railway
1. Go to https://railway.app and sign in
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Choose the `/backend` directory as the root

## Step 3: Configure Environment Variables
In Railway dashboard, go to your project → Variables and add:

```
NODE_ENV=production
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## Step 4: Upload Google Cloud Credentials
1. In Railway dashboard, go to your service
2. Go to "Data" tab
3. Create a new volume mounted at `/app`
4. Upload your Google Cloud service account JSON file
5. Set `GOOGLE_APPLICATION_CREDENTIALS=/app/your-service-account.json`

## Step 5: Custom Domain (Optional)
1. In Railway dashboard, go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Step 6: Update Frontend Configuration
After deployment, you'll get a Railway URL like:
`https://your-app-name.railway.app`

Update your frontend's API base URL to this domain.

## Environment Variables for Production

### Required Variables:
- `NODE_ENV=production`
- `PORT=5000` (Railway will set this automatically)
- `OPENAI_API_KEY` - Your OpenAI API key
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON
- `FIREBASE_*` - All Firebase configuration variables

### Security Notes:
- Never commit API keys to GitHub
- Use Railway's environment variables feature
- Enable CORS only for your production domains
- Consider rate limiting for production use

## Monitoring and Logs
1. Railway provides built-in logging
2. Check logs in Railway dashboard → Deployments → View Logs
3. Monitor performance in Railway dashboard

## Troubleshooting
1. **Build Fails**: Check package.json scripts and dependencies
2. **App Won't Start**: Check logs for missing environment variables
3. **CORS Errors**: Ensure frontend domain is added to CORS whitelist
4. **File Upload Issues**: Check volume mounting for Google credentials

## Health Check Endpoint
Your app includes a health check at: `GET /health`
This will return server status and configuration info.
