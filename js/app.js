// Main application module
import dataManager from './data.js';
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
        // Mobile menu toggle
        const mobileMenuButton = document.getElementById('mobileMenuButton');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

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
    }

    async loadData() {
        try {
            const success = await dataManager.fetchData();
            if (!success) {
                if (dataManager.error) {
                    this.showError(dataManager.error);
                } else {
                    this.showError('Failed to load data. Please try again later.');
                }
                return;
            }
            
            // Update all UI components
            await Promise.all([
                this.updateUI(),
                mapManager.initialize(dataManager.getIncidents()),
                chartsManager.initialize(dataManager.getIncidents()),
                tableManager.initialize(dataManager.getIncidents())
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('An error occurred while loading data.');
        }
    }

    updateUI() {
        // Update stats
        const stats = dataManager.getStats();
        document.getElementById('weeklyCount').textContent = stats.weeklyCount;
        document.getElementById('monthlyCount').textContent = stats.monthlyCount;
        document.getElementById('mostAffectedState').textContent = stats.mostAffectedState;

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
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="window.showIncidentDetails('${incident['Incident ID']}')">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${incident['Date of Incident'] ? new Date(incident['Date of Incident']).toLocaleDateString() : 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">${this.escapeHtml(incident.Title)}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${this.escapeHtml(incident.Location || 'N/A')}, ${this.escapeHtml(incident.State || 'N/A')}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">${this.escapeHtml(incident['Incident Type'] || 'N/A')}</td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${incident['Source URL'] ? 
                        `<a href="${this.escapeHtml(incident['Source URL'])}" target="_blank" class="text-indigo-600 hover:text-indigo-900">Source</a>` : 
                        'N/A'}
                </td>
            </tr>
        `).join('');
    }

    showError(message) {
        // Remove any existing error notifications
        const existingNotifications = document.querySelectorAll('.error-notification');
        existingNotifications.forEach(n => n.remove());

        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50';
        notification.innerHTML = `
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline"> ${message}</span>
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
    
    // Make app instance globally available for debugging
    window.app = app;
    
    // Make incident details function globally available
    window.showIncidentDetails = (incidentId) => {
        const incident = dataManager.getIncidents().find(i => i['Incident ID'] === incidentId);
        if (!incident) return;
        
        const modal = document.getElementById('incidentModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        if (modal && modalTitle && modalContent) {
            modalTitle.textContent = incident.Title;
            modalContent.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Date:</strong> ${incident['Date of Incident'] ? new Date(incident['Date of Incident']).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Location:</strong> ${app.escapeHtml(incident.Location || 'N/A')}, ${app.escapeHtml(incident.State || 'N/A')}</p>
                    <p><strong>Type:</strong> ${app.escapeHtml(incident['Incident Type'] || 'N/A')}</p>
                    <p><strong>Community:</strong> ${app.escapeHtml(incident['Victim Community'] || 'N/A')}</p>
                    <p><strong>Description:</strong> ${app.escapeHtml(incident.Description || 'N/A')}</p>
                    ${incident['Source URL'] ? `<p><strong>Source:</strong> <a href="${app.escapeHtml(incident['Source URL'])}" target="_blank" class="text-primary-600 hover:text-primary-700">View Source</a></p>` : ''}
                </div>
            `;
            modal.classList.remove('hidden');
        }
    };
});

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            }
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (mobileMenu && !mobileMenu.classList.contains('hidden') && 
            !mobileMenu.contains(e.target) && 
            !mobileMenuButton.contains(e.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth >= 768 && mobileMenu) { // 768px is md breakpoint
                mobileMenu.classList.add('hidden');
            }
        }, 250);
    });
});

// Data fetching and initialization
async function initializeDashboard() {
    try {
        // Show loading states
        document.querySelectorAll('[id$="Count"]').forEach(el => {
            el.textContent = 'Loading...';
        });
        document.getElementById('mostAffectedState').textContent = 'Loading...';
        document.getElementById('lastUpdated').textContent = 'Loading...';

        // Fetch data from Google Sheet
        // TODO: Replace with your Google Sheet URL
        // const response = await fetch('YOUR_GOOGLE_SHEET_URL');
        const data = await response.json();

        // Update dashboard with data
        updateDashboard(data);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Show error states
        document.querySelectorAll('[id$="Count"]').forEach(el => {
            el.textContent = 'Error loading data';
        });
        document.getElementById('mostAffectedState').textContent = 'Error loading data';
        document.getElementById('lastUpdated').textContent = 'Error loading data';
    }
}

// Initialize the dashboard when the page loads
window.addEventListener('load', initializeDashboard); 