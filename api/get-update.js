// API endpoint: /api/get-update?version={current_version}
// Checks GitHub repo for updates and returns update info or 63887 if latest

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/uzairdeveloper223/kips_mirpur_update/main';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { version } = req.query;

    if (!version) {
        return res.status(400).json({ error: 'Version parameter required' });
    }

    try {
        // Fetch latest version from GitHub
        const versionResponse = await fetch(`${GITHUB_RAW_BASE}/version.txt`);

        if (!versionResponse.ok) {
            return res.status(500).json({ error: 'Failed to fetch version info' });
        }

        const latestVersion = (await versionResponse.text()).trim();

        // Compare versions
        if (compareVersions(version, latestVersion) >= 0) {
            // Current version is latest or newer
            return res.status(200).send('63887');
        }

        // Update available - fetch changelog
        const changelogResponse = await fetch(`${GITHUB_RAW_BASE}/changelog_${latestVersion}.txt`);
        let changelog = 'New version available!';

        if (changelogResponse.ok) {
            changelog = await changelogResponse.text();
        }

        // Build download URL
        const downloadUrl = `${GITHUB_RAW_BASE}/kips_mirpur_${latestVersion}.apk`;

        return res.status(200).json({
            status: 'update_available',
            version: latestVersion,
            download_url: downloadUrl,
            changelog: changelog.trim()
        });

    } catch (error) {
        console.error('Update check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Compare two version strings (e.g., "1.0.0" vs "1.0.5")
// Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 < p2) return -1;
        if (p1 > p2) return 1;
    }

    return 0;
}
