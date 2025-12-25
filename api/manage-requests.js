// API endpoint: /api/manage-requests
// Manage suggestions (fetch pending, approve, deny)
// Methods: GET (fetch), POST (update status)

import { neon } from '@neondatabase/serverless';

// const sql = neon(process.env.NEON_DATABASE_URL); // MOVED INSIDE HANDLER
const ADMIN_KEY = process.env.ADMIN_KEY;

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!process.env.NEON_DATABASE_URL) {
        return res.status(500).json({ error: 'Server configuration error: Database connection is missing.' });
    }

    // specific auth check
    const key = req.query.key || req.body?.key;
    if (key !== ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized. Invalid Admin Key.' });
    }

    try {
        const sql = neon(process.env.NEON_DATABASE_URL);

        if (req.method === 'GET') {
            // Fetch all suggestions, ordered by pending first, then by date
            const suggestions = await sql`
                SELECT * FROM suggestions 
                ORDER BY 
                    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
                    created_at DESC
                LIMIT 100
            `;

            return res.status(200).json({ success: true, suggestions });
        }
        else if (req.method === 'POST') {
            const { id, status } = JSON.parse(req.body);

            if (!id || !['approved', 'denied'].includes(status)) {
                return res.status(400).json({ error: 'Invalid parameters' });
            }

            await sql`
                UPDATE suggestions 
                SET status = ${status} 
                WHERE id = ${id}
            `;

            return res.status(200).json({ success: true, message: `Suggestion ${status}` });
        }
    } catch (error) {
        console.error('Admin API error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
