const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const LOGSTASH_URL = process.env.LOGSTASH_URL || 'http://localhost:5044';

// Endpoint de réception
app.post('/api/events', async (req, res) => {
  const events = req.body;

  try {
    // Redirection vers Logstash
    await axios.post(LOGSTASH_URL, events);
    res.status(200).json({ status: 'Event(s) sent to Logstash successfully.' });
  } catch (error) {
    console.error('Error sending to Logstash:', error.message);
    res.status(500).json({ error: 'Failed to forward event(s) to Logstash.' });
  }
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Event API listening on port ${PORT}`));
