const express = require('express');
const { renderPage, loadAlbums, saveAlbums, extractSpotifyId, getSpotifyAlbum } = require('./utils');

const router = express.Router();

// ================= LIST =================
router.get('/albums', async (req, res) => {
    const albums = loadAlbums();
    const query = (req.query.q || "").toLowerCase();
    const showFavOnly = req.query.fav === "true";

    function normalizeImageUrl(img) {
        const placeholder = 'https://via.placeholder.com/640x640?text=Album+Cover';
        if (!img) return placeholder;
        const trimmed = String(img).trim();
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return placeholder;
    }

    const enriched = await Promise.all(
        albums.map(async (album) => {
            const data = await getSpotifyAlbum(album.spotifyId).catch(() => null);

            // 🔥 IMPORTANT: DO NOT overwrite core fields
            return {
                ...album,

                // Spotify-only display fields (NEW NAMES)
                spotifyTitle: data?.name || "",
                spotifyArtist: data?.artists?.map(a => a.name).join(", ") || "",
                spotifyImage: normalizeImageUrl(data?.images?.[0]?.url)
            };
        })
    );

    const filtered = enriched.filter(a =>
        (!query ||
            (a.spotifyArtist || a.artist).toLowerCase().includes(query) ||
            (a.year && a.year.toString().includes(query)) ||
            (a.notes && a.notes.toLowerCase().includes(query))) &&
        (!showFavOnly || a.favorite)
    );

    let list = '';
    for (let album of filtered) {
        list += `
        <div class="card album-card p-3 mb-4 mx-auto" style="max-width:420px;">

            <div class="text-start mb-2">
                ${album.spotifyTitle || album.title ? `<h4>${album.spotifyTitle || album.title}</h4>` : ''}
                ${album.spotifyArtist || album.artist ? `<p class="text-muted mb-0">${album.spotifyArtist || album.artist}</p>` : ''}
            </div>

            ${album.spotifyId ? `
            <div class="album-player-section">
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

            <div class="d-flex gap-2 my-3 flex-wrap">
                <a href="/editAlbum/${album.id}" class="btn btn-primary btn-sm">Edit</a>

                <form action="/deleteAlbum/${album.id}" method="POST" style="display:inline;">
                    <button class="btn btn-danger btn-sm">Delete</button>
                </form>

                <form action="/favoriteAlbum/${album.id}" method="POST" style="display:inline;">
                    <button class="btn btn-warning btn-sm">
                        ${album.favorite ? "★" : "☆"}
                    </button>
                </form>
            </div>

            ${album.spotifyId ? `
            <hr>
            <a class="btn btn-dark btn-sm w-100" target="_blank"
               href="https://open.spotify.com/album/${album.spotifyId}">
               ▶ Open in Spotify
            </a>` : ''}

        </div>`;
    }

    res.send(renderPage('Albums', `
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
            <div>
                <h1 class="page-title mb-1">My Spotify Albums ✨</h1>
                <p class="text-muted mb-0">Saved Spotify albums appear below.</p>
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

                    <div class="album-grid" id="album-grid">
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
    `));
});


// ================= ADD =================
router.post('/addAlbum', async (req, res) => {
    const albums = loadAlbums();
    const spotifyId = extractSpotifyId(req.body.spotifyId);

    if (!spotifyId) return res.send("❌ Invalid Spotify album link or ID");

    const data = await getSpotifyAlbum(spotifyId).catch(() => null);

    const newId = albums.length ? Math.max(...albums.map(a => a.id)) + 1 : 1;

    albums.push({
        id: newId,
        spotifyId,

        // user data (NEVER overwritten)
        artist: req.body.artist || "",
        year: req.body.year || "",
        notes: req.body.notes || "",
        favorite: false,

        // optional fallback
        title: req.body.title || ""
    });

    saveAlbums(albums);
    res.redirect('/albums');
});


// ================= EDIT =================
router.post('/editAlbum/:id', (req, res) => {
    const albums = loadAlbums();
    const index = albums.findIndex(a => a.id == req.params.id);
    if (index === -1) return res.send("Not found");

    const spotifyId = extractSpotifyId(req.body.spotifyId);
    if (!spotifyId) return res.send("❌ Invalid Spotify album link or ID");

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