# Jal Seva Kendra - Water Hishab App

This is a Next.js application for managing water supply records and customer payments for rural farmers, built using Firebase for the backend.

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Set up Environment Variables:**
    Create a `.env.local` file in the root directory and add your Firebase project configuration keys:
    ```dotenv
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID # Optional
    ```
    Replace `YOUR_*` placeholders with the actual values from your Firebase project settings (Project Settings > General > Your apps > Web app).

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:9002](http://localhost:9002) (or the specified port) with your browser to see the result.