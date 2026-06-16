require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FOOTBALL_DATA_API_KEY; // Ganti dengan API key Anda

let lastPredictions = {
  final: ['Spain', 'France'],
  winner: 'Spain',
  winnerProb: 32.5,
  darkHorses: ['USA', 'Morocco'],
  flops: ['Brazil', 'England'],
  topScorer: { name: 'Kylian Mbappé', team: 'France', goals: 7 },
  bestPlayer: 'Rodri (Spain)',
  bestYoung: 'Lamine Yamal (Spain)',
  bestGoalkeeper: 'Mike Maignan (France)',
  bracket: {},
  groups: {},
  allFixtures: [],
  liveMatches: [],
  history: [], // untuk menyimpan perubahan probabilitas juara dari waktu ke waktu
  lastUpdate: null
};

// Fungsi untuk mendeteksi apakah ada pertandingan yang baru selesai
function hasNewFinishedMatches(oldMatches, newMatches) {
  const oldMap = new Map();
  for (const m of oldMatches) {
    oldMap.set(m.id, { finished: m.finished, homeScore: m.home_score, awayScore: m.away_score });
  }
  for (const m of newMatches) {
    const old = oldMap.get(m.id);
    if (!old) continue;
    // Jika status berubah menjadi FINISHED
    if (old.finished !== 'TRUE' && m.finished === 'TRUE') return true;
    // Jika sudah FINISHED tetapi skor berubah (misal update setelah pertandingan)
    if (m.finished === 'TRUE' && (old.homeScore !== m.home_score || old.awayScore !== m.away_score)) return true;
  }
  return false;
}

async function fetchAndUpdate() {
  try {
    console.log('[CHECK] Mengecek pertandingan baru selesai dari worldcup26.ir...');
    const response = await axios.get('https://worldcup26.ir/get/games');
    const newMatches = response.data.games || [];
    let oldMatches = [];
    if (fs.existsSync('matches_cache.json')) {
      const cached = JSON.parse(fs.readFileSync('matches_cache.json', 'utf8'));
      oldMatches = cached.matches || [];
    }
    if (hasNewFinishedMatches(oldMatches, newMatches) || !fs.existsSync('predictions_output.json')) {
      console.log('[UPDATE] Pertandingan baru selesai! Menjalankan ulang model prediksi...');
      // We store it as { matches: [...] } to keep things consistent for python
      fs.writeFileSync('matches_cache.json', JSON.stringify({ matches: newMatches }, null, 2));
      // Jalankan predictor.py
      // Jalankan predictor.py
      const python = spawn('python3', ['predictor.py']);
      python.stderr.on('data', (data) => { console.error(`[PYTHON ERR] ${data}`); });
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const newPred = JSON.parse(fs.readFileSync('predictions_output.json', 'utf8'));
            // Remove history overwrite to respect predictor.py history
            lastPredictions = { ...lastPredictions, ...newPred };
            lastPredictions = { ...lastPredictions, ...newPred };
            fs.writeFileSync('predictions_output.json', JSON.stringify(lastPredictions, null, 2));
            console.log(`[SUCCESS] Prediksi diperbarui pada ${new Date().toLocaleTimeString()}`);
          } catch(e) { console.error('[ERROR] Gagal parse JSON dari Python', e); }
        } else {
          console.error(`[ERROR] Python exit code ${code}`);
        }
      });
    } else {
      console.log('[CHECK] Tidak ada pertandingan baru selesai.');
    }
  } catch (err) {
    console.error('[API ERROR]', err.message);
  }
}

// Jalankan pengecekan setiap 30 detik (agar cepat respon)
setInterval(fetchAndUpdate, 30000);
// Jalankan pertama kali saat server start
fetchAndUpdate();

// Endpoint untuk frontend
app.get('/api/predictions', (req, res) => {
  if (fs.existsSync('predictions_output.json')) {
    const data = JSON.parse(fs.readFileSync('predictions_output.json', 'utf8'));
    res.json(data);
  } else {
    res.json(lastPredictions);
  }
});

app.use(express.static('public'));
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log('⏳ Aplikasi akan mendeteksi pertandingan selesai setiap 30 detik dan memperbarui prediksi.');
});
