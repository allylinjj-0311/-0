<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/73cb3f7f-4fc2-41a5-9a8d-d8254ae7cf0a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## GitHub + Vercel deployment notes

This project is ready to upload to GitHub and import into Vercel. Do not commit `.env.local`.

Set these environment variables in Vercel before deploying:

- `GEMINI_API_KEY`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `NOTION_DATA_SOURCE_ID`

Use the default Vercel settings for a Vite app:

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

The Notion endpoints are implemented as Vercel API routes under `api/notion/*`.
