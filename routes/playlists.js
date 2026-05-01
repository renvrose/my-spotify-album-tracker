const express = require('express');
const { renderPage, loadPlaylists, savePlaylists, getSpotifyPlaylist, extractSpotifyId } = require('./utils');

const router = express.Router();

router.get('/playlists', async (req, res) => {
    const playlists = loadPlaylists();
    const query = (req.query.q || '').toLowerCase();

    const enriched = await Promise.all(
        playlists.map(async (playlist) => {
            const data = await getSpotifyPlaylist(playlist.spotifyId).catch(() => null);

            return {
                ...playlist,
                title: data?.name || playlist.title || '',
                owner: data?.owner?.display_name || playlist.artist || 'Unknown',
                description: data?.description || playlist.notes || ''
            };
        })
    );

    const filtered = enriched.filter(item =>
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.owner.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );

    let list = '';
    for (let playlist of filtered) {
        list += `
        <div class="playlist-card card p-3">
            <div class="text-start mb-2">
                ${playlist.title ? `<h4>${playlist.title}</h4>` : ''}
                <p class="text-muted mb-0">${playlist.owner}</p>
            </div>

            <div class="playlist-player-section mb-3">
                <iframe
                    src="https://open.spotify.com/embed/playlist/${playlist.spotifyId}?utm_source=generator&theme=1"
                    width="100%" height="232"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy">
                </iframe>
            </div>

            ${playlist.description ? `<p class="text-muted mb-2">${playlist.description}</p>` : ''}

            <div class="d-flex gap-2 flex-wrap mb-3">
                <a class="btn btn-primary btn-sm" href="/editPlaylist/${playlist.id}">Edit</a>
                <form action="/deletePlaylist/${playlist.id}" method="POST" style="display:inline;">
                    <button class="btn btn-danger btn-sm">Delete</button>
                </form>
            </div>

            <a class="btn btn-dark btn-sm" target="_blank"
               href="https://open.spotify.com/playlist/${playlist.spotifyId}">
                ▶ Open in Spotify
            </a>
        </div>`;
    }

    res.send(renderPage('Playlists', `
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
            <div>
                <h1 class="page-title mb-1">My Spotify Playlists 🎧</h1>
                <p class="text-muted mb-0">Saved playlists from Spotify appear below.</p>
            </div>
            <a href="/addPlaylist" class="btn btn-success btn-lg">Add Playlist</a>
        </div>

        <form class="d-flex mb-4" style="max-width:420px;">
            <input type="text" name="q" class="form-control me-2"
                   placeholder="Search playlists…" value="${req.query.q || ''}">
            <button type="submit" formaction="/playlists" class="btn btn-primary me-2">Search</button>
            <button type="submit" formaction="https://open.spotify.com/search"
                    formtarget="_blank" class="btn btn-success">Spotify</button>
        </form>

        ${list
            ? `<div class="carousel-container">
                    <button class="carousel-btn carousel-btn-left" id="scroll-left-playlists">
                        <span>‹</span>
                    </button>

                    <div class="playlist-grid" id="playlist-grid">
                        ${list}
                    </div>

                    <button class="carousel-btn carousel-btn-right" id="scroll-right-playlists">
                        <span>›</span>
                    </button>
               </div>`
            : `<div class="empty-state card p-5 text-center">
                    <p class="mb-0">No playlists found.</p>
               </div>`
        }

        <div class="text-center mt-5 text-muted small">
            <p>This app is purely for entertainment purposes. 
            <p>It started with an idea of someone who wants to stream using Spotify free plan!
        </div>

        <script>
        (function() {
            const grid = document.getElementById('playlist-grid');
            const leftBtn = document.getElementById('scroll-left-playlists');
            const rightBtn = document.getElementById('scroll-right-playlists');

            if (!grid || !leftBtn || !rightBtn) return;

            const scrollAmount = 350;

            leftBtn.addEventListener('click', () => {
                grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            });

            rightBtn.addEventListener('click', () => {
                grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            });
        })();
        </script>
    `));
});

router.get('/addPlaylist', (req, res) => {
    res.send(renderPage('Add Playlist', `
        <div class="card form-card mx-auto" style="max-width: 520px;">
            <div class="card-body">
                <h2 class="page-title mb-3">Add Playlist</h2>
                <form action="/addPlaylist" method="POST" class="d-grid gap-3">
                    <label class="form-label">Spotify playlist link or ID</label>
                    <input name="spotifyId" class="form-control" required>

                    <label class="form-label">Owner / Artist</label>
                    <input name="artist" class="form-control">

                    <label class="form-label">Year</label>
                    <input name="year" class="form-control" type="number" min="1900" max="2100">

                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-control"></textarea>

                    <button class="btn btn-success btn-lg">Save playlist</button>
                </form>
            </div>
        </div>
    `, 'adding'));
});

router.post('/addPlaylist', (req, res) => {
    const playlists = loadPlaylists();
    const spotifyId = extractSpotifyId(req.body.spotifyId);
    if (!spotifyId) return res.send('❌ Invalid Spotify playlist link or ID');

    const newId = playlists.length ? Math.max(...playlists.map(p => p.id)) + 1 : 1;
    playlists.push({
        id: newId,
        spotifyId,
        artist: req.body.artist || '',
        year: req.body.year || '',
        notes: req.body.notes || ''
    });
    savePlaylists(playlists);
    res.redirect('/playlists');
});

router.get('/editPlaylist/:id', (req, res) => {
    const playlists = loadPlaylists();
    const playlist = playlists.find(p => p.id == req.params.id);
    if (!playlist) return res.status(404).send('Playlist not found');

    res.send(renderPage('Edit Playlist', `
        <div class="card form-card mx-auto" style="max-width: 520px;">
            <div class="card-body">
                <h2 class="page-title mb-3">Edit Playlist</h2>
                <form action="/editPlaylist/${playlist.id}" method="POST" class="d-grid gap-3">
                    <label class="form-label">Spotify playlist link or ID</label>
                    <input name="spotifyId" value="${playlist.spotifyId || ''}" class="form-control" required>

                    <label class="form-label">Owner / Artist</label>
                    <input name="artist" value="${playlist.artist || ''}" class="form-control">

                    <label class="form-label">Year</label>
                    <input name="year" value="${playlist.year || ''}" class="form-control" type="number" min="1900" max="2100">

                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-control">${playlist.notes || ''}</textarea>

                    <button class="btn btn-primary btn-lg">Save changes</button>
                </form>
            </div>
        </div>
    `, 'editing'));
});

router.post('/editPlaylist/:id', (req, res) => {
    const playlists = loadPlaylists();
    const index = playlists.findIndex(p => p.id == req.params.id);
    if (index === -1) return res.status(404).send('Playlist not found');

    const spotifyId = extractSpotifyId(req.body.spotifyId);
    if (!spotifyId) return res.send('❌ Invalid Spotify playlist link or ID');

    playlists[index].spotifyId = spotifyId;
    playlists[index].artist = req.body.artist || '';
    playlists[index].year = req.body.year || '';
    playlists[index].notes = req.body.notes || '';
    savePlaylists(playlists);

    res.redirect('/playlists');
});

router.post('/deletePlaylist/:id', (req, res) => {
    let playlists = loadPlaylists();
    playlists = playlists.filter(p => p.id != req.params.id);
    savePlaylists(playlists);
    res.redirect('/playlists');
});

module.exports = router;
