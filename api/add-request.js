// API endpoint: /api/add-request
// Returns user's past suggestions by androidid
// Params: androidid

import { neon } from '@neondatabase/serverless';

// const sql = neon(process.env.NEON_DATABASE_URL); // MOVED INSIDE HANDLER

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!process.env.NEON_DATABASE_URL) {
        return res.status(500).json({
            success: false,
            error: 'Server configuration error: Database connection is missing.'
        });
    }

    const { androidid } = req.query;

    if (!androidid) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameter: androidid'
        });
    }

    try {
        const sql = neon(process.env.NEON_DATABASE_URL);

        // Fetch user's suggestions ordered by most recent first
        const suggestions = await sql`
            SELECT id, message, has_image, image_url, status, created_at
            FROM suggestions
            WHERE android_id = ${androidid}
            ORDER BY created_at DESC
        `;

        // Check if user has a pending request
        const hasPending = suggestions.some(s => s.status === 'pending');

        return res.status(200).json({
            success: true,
            has_pending: hasPending,
            suggestions: suggestions.map(s => ({
                id: s.id,
                message: s.message,
                hasImage: s.has_image,
                imageUrl: s.image_url,
                status: s.status,
                createdAt: s.created_at
            }))
        });

    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch suggestions'
        });
    }
}
