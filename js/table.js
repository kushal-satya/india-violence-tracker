// Table manager module
import dataManager from './data.js';

class TableManager {
    constructor() {
        this.table = null;
        this.tableBody = null;
        this.searchInput = null;
        this.stateFilter = null;
        this.typeFilter = null;
        this.dateFilter = null;
        this.initialized = false;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
    }

    async initialize(incidents) {
        if (this.initialized) {
            this.updateTable(incidents);
            return;
        }

        try {
            // Get DOM elements
            this.table = document.getElementById('incidentsTable');
            this.tableBody = document.getElementById('incidentsTableBody');
            this.searchInput = document.getElementById('searchInput');
            this.stateFilter = document.getElementById('stateFilter');
            this.typeFilter = document.getElementById('typeFilter');
            this.dateFilter = document.getElementById('dateFilter');

            if (!this.table || !this.tableBody || !this.searchInput || !this.stateFilter || !this.typeFilter || !this.dateFilter) {
                throw new Error('Required table elements not found');
            }

            // Initialize filters
            await this.initializeFilters(incidents);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initial table render
            this.updateTable(incidents);
            
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing table:', error);
            throw new Error('Failed to initialize table');
        }
    }

    async initializeFilters(incidents) {
        try {
            // Get unique values
            const states = [...new Set(incidents.map(i => i.State).filter(Boolean))].sort();
            const types = [...new Set(incidents.map(i => i['Incident Type']).filter(Boolean))].sort();
            
            // Populate state filter
            this.stateFilter.innerHTML = '<option value="">All States</option>' +
                states.map(state => `<option value="${this.escapeHtml(state)}">${this.escapeHtml(state)}</option>`).join('');
            
            // Populate type filter
            this.typeFilter.innerHTML = '<option value="">All Types</option>' +
                types.map(type => `<option value="${this.escapeHtml(type)}">${this.escapeHtml(type)}</option>`).join('');
            
            // Set max date to today
            const today = new Date().toISOString().split('T')[0];
            this.dateFilter.max = today;
        } catch (error) {
            console.error('Error initializing filters:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Search input with debounce
        let searchTimeout;
        this.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.updateTable(), 300);
        });
        
        // Filter selects
        this.stateFilter.addEventListener('change', () => {
            this.currentPage = 1;
            this.updateTable();
        });
        this.typeFilter.addEventListener('change', () => {
            this.currentPage = 1;
            this.updateTable();
        });
        this.dateFilter.addEventListener('change', () => {
            this.currentPage = 1;
            this.updateTable();
        });

        // Add pagination controls
        const paginationControls = document.getElementById('paginationControls');
        paginationControls.innerHTML = '';
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'mt-4 flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6';
        paginationContainer.innerHTML = `
            <div class="flex-1 flex justify-between sm:hidden">
                <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" id="prevPageMobile">
                    Previous
                </button>
                <button class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" id="nextPageMobile">
                    Next
                </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700">
                        Showing <span class="font-medium" id="startItem">1</span> to <span class="font-medium" id="endItem">10</span> of <span class="font-medium" id="totalItems">0</span> results
                    </p>
                </div>
                <div>
                    <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50" id="prevPage">
                            <span class="sr-only">Previous</span>
                            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <div id="pageNumbers" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            Page 1 of 1
                        </div>
                        <button class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50" id="nextPage">
                            <span class="sr-only">Next</span>
                            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </nav>
                </div>
            </div>
        `;
        paginationControls.appendChild(paginationContainer);

        // Add pagination event listeners
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateTable();
            }
        });
        document.getElementById('nextPage').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.updateTable();
            }
        });
        document.getElementById('prevPageMobile').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateTable();
            }
        });
        document.getElementById('nextPageMobile').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.updateTable();
            }
        });
    }

    updateTable(incidents = dataManager.getIncidents()) {
        if (!this.initialized) return;

        try {
            const filters = {
                search: this.searchInput.value.toLowerCase(),
                state: this.stateFilter.value,
                type: this.typeFilter.value,
                date: this.dateFilter.value
            };

            // Apply filters
            let filteredIncidents = incidents.filter(incident => {
                if (filters.search) {
                    const searchFields = [
                        incident.Title,
                        incident.Location,
                        incident.State,
                        incident.District,
                        incident['Victim Community'],
                        incident['Incident Type']
                    ].filter(Boolean).map(f => f.toLowerCase());
                    
                    if (!searchFields.some(field => field.includes(filters.search))) {
                        return false;
                    }
                }
                
                if (filters.state && incident.State !== filters.state) {
                    return false;
                }
                
                if (filters.type && incident['Incident Type'] !== filters.type) {
                    return false;
                }
                
                if (filters.date && incident['Date of Incident']) {
                    const incidentDate = new Date(incident['Date of Incident']).toISOString().split('T')[0];
                    if (incidentDate !== filters.date) {
                        return false;
                    }
                }
                
                return true;
            });

            // Calculate pagination
            this.totalPages = Math.ceil(filteredIncidents.length / this.itemsPerPage);
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = Math.min(startIndex + this.itemsPerPage, filteredIncidents.length);
            const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex);

            // Update pagination info
            document.getElementById('startItem').textContent = filteredIncidents.length ? startIndex + 1 : 0;
            document.getElementById('endItem').textContent = endIndex;
            document.getElementById('totalItems').textContent = filteredIncidents.length;
            document.getElementById('pageNumbers').textContent = `Page ${this.currentPage} of ${this.totalPages}`;

            // Update pagination button states
            const prevButtons = [document.getElementById('prevPage'), document.getElementById('prevPageMobile')];
            const nextButtons = [document.getElementById('nextPage'), document.getElementById('nextPageMobile')];

            prevButtons.forEach(btn => {
                btn.disabled = this.currentPage === 1;
                btn.classList.toggle('opacity-50', this.currentPage === 1);
                btn.classList.toggle('cursor-not-allowed', this.currentPage === 1);
            });

            nextButtons.forEach(btn => {
                btn.disabled = this.currentPage === this.totalPages;
                btn.classList.toggle('opacity-50', this.currentPage === this.totalPages);
                btn.classList.toggle('cursor-not-allowed', this.currentPage === this.totalPages);
            });

            // Render table
            this.renderTable(paginatedIncidents);
        } catch (error) {
            console.error('Error updating table:', error);
            this.showError('Failed to update table');
        }
    }

    renderTable(incidents) {
        if (!this.tableBody) return;

        this.tableBody.innerHTML = '';

        if (incidents.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No incidents found matching the current filters</p>
                    </div>
                </td>
            `;
            this.tableBody.appendChild(row);
            return;
        }

        incidents.forEach(incident => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 cursor-pointer transition-colors duration-150';
            row.addEventListener('click', (e) => {
                // Prevent modal if clicking a link
                if (e.target.tagName === 'A') return;
                this.showIncidentDetails(incident);
            });

            const date = incident['Date of Incident'] 
                ? new Date(incident['Date of Incident']).toLocaleDateString()
                : 'N/A';

            const location = incident.hasLocation
                ? `${incident.Location}${incident.District ? `, ${incident.District}` : ''}, ${incident.State}`
                : 'Location not specified';

            row.innerHTML = `
                <td class="px-2 sm:px-4 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">${date}</td>
                <td class="px-2 sm:px-4 py-4 text-sm text-gray-900 max-w-xs truncate">${this.escapeHtml(incident.Title)}</td>
                <td class="px-2 sm:px-4 py-4 text-sm text-gray-500 max-w-xs truncate">${this.escapeHtml(location)}</td>
                <td class="px-2 sm:px-4 py-4 text-sm max-w-xs truncate">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                        ${this.escapeHtml(incident['Incident Type'] || 'Not specified')}
                    </span>
                </td>
                <td class="px-2 sm:px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                    ${incident['Source URL'] ? `
                        <a href="${this.escapeHtml(incident['Source URL'])}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="text-primary-600 hover:text-primary-700 hover:underline" 
                           onclick="event.stopPropagation()">
                            ${this.escapeHtml(incident['Source Name'] || 'View Source')}
                        </a>
                    ` : 'No source available'}
                </td>
            `;

            this.tableBody.appendChild(row);
        });
    }

    showIncidentDetails(incident) {
        const modal = document.getElementById('incidentModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');

        if (!modal || !modalTitle || !modalContent) return;

        modalTitle.textContent = this.escapeHtml(incident.Title || 'No Title');

        const details = [];
        if (incident['Date of Incident']) {
            details.push(`
                <div class="flex items-start space-x-2">
                    <svg class="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                        <p class="font-medium text-gray-900">Date</p>
                        <p class="text-gray-500">${new Date(incident['Date of Incident']).toLocaleString()}</p>
                    </div>
                </div>
            `);
        }

        if (incident.hasLocation) {
            details.push(`
                <div class="flex items-start space-x-2">
                    <svg class="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                        <p class="font-medium text-gray-900">Location</p>
                        <p class="text-gray-500">
                            ${this.escapeHtml(incident.Location)}
                            ${incident.District ? `, ${this.escapeHtml(incident.District)}` : ''}
                            , ${this.escapeHtml(incident.State)}
                        </p>
                    </div>
                </div>
            `);
        }

        if (incident['Victim Community']) {
            details.push(`
                <div class="flex items-start space-x-2">
                    <svg class="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                        <p class="font-medium text-gray-900">Affected Community</p>
                        <p class="text-gray-500">${this.escapeHtml(incident['Victim Community'])}</p>
                    </div>
                </div>
            `);
        }

        if (incident['Incident Type']) {
            details.push(`
                <div class="flex items-start space-x-2">
                    <svg class="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                        <p class="font-medium text-gray-900">Incident Type</p>
                        <p class="text-gray-500">${this.escapeHtml(incident['Incident Type'])}</p>
                    </div>
                </div>
            `);
        }

        if (incident['Source URL']) {
            details.push(`
                <div class="flex items-start space-x-2">
                    <svg class="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <div>
                        <p class="font-medium text-gray-900">Source</p>
                        <a href="${this.escapeHtml(incident['Source URL'])}" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="text-primary-600 hover:text-primary-700 hover:underline">
                            ${this.escapeHtml(incident['Source Name'] || 'View Source')}
                        </a>
                    </div>
                </div>
            `);
        }

        if (incident['Last Updated']) {
            details.push(`
                <div class="flex items-start space-x-2">
                    <svg class="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p class="font-medium text-gray-900">Last Updated</p>
                        <p class="text-gray-500">${new Date(incident['Last Updated']).toLocaleString()}</p>
                    </div>
                </div>
            `);
        }

        modalContent.innerHTML = `
            <div class="space-y-4">
                ${details.join('')}
            </div>
        `;

        modal.classList.remove('hidden');

        // Close modal when clicking outside
        const closeModal = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                modal.removeEventListener('click', closeModal);
            }
        };
        modal.addEventListener('click', closeModal);

        // Close modal when clicking close button
        const closeButton = document.getElementById('closeModal');
        if (closeButton) {
            const closeButtonHandler = () => {
                modal.classList.add('hidden');
                closeButton.removeEventListener('click', closeButtonHandler);
            };
            closeButton.addEventListener('click', closeButtonHandler);
        }
    }

    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50';
        notification.innerHTML = `
            <div class="flex items-center">
                <svg class="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => notification.remove(), 5000);
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
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