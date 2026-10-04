// EPA Orienteering Game - Main Application Logic

// Azure Maps configuration (from Brandvatten)
const AZURE_MAPS_TILE_URL =
  "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}&tileSize=256&language=sv-SE&view=Auto&subscription-key=";
const AZURE_MAPS_KEY = "DDyXGJo90rmsvZWRBl8gjVei030IlU4hcBqSgcOJ2n3xiTT1cgnWJQQJ99CDACi5YpzT8CmNAAAgAZMP34PQ";

class EPAGame {
  constructor() {
    this.playerId = null;
    this.playerName = null;
    this.currentPoi = null;
    this.pois = [];
    this.gameState = null;
    this.map = null;
    this.markers = {};
    this.geoWatchId = null;
    this.currentPosition = null;
    this.currentQuestion = null;
    this.isAnswering = false;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Start screen
    document.getElementById('startBtn').addEventListener('click', () => this.startGame());
    document.getElementById('playerName').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startGame();
    });

    // Game screen
    document.getElementById('arrivedBtn').addEventListener('click', () => this.showQuestion());

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

      if (!response.ok) throw new Error('Kunde inte starta spelet');

      const data = await response.json();
      this.playerId = data.playerId;
      this.playerName = data.namn;

      // Show game screen and init map FIRST
      this.showScreen('game');
      this.initMap();

      // Then load game state and POIs
      await this.loadGameState();
      await this.loadPOIs();
      
      // Start tracking position
      this.startPositionTracking();
    } catch (err) {
      console.error('Error starting game:', err);
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

    this.map = L.map('mapContainer').setView([centerLat, centerLng], 15);

    // Use Azure Maps like Brandvatten
    L.tileLayer(`${AZURE_MAPS_TILE_URL}${encodeURIComponent(AZURE_MAPS_KEY)}`, {
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

    if (this.map && this.currentPoi) {
      // Update map center with player position (slightly)
      // this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 15);

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

      // Enable "Jag är framme" button when close
      const arrivedBtn = document.getElementById('arrivedBtn');
      if (data.withinRadius) {
        arrivedBtn.disabled = false;
        arrivedBtn.style.background = 'var(--secondary-accent)';
      } else {
        arrivedBtn.disabled = true;
        arrivedBtn.style.background = '';
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
      button.addEventListener('click', () => this.submitAnswer(index));
      optionsContainer.appendChild(button);
    });

    // Clear feedback
    document.getElementById('feedback').innerHTML = '';
    document.getElementById('attemptsLeft').innerHTML = '';
    this.isAnswering = false;
  }

  async submitAnswer(answerIndex) {
    if (this.isAnswering) return;
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

        // Wait and show next
        setTimeout(() => {
          this.loadGameState().then(() => {
            if (this.gameState.player.status === 'klar') {
              this.showFinish();
            } else {
              this.showGame();
            }
          });
        }, 1500);
      } else {
        feedback.textContent = '✗ ' + data.message;
        feedback.className = 'feedback incorrect';
        document.querySelectorAll('.answer-btn')[answerIndex].classList.add('incorrect');

        if (data.attemptsLeft === 0 && data.hint) {
          attemptsDiv.innerHTML = `<strong>Ledtråd:</strong> ${data.hint}`;
          attemptsDiv.style.color = 'var(--secondary-accent)';
        } else if (data.attemptsLeft > 0) {
          attemptsDiv.textContent = `Försök kvar: ${data.attemptsLeft}`;
        }

        setTimeout(() => {
          this.isAnswering = false;
        }, 1500);
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

    const totalPois = this.gameState.pois.length;
    const completedPois = this.gameState.pois.filter(p => p.status === 'klar').length;
    const progressPercent = (completedPois / totalPois) * 100;

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
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeString = `${minutes}m ${seconds}s`;

    document.getElementById('finishName').textContent = player.namn;
    document.getElementById('finishTime').textContent = timeString;

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
  game.showScreen('start');
});
