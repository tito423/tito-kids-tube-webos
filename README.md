# Tito Kids Tube - LG WebOS Version

A safe YouTube video streaming application for kids, built for LG Smart TVs.

## Features

- **Safe Content**: Curated Islamic and educational content with strict filtering
- **Spatial Navigation**: Full D-pad and Magic Remote support
- **Dual Profiles**: Strict (Kids 3-7) and Moderate (Tween 8-12)
- **1080p/4K Optimized**: Designed for large TV displays
- **Dark/Light Themes**: With blue light filter option
- **HTTPS Only**: All network traffic encrypted
- **Content Security Policy**: Strict CSP headers for WebOS security

## Project Structure

```
Tito Kids Tube WebOs/
├── appinfo.json          # LG WebOS manifest
├── package.json          # Build config
├── index.html            # Main HTML (CSP headers)
├── css/
│   ├── reset.css         # CSS reset
│   ├── variables.css     # Design tokens & themes
│   ├── main.css          # Layout (1920x1080)
│   ├── components.css    # Video cards & focus states
│   └── animations.css    # TV-optimized animations
├── js/
│   ├── security.js       # Input sanitization & HTTPS
│   ├── spatial-navigation.js  # D-pad navigation engine
│   ├── piped-service.js  # YouTube API via Piped
│   ├── content-filter.js # Content safety filters
│   └── app.js            # Main app controller
└── assets/               # Icons & images
```

## Development

```bash
# Install dev tools
npm install

# Start local dev server
npm run dev

# Build for production
npm run build
```

## Remote Control Keys

| Key | Action |
|-----|--------|
| ←→↑↓ | Navigate between elements |
| Enter/OK | Select/Activate |
| Back (461) | Go back / Exit player |

## Security

- All API requests go through `Security.secureFetch()` (HTTPS only)
- All user inputs sanitized via `Security.sanitizeSearch()`
- All DOM insertions use `Security.escapeHtml()` to prevent XSS
- Content Security Policy blocks unsafe scripts and origins
- No sensitive data stored (localStorage holds only UI preferences)
