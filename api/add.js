// API endpoint: /api/add
// Receives feature suggestions from the app
// Params: message (base64), image (bool), imgsrc (optional), androidid

import { neon } from '@neondatabase/serverless';

// TODO: Add your Neon DB connection string as environment variable NEON_DATABASE_URL
// const sql = neon(process.env.NEON_DATABASE_URL); // MOVED INSIDE HANDLER

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!process.env.NEON_DATABASE_URL) {
        console.error('Error: NEON_DATABASE_URL is not set');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error: Database connection is missing.'
        });
    }

    const { message, image, imgsrc, androidid } = req.query;

    // Validate required params
    if (!message || !androidid) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters: message and androidid'
        });
    }

    try {
        const sql = neon(process.env.NEON_DATABASE_URL);

        // Decode base64 message
        const decodedMessage = Buffer.from(message, 'base64').toString('utf-8');

        // Check if user has a pending request
        const pendingCheck = await sql`
            SELECT id FROM suggestions
            WHERE android_id = ${androidid} AND status = 'pending'
            LIMIT 1
        `;

        if (pendingCheck.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'You already have a pending suggestion. Please wait for it to be reviewed.'
            });
        }

        // Insert new suggestion
        const hasImage = image === 'true';
        const imageUrl = hasImage && imgsrc ? imgsrc : null;

        await sql`
            INSERT INTO suggestions (android_id, message, has_image, image_url, status, created_at)
            VALUES (${androidid}, ${decodedMessage}, ${hasImage}, ${imageUrl}, 'pending', NOW())
        `;

        return res.status(200).json({
            success: true,
            message: 'Your suggestion has been submitted successfully!'
        });

    } catch (error) {
        console.error('Error saving suggestion:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save suggestion. Please try again.'
        });
    }
}

/*
SQL to create the suggestions table in Neon DB:

CREATE TABLE suggestions (
    id SERIAL PRIMARY KEY,
    android_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    has_image BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_android_id ON suggestions(android_id);
CREATE INDEX idx_status ON suggestions(status);
*/
