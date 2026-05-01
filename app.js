const dotenv = require('dotenv');
const express = require('express');

const envPath = require('path').join(__dirname, '.env');
const altEnvPath = require('path').join(__dirname, 'dotenv.env');

const fs = require('fs');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else if (fs.existsSync(altEnvPath)) {
    dotenv.config({ path: altEnvPath });
} else {
    dotenv.config();
}

const app = express();
const port = 3000;

// ================= SPOTIFY =================
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Missing Spotify credentials in .env");
    process.exit(1);
}

// ================= MIDDLEWARE =================
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= ROUTES =================
const homeRoutes = require('./routes/home');
const albumRoutes = require('./routes/albums');
const searchRoutes = require('./routes/search');
const playlistRoutes = require('./routes/playlists');
const { renderPage } = require('./routes/utils');

app.use('/', homeRoutes);
app.use('/', albumRoutes);
app.use('/', searchRoutes);
app.use('/', playlistRoutes);

// ================= 404 HANDLER =================
app.use((req, res) => {
    res.status(404).send(renderPage('404 - Page Not Found', `
        <div class="card form-card mx-auto text-center" style="max-width: 580px;">
            <div class="card-body">
                <div class="mb-4">
                    <span class="badge bg-danger mb-3">404</span>
                    <h2 class="page-title mb-3">Page not found</h2>
                    <p class="lead text-muted">Looks like this route got lost in the playlist shuffle.</p>
                </div>

                <div class="d-flex flex-column flex-sm-row justify-content-center gap-2 mt-4">
                    <a href="/" class="btn btn-primary">Go home</a>
                    <a href="/albums" class="btn btn-outline-secondary">Albums</a>
                    <a href="/playlists" class="btn btn-outline-secondary">Playlists</a>
                </div>
            </div>
        </div>
    `));
});


// ================= START =================
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
