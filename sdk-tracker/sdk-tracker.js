class Tracker {
  constructor(apiEndpoint, options = {}) {
    this.apiEndpoint = apiEndpoint;
    this.bufferKey = 'eventBuffer';
    this.buffer = this.loadBuffer();
    this.maxRetries = options.maxRetries || 3;
    this.retryInterval = options.retryInterval || 5000; // 5 sec
    this.flushInterval = options.flushInterval || 3000; // 3 sec
    this.batchMode = options.batchMode || false;

    this.sessionId = this.generateSessionId();
    this.userId = null;

    // Démarrage de la tentative d'envoi périodique
    this.startFlushLoop();
  }

  generateSessionId() {
    return 'xxxx-xxxx-xxxx'.replace(/[x]/g, () =>
      ((Math.random() * 16) | 0).toString(16)
    );
  }

  identify(userId) {
    this.userId = userId;
  }

  loadBuffer() {
    try {
      const buffer = JSON.parse(localStorage.getItem(this.bufferKey));
      return Array.isArray(buffer) ? buffer : [];
    } catch (e) {
      return [];
    }
  }

  saveBuffer() {
    localStorage.setItem(this.bufferKey, JSON.stringify(this.buffer));
  }

  track(eventName, properties = {}) {
    const eventPayload = {
      eventName,
      properties,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      retries: 0
    };

    this.buffer.push(eventPayload);
    this.saveBuffer();
  }

  async flush() {
    if (this.buffer.length === 0) return;

    if (this.batchMode) {
      await this.sendBatch(this.buffer);
    } else {
      await this.sendEventsIndividually();
    }
  }

  async sendEventsIndividually() {
    let pendingBuffer = [...this.buffer];
    this.buffer = [];
    this.saveBuffer();

    for (let event of pendingBuffer) {
      try {
        await this.sendEvent(event);
      } catch (error) {
        if (event.retries < this.maxRetries) {
          event.retries++;
          this.buffer.push(event);
          this.saveBuffer();
        }
      }
    }
  }

  async sendBatch(events) {
    try {
      await fetch(`${this.apiEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events)
      });
      this.buffer = [];
      this.saveBuffer();
    } catch (error) {
      // Réinsère tous les événements dans le buffer pour retry
      events.forEach(event => {
        if (event.retries < this.maxRetries) {
          event.retries++;
          this.buffer.push(event);
        }
      });
      this.saveBuffer();
    }
  }

  async sendEvent(event) {
    await fetch(`${this.apiEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  }

  startFlushLoop() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Tentative de flush avant fermeture de la page
    window.addEventListener('beforeunload', () => {
      navigator.sendBeacon(
        this.apiEndpoint,
        JSON.stringify(this.buffer)
      );
    });
  }
}
