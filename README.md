# NYC Pastry Finder

An interactive web application that finds the best pastries in NYC by aggregating data from Google Maps, Yelp, and other sources.

## Features

- **Multi-source aggregation**: Combines ratings from Google Maps and Yelp
- **Cumulative scoring**: Weighted ranking based on ratings and review counts
- **Filter by pastry type**: Plain croissants, chocolate croissants, and more
- **Location filtering**: Filter by borough or neighborhood
- **Detailed reviews**: View reviews from multiple sources for each shop
- **Responsive design**: Works on desktop and mobile

## Project Structure

```
nyc-pastry-finder/
├── backend/               # Node.js Express API
│   ├── src/
│   │   ├── index.js       # Server entry point
│   │   ├── routes/        # API routes
│   │   └── services/      # API integrations
│   └── package.json
├── frontend/              # React application
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   ├── components/    # React components
│   │   └── index.css      # Styles
│   └── package.json
└── package.json           # Root package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository and install dependencies:

```bash
npm run install:all
```

2. Set up environment variables:

```bash
cp backend/.env.example backend/.env
```

3. Add your API keys to `backend/.env`:

```env
GOOGLE_PLACES_API_KEY=your_google_api_key_here
YELP_API_KEY=your_yelp_api_key_here
```

### Running the Application

**Development mode (runs both frontend and backend):**

```bash
# Terminal 1: Start the backend
cd backend && npm run dev

# Terminal 2: Start the frontend
cd frontend && npm run dev
```

The frontend will be available at `http://localhost:3000`
The backend API will be available at `http://localhost:3001`

## API Endpoints

### GET /api/pastries/search

Search for pastry shops with optional filters.

**Query Parameters:**
- `pastryType`: Type of pastry (default: "croissant")
- `location`: Neighborhood or borough name (optional)

**Example:**
```bash
curl "http://localhost:3001/api/pastries/search?pastryType=chocolate%20croissant&location=brooklyn"
```

### GET /api/pastries/filters

Get available filter options.

### GET /api/pastries/top

Get top-rated pastry shops.

**Query Parameters:**
- `pastryType`: Type of pastry (default: "croissant")
- `limit`: Number of results (default: 5)

## API Keys

### Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Places API
4. Create credentials (API Key)
5. Add the key to your `.env` file

### Yelp Fusion API

1. Go to [Yelp Developers](https://www.yelp.com/developers)
2. Create an app to get your API key
3. Add the key to your `.env` file

## Demo Mode

The application works without API keys using mock data. This is useful for development and demos. When API keys are not configured, the app will display realistic sample data for NYC bakeries.

## Technologies

- **Backend**: Node.js, Express
- **Frontend**: React, Vite
- **Styling**: CSS (custom design)
- **APIs**: Google Places API, Yelp Fusion API

## License

MIT
