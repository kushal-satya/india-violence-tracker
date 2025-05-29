// Data manager for India Violence Tracker
// Connects to Google Sheets PublicData sheet
const SHEET_URL = "https://docs.google.com/spreadsheets/d/169QLiZ1dp5z92sIrn6mLp26ZsaarUc5P3-5nSwSgdkc/export?format=csv&gid=1466869679";

class DataManager {
    constructor() {
        this.incidents = [];
        this.lastUpdated = null;
        this.loading = false;
        this.error = null;
    }

    async fetchData() {
        if (this.loading) return false;
        
        this.loading = true;
        this.error = null;
        
        try {
            console.log('Fetching data from Google Sheets...');
            const response = await fetch(SHEET_URL);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log('Raw CSV data:', csvText.substring(0, 500));
            
            this.incidents = this.parseCSV(csvText);
            this.lastUpdated = new Date();
            
            console.log(`Parsed ${this.incidents.length} incidents`);
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
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('No data rows found');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('Headers:', headers);
        
        // Field mapping from CSV headers to JS properties
        const camelMap = {
            'headline': 'title',
            'location': 'location_summary'
            // All other fields keep their original names
        };
        
        const incidents = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            const incident = {};
            
            headers.forEach((header, index) => {
                let value = values[index] || '';
                value = value.replace(/^"|"$/g, '').trim();
                
                // Use camelMap for field renaming, fallback to original header
                const fieldName = camelMap[header] || header;
                incident[fieldName] = value;
            });
            
            // Only include incidents with valid data
            if (incident.victim_group && incident.victim_group !== '') {
                incidents.push(incident);
            }
        }
        
        console.log('Sample incident:', incidents[0]);
        return incidents;
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
        
        values.push(current); // Don't forget the last value
        return values;
    }

    getStats() {
        const stats = {
            total: this.incidents.length,
            states: new Set(),
            districts: new Set(),
            victimGroups: {},
            stateBreakdown: {}
        };
        
        this.incidents.forEach(incident => {
            // Count states
            if (incident.state && incident.state.trim()) {
                stats.states.add(incident.state.trim());
                
                // State breakdown
                if (!stats.stateBreakdown[incident.state]) {
                    stats.stateBreakdown[incident.state] = 0;
                }
                stats.stateBreakdown[incident.state]++;
            }
            
            // Count districts
            if (incident.district && incident.district.trim()) {
                stats.districts.add(incident.district.trim());
            }
            
            // Count victim groups
            if (incident.victim_group && incident.victim_group.trim()) {
                const group = incident.victim_group.trim();
                stats.victimGroups[group] = (stats.victimGroups[group] || 0) + 1;
            }
        });
        
        return {
            total: stats.total,
            statesCount: stats.states.size,
            districtsCount: stats.districts.size,
            victimGroups: stats.victimGroups,
            stateBreakdown: stats.stateBreakdown
        };
    }

    getIncidentsWithLocation() {
        return this.incidents.filter(incident => 
            incident.lat && incident.lon && 
            !isNaN(parseFloat(incident.lat)) && 
            !isNaN(parseFloat(incident.lon)) &&
            parseFloat(incident.lat) !== 0 &&
            parseFloat(incident.lon) !== 0
        );
    }

    getRecentIncidents(limit = 20) {
        return this.incidents
            .filter(incident => incident.victim_group && incident.victim_group.trim())
            .slice(0, limit);
    }
}

// Global data manager instance
window.dataManager = new DataManager();