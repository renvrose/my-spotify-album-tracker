const express = require('express');
const { renderPage } = require('./utils');

const router = express.Router();

router.get('/', (req, res) => {
    res.send(renderPage('Home', `
        <section class="hero text-center mx-auto" style="max-width: 760px;">
            <span class="hero-badge">🌸 Spotify Tracker ✨</span>
            <h1 class="page-title"> My Spotify Albums</h1>
            <p class="hero-copy text-muted">Browse your saved albums, preview Spotify embeds, and keep your favourites in one place.</p>
            <div class="button-group d-flex flex-column flex-sm-row justify-content-center gap-3 mt-4">
                <a href="/albums" class="btn btn-primary btn-lg">Albums</a>
                <a href="/playlists" class="btn btn-primary btn-lg">Playlists</a>
                <a href="/search" class="btn btn-dark btn-lg">Search</a>
            </div>
        </section>
    `, 'default'));
});

module.exports = router;