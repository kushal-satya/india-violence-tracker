// Table manager module
import dataManager from './data.js';

class TableManager {
    constructor() {
        this.table = document.getElementById('incidentsTable');
        this.tableBody = document.getElementById('incidentsTableBody');
        this.searchInput = document.getElementById('searchInput');
        this.stateFilter = document.getElementById('stateFilter');
        this.typeFilter = document.getElementById('typeFilter');
        this.dateFilter = document.getElementById('dateFilter');
        
        this.initializeFilters();
        this.setupEventListeners();
    }

    initializeFilters() {
        // Populate state filter
        const states = dataManager.getUniqueStates();
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            this.stateFilter.appendChild(option);
        });

        // Populate type filter
        const types = dataManager.getUniqueTypes();
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.typeFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        // Search input
        this.searchInput.addEventListener('input', () => this.updateTable());
        
        // Filter selects
        this.stateFilter.addEventListener('change', () => this.updateTable());
        this.typeFilter.addEventListener('change', () => this.updateTable());
        this.dateFilter.addEventListener('change', () => this.updateTable());
    }

    updateTable() {
        const filters = {
            search: this.searchInput.value,
            state: this.stateFilter.value,
            type: this.typeFilter.value,
            date: this.dateFilter.value
        };

        const incidents = dataManager.getFilteredIncidents(filters);
        this.renderTable(incidents);
    }

    renderTable(incidents) {
        this.tableBody.innerHTML = '';

        if (incidents.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No incidents found matching the current filters
                </td>
            `;
            this.tableBody.appendChild(row);
            return;
        }

        incidents.forEach(incident => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 cursor-pointer';
            row.addEventListener('click', () => this.showIncidentDetails(incident));

            const date = incident['Date of Incident'] 
                ? new Date(incident['Date of Incident']).toLocaleDateString()
                : 'N/A';

            const location = incident.hasLocation
                ? `${incident.Location}${incident.District ? `, ${incident.District}` : ''}, ${incident.State}`
                : 'Location not specified';

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                <td class="px-6 py-4 text-sm text-gray-900">${this.escapeHtml(incident.Title)}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${this.escapeHtml(location)}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${incident['Incident Type'] || 'Not specified'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    <a href="${incident['Source URL']}" target="_blank" rel="noopener noreferrer" 
                       class="text-primary-600 hover:text-primary-700" 
                       onclick="event.stopPropagation()">
                        ${incident['Source Name']}
                    </a>
                </td>
            `;

            this.tableBody.appendChild(row);
        });
    }

    showIncidentDetails(incident) {
        const modal = document.getElementById('incidentModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');

        modalTitle.textContent = incident.Title;

        const details = [];
        if (incident['Date of Incident']) {
            details.push(`<strong>Date:</strong> ${new Date(incident['Date of Incident']).toLocaleString()}`);
        }
        if (incident.hasLocation) {
            details.push(`<strong>Location:</strong> ${incident.Location}`);
            if (incident.District) details.push(`<strong>District:</strong> ${incident.District}`);
            details.push(`<strong>State:</strong> ${incident.State}`);
        }
        if (incident['Victim Community']) {
            details.push(`<strong>Affected Community:</strong> ${incident['Victim Community']}`);
        }
        if (incident['Incident Type']) {
            details.push(`<strong>Incident Type:</strong> ${incident['Incident Type']}`);
        }
        details.push(`<strong>Source:</strong> <a href="${incident['Source URL']}" target="_blank" rel="noopener noreferrer">${incident['Source Name']}</a>`);
        details.push(`<strong>Last Updated:</strong> ${new Date(incident['Last Updated']).toLocaleString()}`);

        modalContent.innerHTML = details.join('<br>');
        modal.classList.remove('hidden');

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        // Close modal when clicking close button
        document.getElementById('closeModal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
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
const tableManager = new TableManager();
export default tableManager; 