// Map visualization module
import dataManager from './data.js';

class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.heatmapLayer = null;
        this.initialized = false;
    }

    async initialize(incidents) {
        if (this.initialized) {
            this.updateMarkers(incidents);
            return;
        }

        try {
            // Initialize the map centered on India
            this.map = L.map('mapContainer', {
                center: [20.5937, 78.9629],
                zoom: 5,
                zoomControl: false, // We'll add it in a better position
                attributionControl: false // We'll add it in a better position
            });

            // Add zoom control in a better position
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.map);

            // Add attribution in a better position
            L.control.attribution({
                position: 'bottomleft'
            }).addTo(this.map);

            // Add the base tile layer (OpenStreetMap)
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Add satellite layer option
            const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 19
            });

            // Add layer control
            const baseMaps = {
                "Street Map": osmLayer,
                "Satellite": satelliteLayer
            };

            L.control.layers(baseMaps, null, {
                position: 'topright',
                collapsed: false
            }).addTo(this.map);

            // Add a loading indicator
            const loadingControl = L.Control.extend({
                onAdd: function() {
                    const div = L.DomUtil.create('div', 'leaflet-control leaflet-bar loading-indicator hidden');
                    div.innerHTML = `
                        <div class="bg-white p-2 rounded shadow">
                            <div class="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                        </div>
                    `;
                    return div;
                }
            });
            this.loadingIndicator = new loadingControl({ position: 'topright' }).addTo(this.map);

            this.initialized = true;
            this.updateMarkers(incidents);
        } catch (error) {
            console.error('Error initializing map:', error);
            throw new Error('Failed to initialize map');
        }
    }

    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.getContainer().classList.remove('hidden');
        }
    }

    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.getContainer().classList.add('hidden');
        }
    }

    updateMarkers(incidents) {
        if (!this.initialized) return;

        this.showLoading();
        
        try {
            // Clear existing markers
            this.clearMarkers();

            // Add new markers
            const markerClusterGroup = L.markerClusterGroup({
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                iconCreateFunction: function(cluster) {
                    const count = cluster.getChildCount();
                    return L.divIcon({
                        html: `<div class="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">${count}</div>`,
                        className: 'marker-cluster',
                        iconSize: L.point(32, 32)
                    });
                }
            });

            incidents.forEach(incident => {
                const lat = Number(incident.Latitude);
                const lng = Number(incident.Longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                    const marker = L.marker([lat, lng])
                        .bindPopup(this.createPopupContent(incident));
                    markerClusterGroup.addLayer(marker);
                    this.markers.push(marker);
                }
            });

            this.map.addLayer(markerClusterGroup);
        } catch (error) {
            console.error('Error updating markers:', error);
        } finally {
            this.hideLoading();
        }
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            if (marker.getParentGroup()) {
                marker.getParentGroup().removeLayer(marker);
            } else {
                marker.remove();
            }
        });
        this.markers = [];
    }

    createPopupContent(incident) {
        const date = incident['Date of Incident'] ? new Date(incident['Date of Incident']).toLocaleDateString() : 'N/A';
        return `
            <div class="popup-content p-2">
                <h3 class="font-bold text-primary-700">${this.escapeHtml(incident.Title)}</h3>
                <div class="mt-2 space-y-1 text-sm text-gray-600">
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Location:</strong> ${this.escapeHtml(incident.Location || 'N/A')}, ${this.escapeHtml(incident.State || 'N/A')}</p>
                    <p><strong>Type:</strong> ${this.escapeHtml(incident['Incident Type'] || 'N/A')}</p>
                    <p><strong>Community:</strong> ${this.escapeHtml(incident['Victim Community'] || 'N/A')}</p>
                </div>
                ${incident['Source URL'] ? 
                    `<a href="${this.escapeHtml(incident['Source URL'])}" target="_blank" class="mt-2 inline-block text-primary-600 hover:text-primary-700 text-sm">View Source →</a>` : 
                    ''}
            </div>
        `;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Create and export a singleton instance
const mapManager = new MapManager();
export default mapManager; 