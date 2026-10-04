// EPA Orienteering Game - Main Application Logic

// Azure Maps configuration (from Brandvatten)
const AZURE_MAPS_TILE_URL =
  "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}&tileSize=256&language=sv-SE&view=Auto&subscription-key=";
const AZURE_MAPS_KEY = "DDyXGJo90rmsvZWRBl8gjVei030IlU4hcBqSgcOJ2n3xiTT1cgnWJQQJ99CDACi5YpzT8CmNAAAgAZMP34PQ";

class EPAGame {
  constructor() {
    this.playerId = null;
    this.playerName = null;
    this.sessionId = null;
    this.currentPoi = null;
    this.pois = [];
    this.gameState = null;
    this.map = null;
    this.markers = {};
    this.playerMarker = null;
    this.geoWatchId = null;
    this.currentPosition = null;
    this.currentQuestion = null;
    this.isAnswering = false;
    this.mapFollowPlayer = true;
    this.mapFocusTimer = null;
    this.sessionStorageKey = 'epa_player_session';
    this.broadcastLastSeen = 0;
    this.broadcastPollInterval = null;
    
    // Auto-question and timer state
    this.questionAutoShown = false;
    this.wrongAnswerTimer = null;
    this.canAnswerAgain = true;
    this.timerInterval = null;
    this.missionOverlayTimer = null;
    
    // Waiting room polling
    this.waitingPollInterval = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Start screen
    document.getElementById('startBtn').addEventListener('click', () => this.startGame());
    document.getElementById('playerName').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startGame();
    });

    // Game screen
    const poiName = document.getElementById('poiName');
    const distanceEl = document.getElementById('distance');
    if (poiName) {
      poiName.addEventListener('click', () => this.focusOnPoi());
    }
    if (distanceEl) {
      distanceEl.addEventListener('click', () => this.focusOnPoi());
    }

    // Question screen
    document.getElementById('backBtn').addEventListener('click', () => this.showGame());

    // Finish screen
    document.getElementById('restartBtn').addEventListener('click', () => this.restart());

    // Watch for Escape key to go back
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentScreen === 'question') {
        this.showGame();
      }
    });
  }

  savePlayerSession() {
    if (!this.playerId || !this.playerName) return;
    localStorage.setItem(this.sessionStorageKey, JSON.stringify({
      playerId: this.playerId,
      playerName: this.playerName
    }));
  }

  async loadBroadcasts() {
    if (!this.playerId) return;

    try {
      const response = await fetch(`/api/epa/player/${this.playerId}/events?since=${this.broadcastLastSeen || 0}`);
      if (!response.ok) {
        console.warn('Broadcast API returned:', response.status);
        return;
      }
      const data = await response.json();
      const messages = data.messages || [];
      console.log('Received broadcasts:', messages.length, 'messages');

      messages.forEach((item) => {
        if (!item?.message) {
          console.log('Skipping empty broadcast item');
          return;
        }
        console.log('Processing broadcast:', { type: item.type, message: item.message });
        this.broadcastLastSeen = Math.max(this.broadcastLastSeen, Number(item.id || 0));
        
        if (item.type === 'sound') {
          console.log('Playing sound:', item.message);
          this.playSound(item.message);
        } else {
          this.showBroadcast(`${item.playerName}: ${item.message}`);
        }
      });
    } catch (err) {
      console.error('Error loading broadcasts:', err);
    }
  }

  playSound(soundId) {
    console.log('playSound called with soundId:', soundId);
    if (soundId === 'gentlemen-start-engines') {
      console.log('Playing gentlemen start your engines');
      this.playEnginesSound();
      this.showBroadcast('🎙️ Gentlemen, start your engines!');
    }
  }

  playEnginesSound() {
    // Generate engine rev sound using Web Audio API
    try {
      console.log('Starting engine sound generation');
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      const duration = 2.5;
      const endTime = now + duration;

      // Create engine revving effect
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);

      // Ramp up the frequency for engine rev effect
      oscillator.frequency.setValueAtTime(80, now);
      oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.3);
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.6);
      oscillator.frequency.exponentialRampToValueAtTime(600, endTime);

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

      oscillator.start(now);
      oscillator.stop(endTime);
      console.log('Engine sound started');
    } catch (e) {
      console.error('Could not play engine sound:', e);
    }
  }

  showBroadcast(message) {
    const container = document.getElementById('broadcastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'broadcast-toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  startBroadcastPolling() {
    if (this.broadcastPollInterval) clearInterval(this.broadcastPollInterval);
    this.loadBroadcasts();
    this.broadcastPollInterval = setInterval(() => this.loadBroadcasts(), 4000);
  }

  loadPlayerSession() {
    try {
      const raw = localStorage.getItem(this.sessionStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.playerId || !parsed?.playerName) return null;
      return parsed;
    } catch (err) {
      console.warn('Could not load saved player session:', err);
      return null;
    }
  }

  clearPlayerSession() {
    localStorage.removeItem(this.sessionStorageKey);
  }

  async restoreSavedSession() {
    const saved = this.loadPlayerSession();
    if (!saved) {
      this.showScreen('start');
      return;
    }

    this.playerId = saved.playerId;
    this.playerName = saved.playerName;
    document.getElementById('playerName').value = this.playerName;

    try {
      this.showScreen('game');
      await this.loadGameState();
      await this.loadPOIs();
      this.initMap();
      this.startPositionTracking();
      this.startBroadcastPolling();
    } catch (err) {
      console.error('Error restoring saved session:', err);
      this.clearPlayerSession();
      this.showScreen('start');
    }
  }

  async startGame() {
    const playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
      alert('Ange ditt namn!');
      return;
    }

    try {
      const response = await fetch('/api/epa/player/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namn: playerName })
      });

      if (!response.ok) throw new Error('Kunde inte registrera dig');

      const data = await response.json();
      this.playerId = data.playerId;
      this.playerName = data.playerName;
      this.sessionId = data.sessionId;
      this.savePlayerSession();

      if (data.existingPlayer) {
        this.showScreen('game');
        await this.loadGameState();
        await this.loadPOIs();
        this.initMap();
        this.startPositionTracking();
        this.startBroadcastPolling();
        return;
      }

      // Show waiting room
      this.showScreen('waiting');
      document.getElementById('waitingPlayerName').textContent = this.playerName;
      
      // Start broadcast polling immediately so we get engine sound
      this.startBroadcastPolling();
      
      // Start polling for game start
      this.startWaitingRoomPoll();
    } catch (err) {
      console.error('Error registering for game:', err);
      alert('Fel vid registrering: ' + err.message);
    }
  }

  startWaitingRoomPoll() {
    // Poll every 1 second for status changes
    this.waitingPollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/epa/game-status');
        if (!response.ok) throw new Error('Kunde inte hämta spelstatus');

        const data = await response.json();
        console.log('Game status in waiting room:', data.status);

        // Show engine start screen when status is ready
        if (data.status === 'ready' && this.currentScreen !== 'engineStart') {
          console.log('Showing engine start screen');
          this.showScreen('engineStart');
        }

        // Start actual game when status is started
        if (data.status === 'started') {
          clearInterval(this.waitingPollInterval);
          this.waitingPollInterval = null;
          console.log('Game started, initializing...');
          
          // Game started! Initialize the actual game
          await this.initializeGameForPlayer();
        }
      } catch (err) {
        console.error('Error polling game status:', err);
      }
    }, 1000);
  }

  async initializeGameForPlayer() {
    try {
      // Call the new endpoint to shuffle POIs and start game
      const response = await fetch(`/api/epa/player/${this.playerId}/game-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte starta ditt spel');
      }

      const data = await response.json();

      // Show game screen
      this.showScreen('game');

      // Load game state and POIs FIRST
      await this.loadGameState();
      await this.loadPOIs();
      
      // THEN init map (so POIs are available)
      this.initMap();
      this.startBroadcastPolling();
      
      // Start tracking position
      this.startPositionTracking();
    } catch (err) {
      console.error('Error initializing game for player:', err);
      alert('Fel vid start: ' + err.message);
    }
  }

  async loadGameState() {
    try {
      const response = await fetch(`/api/epa/player/${this.playerId}`);
      if (!response.ok) throw new Error('Kunde inte hämta spelstatus');

      this.gameState = await response.json();
      
      // Ensure activePoi has numeric coordinates
      if (this.gameState.activePoi) {
        this.gameState.activePoi = {
          ...this.gameState.activePoi,
          lat: Number(this.gameState.activePoi.lat),
          lng: Number(this.gameState.activePoi.lng),
          radie_meter: Number(this.gameState.activePoi.radie_meter)
        };
      }
      
      // Ensure all pois in pois array have numeric coordinates
      if (this.gameState.pois) {
        this.gameState.pois = this.gameState.pois.map(poi => ({
          ...poi,
          lat: poi.lat ? Number(poi.lat) : undefined,
          lng: poi.lng ? Number(poi.lng) : undefined,
          radie_meter: poi.radie_meter ? Number(poi.radie_meter) : undefined
        }));
      }
      
      this.currentPoi = this.gameState.activePoi;
      
      // Reset auto-show flag for new POI, and clear wrong answer timer
      this.questionAutoShown = false;
      this.canAnswerAgain = true;
      this.clearWrongAnswerTimer();
      
      this.updateGameUI();
    } catch (err) {
      console.error('Error loading game state:', err);
    }
  }

  async loadPOIs() {
    try {
      const response = await fetch('/api/epa/poi');
      if (!response.ok) throw new Error('Kunde inte hämta POI:er');

      const pois = await response.json();
      
      // Ensure lat/lng are numbers
      this.pois = pois.map(poi => ({
        ...poi,
        lat: Number(poi.lat),
        lng: Number(poi.lng),
        radie_meter: Number(poi.radie_meter)
      }));
    } catch (err) {
      console.error('Error loading POIs:', err);
    }
  }

  initMap() {
    if (this.map) this.map.remove();

    // Center map around first POI or default to Sweden center
    const centerLat = this.pois[0]?.lat || 60.5;
    const centerLng = this.pois[0]?.lng || 15.5;

    this.map = L.map('mapContainer', {
      minZoom: 8,
      maxZoom: 22
    }).setView([centerLat, centerLng], 15);

    // Use Azure Maps like Brandvatten
    L.tileLayer(`${AZURE_MAPS_TILE_URL}${encodeURIComponent(AZURE_MAPS_KEY)}`, {
      minZoom: 8,
      maxZoom: 22,
      attribution: '&copy; <a href="https://www.microsoft.com/maps" target="_blank" rel="noreferrer">Microsoft Azure Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
    }).addTo(this.map);

    // Add POI markers
    this.pois.forEach((poi) => {
      const playerPoi = this.gameState.pois.find(p => p.poi_id === poi.id);
      this.addMarker(poi, playerPoi);
    });

    // Add circle for active POI radius
    this.updateActiveRadiusCircle();

    // Create player position marker
    const playerIcon = L.divIcon({
      html: '<div style="width: 20px; height: 20px; background: #0066ff; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0, 102, 255, 0.6);"></div>',
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    this.playerMarker = L.marker([centerLat, centerLng], { icon: playerIcon, zIndexOffset: 1000 }).addTo(this.map);
  }

  addMarker(poi, playerPoi) {
    const status = playerPoi?.status || 'låst';
    const sekvens = playerPoi?.sekvens || '?';

    const className = `poi-marker ${status}`;
    const html = `<div class="${className}" id="marker-${poi.id}">${sekvens}</div>`;

    const marker = L.marker([poi.lat, poi.lng], {
      icon: L.divIcon({
        html,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      })
    }).addTo(this.map);

    this.markers[poi.id] = marker;
  }

  focusOnPoi(durationMs = 2500) {
    if (!this.map || !this.currentPoi) return;

    this.mapFollowPlayer = false;
    this.map.setView([this.currentPoi.lat, this.currentPoi.lng], 15);

    clearTimeout(this.mapFocusTimer);
    this.mapFocusTimer = setTimeout(() => {
      this.mapFollowPlayer = true;
      if (this.currentPosition) {
        this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 15);
      }
    }, durationMs);
  }

  updateActiveRadiusCircle() {
    // Remove old circle
    if (this.radiusCircle) {
      this.map.removeLayer(this.radiusCircle);
    }

    if (!this.currentPoi) return;

    this.radiusCircle = L.circle(
      [this.currentPoi.lat, this.currentPoi.lng],
      {
        radius: this.currentPoi.radie_meter,
        color: '#ffff00',
        fillColor: '#ffff00',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 5'
      }
    ).addTo(this.map);
  }

  startPositionTracking() {
    if (!navigator.geolocation) {
      alert('Geolocation stöds inte på denna enhet');
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => this.updatePosition(position),
      (error) => this.handleGeoError(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Watch position
    this.geoWatchId = navigator.geolocation.watchPosition(
      (position) => this.updatePosition(position),
      (error) => this.handleGeoError(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async updatePosition(position) {
    this.currentPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    // Update player marker position on map
    if (this.map && this.playerMarker) {
      this.playerMarker.setLatLng([this.currentPosition.lat, this.currentPosition.lng]);

      if (this.mapFollowPlayer) {
        this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 15);
      }
    }

    if (this.map && this.currentPoi) {
      // Check distance to active POI
      await this.checkDistance();
    }
  }

  async checkDistance() {
    if (!this.currentPoi) return;

    try {
      const response = await fetch(`/api/epa/player/${this.playerId}/verify-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: this.currentPosition.lat,
          lng: this.currentPosition.lng
        })
      });

      if (!response.ok) throw new Error('Kunde inte verifiera position');

      const data = await response.json();

      // Update distance display
      document.getElementById('distance').textContent = `${data.distance}m`;

      // Auto-show question when within 40m (before verification)
      if (data.withinRadius && !this.questionAutoShown && this.canAnswerAgain) {
        this.questionAutoShown = true;
        await this.showQuestion();
      }
    } catch (err) {
      console.error('Error checking distance:', err);
    }
  }

  handleGeoError(error) {
    console.error('Geolocation error:', error);
    const status = {
      1: 'Behörighet nekad',
      2: 'Position ej tillgänglig',
      3: 'Timeout'
    }[error.code] || 'Okänt fel';

    document.getElementById('statusText').textContent = `GPS-fel: ${status}`;
  }

  async showQuestion() {
    if (!this.currentPoi) return;

    try {
      const response = await fetch(`/api/epa/poi/${this.currentPoi.poi_id}/question`);
      if (!response.ok) throw new Error('Kunde inte hämta fråga');

      this.currentQuestion = await response.json();
      this.renderQuestion();
      this.showScreen('question');
    } catch (err) {
      console.error('Error loading question:', err);
      alert('Fel vid inladdning av fråga');
    }
  }

  renderQuestion() {
    document.getElementById('questionPoi').textContent = this.currentPoi.namn;
    document.getElementById('questionText').textContent = this.currentQuestion.text;

    const optionsContainer = document.getElementById('answerOptions');
    optionsContainer.innerHTML = '';

    this.currentQuestion.alternativ.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'answer-btn';
      button.textContent = option;
      button.id = `answer-btn-${index}`;
      button.addEventListener('click', () => this.submitAnswer(index));
      optionsContainer.appendChild(button);
    });

    // Clear feedback and timer
    document.getElementById('feedback').innerHTML = '';
    document.getElementById('attemptsLeft').innerHTML = '';
    this.isAnswering = false;
    this.hideMissionOverlay();
    
    // Reset timer display
    this.clearWrongAnswerTimer();
  }

  async submitAnswer(answerIndex) {
    if (this.isAnswering || !this.canAnswerAgain) return;
    this.isAnswering = true;

    try {
      const response = await fetch(`/api/epa/player/${this.playerId}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerIndex })
      });

      if (!response.ok) throw new Error('Kunde inte behandla svar');

      const data = await response.json();

      const feedback = document.getElementById('feedback');
      const attemptsDiv = document.getElementById('attemptsLeft');

      if (data.correct) {
        feedback.textContent = '✓ ' + data.message;
        feedback.className = 'feedback correct';
        document.querySelectorAll('.answer-btn')[answerIndex].classList.add('correct');
        this.showMissionOverlay('completed', 'Uppdraget är klart', 0);

        // Wait and show next
        setTimeout(() => {
          this.hideMissionOverlay();
          this.loadGameState().then(() => {
            if (this.gameState.player.status === 'klar') {
              this.showFinish();
            } else {
              this.showGame();
            }
          });
        }, 1500);
      } else {
        // Wrong answer - start 60 second timer immediately
        feedback.textContent = '✗ ' + data.message;
        feedback.className = 'feedback incorrect';
        document.querySelectorAll('.answer-btn')[answerIndex].classList.add('incorrect');

        if (data.attemptsLeft === 0 && data.hint) {
          attemptsDiv.innerHTML = `<strong>Ledtråd:</strong> ${data.hint}`;
          attemptsDiv.style.color = 'var(--secondary-accent)';
        } else if (data.attemptsLeft > 0) {
          attemptsDiv.textContent = `Försök kvar: ${data.attemptsLeft}`;
        }

        this.canAnswerAgain = false;
        this.startWrongAnswerTimer(60);
        this.showMissionOverlay('busted', 'Nytt försök snart...', 60);
        
        this.isAnswering = false;
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      alert('Fel vid svarsinlämning');
      this.isAnswering = false;
    }
  }

  updateGameUI() {
    if (!this.currentPoi) {
      document.getElementById('statusText').textContent = 'Spelet är klart!';
      return;
    }

    document.getElementById('poiName').textContent = this.currentPoi.namn;

    const totalPois = Math.max(1, this.gameState.pois.length);
    const completedPois = this.gameState.pois.filter(p => p.status === 'klar').length;
    const progressPercent = totalPois > 0 ? (completedPois / totalPois) * 100 : 0;

    document.getElementById('progressFill').style.width = progressPercent + '%';
    document.getElementById('progressText').textContent = `${completedPois + 1} av ${totalPois}`;

    const distanceEl = document.getElementById('distance');
    if (this.currentPosition) {
      const distance = this.calculateDistance(
        this.currentPosition.lat,
        this.currentPosition.lng,
        this.currentPoi.lat,
        this.currentPoi.lng
      );
      distanceEl.textContent = `${Math.round(distance)}m`;
    }

    // Update markers
    this.gameState.pois.forEach((poi) => {
      if (this.markers[poi.poi_id]) {
        const marker = this.markers[poi.poi_id];
        const oldIcon = marker.getIcon();
        const newHtml = `<div class="poi-marker ${poi.status}" id="marker-${poi.poi_id}">${poi.sekvens}</div>`;
        const newIcon = L.divIcon({
          html: newHtml,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
        marker.setIcon(newIcon);
      }
    });

    this.updateActiveRadiusCircle();
  }

  showMissionOverlay(type, subtitle, seconds) {
    const overlay = document.getElementById('missionOverlay');
    const title = document.getElementById('missionTitle');
    const subtitleEl = document.getElementById('missionSubtitle');
    const timerEl = document.getElementById('missionTimer');

    title.textContent = type === 'completed' ? 'MISSION COMPLETED' : 'BUSTED';
    title.className = `mission-title ${type === 'completed' ? 'completed' : 'busted'}`;
    subtitleEl.textContent = subtitle || 'Nytt uppdrag laddas...';
    overlay.classList.add('visible');

    if (seconds > 0) {
      timerEl.textContent = `${seconds}s`;
      timerEl.style.display = 'block';
    } else {
      timerEl.style.display = 'none';
    }
  }

  hideMissionOverlay() {
    const overlay = document.getElementById('missionOverlay');
    overlay.classList.remove('visible');
    document.getElementById('missionTimer').style.display = 'none';
  }

  startWrongAnswerTimer(seconds) {
    this.wrongAnswerTimer = seconds;
    const attemptsDiv = document.getElementById('attemptsLeft');
    const timerEl = document.getElementById('missionTimer');

    // Disable all answer buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });

    this.timerInterval = setInterval(() => {
      this.wrongAnswerTimer--;
      attemptsDiv.textContent = `Vänta: ${this.wrongAnswerTimer}s innan nytt försök`;
      attemptsDiv.style.color = 'var(--secondary-accent)';
      timerEl.textContent = `${this.wrongAnswerTimer}s`;

      if (this.wrongAnswerTimer <= 0) {
        this.clearWrongAnswerTimer();
      }
    }, 1000);
  }

  clearWrongAnswerTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.wrongAnswerTimer = null;
    this.canAnswerAgain = true;
    this.hideMissionOverlay();
    
    // Enable all answer buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.classList.remove('incorrect');
    });

    document.getElementById('attemptsLeft').textContent = 'Du kan svara igen!';
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  showFinish() {
    const player = this.gameState.player;
    const startTime = new Date(player.start_tid);
    const endTime = new Date(player.mal_tid);
    const duration = Math.round((endTime - startTime) / 1000);
    const totalPois = Math.max(1, this.gameState.pois.length);
    const completedPois = this.gameState.pois.filter(p => p.status === 'klar').length;
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeString = `${minutes}m ${seconds}s`;

    document.getElementById('finishName').textContent = player.namn;
    document.getElementById('finishTime').textContent = timeString;
    document.getElementById('finishCount').textContent = `${completedPois} / ${totalPois}`;

    this.showScreen('finish');

    if (this.geoWatchId) {
      navigator.geolocation.clearWatch(this.geoWatchId);
    }
  }

  showGame() {
    this.loadGameState();
    this.showScreen('game');
  }

  showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenName + 'Screen').classList.add('active');
    this.currentScreen = screenName;
  }

  restart() {
    this.playerId = null;
    this.playerName = null;
    this.gameState = null;
    this.currentPoi = null;
    this.clearPlayerSession();
    document.getElementById('playerName').value = '';

    if (this.map) this.map.remove();
    if (this.geoWatchId) navigator.geolocation.clearWatch(this.geoWatchId);

    this.showScreen('start');
  }
}

// Initialize game when DOM is ready
let game;
document.addEventListener('DOMContentLoaded', () => {
  game = new EPAGame();
  const savedSession = game.loadPlayerSession();
  if (savedSession?.playerName) {
    document.getElementById('playerName').value = savedSession.playerName;
  }
  game.restoreSavedSession();
});
