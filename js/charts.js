// Charts module
import dataManager from './data.js';

class ChartsManager {
    constructor() {
        this.stateChart = null;
        this.incidentTypeChart = null;
    }

    initialize() {
        this.initializeStateChart();
        this.initializeIncidentTypeChart();
    }

    initializeStateChart() {
        const ctx = document.getElementById('stateChart').getContext('2d');
        const stateData = dataManager.getStateDistribution();
        
        this.stateChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(stateData),
                datasets: [{
                    label: 'Number of Incidents',
                    data: Object.values(stateData),
                    backgroundColor: 'rgba(79, 70, 229, 0.5)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Incidents by State'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Incidents'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'State'
                        }
                    }
                }
            }
        });
    }

    initializeIncidentTypeChart() {
        const ctx = document.getElementById('incidentTypeChart').getContext('2d');
        const typeData = dataManager.getIncidentTypeDistribution();
        
        this.incidentTypeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(typeData),
                datasets: [{
                    data: Object.values(typeData),
                    backgroundColor: [
                        'rgba(79, 70, 229, 0.5)',
                        'rgba(59, 130, 246, 0.5)',
                        'rgba(16, 185, 129, 0.5)',
                        'rgba(245, 158, 11, 0.5)',
                        'rgba(239, 68, 68, 0.5)'
                    ],
                    borderColor: [
                        'rgba(79, 70, 229, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(239, 68, 68, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'Incidents by Type'
                    }
                }
            }
        });
    }

    updateCharts() {
        const stateData = dataManager.getStateDistribution();
        const typeData = dataManager.getIncidentTypeDistribution();

        // Update state chart
        this.stateChart.data.labels = Object.keys(stateData);
        this.stateChart.data.datasets[0].data = Object.values(stateData);
        this.stateChart.update();

        // Update incident type chart
        this.incidentTypeChart.data.labels = Object.keys(typeData);
        this.incidentTypeChart.data.datasets[0].data = Object.values(typeData);
        this.incidentTypeChart.update();
    }
}

// Create and export a singleton instance
const chartsManager = new ChartsManager();
export default chartsManager; 