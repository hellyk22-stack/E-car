# Deployment Guide

This project deploys as:

- Frontend: Vercel
- Backend API: Render
- Database: MongoDB Atlas

## Backend on Render

Use the `render.yaml` file in this folder when creating a Blueprint.

- Repo path to this app: `Frontend/ecar-app`
- Backend root directory inside this app: `server`
- Health check path: `/health`

Required backend environment variables:

- `MONGO_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `MAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Frontend on Vercel

Set the Vercel project root to:

- `Frontend/ecar-app`

Build settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Required frontend environment variables:

- `VITE_API_BASE_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

The included `vercel.json` adds an SPA fallback so nested React routes work on refresh.

## MongoDB Atlas

Create a MongoDB Atlas cluster and place its connection string in:

- `MONGO_URL`

If Atlas network restrictions are enabled, allow the Render backend to connect.

## Final wiring

1. Deploy the backend on Render.
2. Copy the Render backend URL into Vercel as `VITE_API_BASE_URL`.
3. Deploy the frontend on Vercel.
4. Copy the Vercel frontend URL into Render as `FRONTEND_URL`.
5. Redeploy the backend once `FRONTEND_URL` is set.

## Smoke checks

- Frontend opens without a blank screen.
- Backend returns success at `/health`.
- Auth, showroom, booking, and payment endpoints respond correctly.
