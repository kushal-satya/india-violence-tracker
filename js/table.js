// Table manager module
import dataManager from './data.js?v=3';

class TableManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortColumn = 'incident_date';
        this.sortDirection = 'desc';
        this.incidents = [];
        this.filteredIncidents = [];
    }

    async initialize(incidents) {
        console.log('[table] Initializing table with', incidents.length, 'incidents');
        this.incidents = incidents;
        this.filteredIncidents = incidents;
        
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Pagination controls
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => this.previousPage());
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.nextPage());
        }

        // Page size selector
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.render();
            });
        }

        // Sort headers
        const sortableHeaders = document.querySelectorAll('[data-sort]');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.getAttribute('data-sort');
                this.sort(column);
            });
        });
    }

    render() {
        this.renderTable();
        this.renderPagination();
    }

    renderTable() {
        const tableBody = document.getElementById('incidents-table-body');
        if (!tableBody) {
            console.error('[table] Table body element not found');
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredIncidents.slice(startIndex, endIndex);

        // Clear existing rows
        tableBody.innerHTML = '';

        // Render rows
        pageData.forEach((incident, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const serialNumber = startIndex + index + 1;
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${serialNumber}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.formatDate(incident.incident_date)}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="max-w-xs">
                        <div class="font-medium truncate">${this.escapeHtml(incident.headline || 'N/A')}</div>
                        ${incident.summary ? `<div class="text-gray-500 text-xs mt-1 truncate">${this.escapeHtml(incident.summary.substring(0, 100))}...</div>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="max-w-xs">
                        <div>${this.escapeHtml(incident.location || 'N/A')}</div>
                        ${incident.state ? `<div class="text-gray-500 text-xs">${this.escapeHtml(incident.state)}</div>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <span class="inline-flex px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        ${this.escapeHtml(incident.incident_type || 'N/A')}
                    </span>
                    ${incident.victim_group ? `<div class="text-xs text-gray-500 mt-1">${this.escapeHtml(incident.victim_group)}</div>` : ''}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    ${incident.source_url ? `<a href="${this.escapeHtml(incident.source_url)}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs truncate max-w-xs block">${this.escapeHtml(incident.source_name || 'View Source')}</a>` : 'N/A'}
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredIncidents.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(startIndex + this.itemsPerPage - 1, this.filteredIncidents.length);

        // Update pagination info
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startIndex} to ${endIndex} of ${this.filteredIncidents.length} results`;
        }

        // Update page buttons
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        
        if (prevButton) {
            prevButton.disabled = this.currentPage === 1;
            prevButton.classList.toggle('opacity-50', this.currentPage === 1);
            prevButton.classList.toggle('cursor-not-allowed', this.currentPage === 1);
        }
        
        if (nextButton) {
            nextButton.disabled = this.currentPage === totalPages;
            nextButton.classList.toggle('opacity-50', this.currentPage === totalPages);
            nextButton.classList.toggle('cursor-not-allowed', this.currentPage === totalPages);
        }

        // Update current page indicator
        const currentPageSpan = document.getElementById('currentPage');
        const totalPagesSpan = document.getElementById('totalPages');
        if (currentPageSpan) currentPageSpan.textContent = this.currentPage;
        if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    }

    sort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredIncidents.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle date sorting
            if (column === 'incident_date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            // Handle string sorting
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) {
                return this.sortDirection === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return this.sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });

        this.currentPage = 1;
        this.render();
        this.updateSortHeaders();
    }

    updateSortHeaders() {
        const headers = document.querySelectorAll('[data-sort]');
        headers.forEach(header => {
            const sortIcon = header.querySelector('.sort-icon');
            if (sortIcon) {
                if (header.getAttribute('data-sort') === this.sortColumn) {
                    sortIcon.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
                    sortIcon.classList.remove('text-gray-400');
                    sortIcon.classList.add('text-gray-600', 'dark:text-gray-300');
                } else {
                    sortIcon.textContent = '↕';
                    sortIcon.classList.remove('text-gray-600', 'dark:text-gray-300');
                    sortIcon.classList.add('text-gray-400');
                }
            }
        });
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.render();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredIncidents.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.render();
        }
    }

    updateTable(incidents) {
        console.log('[table] Updating table with', incidents.length, 'incidents');
        this.filteredIncidents = incidents;
        this.currentPage = 1;
        this.render();
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    getVictimGroupColor(group) {
        const colors = {
            'Dalit': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            'Muslim': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            'Christian': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'Adivasi': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            'Sikh': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            'Hindu': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };

        for (const [key, color] of Object.entries(colors)) {
            if (group.toLowerCase().includes(key.toLowerCase())) {
                return color;
            }
        }

        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Create and export singleton instance
const tableManager = new TableManager();
export default tableManager; 