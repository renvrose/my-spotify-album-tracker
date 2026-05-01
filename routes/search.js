const express = require('express');
const { renderPage } = require('./utils');

const router = express.Router();

// ================= SEARCH =================
router.get('/search', (req, res) => {
    res.send(renderPage('Search', `
        <div class="card form-card mx-auto" style="max-width: 520px;">
            <div class="card-body">
                <h2 class="page-title mb-3">Search Spotify</h2>
                <form action="/search" method="POST" class="d-grid gap-3">
                    <label class="form-label">Search for albums on Spotify</label>
                    <input name="searchTerm" class="form-control" placeholder="Album name, artist, etc." required>
                    <button class="btn btn-success btn-lg">Search on Spotify</button>
                </form>
            </div>
        </div>
    `, 'default'));
});

router.post('/search', (req, res) => {
    const searchTerm = req.body.searchTerm;
    if (!searchTerm) return res.redirect('/search');
    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(searchTerm)}/albums`;
    res.redirect(spotifyUrl);
});

module.exports = router;