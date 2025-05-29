// Data manager module
// Google Sheets published JSON URL (from public_json_data sheet)
const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYLP4l0USAayIafvxTcDTzgVyktdJOOVnqJIbC4zW8zANSGsJr71QLpxHEW9MIeBQ8qm8qL-zUdRvW/pub?gid=1466869679&single=true&output=csv";
// TODO: Update with actual published JSON URL from public_json_data sheet
# https://docs.google.com/spreadsheets/d/e/2PACX-1vQYLP4l0USAayIafvxTcDTzgVyktdJOOVnqJIbC4zW8zANSGsJr71QLpxHEW9MIeBQ8qm8qL-zUdRvW/pub?gid=1466869679&single=true&output=csv
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
            let data;
            
            if (this.useMockData) {
                // Use mock data for development
                data = this.getMockData();
            } else {
                // Fetch from Google Sheets JSON
                const response = await fetch(DATA_URL);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const text = await response.text();
                // The Google Sheets JSON is stored as text in the first cell
                data = JSON.parse(text);
            }
            
            this.incidents = data.data || data;
            this.lastUpdated = data.lastUpdated || new Date().toISOString();
            
            if (this.incidents.length === 0) {
                throw new Error('No valid incidents found in data');
            }
            
            this.updateStats();
            return true;
        } catch (error) {
            console.error('Error fetching data:', error);
            this.error = error.message;
            return false;
        } finally {
            this.loading = false;
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
                headline: `${incidentType} incident reported in ${state}`,
                summary: `A case of ${incidentType.toLowerCase()} against a ${victimGroup} person was reported. Local authorities have been notified.`,
                incidentDate: date.toISOString().split('T')[0],
                publishedAt: date.toISOString(),
                lat: 20 + Math.random() * 15, // India latitude range
                lon: 68 + Math.random() * 30, // India longitude range
                district: `District ${i + 1}`,
                state: state,
                victimGroup: victimGroup,
                incidentType: incidentType,
                allegedPerp: 'Unknown',
                policeAction: policeActions[Math.floor(Math.random() * policeActions.length)],
                sourceUrl: `https://example.com/news/${i}`,
                rssFeedId: `feed_${Math.floor(Math.random() * 5)}`,
                confidenceScore: 0.7 + Math.random() * 0.3,
                verifiedManually: true
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
            const incidentDate = new Date(incident.incidentDate || incident.publishedAt);
            return incidentDate >= oneWeekAgo;
        }).length;

        this.stats.monthlyCount = this.incidents.filter(incident => {
            const incidentDate = new Date(incident.incidentDate || incident.publishedAt);
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
        return this.stats;
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
            if (filters.victimGroup && incident.victimGroup !== filters.victimGroup) {
                return false;
            }
            if (filters.incidentType && incident.incidentType !== filters.incidentType) {
                return false;
            }
            if (filters.dateFrom) {
                const incidentDate = new Date(incident.incidentDate || incident.publishedAt);
                const fromDate = new Date(filters.dateFrom);
                if (incidentDate < fromDate) {
                    return false;
                }
            }
            if (filters.dateTo) {
                const incidentDate = new Date(incident.incidentDate || incident.publishedAt);
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
            (incident.headline && incident.headline.toLowerCase().includes(searchLower)) ||
            (incident.summary && incident.summary.toLowerCase().includes(searchLower)) ||
            (incident.district && incident.district.toLowerCase().includes(searchLower)) ||
            (incident.state && incident.state.toLowerCase().includes(searchLower)) ||
            (incident.victimGroup && incident.victimGroup.toLowerCase().includes(searchLower)) ||
            (incident.incidentType && incident.incidentType.toLowerCase().includes(searchLower)) ||
            (incident.allegedPerp && incident.allegedPerp.toLowerCase().includes(searchLower))
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
            .filter(incident => incident.victimGroup)
            .map(incident => incident.victimGroup)
        )].sort();
    }

    getUniqueIncidentTypes() {
        return [...new Set(this.incidents
            .filter(incident => incident.incidentType)
            .map(incident => incident.incidentType)
        )].sort();
    }
}

// Export a singleton instance
const dataManager = new DataManager();
export default dataManager; 