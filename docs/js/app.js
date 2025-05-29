// Main application module
import dataManager from './data.js?v=2';
import mapManager from './map.js';
import chartsManager from './charts.js';
import tableManager from './table.js';

class App {
    constructor() {
        this.initializeLoadingStates();
        this.initializeEventListeners();
        this.loadData();
    }

    initializeLoadingStates() {
        // Show loading spinner
        document.getElementById('loader')?.classList.remove('hidden');
        document.getElementById('errorBanner')?.classList.add('hidden');

        // Add loading spinners to stats cards
        const statsCards = document.querySelectorAll('#stats > div');
        statsCards.forEach(card => {
            const valueElement = card.querySelector('p');
            if (valueElement) {
                valueElement.innerHTML = '<div class="animate-pulse h-8 bg-gray-200 rounded w-24"></div>';
            }
        });

        // Add loading state to table
        const tableBody = document.getElementById('incidentsTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center">
                        <div class="animate-pulse space-y-3">
                            <div class="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                            <div class="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                            <div class="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
                        </div>
                    </td>
                </tr>
            `;
        }

        // Add loading state to charts
        const chartContainers = document.querySelectorAll('canvas');
        chartContainers.forEach(container => {
            container.parentElement.classList.add('animate-pulse', 'bg-gray-200', 'rounded');
        });
    }

    initializeEventListeners() {
        // Modal close button
        const closeModal = document.getElementById('closeModal');
        const modal = document.getElementById('incidentModal');
        if (closeModal && modal) {
            closeModal.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        // Set current year in footer
        const currentYearElement = document.getElementById('currentYear');
        if (currentYearElement) {
            currentYearElement.textContent = new Date().getFullYear();
        }

        // Add error banner close button handler
        const errorBanner = document.getElementById('errorBanner');
        if (errorBanner) {
            const closeButton = errorBanner.querySelector('button');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    errorBanner.classList.add('hidden');
                });
            }
        }
    }

    async loadData() {
        try {
            console.log('🚀 Starting data load...');
            const success = await dataManager.fetchData();
            console.log('📊 Data fetch result:', success);
            
            if (!success) {
                console.error('❌ Data fetch failed');
                if (dataManager.error) {
                    this.showError(dataManager.error);
                } else {
                    this.showError('Failed to load data. Please try again later.');
                }
                // Show error screen, hide loading screen
                document.getElementById('loading-screen')?.classList.add('hidden');
                document.getElementById('error-screen')?.classList.remove('hidden');
                document.getElementById('loader')?.classList.add('hidden');
                return;
            }
            
            console.log('📈 Initializing UI components...');
            const incidents = dataManager.getIncidents();
            console.log('📋 Incidents loaded:', incidents.length);
            
            // Update all UI components
            await Promise.all([
                this.updateUI(),
                mapManager.initialize(incidents),
                tableManager.initialize(incidents),
                chartsManager.initialize(incidents)
            ]);

            // Hide loading spinner and error screen, show dashboard
            document.getElementById('loader')?.classList.add('hidden');
            document.getElementById('loading-screen')?.classList.add('hidden');
            document.getElementById('error-screen')?.classList.add('hidden');
            document.getElementById('dashboard')?.classList.remove('hidden');
            
            console.log('✅ Dashboard initialized successfully!');
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('An error occurred while loading data.');
            document.getElementById('loader')?.classList.add('hidden');
            document.getElementById('loading-screen')?.classList.add('hidden');
            document.getElementById('error-screen')?.classList.remove('hidden');
        }
    }

    updateUI() {
        // Update stats
        const stats = dataManager.getStats();
        const weeklyCountEl = document.getElementById('weeklyCount');
        const monthlyCountEl = document.getElementById('monthlyCount');
        const totalCountEl = document.getElementById('totalCount');
        if (weeklyCountEl) weeklyCountEl.textContent = stats.weeklyCount;
        if (monthlyCountEl) monthlyCountEl.textContent = stats.monthlyCount;
        if (totalCountEl) totalCountEl.textContent = stats.total;

        // Update last updated time
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement && dataManager.lastUpdated) {
            const date = new Date(dataManager.lastUpdated);
            lastUpdatedElement.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }

        // Update filters
        this.updateFilters();
        
        // Update table
        this.updateTable();
        
        // Update charts
        if (window.updateCharts) {
            window.updateCharts(dataManager.getIncidents());
        }
        
        // Update map
        if (window.updateMap) {
            window.updateMap(dataManager.getIncidents());
        }
    }

    updateFilters() {
        const stateFilter = document.getElementById('stateFilter');
        const typeFilter = document.getElementById('typeFilter');
        
        if (stateFilter) {
            const states = dataManager.getUniqueStates();
            stateFilter.innerHTML = '<option value="">All States</option>' +
                states.map(state => `<option value="${state}">${state}</option>`).join('');
        }
        
        if (typeFilter) {
            const types = dataManager.getUniqueTypes();
            typeFilter.innerHTML = '<option value="">All Types</option>' +
                types.map(type => `<option value="${type}">${type}</option>`).join('');
        }
    }

    updateTable() {
        const tableBody = document.getElementById('incidentsTableBody');
        if (!tableBody) return;

        const incidents = dataManager.getIncidents();
        if (incidents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        No incidents found
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = incidents.map(incident => `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="window.showIncidentDetails('${incident.incident_id}')">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${this.escapeHtml(incident.title || 'Untitled Incident')}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${this.escapeHtml(incident.location_summary || 'N/A')}, ${this.escapeHtml(incident.state || 'N/A')}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${this.escapeHtml(incident.incident_type || 'N/A')}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${incident.source_url ? 
                        `<a href="${this.escapeHtml(incident.source_url)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-700">${this.escapeHtml(incident.source_name || 'View Source')}</a>` : 
                        'N/A'}
                </td>
            </tr>
        `).join('');
    }

    showError(message) {
        // Show error banner
        const errorBanner = document.getElementById('errorBanner');
        if (errorBanner) {
            const messageEl = errorBanner.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }
            errorBanner.classList.remove('hidden');
        }

        // Also show toast notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50';
        notification.innerHTML = `
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline"> ${this.escapeHtml(message)}</span>
            <button class="absolute top-0 bottom-0 right-0 px-4 py-3 hover:bg-red-200 rounded-r" onclick="this.parentElement.remove()">
                <span class="sr-only">Dismiss</span>
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => notification.remove(), 5000);
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

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app;
    window.showIncidentDetails = (incidentId) => {
        const incident = dataManager.getIncidents().find(i => i.incident_id === incidentId);
        if (!incident) return;
        
        const modal = document.getElementById('incidentModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        if (modal && modalTitle && modalContent) {
            modalTitle.textContent = incident.title || 'Untitled Incident';
            modalContent.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Date:</strong> ${incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Location:</strong> ${app.escapeHtml(incident.location_summary || 'N/A')}, ${app.escapeHtml(incident.state || 'N/A')}</p>
                    <p><strong>Type:</strong> ${app.escapeHtml(incident.incident_type || 'N/A')}</p>
                    <p><strong>Victim Group:</strong> ${app.escapeHtml(incident.victim_group || 'N/A')}</p>
                    <p><strong>Description:</strong> ${app.escapeHtml(incident.summary || 'N/A')}</p>
                    ${incident.source_url ? `
                        <p><strong>Source:</strong> 
                            <a href="${app.escapeHtml(incident.source_url)}" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               class="text-indigo-600 hover:text-indigo-700">
                                ${app.escapeHtml(incident.source_name || 'View Source')}
                            </a>
                        </p>
                    ` : ''}
                </div>
            `;
            modal.classList.remove('hidden');
        }
    };
    // No legacy tab or mobile menu logic here!
}); 