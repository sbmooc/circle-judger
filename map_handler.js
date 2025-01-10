class MapHandler {
    constructor() {
        this.map = null;
        this.circleDetector = new CircleDetector();
        this.layers = {
            track: null,
            perfect: null,
            inner: null,
            outer: null
        };
        
        this.initMap();
        this.initFileHandler();
    }

    initMap() {
        this.map = L.map('map').setView([51.505, -0.09], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    initFileHandler() {
        document.getElementById('gpxFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => this.processGPX(e.target.result);
                reader.readAsText(file);
            }
        });
    }

    clearLayers() {
        Object.values(this.layers).forEach(layer => {
            if (layer) {
                this.map.removeLayer(layer);
            }
        });
    }

    processGPX(gpxContent) {
        this.clearLayers();
        
        const gpx = new gpxParser();
        gpx.parse(gpxContent);
        
        const points = gpx.tracks.flatMap(track => 
            track.points.map(point => ({
                lat: point.lat,
                lon: point.lon
            }))
        );

        const result = this.circleDetector.analyzeTrack(points);
        this.displayResults(result);
        this.displayOnMap(points, result);
    }

    displayResults(result) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <h3>Analysis Results:</h3>
            <p>Is circular: ${result.isCircular}</p>
            <p>Average radius: ${result.details.averageRadius.toFixed(2)} km</p>
            <p>Radius variance: ${(result.details.radiusVariance * 100).toFixed(2)}%</p>
            <p>Start-End distance: ${result.details.startEndDistance.toFixed(2)} km</p>
        `;
    }

    displayOnMap(points, result) {
        // Draw original track
        const trackPoints = points.map(p => [p.lat, p.lon]);
        this.layers.track = L.polyline(trackPoints, {
            color: 'blue',
            weight: 3
        }).addTo(this.map);

        // Draw circles
        this.layers.perfect = L.polyline(result.circles.perfect, {
            color: 'green',
            weight: 2,
            dashArray: '5, 10'
        }).addTo(this.map);

        this.layers.inner = L.polyline(result.circles.inner, {
            color: 'red',
            weight: 1,
            dashArray: '3, 7'
        }).addTo(this.map);

        this.layers.outer = L.polyline(result.circles.outer, {
            color: 'red',
            weight: 1,
            dashArray: '3, 7'
        }).addTo(this.map);

        // Add center marker
        L.marker(result.details.center).addTo(this.map)
            .bindPopup('Center Point');

        // Fit map to track bounds
        this.map.fitBounds(this.layers.track.getBounds());
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new MapHandler();
}); 