# FindVibe

A modern music streaming and discovery web app built with Angular.

**Live Demo:** [https://find-vibe.vercel.app/](https://find-vibe.vercel.app/)

## Features

- **Music Discovery** - Search and explore a vast music library
- **Personal Library** - Save and organize your favorite songs
- **Offline Playback** - Download songs for offline listening
- **Smart Player** - Full-featured player with shuffle and repeat modes
- **Play History** - Quick access to recently played tracks
- **Progressive Web App** - Install on any device with offline support

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Create a `src/.env` file:

```env
API_URL=http://localhost:8080
```

Start the development server:

```bash
npm start
```

Navigate to `http://localhost:4200/`

### Build

```bash
npm run build
```

## Tech Stack

- Angular 21
- Tailwind CSS + DaisyUI
- RxJS
- Service Worker (PWA)
