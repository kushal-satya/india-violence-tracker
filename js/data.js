// Data manager for India violence tracker
class DataManager {
    constructor() {
        this.incidents = [];
        this.isLoaded = false;
        this.csvUrl = './assets/india dalit violence - PublicData (1).csv';
    }

    async loadData() {
        console.log('[data] Starting data load...');
        
        try {
            const response = await fetch(this.csvUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log('[data] CSV fetched, size:', csvText.length, 'characters');
            
            // Parse CSV using PapaParse
            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: function(header) {
                        // Clean up headers
                        return header.trim().toLowerCase();
                    },
                    transform: function(value, header) {
                        // Clean up values
                        return value ? value.trim() : '';
                    },
                    complete: (results) => {
                        console.log('[data] CSV parsing complete');
                        console.log('[data] Total rows parsed:', results.data.length);
                        console.log('[data] Parse errors:', results.errors.length);
                        
                        if (results.errors.length > 0) {
                            console.warn('[data] Parse errors:', results.errors);
                        }
                        
                        if (results.data.length === 0) {
                            reject(new Error('No data found in CSV'));
                            return;
                        }

                        // Process and normalize the data
                        this.incidents = this.processIncidents(results.data);
                        console.log('[data] Processed incidents:', this.incidents.length);
                        
                        // Log sample of processed data for debugging
                        if (this.incidents.length > 0) {
                            console.log('[data] Sample processed incident:', JSON.stringify(this.incidents[0], null, 2));
                        }
                        
                        this.isLoaded = true;
                        resolve(this.incidents);
                    },
                    error: (error) => {
                        console.error('[data] CSV parsing error:', error);
                        reject(new Error(`CSV parsing failed: ${error.message}`));
                    }
                });
            });
        } catch (error) {
            console.error('[data] Error loading data:', error);
            throw new Error(`Data loading failed: ${error.message}`);
        }
    }

    processIncidents(rawData) {
        console.log('[data] Processing raw data...');
        
        // Log first raw row to understand structure
        if (rawData.length > 0) {
            console.log('[data] First raw row keys:', Object.keys(rawData[0]));
            console.log('[data] First raw row:', JSON.stringify(rawData[0], null, 2));
        }
        
        const processed = rawData
            .map((row, index) => {
                try {
                    // Map CSV columns to our data structure
                    const incident = {
                        incident_id: row.incident_id || `incident_${index}`,
                        title: row.headline || 'Untitled Incident',
                        summary: row.summary || '',
                        incident_date: this.parseDate(row.incident_date || row.published_at) || new Date().toISOString().split('T')[0],
                        published_at: row.published_at || '',
                        location_summary: this.buildLocationSummary(row),
                        district: row.district || '',
                        state: row.state || '',
                        lat: this.parseCoordinate(row.lat),
                        lon: this.parseCoordinate(row.lon),
                        victim_group: row.victim_group || 'Unknown',
                        incident_type: row.incident_type || 'Unknown',
                        alleged_perp: row.alleged_perp || '',
                        police_action: row.police_action || '',
                        source_url: row.source_url || '',
                        source_name: row.source_name || '',
                        confidence_score: row.confidence_score || 'Unknown',
                        verified_manually: row.verified_manually || '',
                        
                        // Additional computed fields
                        has_coordinates: this.hasValidCoordinates(row.lat, row.lon),
                        date_formatted: this.formatDate(row.incident_date || row.published_at),
                        year: this.extractYear(row.incident_date || row.published_at)
                    };
                    
                    return incident;
                } catch (error) {
                    console.warn(`[data] Error processing row ${index}:`, error, row);
                    return null;
                }
            })
            .filter(incident => incident !== null);
            
        console.log('[data] Successfully processed', processed.length, 'incidents');
        console.log('[data] Incidents with coordinates:', processed.filter(i => i.has_coordinates).length);
        
        return processed;
    }

    parseCoordinate(value) {
        if (!value || value === '' || value === null || value === undefined) {
            return null;
        }
        
        const parsed = parseFloat(value);
        
        // Check if it's a valid number and within reasonable coordinate bounds
        if (isNaN(parsed) || !isFinite(parsed)) {
            return null;
        }
        
        // Basic coordinate validation (rough bounds for Earth)
        if (parsed < -180 || parsed > 180) {
            return null;
        }
        
        return parsed;
    }

    hasValidCoordinates(lat, lon) {
        const parsedLat = this.parseCoordinate(lat);
        const parsedLon = this.parseCoordinate(lon);
        
        return parsedLat !== null && parsedLon !== null &&
               parsedLat >= -90 && parsedLat <= 90 &&
               parsedLon >= -180 && parsedLon <= 180;
    }

    buildLocationSummary(row) {
        const parts = [];
        
        if (row.location) parts.push(row.location);
        if (row.district && row.district !== row.location) parts.push(row.district);
        if (row.state && row.state !== row.district) parts.push(row.state);
        
        return parts.length > 0 ? parts.join(', ') : 'Location not specified';
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        try {
            // Handle various date formats
            let date = new Date(dateString);
            
            // If invalid, try to parse manually
            if (isNaN(date.getTime())) {
                // Try different formats
                const formats = [
                    /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
                    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
                    /(\d{2})-(\d{2})-(\d{4})/   // MM-DD-YYYY
                ];
                
                for (const format of formats) {
                    const match = dateString.match(format);
                    if (match) {
                        date = new Date(match[1], match[2] - 1, match[3]);
                        break;
                    }
                }
            }
            
            return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('[data] Date parsing error:', error, dateString);
            return null;
        }
    }

    formatDate(dateString) {
        const date = this.parseDate(dateString);
        if (!date) return 'Unknown Date';
        
        try {
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return date;
        }
    }

    extractYear(dateString) {
        const date = this.parseDate(dateString);
        if (!date) return new Date().getFullYear();
        
        try {
            return new Date(date).getFullYear();
        } catch (error) {
            return new Date().getFullYear();
        }
    }

    // Filter methods
    filterByState(state) {
        if (!state || state === 'all') return this.incidents;
        return this.incidents.filter(incident => 
            incident.state && incident.state.toLowerCase().includes(state.toLowerCase())
        );
    }

    filterByVictimGroup(group) {
        if (!group || group === 'all') return this.incidents;
        return this.incidents.filter(incident => 
            incident.victim_group && incident.victim_group.toLowerCase().includes(group.toLowerCase())
        );
    }

    filterByIncidentType(type) {
        if (!type || type === 'all') return this.incidents;
        return this.incidents.filter(incident => 
            incident.incident_type && incident.incident_type.toLowerCase().includes(type.toLowerCase())
        );
    }

    filterByDateRange(startDate, endDate) {
        return this.incidents.filter(incident => {
            const incidentDate = new Date(incident.incident_date);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date();
            
            return incidentDate >= start && incidentDate <= end;
        });
    }

    searchIncidents(query) {
        if (!query || query.length < 2) return this.incidents;
        
        const searchTerm = query.toLowerCase();
        return this.incidents.filter(incident => 
            incident.title.toLowerCase().includes(searchTerm) ||
            incident.summary.toLowerCase().includes(searchTerm) ||
            incident.location_summary.toLowerCase().includes(searchTerm) ||
            incident.victim_group.toLowerCase().includes(searchTerm) ||
            incident.incident_type.toLowerCase().includes(searchTerm)
        );
    }

    // Stats methods
    getStats() {
        const total = this.incidents.length;
        const withCoordinates = this.incidents.filter(i => i.has_coordinates).length;
        
        const byState = {};
        const byVictimGroup = {};
        const byIncidentType = {};
        const byYear = {};
        
        this.incidents.forEach(incident => {
            // By state
            const state = incident.state || 'Unknown';
            byState[state] = (byState[state] || 0) + 1;
            
            // By victim group
            const group = incident.victim_group || 'Unknown';
            byVictimGroup[group] = (byVictimGroup[group] || 0) + 1;
            
            // By incident type
            const type = incident.incident_type || 'Unknown';
            byIncidentType[type] = (byIncidentType[type] || 0) + 1;
            
            // By year
            const year = incident.year;
            byYear[year] = (byYear[year] || 0) + 1;
        });
        
        return {
            total,
            withCoordinates,
            byState,
            byVictimGroup,
            byIncidentType,
            byYear
        };
    }
}

// Create and export singleton instance
const dataManager = new DataManager();
export default dataManager; 