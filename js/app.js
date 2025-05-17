// Main application module
import dataManager from './data.js';
import mapManager from './map.js';
import chartsManager from './charts.js';
import tableManager from './table.js';

class App {
    constructor() {
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Show loading state
            this.updateLoadingState(true);

            // Fetch data
            const success = await dataManager.fetchData();
            if (!success) {
                throw new Error('Failed to fetch data');
            }

            // Initialize components
            mapManager.initialize();
            chartsManager.initialize();
            
            // Update UI with data
            this.updateUI();
            
            // Update last updated timestamp
            this.updateLastUpdated();
            
            // Hide loading state
            this.updateLoadingState(false);
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to load dashboard data. Please try again later.');
        }
    }

    updateUI() {
        // Update stats
        const stats = dataManager.getStats();
        document.getElementById('weeklyCount').textContent = stats.weeklyCount;
        document.getElementById('monthlyCount').textContent = stats.monthlyCount;
        document.getElementById('mostAffectedState').textContent = stats.mostAffectedState;

        // Update map
        mapManager.updateMap();

        // Update charts
        chartsManager.updateCharts();

        // Update table
        tableManager.updateTable();
    }

    updateLastUpdated() {
        const lastUpdated = document.getElementById('lastUpdated');
        if (dataManager.lastUpdated) {
            const date = new Date(dataManager.lastUpdated);
            lastUpdated.textContent = date.toLocaleString();
        }
    }

    updateLoadingState(isLoading) {
        // You can implement a loading spinner or other loading indicators here
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(element => {
            element.style.display = isLoading ? 'block' : 'none';
        });
    }

    showError(message) {
        // You can implement a more sophisticated error display
        alert(message);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
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

    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();

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
        const response = await fetch('YOUR_GOOGLE_SHEET_URL');
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