// Main application
import dataManager from './data.js?v=3';
import mapManager from './map.js?v=3';
import chartManager from './charts.js?v=3';
import tableManager from './table.js?v=3';

class App {
    constructor() {
        this.initialized = false;
        this.error = null;
    }

    async initialize() {
        try {
            console.log('[app] Starting application initialization...');
            
            // Show loading state
            document.getElementById('loadingSpinner')?.classList.remove('hidden');
            document.getElementById('errorBanner')?.classList.add('hidden');
            
            // Load data first
            console.log('[app] Loading data...');
            const incidents = await dataManager.loadData();
            console.log('[app] Data loaded successfully, incidents:', incidents.length);
            
            // Initialize all components with data
            console.log('[app] Initializing map...');
            await mapManager.initialize(incidents);
            
            console.log('[app] Initializing charts...');
            await chartManager.initialize(incidents);
            
            console.log('[app] Initializing table...');
            await tableManager.initialize(incidents);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Hide loading, show dashboard
            document.getElementById('loadingSpinner')?.classList.add('hidden');
            document.getElementById('dashboard')?.classList.remove('hidden');
            
            this.initialized = true;
            console.log('✅ Dashboard initialized successfully!');
            
        } catch (error) {
            console.error('[app] Initialization error:', error);
            this.error = error.message;
            
            // Show error banner
            const errorBanner = document.getElementById('errorBanner');
            if (errorBanner) {
                errorBanner.textContent = `Error: ${error.message}`;
                errorBanner.classList.remove('hidden');
            }
            
            // Hide loading spinner
            document.getElementById('loadingSpinner')?.classList.add('hidden');
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // State filter
        const stateFilter = document.getElementById('state-filter');
        if (stateFilter) {
            stateFilter.addEventListener('change', (e) => {
                this.handleStateFilter(e.target.value);
            });
        }

        // Victim group filter
        const victimGroupFilter = document.getElementById('victim-group-filter');
        if (victimGroupFilter) {
            victimGroupFilter.addEventListener('change', (e) => {
                this.handleVictimGroupFilter(e.target.value);
            });
        }

        // Incident type filter
        const incidentTypeFilter = document.getElementById('incident-type-filter');
        if (incidentTypeFilter) {
            incidentTypeFilter.addEventListener('change', (e) => {
                this.handleIncidentTypeFilter(e.target.value);
            });
        }
    }

    handleSearch(query) {
        console.log('[app] Search query:', query);
        const filteredIncidents = dataManager.searchIncidents(query);
        this.updateComponents(filteredIncidents);
    }

    handleStateFilter(state) {
        console.log('[app] State filter:', state);
        const filteredIncidents = dataManager.filterByState(state);
        this.updateComponents(filteredIncidents);
    }

    handleVictimGroupFilter(group) {
        console.log('[app] Victim group filter:', group);
        const filteredIncidents = dataManager.filterByVictimGroup(group);
        this.updateComponents(filteredIncidents);
    }

    handleIncidentTypeFilter(type) {
        console.log('[app] Incident type filter:', type);
        const filteredIncidents = dataManager.filterByIncidentType(type);
        this.updateComponents(filteredIncidents);
    }

    updateComponents(incidents) {
        // Update map
        mapManager.updateMap(incidents);
        
        // Update charts
        chartManager.updateCharts(incidents);
        
        // Update table
        tableManager.updateTable(incidents);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[app] DOM loaded, starting app...');
    const app = new App();
    app.initialize();
}); 