// Importăm modulele necesare
const express = require('express');
const path = require('path');

// Inițializăm aplicația Express
const app = express();
const PORT = 3000;

// Setăm directorul 'public' pentru a servi fișiere statice (CSS, JS, imagini)
// Serverul va căuta fișierele cerute la căi precum '/css/style.css' în directorul 'public/css/style.css'
app.use(express.static(path.join(__dirname, 'public')));

// Setăm EJS ca motor de template
app.set('view engine', 'ejs');
// Setăm directorul unde se găsesc fișierele .ejs
app.set('views', path.join(__dirname, 'views'));

// --- Rutele aplicației ---

// Ruta pentru pagina principală (Home)
app.get('/', (req, res) => {
    // Randează fișierul 'views/index.ejs' și îi trimite o variabilă 'title'
    res.render('index', { title: 'Welcome to Skypixel!' });
});

// Ruta pentru pagina de proiecte (Projects)
app.get('/projects', (req, res) => {
    // Randează fișierul 'views/projects.ejs'
    res.render('projects', { title: 'Our Projects - Skypixel' });
});

// Ruta pentru pagina despre noi (About Us)
app.get('/about', (req, res) => {
    // Randează fișierul 'views/about.ejs'
    res.render('about', { title: 'About Us - Skypixel' });
});


// --- Pornirea serverului ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
