# 🌌 Dark Sky Zone Finder

A full-stack web application that helps users find the closest International Dark-Sky Association certified dark sky zones and provides optimal astronomical viewing recommendations based on location, moon phases, and atmospheric conditions.

## ✨ Features

- **Location Services**: Enter an address or use current GPS location
- **Dark Sky Zone Database**: Comprehensive database of IDA-certified dark sky locations
- **Distance Calculations**: Find the closest dark sky zones using geodesic distance
- **Astronomical Calculations**: Moon phase tracking and visibility scoring
- **Optimal Timing**: Recommendations for the best dates and times for stargazing
- **Bortle Scale**: Light pollution classification for each location
- **Modern UI**: Beautiful space-themed interface with responsive design

## 🚀 Tech Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Geolocation API** for location services

### Backend
- **FastAPI** (Python)
- **PyEphem** for astronomical calculations
- **Astropy** for advanced astronomical computations
- **GeoPy** for distance calculations
- **Pydantic** for data validation

## 📦 Installation & Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Quick Start

For a quick setup, use the provided startup script:

```bash
./start.sh
```

This script will:
- Set up Python virtual environment
- Install all dependencies
- Start both backend and frontend servers
- Display access URLs

## 🎯 Usage

1. **Enter Location**: Input your latitude and longitude, or use the "Current Location" button to automatically detect your position.

2. **View Dark Sky Zones**: Browse the closest International Dark-Sky Association certified locations, sorted by distance from your location.

3. **Check Stargazing Conditions**: View the best dates and times for stargazing over the next 14 days, including:
   - Moon phase and illumination percentage
   - Moon rise/set times
   - Optimal viewing windows
   - Visibility scores based on light pollution and lunar conditions

4. **Plan Your Trip**: Use the detailed information about each dark sky zone to plan your astronomical adventure.

## 🌟 Features Explained

### Dark Sky Zone Database
The application includes a comprehensive database of IDA-certified locations including:
- **International Dark Sky Parks**: Protected areas with exceptional night sky quality
- **Dark Sky Reserves**: Large areas with a dark core surrounded by buffer zones
- **Dark Sky Communities**: Towns/cities that have implemented lighting ordinances

### Astronomical Calculations
- **Moon Phase Tracking**: Real-time calculation of lunar phases and illumination
- **Visibility Scoring**: Algorithm combining Bortle scale ratings with lunar conditions
- **Optimal Timing**: Recommendations based on astronomical twilight and moon position

### Bortle Scale Integration
Each location is rated on the Bortle Dark-Sky Scale (1-9):
- **1-2**: Pristine to excellent dark skies
- **3-4**: Good to moderate light pollution
- **5-6**: Bright suburban to urban skies
- **7-9**: Inner city to extreme light pollution

## 🛠️ Technical Details

### Backend Architecture
- **FastAPI**: Modern Python web framework with automatic API documentation
- **PyEphem**: Astronomical calculations for moon phases and celestial mechanics
- **Astropy**: Advanced astronomical computations and coordinate systems
- **GeoPy**: Geographic distance calculations using geodesic algorithms

### Frontend Architecture
- **React with TypeScript**: Type-safe component development
- **Tailwind CSS**: Utility-first CSS framework with custom space theme
- **Lucide React**: Beautiful, customizable icons
- **Axios**: HTTP client for API communication

### Key Algorithms
1. **Distance Calculation**: Uses geodesic distance for accurate Earth-surface measurements
2. **Visibility Scoring**: Weighted algorithm considering light pollution and lunar interference
3. **Moon Phase Calculation**: Precise lunar illumination and rise/set time computation

## 📱 Responsive Design

The application features a responsive, mobile-first design with:
- **Desktop**: Multi-column layouts with detailed information cards
- **Tablet**: Optimized two-column layouts
- **Mobile**: Single-column, touch-friendly interface

## 🎨 Design Theme

The interface uses a space-inspired design with:
- **Starry Night Background**: Animated star field with twinkling effects
- **Glass Morphism**: Semi-transparent cards with backdrop blur
- **Cosmic Color Palette**: Deep blues, purples, and stellar yellows
- **Smooth Animations**: Floating elements and hover effects

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Build frontend
cd frontend
npm run build

# Backend is production-ready with uvicorn
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
   python main.py
   ```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## 🌟 Usage

1. **Enter Location**: Type an address or click "Use Current Location"
2. **View Results**: Browse the closest dark sky zones with distances and descriptions
3. **Check Schedule**: View optimal viewing dates with moon phase information
4. **Plan Your Trip**: Use the visibility scores and conditions to plan your stargazing adventure

## 🌙 How It Works

### Dark Sky Zone Selection
The application includes a curated database of International Dark-Sky Association certified locations, including:
- Death Valley National Park (Bortle Class 1)
- Joshua Tree National Park (Bortle Class 2)
- Big Bend National Park (Bortle Class 1)
- Mauna Kea Observatory (Bortle Class 1)
- And many more...

### Visibility Scoring
The app calculates visibility scores (1-10) based on:
- **Moon illumination**: Less moonlight = better deep sky viewing
- **Bortle classification**: Lower light pollution = higher score
- **Seasonal considerations**: Optimal viewing windows

### Astronomical Calculations
- **Moon phases**: Precise lunar phase calculations
- **Illumination percentages**: How much of the moon is lit
- **Optimal timing**: Best hours for astronomical observations

## 🔧 API Endpoints

- `POST /find-dark-sky-zones`: Get closest zones and viewing recommendations
- `GET /moon-phase/{date}`: Get moon phase for specific date
- `GET /`: API health check

## 🌍 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔭 About Dark Sky Zones

Dark sky zones are areas with minimal light pollution where you can observe:
- **Deep sky objects**: Galaxies, nebulae, star clusters
- **Planetary details**: Surface features of planets
- **Meteor showers**: Better visibility of shooting stars
- **Milky Way**: Clear view of our galaxy's structure

The Bortle scale (1-9) measures light pollution levels, with Class 1 being the darkest skies and Class 9 being inner-city conditions.

---

Happy stargazing! 🌟
