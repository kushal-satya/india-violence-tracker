// Map visualization module
import dataManager from './data.js';

class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.heatmapLayer = null;
    }

    initialize() {
        // Initialize the map centered on India
        this.map = L.map('map').setView([20.5937, 78.9629], 5);

        // Add the base tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add satellite layer option
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        // Add layer control
        const baseMaps = {
            "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }),
            "Satellite": satelliteLayer
        };

        L.control.layers(baseMaps).addTo(this.map);

        // Initialize heatmap layer
        this.initializeHeatmap();
    }

    initializeHeatmap() {
        // Create a heatmap layer (you'll need to include the Leaflet.heat plugin)
        // This is a placeholder - you'll need to add the actual heatmap library
        // this.heatmapLayer = L.heatLayer([], {radius: 25}).addTo(this.map);
    }

    updateMarkers(incidents) {
        // Clear existing markers
        this.clearMarkers();

        // Add new markers
        incidents.forEach(incident => {
            if (incident.latitude && incident.longitude) {
                const marker = L.marker([incident.latitude, incident.longitude])
                    .bindPopup(this.createPopupContent(incident));
                marker.addTo(this.map);
                this.markers.push(marker);
            }
        });

        // Update heatmap if available
        if (this.heatmapLayer) {
            const heatmapData = incidents
                .filter(incident => incident.latitude && incident.longitude)
                .map(incident => [incident.latitude, incident.longitude, 1]);
            this.heatmapLayer.setLatLngs(heatmapData);
        }
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    }

    createPopupContent(incident) {
        return `
            <div class="popup-content">
                <h3 class="font-bold">${incident.title}</h3>
                <p class="text-sm">${incident.description}</p>
                <p class="text-sm mt-2">
                    <strong>Location:</strong> ${incident.location}<br>
                    <strong>Date:</strong> ${new Date(incident.incident_date).toLocaleDateString()}<br>
                    <strong>Type:</strong> ${incident.incident_type}
                </p>
                <a href="${incident.url}" target="_blank" class="text-blue-600 hover:underline text-sm">Read more</a>
            </div>
        `;
    }

    updateMap(filters = {}) {
        const filteredIncidents = dataManager.filterIncidents(filters);
        this.updateMarkers(filteredIncidents);
    }
}

// Create and export a singleton instance
const mapManager = new MapManager();
export default mapManager; 