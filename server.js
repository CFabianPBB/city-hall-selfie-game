const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// In-memory storage for game data
let players = [];
let leaderboard = [];

// Email configuration (optional - will work without it)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// NEW ROUTE: Serve Google Maps API Key securely
app.get('/api/google-maps-key', (req, res) => {
    // Get the API key from environment variable
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    // Check if the key exists and is not a placeholder
    if (apiKey && apiKey !== 'YOUR_API_KEY_PLACEHOLDER' && apiKey !== '') {
        res.json({ key: apiKey });
    } else {
        // Return error if no valid key
        res.status(500).json({ 
            error: 'Google Maps API key not configured',
            key: null 
        });
    }
});

// Register new player
app.post('/api/register', async (req, res) => {
    const { name, email, photo } = req.body;
    
    const player = {
        id: Date.now().toString(),
        name,
        email,
        photo,
        score: 0,
        joinedAt: new Date()
    };
    
    players.push(player);
    leaderboard.push({ name: player.name, score: 0, id: player.id });
    
    // Try to send email notification (won't break if not configured)
    try {
        if (process.env.EMAIL_USER) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: 'cfabian@resourcex.net',
                subject: 'New City Hall Selfie Player!',
                html: `
                    <h2>New Player Registered!</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                `
            });
        }
    } catch (error) {
        console.log('Email not sent:', error.message);
    }
    
    res.json({ success: true, player });
});

// Update score
app.post('/api/score', (req, res) => {
    const { playerId, points, location } = req.body;
    
    const player = players.find(p => p.id === playerId);
    if (player) {
        player.score += points;
        
        const leaderboardEntry = leaderboard.find(l => l.id === playerId);
        if (leaderboardEntry) {
            leaderboardEntry.score = player.score;
        }
        
        // Sort leaderboard
        leaderboard.sort((a, b) => b.score - a.score);
    }
    
    res.json({ 
        success: true, 
        newScore: player ? player.score : 0,
        leaderboard: leaderboard.slice(0, 20)
    });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    res.json(leaderboard.slice(0, 20));
});

// Get city data (mock data for now)
app.post('/api/city', (req, res) => {
    const { cityName } = req.body;
    
    // Mock city data with special locations
    const specialCities = {
        'plano': { type: 'tyler-major', points: 50, hasBuilding: true },
        'yarmouth': { type: 'tyler-major', points: 50, hasBuilding: true },
        'denver': { type: 'pbb', points: 25, hasBuilding: true },
        'washington': { type: 'capital', points: 5, hasBuilding: true }
    };
    
    const cityLower = cityName.toLowerCase();
    const cityData = specialCities[cityLower] || { type: 'regular', points: 5, hasBuilding: true };
    
    // Generate random position on map
    cityData.position = {
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80
    };
    
    res.json(cityData);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Google Maps API Key configured: ${process.env.GOOGLE_MAPS_API_KEY ? 'Yes' : 'No'}`);
});