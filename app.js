const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Setăm directorul pentru fișierele statice (CSS, JS, imagini)
app.use(express.static(path.join(__dirname, 'public')));

// Setăm motorul de template (opțional, aici folosim EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('index', { title: 'Welcome to Skypixel!' }); // Changed title here
});

// Pornim serverul
app.listen(PORT, () => {
    console.log(`Serverul rulează pe http://localhost:${PORT}`);
});