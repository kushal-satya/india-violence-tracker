// Data manager module
const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYLP4l0USAayIafvxTcDTzgVyktdJOOVnqJIbC4zW8zANSGsJr71QLpxHEW9MIeBQ8qm8qL-zUdRvW/pub?gid=1466869679&single=true&output=csv";

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
    }

    async fetchData() {
        if (this.loading) return false;
        
        this.loading = true;
        this.error = null;
        
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            if (!csvText.trim()) {
                throw new Error('Empty data received');
            }
            
            this.incidents = this.parseCSV(csvText);
            if (this.incidents.length === 0) {
                throw new Error('No valid incidents found in data');
            }
            
            this.lastUpdated = new Date().toISOString();
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

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1)
            .filter(line => line.trim()) // Skip empty lines
            .map(line => {
                const values = this.parseCSVLine(line);
                const incident = {};
                
                headers.forEach((header, index) => {
                    let value = values[index] || '';
                    // Clean up the value
                    value = value.replace(/^"|"$/g, '').trim();
                    
                    // Parse dates
                    if (header === 'Date of Incident' || header === 'Last Updated') {
                        try {
                            value = new Date(value);
                        } catch (e) {
                            value = null;
                        }
                    }
                    
                    incident[header] = value;
                });

                // Add derived fields
                incident.hasLocation = Boolean(incident.Location && incident.State);
                incident.hasCommunity = Boolean(incident['Victim Community']);
                incident.hasType = Boolean(incident['Incident Type']);
                
                return incident;
            })
            .filter(incident => incident.Title); // Filter out rows without titles
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    }

    updateStats() {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Count incidents by time period
        this.stats.weeklyCount = this.incidents.filter(incident => 
            incident['Date of Incident'] && incident['Date of Incident'] >= oneWeekAgo
        ).length;

        this.stats.monthlyCount = this.incidents.filter(incident => 
            incident['Date of Incident'] && incident['Date of Incident'] >= oneMonthAgo
        ).length;

        // Find most affected state
        const stateCounts = {};
        this.incidents.forEach(incident => {
            if (incident.State) {
                stateCounts[incident.State] = (stateCounts[incident.State] || 0) + 1;
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
            if (filters.state && incident.State !== filters.state) {
                return false;
            }
            if (filters.type && incident['Incident Type'] !== filters.type) {
                return false;
            }
            if (filters.date && incident['Date of Incident']) {
                const incidentDate = new Date(incident['Date of Incident']);
                const filterDate = new Date(filters.date);
                if (incidentDate.toDateString() !== filterDate.toDateString()) {
                    return false;
                }
            }
            return true;
        });
    }

    matchesSearch(incident, searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
            (incident.Title && incident.Title.toLowerCase().includes(searchLower)) ||
            (incident.Location && incident.Location.toLowerCase().includes(searchLower)) ||
            (incident.State && incident.State.toLowerCase().includes(searchLower)) ||
            (incident.District && incident.District.toLowerCase().includes(searchLower)) ||
            (incident['Victim Community'] && incident['Victim Community'].toLowerCase().includes(searchLower)) ||
            (incident['Incident Type'] && incident['Incident Type'].toLowerCase().includes(searchLower))
        );
    }

    getUniqueStates() {
        return [...new Set(this.incidents
            .filter(incident => incident.State)
            .map(incident => incident.State)
        )].sort();
    }

    getUniqueTypes() {
        return [...new Set(this.incidents
            .filter(incident => incident['Incident Type'])
            .map(incident => incident['Incident Type'])
        )].sort();
    }
}

// Export a singleton instance
const dataManager = new DataManager();
export default dataManager; 