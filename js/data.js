// Data manager module
import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

// Google Sheets published CSV URL (from public_json_data sheet)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYLP4l0USAayIafvxTcDTzgVyktdJOOVnqJIbC4zW8zANSGsJr71QLpxHEW9MIeBQ8qm8qL-zUdRvW/pub?gid=1466869679&single=true&output=csv";
const SHEET_PROXY = "https://cors.isomorphic-git.org/";

// Field mapping from CSV headers to JS properties
const FIELD_MAP = {
    'headline': 'title',
    'location': 'location_summary',
    'date_of_incident': 'incident_date',
    'incident_type': 'incident_type',
    'victim_group': 'victim_group',
    'state': 'state',
    'district': 'district',
    'latitude': 'lat',
    'longitude': 'lon',
    'source_url': 'source_url',
    'source_name': 'source_name'
};

class DataManager {
    constructor() {
        this.incidents = [];
        this.lastUpdated = null;
        this.stats = {
            weeklyCount: 0,
            monthlyCount: 0,
            mostAffectedState: 'N/A'
        };
        this.loading = false;
        this.error = null;
        this.useMockData = true; // TODO: Set to false when real data is available
    }

    async fetchData() {
        if (this.loading) return false;
        
        this.loading = true;
        this.error = null;
        
        try {
            // Show loading state
            document.getElementById('loader')?.classList.remove('hidden');
            document.getElementById('errorBanner')?.classList.add('hidden');
            
            // Try direct fetch first
            let response = await fetch(SHEET_URL, { mode: 'cors' });
            
            // If CORS fails, use proxy
            if (!response.ok) {
                console.info('[fetch] Direct fetch failed, trying CORS proxy...');
                response = await fetch(SHEET_PROXY + SHEET_URL);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            console.info('[fetch]', response.status, response.headers.get('content-type'));
            
            const csvText = await response.text();
            const { data, errors } = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim().toLowerCase()
            });
            
            if (errors.length) {
                console.warn('[parse] CSV parsing errors:', errors);
            }
            
            // Map fields and clean data
            this.incidents = data.map(row => {
                const incident = {};
                Object.entries(FIELD_MAP).forEach(([oldKey, newKey]) => {
                    if (row[oldKey] !== undefined) {
                        incident[newKey] = row[oldKey].trim();
                    }
                });
                
                // Convert lat/lon to numbers, skip if invalid
                if (incident.lat && incident.lon) {
                    const lat = parseFloat(incident.lat);
                    const lon = parseFloat(incident.lon);
                    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                        incident.lat = lat;
                        incident.lon = lon;
                    } else {
                        delete incident.lat;
                        delete incident.lon;
                    }
                }
                
                return incident;
            }).filter(incident => incident.victim_group); // Only keep incidents with victim group
            
            console.assert(this.incidents.length > 0, 'No valid incidents parsed from CSV');
            
            this.lastUpdated = new Date();
            this.updateStats();
            
            return true;
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.error = error.message;
            document.getElementById('errorBanner')?.classList.remove('hidden');
            return false;
        } finally {
            this.loading = false;
            document.getElementById('loader')?.classList.add('hidden');
        }
    }

    getMockData() {
        // Mock data for development and testing
        const mockIncidents = [];
        const states = ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh'];
        const victimGroups = ['Dalit', 'Adivasi', 'Muslim', 'Christian', 'Sikh', 'Other Minority'];
        const incidentTypes = ['Physical Violence', 'Verbal Abuse', 'Discrimination', 'Property Damage', 'Social Boycott'];
        const policeActions = ['FIR Filed', 'Investigation Ongoing', 'No Action', 'Case Closed', 'Arrest Made'];
        
        // Generate 50 mock incidents
        for (let i = 0; i < 50; i++) {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 90)); // Last 90 days
            
            const state = states[Math.floor(Math.random() * states.length)];
            const victimGroup = victimGroups[Math.floor(Math.random() * victimGroups.length)];
            const incidentType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
            
            mockIncidents.push({
                incident_id: `INC_${String(i + 1).padStart(3, '0')}`,
                title: `${incidentType} incident reported in ${state}`,
                summary: `A case of ${incidentType.toLowerCase()} against a ${victimGroup} person was reported. Local authorities have been notified.`,
                incident_date: date.toISOString().split('T')[0],
                published_at: date.toISOString(),
                location_summary: `Near ${state} City Center`,
                district: `District ${i + 1}`,
                state: state,
                lat: 20 + Math.random() * 15, // India latitude range
                lon: 68 + Math.random() * 30, // India longitude range
                victim_group: victimGroup,
                incident_type: incidentType,
                alleged_perp: 'Unknown',
                police_action: policeActions[Math.floor(Math.random() * policeActions.length)],
                source_url: `https://example.com/news/${i}`,
                source_name: `News Source ${Math.floor(Math.random() * 5) + 1}`,
                rss_feed_id: `feed_${Math.floor(Math.random() * 5)}`,
                confidence_score: Math.random() < 0.3 ? 'Low' : Math.random() < 0.7 ? 'Medium' : 'High',
                verified_manually: Math.random() < 0.3 ? 'TRUE' : 'FALSE'
            });
        }
        
        return {
            lastUpdated: new Date().toISOString(),
            totalIncidents: mockIncidents.length,
            data: mockIncidents
        };
    }

    updateStats() {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Count incidents by time period using new field names
        this.stats.weeklyCount = this.incidents.filter(incident => {
            const incidentDate = new Date(incident.incident_date || incident.published_at);
            return incidentDate >= oneWeekAgo;
        }).length;

        this.stats.monthlyCount = this.incidents.filter(incident => {
            const incidentDate = new Date(incident.incident_date || incident.published_at);
            return incidentDate >= oneMonthAgo;
        }).length;

        // Find most affected state
        const stateCounts = {};
        this.incidents.forEach(incident => {
            if (incident.state) {
                stateCounts[incident.state] = (stateCounts[incident.state] || 0) + 1;
            }
        });

        const mostAffected = Object.entries(stateCounts)
            .sort(([,a], [,b]) => b - a)[0];

        this.stats.mostAffectedState = mostAffected ? mostAffected[0] : 'N/A';
    }

    getStats() {
        return {
            ...this.stats,
            totalCount: this.incidents.length
        };
    }

    getIncidents() {
        return this.incidents;
    }

    getFilteredIncidents(filters = {}) {
        return this.incidents.filter(incident => {
            if (filters.search && !this.matchesSearch(incident, filters.search)) {
                return false;
            }
            if (filters.state && incident.state !== filters.state) {
                return false;
            }
            if (filters.victimGroup && incident.victim_group !== filters.victimGroup) {
                return false;
            }
            if (filters.incidentType && incident.incident_type !== filters.incidentType) {
                return false;
            }
            if (filters.dateFrom) {
                const incidentDate = new Date(incident.incident_date || incident.published_at);
                const fromDate = new Date(filters.dateFrom);
                if (incidentDate < fromDate) {
                    return false;
                }
            }
            if (filters.dateTo) {
                const incidentDate = new Date(incident.incident_date || incident.published_at);
                const toDate = new Date(filters.dateTo);
                if (incidentDate > toDate) {
                    return false;
                }
            }
            return true;
        });
    }

    matchesSearch(incident, searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
            (incident.title && incident.title.toLowerCase().includes(searchLower)) ||
            (incident.summary && incident.summary.toLowerCase().includes(searchLower)) ||
            (incident.district && incident.district.toLowerCase().includes(searchLower)) ||
            (incident.state && incident.state.toLowerCase().includes(searchLower)) ||
            (incident.victim_group && incident.victim_group.toLowerCase().includes(searchLower)) ||
            (incident.incident_type && incident.incident_type.toLowerCase().includes(searchLower)) ||
            (incident.alleged_perp && incident.alleged_perp.toLowerCase().includes(searchLower))
        );
    }

    getUniqueStates() {
        return [...new Set(this.incidents
            .filter(incident => incident.state)
            .map(incident => incident.state)
        )].sort();
    }

    getUniqueVictimGroups() {
        return [...new Set(this.incidents
            .filter(incident => incident.victim_group)
            .map(incident => incident.victim_group)
        )].sort();
    }

    getUniqueIncidentTypes() {
        return [...new Set(this.incidents
            .filter(incident => incident.incident_type)
            .map(incident => incident.incident_type)
        )].sort();
    }
}

// Export a singleton instance
const dataManager = new DataManager();
export default dataManager; 