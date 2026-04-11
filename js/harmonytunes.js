import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    const librarySongs = [
        { 
            id: 'deorc-decuple',
            title: "Deorc Decuple", 
            artist: "FormantX", 
            duration: "3:45", 
            src: "/music/ES_Deorc Decuple - FormantX.mp3", 
            art: "/images/harmony-tunes-card.jpg"
        },
        { 
            id: 'no-pole-remix',
            title: "No Pole x Where Have You Been", 
            artist: "Remix", 
            duration: "2:30", 
            src: "/music/No Pole x Where Have You Been (Remix).mp3", 
            art: "/images/dreams-lobby.jpg"
        }
    ];

    const tiktokData = [
        { title: "Viral Hit #1", img: "/images/UnstoppableHoodieModel300x300.png", url: "https://tiktok.com" },
        { title: "Studio Vibes", img: "/images/harmony-tunes-card.jpg", url: "https://tiktok.com" },
        { title: "New Release Teaser", img: "/images/DreamsTimeSkipModel300x300.jpg", url: "https://tiktok.com" },
        { title: "Behind the Scenes", img: "/images/dreams-lobby.jpg", url: "https://tiktok.com" },
        { title: "Top 10 This Week", img: "/images/un-logo-1.png", url: "https://tiktok.com" }
    ];

    let userFavorites = [];
    let currentQueue = [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = 0; // 0: none, 1: all, 2: one
    let currentUser = null;

    // --- DOM ELEMENTS ---
    const viewHome = document.getElementById('view-home');
    const viewPlaylist = document.getElementById('view-playlist');
    const navPills = document.querySelectorAll('.nav-pill');
    const backToHomeBtn = document.getElementById('back-to-home');
    
    // Containers
    const containerJumpBack = document.getElementById('container-jump-back-in');
    const containerRecommended = document.getElementById('container-recommended');
    const containerTikToks = document.getElementById('container-tiktoks');
    const containerPlaylists = document.getElementById('container-playlists');
    const songListBody = document.getElementById('song-list-body');
    
    // Playlist Elements
    const playlistTitleEl = document.getElementById('playlist-title');
    const playlistDescEl = document.getElementById('playlist-desc');
    const playlistPlayBtn = document.getElementById('playlist-play-btn');
    
    // Player Elements
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progress = document.querySelector('.progress');
    const currentTimeEl = document.querySelector('.current-time');
    const totalTimeEl = document.querySelector('.total-time');
    const volumeSlider = document.querySelector('.volume-slider');
    const playerTitle = document.getElementById('player-song-title');
    const playerArtist = document.getElementById('player-song-artist');
    const playerArt = document.getElementById('player-album-art');
    const playerLikeBtn = document.getElementById('player-like-btn');

    // --- INITIALIZATION ---
    function init() {
        renderHome();
        setupNavigation();
        setupPlayerEvents();
    }

    // --- NAVIGATION ---
    function setupNavigation() {
        navPills.forEach(pill => {
            pill.addEventListener('click', () => {
                // UI Toggle
                navPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                // Logic
                const id = pill.id;
                if (id === 'nav-home') {
                    showHome();
                } else if (id === 'nav-favorites') {
                    loadPlaylistView('favorites');
                } else if (id === 'nav-playlists') {
                    // Just scroll to playlist section on home for now
                    showHome();
                    containerPlaylists.scrollIntoView({ behavior: 'smooth' });
                } else if (id === 'nav-search') {
                    alert("Search feature coming soon!");
                }
            });
        });

        backToHomeBtn.addEventListener('click', () => {
            showHome();
            document.getElementById('nav-home').classList.add('active');
            document.getElementById('nav-favorites').classList.remove('active');
        });
    }

    function showHome() {
        viewHome.style.display = 'block';
        viewPlaylist.style.display = 'none';
    }

    function loadPlaylistView(type) {
        viewHome.style.display = 'none';
        viewPlaylist.style.display = 'block';
        
        if (type === 'favorites') {
            playlistTitleEl.textContent = "Liked Songs";
            playlistDescEl.textContent = `${currentUser ? currentUser.displayName || 'User' : 'Guest'}'s Favorites • ${userFavorites.length} songs`;
            renderSongTable(userFavorites);
            playlistPlayBtn.onclick = () => {
                if (userFavorites.length > 0) playContext(userFavorites, 0);
            };
        } else {
            // Default Main
            playlistTitleEl.textContent = "All Available Tracks";
            playlistDescEl.textContent = "Unstoppable Media • Official Library";
            renderSongTable(librarySongs);
            playlistPlayBtn.onclick = () => {
                playContext(librarySongs, 0);
            };
        }
    }

    // --- RENDERING HOME ---
    function renderHome() {
        // 1. Jump Back In
        containerJumpBack.innerHTML = librarySongs.slice(0, 2).map(song => createSongCard(song)).join('');

        // 2. Recommended
        const recommended = [...librarySongs].sort(() => 0.5 - Math.random());
        containerRecommended.innerHTML = recommended.map(song => createSongCard(song)).join('');

        // 3. TikToks
        containerTikToks.innerHTML = tiktokData.map(tk => `
            <div class="tiktok-card" onclick="window.open('${tk.url}', '_blank')">
                <img src="${tk.img}" alt="${tk.title}">
                <div class="tiktok-overlay">
                    <div class="tiktok-title">${tk.title}</div>
                </div>
            </div>
        `).join('');

        // 4. Playlists
        const playlists = [
            { id: 'main', title: "All Tracks", desc: "Complete Library" },
            { id: 'favorites', title: "Liked Songs", desc: "Your Favorites" }
        ];
        containerPlaylists.innerHTML = playlists.map(pl => `
            <div class="music-card" onclick="window.loadPlaylistView('${pl.id}')">
                <div class="card-img-wrapper">
                    <img src="/images/harmony-tunes-card.jpg" alt="${pl.title}">
                    <button class="card-play-btn">▶</button>
                </div>
                <div class="card-title">${pl.title}</div>
                <div class="card-desc">${pl.desc}</div>
            </div>
        `).join('');

        // Card Play Buttons
        document.querySelectorAll('.music-card .card-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.music-card');
                const songId = card.dataset.songId;
                if (songId) {
                    const song = librarySongs.find(s => s.id === songId);
                    if(song) playContext([song], 0);
                }
            });
        });
    }

    function createSongCard(song) {
        return `
            <div class="music-card" data-song-id="${song.id}" onclick="playSongById('${song.id}')">
                <div class="card-img-wrapper">
                    <img src="${song.art}" alt="${song.title}">
                    <button class="card-play-btn">▶</button>
                </div>
                <div class="card-title">${song.title}</div>
                <div class="card-desc">${song.artist}</div>
            </div>
        `;
    }

    window.playSongById = (id) => {
        const songIndex = librarySongs.findIndex(s => s.id === id);
        if (songIndex > -1) playContext(librarySongs, songIndex);
    };
    
    window.loadPlaylistView = loadPlaylistView;

    // --- RENDERING TABLE (Fixed Duration Bug) ---
    function renderSongTable(songs) {
        songListBody.innerHTML = '';
        if (songs.length === 0) {
            songListBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">No songs found.</td></tr>`;
            return;
        }

        songs.forEach((song, index) => {
            const row = document.createElement('tr');
            
            const isActive = (currentQueue[currentSongIndex]?.id === song.id);
            if (isActive) row.classList.add('playing');

            // REMOVED HEART COLUMN, ADDED DURATION
            row.innerHTML = `
                <td>
                    <span class="song-index" style="${isActive ? 'display:none' : ''}">${index + 1}</span>
                    <span class="playing-icon" style="${isActive ? 'display:inline' : 'display:none'}">▶</span>
                </td>
                <td class="song-title">${song.title}</td>
                <td>${song.artist}</td>
                <td style="text-align: right;">${song.duration}</td>
            `;

            row.addEventListener('click', () => {
                playContext(songs, index);
            });

            songListBody.appendChild(row);
        });
    }

    // --- PLAYER LOGIC ---
    function playContext(newQueue, startIndex) {
        currentQueue = [...newQueue];
        if (isShuffle) {
            const first = currentQueue[startIndex];
            const rest = currentQueue.filter((_, i) => i !== startIndex).sort(() => Math.random() - 0.5);
            currentQueue = [first, ...rest];
            currentSongIndex = 0;
        } else {
            currentSongIndex = startIndex;
        }
        loadSong(currentSongIndex);
        playSong();
    }

    function loadSong(index) {
        if (index < 0 || index >= currentQueue.length) return;
        const song = currentQueue[index];
        
        audioPlayer.src = song.src;
        playerTitle.textContent = song.title;
        playerArtist.textContent = song.artist;
        playerArt.src = song.art;

        const isFav = userFavorites.some(s => s.id === song.id);
        playerLikeBtn.textContent = isFav ? '❤' : '♡';
        playerLikeBtn.classList.toggle('active', isFav);

        updateProgress();
        if(viewPlaylist.style.display !== 'none') {
            const showingFavs = playlistTitleEl.textContent === "Liked Songs";
            renderSongTable(showingFavs ? userFavorites : librarySongs);
        }
    }

    function playSong() {
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }).catch(e => console.error(e));
    }

    function pauseSong() {
        audioPlayer.pause();
        isPlaying = false;
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }

    function togglePlayPause() {
        if (audioPlayer.paused) playSong();
        else pauseSong();
    }

    function nextSong() {
        let nextIndex = currentSongIndex + 1;
        if (nextIndex >= currentQueue.length) {
            if (repeatMode === 1) nextIndex = 0;
            else return;
        }
        currentSongIndex = nextIndex;
        loadSong(currentSongIndex);
        playSong();
    }

    function prevSong() {
        if (audioPlayer.currentTime > 3) {
            audioPlayer.currentTime = 0;
        } else {
            let prevIndex = currentSongIndex - 1;
            if (prevIndex < 0) {
                if (repeatMode === 1) prevIndex = currentQueue.length - 1;
                else prevIndex = 0;
            }
            currentSongIndex = prevIndex;
            loadSong(currentSongIndex);
            playSong();
        }
    }

    // --- EVENTS ---
    function setupPlayerEvents() {
        playPauseBtn.addEventListener('click', togglePlayPause);
        nextBtn.addEventListener('click', nextSong);
        prevBtn.addEventListener('click', prevSong);
        
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', () => {
            if (repeatMode === 2) {
                audioPlayer.currentTime = 0;
                playSong();
            } else {
                nextSong();
            }
        });

        volumeSlider.addEventListener('input', (e) => audioPlayer.volume = e.target.value);

        progressBar.parentElement.addEventListener('click', (e) => {
            const width = progressBar.parentElement.clientWidth;
            const clickX = e.offsetX;
            const duration = audioPlayer.duration;
            audioPlayer.currentTime = (clickX / width) * duration;
        });

        shuffleBtn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            shuffleBtn.style.color = isShuffle ? 'var(--accent-green)' : '#b3b3b3';
        });

        repeatBtn.addEventListener('click', () => {
            repeatMode = (repeatMode + 1) % 3;
            const indicator = repeatBtn.querySelector('.repeat-indicator');
            if (repeatMode === 0) {
                repeatBtn.style.color = '#b3b3b3';
                indicator.textContent = '';
            } else if (repeatMode === 1) {
                repeatBtn.style.color = 'var(--accent-green)';
                indicator.textContent = '.';
            } else {
                repeatBtn.style.color = 'var(--accent-green)';
                indicator.textContent = '1';
            }
        });

        playerLikeBtn.addEventListener('click', () => {
            if(currentQueue[currentSongIndex]) {
                toggleFavorite(currentQueue[currentSongIndex].id);
            }
        });
    }

    function updateProgress() {
        const { duration, currentTime } = audioPlayer;
        if (duration) {
            const percent = (currentTime / duration) * 100;
            progress.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(currentTime);
            totalTimeEl.textContent = formatTime(duration);
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    async function toggleFavorite(songId) {
        if (!currentUser) {
            alert("Please sign in to save favorites.");
            return;
        }

        const song = librarySongs.find(s => s.id === songId);
        const isFav = userFavorites.some(s => s.id === songId);
        const userRef = doc(db, "users", currentUser.uid);

        try {
            if (isFav) {
                userFavorites = userFavorites.filter(s => s.id !== songId);
                await updateDoc(userRef, { musicFavorites: arrayRemove(songId) });
            } else {
                userFavorites.push(song);
                await updateDoc(userRef, { musicFavorites: arrayUnion(songId) });
            }
            // Update UI
            const isPlayingFav = (currentQueue[currentSongIndex]?.id === songId);
            if(isPlayingFav) {
                playerLikeBtn.textContent = !isFav ? '❤' : '♡'; // Toggle logic was inverted in var check
                playerLikeBtn.classList.toggle('active', !isFav);
            }
            if (viewPlaylist.style.display !== 'none' && playlistTitleEl.textContent === "Liked Songs") {
                renderSongTable(userFavorites);
            }
        } catch (e) {
            if (e.code === 'not-found') {
                await setDoc(userRef, { musicFavorites: [songId] }, { merge: true });
                userFavorites.push(song);
            }
        }
    }

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().musicFavorites) {
                    const favIds = docSnap.data().musicFavorites;
                    userFavorites = librarySongs.filter(song => favIds.includes(song.id));
                }
            } catch (e) { console.error(e); }
            
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
            document.getElementById('greeting').textContent = `${timeGreeting}, ${user.displayName || 'Friend'}`;
        }
        init();
    });
});