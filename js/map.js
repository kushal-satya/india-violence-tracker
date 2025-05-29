// Map module
import dataManager from './data.js?v=2';

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
        console.log('[map] Starting map initialization');
        
        try {
            console.log('[map] Starting fresh map initialization');
            
            // Debug map container
            const mapContainer = document.getElementById('map');
            console.log('[map] Map container found:', mapContainer ? true : false);
            
            if (!mapContainer) {
                console.error('[map] Map container not found - looking for element with id="map"');
                
                // Try to find any potential map containers
                const potentialContainers = document.querySelectorAll('div[id*="map"], div.map');
                if (potentialContainers.length > 0) {
                    console.log('[map] Found potential map containers:', 
                        Array.from(potentialContainers).map(el => `${el.tagName}#${el.id}.${el.className}`));
                }
                
                throw new Error('Map container not found');
            }

            // Clean up any existing map instance
            if (this.map) {
                console.log('[map] Removing existing map instance');
                try {
                    this.map.remove();
                } catch (e) {
                    console.warn('[map] Error removing existing map:', e);
                }
                this.map = null;
                this.markers = null;
                this.initialized = false;
            }
            
            // Clear the container completely and reset all Leaflet state
            mapContainer.innerHTML = '';
            mapContainer.className = mapContainer.className.replace(/leaflet-\S*/g, '').trim();
            mapContainer.style.cssText = 'height: 384px; position: relative;';
            
            // Remove any existing Leaflet data attributes
            if (mapContainer._leaflet_id) {
                delete mapContainer._leaflet_id;
            }
            
            // Small delay to ensure DOM is clean
            await new Promise(resolve => setTimeout(resolve, 100));

            // Initialize map with India's center
            console.log('[map] Creating Leaflet map');
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
            console.log('[map] Creating marker cluster group');
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
            console.log('[map] Map initialization complete');
            
            // Update with real incidents
            this.updateMap(incidents);
        } catch (error) {
            console.error('[map] Error initializing map:', error);
            
            // Reset state on error
            this.initialized = false;
            if (this.map) {
                try {
                    this.map.remove();
                } catch (e) {
                    console.warn('[map] Error removing map on cleanup:', e);
                }
                this.map = null;
            }
            this.markers = null;
            
            document.getElementById('errorBanner')?.classList.remove('hidden');
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
        const victimGroup = incident.victim_group?.toLowerCase() || '';
        
        // Color markers by victim group: blue for Dalit, purple for Muslim, grey otherwise
        let color;
        if (victimGroup.includes('dalit')) {
            color = isDark ? '#60A5FA' : '#2563EB'; // Blue
        } else if (victimGroup.includes('muslim')) {
            color = isDark ? '#A855F7' : '#7C3AED'; // Purple
        } else {
            color = isDark ? '#6B7280' : '#4B5563'; // Grey
        }

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
            console.time('[map] Update map');
            this.incidents = incidents;
            this.markers.clearLayers();

            // Filter incidents with valid coordinates
            const validIncidents = incidents.filter(incident => {
                // Try to ensure lat/lon are numbers
                const lat = typeof incident.lat === 'number' ? incident.lat : parseFloat(incident.lat);
                const lon = typeof incident.lon === 'number' ? incident.lon : parseFloat(incident.lon);
                
                // Check if values are valid numbers
                const isValid = lat !== null && lon !== null && 
                                !isNaN(lat) && !isNaN(lon) && 
                                isFinite(lat) && isFinite(lon) &&
                                // Make sure they're in a reasonable range
                                lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
                
                // For debugging: log coordinate details for invalid ones
                if (!isValid) {
                    console.debug(`[map] Skipping incident with invalid coordinates: 
                        Title: ${incident.title || 'Untitled'}, 
                        Lat: ${incident.lat} (${typeof incident.lat}), 
                        Lon: ${incident.lon} (${typeof incident.lon})`);
                }
                
                return isValid;
            });

            console.info(`[map] Adding ${validIncidents.length} markers (${incidents.length - validIncidents.length} skipped)`);
            
            // If no valid incidents, log details of first few incidents for debugging
            if (validIncidents.length === 0 && incidents.length > 0) {
                console.warn('[map] No valid incidents with coordinates. Sample incident data:');
                incidents.slice(0, 3).forEach((incident, i) => {
                    console.warn(`[map] Sample incident ${i+1}:`, JSON.stringify({
                        title: incident.title,
                        lat: incident.lat,
                        lon: incident.lon,
                        latType: typeof incident.lat,
                        lonType: typeof incident.lon
                    }));
                });
                
                // Show error message on map container
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full py-12 text-gray-500 dark:text-gray-400">
                            <svg class="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p class="text-lg font-medium">No mappable incidents available</p>
                            <p class="mt-2 text-sm">Data loaded but no valid coordinates found</p>
                        </div>
                    `;
                }
            } else {
                // Add markers for valid incidents
                let markerCount = 0;
                
                validIncidents.forEach(incident => {
                    try {
                        // Convert lat/lon to numbers again to be safe
                        const lat = typeof incident.lat === 'number' ? incident.lat : parseFloat(incident.lat);
                        const lon = typeof incident.lon === 'number' ? incident.lon : parseFloat(incident.lon);
                        
                        if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
                            console.warn(`[map] Skipping marker with invalid coordinates: ${incident.title}`);
                            return; // Skip this iteration
                        }
                        
                        // Create marker with custom icon
                        const marker = L.marker(
                            [lat, lon],
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
                        markerCount++;
                    } catch (error) {
                        console.error(`[map] Error creating marker for incident: ${incident.title}`, error);
                    }
                });

                console.info(`[map] Added ${markerCount} markers to the map`);

                // Fit bounds to show all markers
                if (this.markers.getLayers().length > 0) {
                    this.map.fitBounds(this.markers.getBounds(), {
                        padding: [50, 50],
                        maxZoom: 12
                    });
                } else {
                    console.warn('[map] No valid markers to display');
                }
            }
            
            console.timeEnd('[map] Update map');
        } catch (error) {
            console.error('Error updating map:', error);
            document.getElementById('errorBanner')?.classList.remove('hidden');
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
                ">${incident.title || 'Untitled Incident'}</h3>
                
                <div style="
                    font-size: 0.875rem;
                    margin-bottom: 0.75rem;
                    color: ${isDark ? '#9CA3AF' : '#6B7280'};
                ">
                    <p style="margin: 0.25rem 0;">
                        <strong>Date:</strong> ${incident.incident_date || '–'}
                    </p>
                    <p style="margin: 0.25rem 0;">
                        <strong>Location:</strong> ${incident.location_summary || 'Unknown'}
                    </p>
                </div>
                
                <div style="
                    font-size: 0.75rem;
                    font-style: italic;
                    margin-bottom: 0.75rem;
                    color: ${isDark ? '#9CA3AF' : '#6B7280'};
                ">
                    ${incident.victim_group || 'Unknown'} – ${incident.incident_type || 'Unknown'}
                </div>

                ${incident.summary ? `
                    <div style="
                        font-size: 0.875rem;
                        margin-top: 0.75rem;
                        padding-top: 0.75rem;
                        border-top: 1px solid ${borderColor};
                        color: ${isDark ? '#D1D5DB' : '#4B5563'};
                    ">
                        ${incident.summary}
                    </div>
                ` : ''}

                ${incident.source_url ? `
                    <div style="
                        font-size: 0.75rem;
                        margin-top: 0.75rem;
                        padding-top: 0.75rem;
                        border-top: 1px solid ${borderColor};
                        color: ${isDark ? '#9CA3AF' : '#6B7280'};
                    ">
                        <a href="${incident.source_url}" target="_blank" rel="noopener noreferrer" style="
                            color: ${isDark ? '#60A5FA' : '#2563EB'};
                            text-decoration: none;
                            font-weight: 500;
                        ">
                            ${incident.source_name || 'View Source'} →
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