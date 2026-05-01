const express = require('express');
const { renderPage, loadAlbums, saveAlbums, extractSpotifyId, getSpotifyAlbum } = require('./utils');

const router = express.Router();

// ================= LIST =================
router.get('/albums', async (req, res) => {
    const albums = loadAlbums();
    const query = (req.query.q || "").toLowerCase();
    const showFavOnly = req.query.fav === "true";

    const enriched = await Promise.all(
        albums.map(async (album) => {
            const data = await getSpotifyAlbum(album.spotifyId);

            const title = data?.name || album.title || '';
            const artist = data?.artists?.map(a => a.name).join(", ") || album.artist || '';

            return {
                ...album,
                title,
                artist
            };
        })
    );

    const filtered = enriched.filter(a =>
        (!query ||
            (a.artist && a.artist.toLowerCase().includes(query)) ||
            (a.year && a.year.toString().includes(query)) ||
            (a.notes && a.notes.toLowerCase().includes(query))) &&
        (!showFavOnly || a.favorite)
    );

    let list = '';

    for (let album of filtered) {
        list += `
        <div class="playlist-card card p-3">

            <div class="text-start mb-2">
                ${album.title ? `<h4>${album.title}</h4>` : ''}
                ${album.artist ? `<p class="text-muted mb-0">${album.artist}</p>` : ''}
            </div>

            ${album.spotifyId ? `
            <div class="playlist-player-section">
                <iframe
                    src="https://open.spotify.com/embed/album/${album.spotifyId}?utm_source=generator&theme=1"
                    width="100%" height="232"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy">
                </iframe>
            </div>` : ''}

            ${album.year || album.notes ? `
            <div class="mt-2">
                ${album.year ? `<p class="text-muted mb-0"><strong>Year:</strong> ${album.year}</p>` : ''}
                ${album.notes ? `<p class="text-muted mb-0"><strong>Notes:</strong> ${album.notes}</p>` : ''}
            </div>` : ''}

            <div class="d-flex gap-2 mt-3 flex-wrap justify-content-between">
                <div class="d-flex gap-2">
                    <a href="/editAlbum/${album.id}" class="btn btn-primary btn-sm">Edit</a>

                    <form action="/deleteAlbum/${album.id}" method="POST">
                        <button class="btn btn-danger btn-sm">Delete</button>
                    </form>

                    <form action="/favoriteAlbum/${album.id}" method="POST">
                        <button class="btn btn-warning btn-sm">
                            ${album.favorite ? "★" : "☆"}
                        </button>
                    </form>
                </div>

                <a class="btn btn-dark btn-sm" target="_blank"
                   href="https://open.spotify.com/album/${album.spotifyId}">
                   ▶ Open
                </a>
            </div>

        </div>`;
    }

    res.send(renderPage('Albums', `
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
            <div>
                <h1 class="page-title mb-1">My Spotify Albums ✨</h1>
                <p class="text-muted mb-0">Saved albums appear below.</p>
            </div>

            <div class="d-flex gap-2">
                <a href="/addAlbum" class="btn btn-success btn-lg">Add Album</a>
                <a href="/albums?fav=true" class="btn btn-outline-warning">Favorites</a>
            </div>
        </div>

        <form class="d-flex mb-4" style="max-width:420px;">
            <input type="text" name="q" class="form-control me-2"
                   placeholder="Search albums…" value="${query}">
            <button type="submit" formaction="/albums" class="btn btn-primary me-2">Filter</button>
            <button type="submit" formaction="https://open.spotify.com/search"
                    formtarget="_blank" class="btn btn-success">Spotify</button>
        </form>

        ${list
            ? `<div class="carousel-container">
                    <button class="carousel-btn carousel-btn-left" id="scroll-left-albums">
                        <span>‹</span>
                    </button>

                    <div class="playlist-grid" id="album-grid">
                        ${list}
                    </div>

                    <button class="carousel-btn carousel-btn-right" id="scroll-right-albums">
                        <span>›</span>
                    </button>
               </div>`
            : `<div class="empty-state card p-5 text-center">
                    <p class="mb-0">No albums found.</p>
               </div>`
        }

        <script>
        (function() {
            const grid = document.getElementById('album-grid');
            const leftBtn = document.getElementById('scroll-left-albums');
            const rightBtn = document.getElementById('scroll-right-albums');

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


// ================= ADD =================
router.get('/addAlbum', (req, res) => {
    res.send(renderPage('Add Album', `
        <div class="card form-card mx-auto" style="max-width: 520px;">
            <div class="card-body">
                <h2 class="page-title mb-3">Add Album</h2>

                <form action="/addAlbum" method="POST" class="d-grid gap-3">
                    <label class="form-label">Spotify album ID</label>
                    <input name="spotifyId" class="form-control" required>

                    <label class="form-label">Artist</label>
                    <input name="artist" class="form-control">

                    <label class="form-label">Year</label>
                    <input name="year" class="form-control" type="number" min="1900" max="2100">

                    <label class="form-label">Notes</label>
                    <textarea name="notes" class="form-control"></textarea>

                    <button class="btn btn-success btn-lg">Save album</button>
                </form>
            </div>
        </div>
    `, 'adding'));
});


// ================= CREATE =================
router.post('/addAlbum', async (req, res) => {
    const albums = loadAlbums();
    const spotifyId = extractSpotifyId(req.body.spotifyId);

    if (!spotifyId) return res.send("❌ Invalid Spotify album ID");

    const newId = albums.length ? Math.max(...albums.map(a => a.id)) + 1 : 1;

    albums.push({
        id: newId,
        spotifyId,
        artist: req.body.artist || "",
        year: req.body.year || "",
        notes: req.body.notes || "",
        favorite: false
    });

    saveAlbums(albums);
    res.redirect('/albums');
});


// ================= EDIT =================
router.get('/editAlbum/:id', (req, res) => {
    const albums = loadAlbums();
    const album = albums.find(a => a.id == req.params.id);
    if (!album) return res.send("Not found");

    res.send(renderPage('Edit Album', `
        <div class="card form-card mx-auto" style="max-width: 560px;">
            <div class="card-body">
                <h2 class="page-title mb-3">Edit Album</h2>

                <form action="/editAlbum/${album.id}" method="POST" class="d-grid gap-3">
                    <input name="spotifyId" value="${album.spotifyId || ''}" class="form-control">
                    <input name="artist" value="${album.artist || ''}" class="form-control">
                    <input name="year" value="${album.year || ''}" class="form-control" type="number">
                    <textarea name="notes" class="form-control">${album.notes || ''}</textarea>
                    <button class="btn btn-primary btn-lg">Save</button>
                </form>
            </div>
        </div>
    `, 'editing'));
});


// ================= UPDATE =================
router.post('/editAlbum/:id', (req, res) => {
    const albums = loadAlbums();
    const index = albums.findIndex(a => a.id == req.params.id);
    if (index === -1) return res.send("Not found");

    const spotifyId = extractSpotifyId(req.body.spotifyId);
    if (!spotifyId) return res.send("❌ Invalid Spotify album ID");

    albums[index].spotifyId = spotifyId;
    albums[index].artist = req.body.artist || "";
    albums[index].year = req.body.year || "";
    albums[index].notes = req.body.notes || "";

    saveAlbums(albums);
    res.redirect('/albums');
});


// ================= DELETE =================
router.post('/deleteAlbum/:id', (req, res) => {
    let albums = loadAlbums();
    albums = albums.filter(a => a.id != req.params.id);
    saveAlbums(albums);
    res.redirect('/albums');
});


// ================= FAVORITE =================
router.post('/favoriteAlbum/:id', (req, res) => {
    const albums = loadAlbums();
    const album = albums.find(a => a.id == req.params.id);

    if (album) {
        album.favorite = !album.favorite;
        saveAlbums(albums);
    }

    res.redirect('/albums');
});

module.exports = router;