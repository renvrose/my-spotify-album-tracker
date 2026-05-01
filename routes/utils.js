const fs = require('fs');
const path = require('path');
const axios = require('axios');

const dataFile = path.join(__dirname, 'albums.json');
const playlistsFile = path.join(__dirname, 'playlists.json');


// ================= TOKEN CACHE =================
let cachedToken = null;
let tokenExpiry = 0;

// ================= LOAD =================
function loadAlbums() {
    try {
        if (!fs.existsSync(dataFile)) return [];
        const data = fs.readFileSync(dataFile, 'utf-8');
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.log("LOAD ERROR:", err.message);
        return [];
    }
}

// ================= SAVE =================
function saveAlbums(albums) {
    fs.writeFileSync(dataFile, JSON.stringify(albums, null, 2));
}

// ================= EXTRACT SPOTIFY ID =================
function extractSpotifyId(input) {
    if (!input) return null;
    const cleaned = input.trim();
    const match =
        cleaned.match(/album\/([A-Za-z0-9]+)/) ||
        cleaned.match(/open\.spotify\.com\/album\/([A-Za-z0-9]+)/);
    if (match) return match[1];
    if (/^[A-Za-z0-9]{22}$/.test(cleaned)) return cleaned;
    return null;
}

// ================= GET TOKEN =================
async function getSpotifyToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }
    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({ grant_type: 'client_credentials' }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization:
                        'Basic ' +
                        Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
                },
            }
        );
        cachedToken = response.data.access_token;
        tokenExpiry = now + response.data.expires_in * 1000;
        return cachedToken;
    } catch (err) {
        console.log("❌ TOKEN ERROR:", err.response?.data || err.message);
        return null;
    }
}

// ================= GET ALBUM =================
async function getSpotifyAlbum(id) {
    try {
        const token = await getSpotifyToken();
        if (!token) {
            console.log("❌ No token available");
            return null;
        }
        const res = await axios.get(
            `https://api.spotify.com/v1/albums/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (err) {
        return null;
    }
}

// ================= GET PLAYLIST =================
async function getSpotifyPlaylist(id) {
    try {
        const token = await getSpotifyToken();
        if (!token) {
            console.log("❌ No token available");
            return null;
        }
        const res = await axios.get(
            `https://api.spotify.com/v1/playlists/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (err) {
        return null;
    }
}

function loadPlaylists() {
    try {
        if (!fs.existsSync(playlistsFile)) return [];
        const data = fs.readFileSync(playlistsFile, 'utf-8');
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.log("LOAD PLAYLIST ERROR:", err.message);
        return [];
    }
}

function savePlaylists(playlists) {
    fs.writeFileSync(playlistsFile, JSON.stringify(playlists, null, 2));
}


function renderPage(title, content, mascotState = 'default') {
    const mascotHTML = getMascot(mascotState);
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <link href="/css/style.css" rel="stylesheet" />
    </head>
    <body>
        <div class="background-bubble" style="top: 10%; left: 10%;"></div>
        <div class="background-bubble green" style="top: 60%; right: 15%;"></div>
        <div class="background-bubble" style="top: 80%; left: 20%;"></div>
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
            <div class="container">
                <a class="navbar-brand" href="/">🎵 Spotify Album Tracker</a>
                <div class="navbar-nav ms-auto">
                    <a class="nav-link" href="/">Home</a>
                    <a class="nav-link" href="/albums">Albums</a>
                </div>
            </div>
        </nav>
        <main class="app-shell container py-5">
            ${content}
        </main>
        ${mascotHTML}
        
        <!-- Theme Selector Modal -->
        <div id="theme-selector" class="theme-selector hidden">
            <div class="theme-selector-content">
                <h3>Pick a theme ✨</h3>
                <div class="theme-options">
                    <button type="button" class="theme-btn" data-theme="default" title="Default">🌸</button>
                    <button type="button" class="theme-btn" data-theme="theme-dark" title="Dark">🌙</button>
                    <button type="button" class="theme-btn" data-theme="theme-ocean" title="Ocean">🌊</button>
                    <button type="button" class="theme-btn" data-theme="theme-pastel" title="Pastel">🎀</button>
                </div>
                <button type="button" id="close-theme-selector" class="theme-close-btn">×</button>
            </div>
        </div>
        
        <script>
        (function () {
            // ===== THEME SELECTOR =====
            const themeSelector = document.getElementById('theme-selector');
            const mascotImg = document.getElementById('mascot-img');
            const closeBtn = document.getElementById('close-theme-selector');
            const themeButtons = document.querySelectorAll('.theme-btn');
            
            if (!themeSelector || !mascotImg || !closeBtn || themeButtons.length === 0) {
                console.warn('Theme selector elements not found');
                return;
            }
            
            // Load saved theme on page load
            const savedTheme = localStorage.getItem('selectedTheme') || 'default';
            applyTheme(savedTheme);
            
            function applyTheme(theme) {
                document.body.className = '';
                if (theme !== 'default') {
                    document.body.classList.add(theme);
                }
                localStorage.setItem('selectedTheme', theme);
                updateThemeButtonStates(theme);
            }
            
            function updateThemeButtonStates(activeTheme) {
                themeButtons.forEach(btn => {
                    if (btn.dataset.theme === activeTheme) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
            
            // Mascot click to toggle theme selector
            mascotImg.addEventListener('click', (e) => {
                e.stopPropagation();
                themeSelector.classList.toggle('hidden');
            });
            
            // Close button
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                themeSelector.classList.add('hidden');
            });
            
            // Theme button clicks
            themeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const theme = btn.dataset.theme;
                    applyTheme(theme);
                    // Keep modal open so user can try other themes
                });
            });
            
            // Close selector when clicking outside
            document.addEventListener('click', (e) => {
                if (themeSelector && !themeSelector.contains(e.target) && e.target !== mascotImg) {
                    themeSelector.classList.add('hidden');
                }
            });
            
            // ===== BUBBLE EFFECTS =====
            const COLORS = ['#ff6b9d', '#4ecdc4', '#ffb3d1', '#a8edea', '#ff9ec4', '#80ded9'];

            function spawnBubbles(e) {
                const el = e.currentTarget;
                const rect = el.getBoundingClientRect();
                const count = 6 + Math.floor(Math.random() * 5);

                for (let i = 0; i < count; i++) {
                    const bubble = document.createElement('span');
                    bubble.className = 'hover-bubble';

                    // Random position along the element edge
                    const x = rect.left + Math.random() * rect.width + window.scrollX;
                    const y = rect.top  + Math.random() * rect.height + window.scrollY;

                    const size = 8 + Math.random() * 18;
                    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    const angle = -60 + Math.random() * 120; // degrees
                    const dist  = 40 + Math.random() * 60;   // px travel

                    bubble.style.cssText = \`
                        left: \${x}px;
                        top: \${y}px;
                        width: \${size}px;
                        height: \${size}px;
                        background: \${color};
                        --tx: \${Math.sin(angle * Math.PI / 180) * dist}px;
                        --ty: \${-Math.abs(Math.cos(angle * Math.PI / 180)) * dist}px;
                        animation-delay: \${Math.random() * 0.15}s;
                    \`;

                    document.body.appendChild(bubble);
                    bubble.addEventListener('animationend', () => bubble.remove());
                }
            }

            function attachBubbles() {
                document.querySelectorAll('.btn, .album-card, .hero, .form-card, #mascot-img').forEach(el => {
                    if (!el.dataset.bubbleAttached) {
                        el.dataset.bubbleAttached = '1';
                        el.addEventListener('mouseenter', spawnBubbles);
                    }
                });
            }

            // Run on load and after any dynamic content changes
            attachBubbles();
            new MutationObserver(attachBubbles).observe(document.body, { childList: true, subtree: true });
        })();
        </script>
    </body>
    </html>`;
}

function getMascot(state) {
    const messages = {
        default: "exploring hmm...music or who? 🎵",
        empty: "too quiet and dusty.. add some albums! 🎶",
        browsing: "my damn amazing collection yessirr 🎧",
        favorites: "all time favourites :3 ⭐",
        adding: " growing my collection slowly~ 🌟",
        editing: "time to change it up! 🔧",
    };

    const message = messages[state] || messages.default;

    // Cute cat with headphones from open-source Twemoji (Twitter emoji, CC-BY 4.0)
    // Using a well-known CDN-hosted PNG for reliability
    return `
    <div id="mascot-widget">
        <img id="mascot-img"
            src="https://in.pinterest.com/pin/white--999165867308538105/"
            alt="mascot"
            onerror="this.src='https://i.pinimg.com/originals/9f/fa/4f/9ffa4ff1e61267bb8365e0a86e03b9fd.jpg'"
        />
        <div id="mascot-bubble">
            <span id="mascot-tail"></span>
            ${message}
        </div>
    </div>`;
}

module.exports = {
    renderPage,
    loadAlbums,
    saveAlbums,
    loadPlaylists,
    savePlaylists,
    extractSpotifyId,
    getSpotifyAlbum,
    getSpotifyPlaylist, 
};
