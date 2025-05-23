// Map module
import dataManager from './data.js';

class MapManager {
    constructor() {
        this.map = null;
        this.markers = null;
        this.initialized = false;
        this.incidents = [];
        this.mapStyles = {
            light: {
                style: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                tileOptions: {
                    maxZoom: 19,
                    subdomains: 'abcd'
                }
            },
            dark: {
                style: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                tileOptions: {
                    maxZoom: 19,
                    subdomains: 'abcd'
                }
            }
        };
    }

    async initialize(incidents) {
        if (this.initialized) {
            this.updateMap(incidents);
            return;
        }

        try {
            const mapContainer = document.getElementById('mapContainer');
            if (!mapContainer) {
                throw new Error('Map container not found');
            }

            // Initialize map with India's center
            this.map = L.map(mapContainer, {
                center: [20.5937, 78.9629],
                zoom: 5,
                zoomControl: false,
                attributionControl: false,
                minZoom: 4,
                maxZoom: 18,
                scrollWheelZoom: true,
                dragging: true,
                touchZoom: true,
                doubleClickZoom: true,
                boxZoom: true,
                keyboard: true,
                tap: true
            });

            // Add zoom control with custom position
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.map);

            // Add attribution control with custom position
            L.control.attribution({
                position: 'bottomleft',
                prefix: false
            }).addTo(this.map);

            // Initialize marker cluster group
            this.markers = L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                disableClusteringAtZoom: 16,
                iconCreateFunction: this.createClusterIcon.bind(this)
            });

            // Add markers to map
            this.map.addLayer(this.markers);

            // Set initial tile layer based on theme
            this.updateMapStyle();

            // Listen for theme changes
            const observer = new MutationObserver(() => {
                this.updateMapStyle();
                this.updateMap(this.incidents);
            });
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            });

            this.initialized = true;
            this.updateMap(incidents);
        } catch (error) {
            console.error('Error initializing map:', error);
            throw new Error('Failed to initialize map');
        }
    }

    createClusterIcon(cluster) {
        const isDark = document.documentElement.classList.contains('dark');
        const childCount = cluster.getChildCount();
        const size = childCount < 100 ? 40 : childCount < 1000 ? 50 : 60;
        const bgColor = isDark ? '#1F2937' : '#FFFFFF';
        const textColor = isDark ? '#E5E7EB' : '#374151';
        const borderColor = isDark ? '#374151' : '#E5E7EB';

        return L.divIcon({
            html: `
                <div style="
                    background-color: ${bgColor};
                    border: 2px solid ${borderColor};
                    border-radius: 50%;
                    width: ${size}px;
                    height: ${size}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: Inter, system-ui, sans-serif;
                    font-weight: 600;
                    font-size: ${size * 0.4}px;
                    color: ${textColor};
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease-in-out;
                ">
                    ${childCount}
                </div>
            `,
            className: 'custom-cluster-icon',
            iconSize: L.point(size, size)
        });
    }

    createMarkerIcon(incident) {
        const isDark = document.documentElement.classList.contains('dark');
        const type = incident['Incident Type']?.toLowerCase() || 'other';
        const colors = {
            assault: isDark ? '#EF4444' : '#DC2626',
            murder: isDark ? '#7F1D1D' : '#991B1B',
            harassment: isDark ? '#F59E0B' : '#D97706',
            discrimination: isDark ? '#8B5CF6' : '#7C3AED',
            other: isDark ? '#6B7280' : '#4B5563'
        };

        const color = colors[type] || colors.other;
        const size = 24;

        return L.divIcon({
            html: `
                <div style="
                    background-color: ${color};
                    border: 2px solid ${isDark ? '#1F2937' : '#FFFFFF'};
                    border-radius: 50%;
                    width: ${size}px;
                    height: ${size}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease-in-out;
                    cursor: pointer;
                ">
                    <div style="
                        width: ${size * 0.4}px;
                        height: ${size * 0.4}px;
                        background-color: ${isDark ? '#1F2937' : '#FFFFFF'};
                        border-radius: 50%;
                    "></div>
                </div>
            `,
            className: 'custom-marker-icon',
            iconSize: L.point(size, size),
            iconAnchor: L.point(size / 2, size / 2)
        });
    }

    updateMapStyle() {
        if (!this.map) return;

        const isDark = document.documentElement.classList.contains('dark');
        const style = isDark ? this.mapStyles.dark : this.mapStyles.light;

        // Remove existing tile layer if any
        this.map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                this.map.removeLayer(layer);
            }
        });

        // Add new tile layer
        L.tileLayer(style.style, {
            attribution: style.attribution,
            ...style.tileOptions
        }).addTo(this.map);
    }

    updateMap(incidents) {
        if (!this.initialized || !this.markers) return;

        try {
            this.incidents = incidents;
            this.markers.clearLayers();

            incidents.forEach(incident => {
                if (incident.Latitude && incident.Longitude) {
                    const marker = L.marker(
                        [incident.Latitude, incident.Longitude],
                        { icon: this.createMarkerIcon(incident) }
                    );

                    // Create popup content
                    const popupContent = this.createPopupContent(incident);
                    marker.bindPopup(popupContent, {
                        maxWidth: 300,
                        className: 'custom-popup',
                        closeButton: true
                    });

                    this.markers.addLayer(marker);
                }
            });

            // Fit bounds to show all markers
            if (this.markers.getLayers().length > 0) {
                this.map.fitBounds(this.markers.getBounds(), {
                    padding: [50, 50],
                    maxZoom: 12
                });
            }
        } catch (error) {
            console.error('Error updating map:', error);
        }
    }

    createPopupContent(incident) {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#E5E7EB' : '#374151';
        const bgColor = isDark ? '#1F2937' : '#FFFFFF';
        const borderColor = isDark ? '#374151' : '#E5E7EB';

        return `
            <div style="
                font-family: Inter, system-ui, sans-serif;
                color: ${textColor};
                background-color: ${bgColor};
                border: 1px solid ${borderColor};
                border-radius: 0.75rem;
                padding: 1rem;
                max-width: 300px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            ">
                <h3 style="
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0 0 0.5rem 0;
                    color: ${textColor};
                ">${incident.Title || 'Untitled Incident'}</h3>
                
                <div style="
                    font-size: 0.875rem;
                    margin-bottom: 0.75rem;
                    color: ${isDark ? '#9CA3AF' : '#6B7280'};
                ">
                    <p style="margin: 0.25rem 0;">
                        <strong>Date:</strong> ${incident.Date || 'Unknown'}
                    </p>
                    <p style="margin: 0.25rem 0;">
                        <strong>Location:</strong> ${incident.Location || 'Unknown'}
                    </p>
                    <p style="margin: 0.25rem 0;">
                        <strong>Type:</strong> ${incident['Incident Type'] || 'Unknown'}
                    </p>
                </div>

                ${incident.Description ? `
                    <div style="
                        font-size: 0.875rem;
                        margin-top: 0.75rem;
                        padding-top: 0.75rem;
                        border-top: 1px solid ${borderColor};
                        color: ${isDark ? '#D1D5DB' : '#4B5563'};
                    ">
                        ${incident.Description}
                    </div>
                ` : ''}

                ${incident.Source ? `
                    <div style="
                        font-size: 0.75rem;
                        margin-top: 0.75rem;
                        padding-top: 0.75rem;
                        border-top: 1px solid ${borderColor};
                        color: ${isDark ? '#9CA3AF' : '#6B7280'};
                    ">
                        <a href="${incident.Source}" target="_blank" rel="noopener noreferrer" style="
                            color: ${isDark ? '#60A5FA' : '#2563EB'};
                            text-decoration: none;
                            font-weight: 500;
                        ">
                            View Source →
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// Create and export a singleton instance
const mapManager = new MapManager();
export default mapManager; 