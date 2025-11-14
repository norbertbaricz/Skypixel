# 🌟 Skypixel Official Website

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.1.0-blue)](https://expressjs.com/)

Welcome to the official Skypixel website repository! This is where passion for creativity and innovative projects comes together. Explore our portfolio, meet our talented team, and discover what makes Skypixel unique.

## 🚀 About Skypixel

Skypixel is a team dedicated to exploring and implementing creative ideas across various domains. Our website serves as a platform to showcase the work of our team members and the exciting projects we are involved in. We believe in collaboration, innovation, and pushing the boundaries of creativity.

## ✨ Features

- **📱 Responsive Design** - Fully optimized for all devices (mobile, tablet, desktop)
- **🎨 Modern UI/UX** - Beautiful dark theme with smooth animations
- **⚡ High Performance** - Optimized loading times with compression and caching
- **🔒 Security First** - Helmet.js protection, rate limiting, and CSP
- **🎯 SEO Optimized** - Meta tags, Open Graph, and semantic HTML
- **♿ Accessibility** - WCAG compliant with ARIA labels
- **📊 Project Showcase** - Dynamic project cards with GitHub release integration
- **👥 Team Profiles** - Meet our talented team members

## 🛠️ Technologies Used

### Frontend
- **HTML5** - Semantic markup with EJS templating
- **CSS3** - Custom properties, animations, responsive design
- **JavaScript (ES6+)** - Modern vanilla JS with Intersection Observer API

### Backend
- **Node.js** (≥18.0.0) - Runtime environment
- **Express.js** (5.1.0) - Web framework
- **EJS** - Templating engine
- **Helmet.js** - Security headers
- **Compression** - Gzip compression
- **Morgan** - HTTP request logger
- **Express Rate Limit** - API rate limiting

### External Services
- **GitHub API** - Fetch latest release versions
- **Unsplash** - Random hero background images
- **Font Awesome** - Icon library
- **Google Fonts** - Montserrat & Open Sans

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- [npm](https://www.npmjs.com/) (version 9.0.0 or higher)
- Git (for cloning the repository)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/norbertbaricz/Skypixel.git
   cd Skypixel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your settings:
   ```env
   PORT=3000
   NODE_ENV=development
   TRUST_PROXY=false
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Usage

### Development Mode
```bash
npm run dev
```
Runs the server with nodemon for auto-reloading and debugging enabled.

### Production Mode
```bash
npm start
```
Runs the optimized production server with proper security headers.

### Linting
```bash
npm run lint
```
Checks code quality with ESLint.

## 📁 Project Structure

```
Skypixel/
├── app.js                 # Main Express application
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── public/               # Static assets
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   ├── images/           # Project images and logos
│   └── js/
│       ├── script.js     # Main JavaScript
│       ├── projects-script.js
│       └── about-script.js
└── views/                # EJS templates
    ├── index.ejs         # Homepage
    ├── projects.ejs      # Projects page
    └── about.ejs         # About page
```

## 🎯 Key Optimizations

### Performance
- ✅ **GitHub API Caching** - 10-minute cache for release data
- ✅ **Gzip Compression** - Reduces bandwidth by ~70%
- ✅ **Static Asset Caching** - Browser cache for CSS/JS/images
- ✅ **Lazy Loading** - Images load on-demand
- ✅ **Intersection Observer** - Efficient scroll animations
- ✅ **Event Delegation** - Optimized event handlers

### Security
- ✅ **Helmet.js** - Security headers (CSP, XSS protection)
- ✅ **Rate Limiting** - 300 requests per 15 minutes
- ✅ **HTTPS Enforcement** - Production HSTS enabled
- ✅ **Input Validation** - Prevents XSS and injection

### SEO & Accessibility
- ✅ **Meta Tags** - Comprehensive Open Graph and Twitter Cards
- ✅ **Semantic HTML** - Proper heading hierarchy
- ✅ **ARIA Labels** - Screen reader support
- ✅ **Alt Text** - All images have descriptive alt attributes
- ✅ **Mobile-First** - Responsive design principles

## 🌐 Pages

### Homepage (`/`)
- Hero section with animated background
- Quick navigation to Projects and About pages
- Smooth scroll animations

### Projects (`/projects`)
- Categorized project showcase (Popular, New, EOL)
- GitHub release version integration
- Detailed project modals with descriptions
- Direct download/archive links

### About (`/about`)
- Team member profiles
- Role-based categorization
- Interactive team cards

## 🔐 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment mode | development | No |
| `TRUST_PROXY` | Enable trust proxy | false | No |
| `GITHUB_TOKEN` | GitHub API token | - | No* |
| `GITHUB_TIMEOUT_MS` | GitHub fetch timeout (ms) | 7000 | No |

*Optional but recommended for higher API rate limits (60 → 5000 requests/hour)

## 🤝 Contributing

Currently, this repository is primarily used to host the website files. However, we welcome feedback and suggestions!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). See the `LICENSE` file for details.

## 📧 Contact

For inquiries or requests, please contact us through:
- Website: [Skypixel Official Site](https://skypixel.com)
- GitHub: [@norbertbaricz](https://github.com/norbertbaricz)

## 🙏 Acknowledgments

- **Font Awesome** - Icon library
- **Google Fonts** - Typography
- **Unsplash** - Background images
- **Express.js Community** - Framework and middleware

---

**Made with ❤️ by the Skypixel Team**

Thank you for visiting! We hope you enjoy exploring our projects and getting to know the Skypixel team!
