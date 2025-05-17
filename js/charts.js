// Charts module
import dataManager from './data.js';

class ChartsManager {
    constructor() {
        this.stateChart = null;
        this.incidentTypeChart = null;
        this.initialized = false;
    }

    async initialize(incidents) {
        if (this.initialized) {
            this.updateCharts(incidents);
            return;
        }

        try {
            await Promise.all([
                this.initializeStateChart(incidents),
                this.initializeIncidentTypeChart(incidents)
            ]);
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing charts:', error);
            throw new Error('Failed to initialize charts');
        }
    }

    async initializeStateChart(incidents) {
        const ctx = document.getElementById('stateChart');
        if (!ctx) return;

        const stateData = this.getStateDistribution(incidents);
        const sortedStates = Object.entries(stateData)
            .sort(([,a], [,b]) => b - a)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        this.stateChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(sortedStates),
                datasets: [{
                    label: 'Number of Incidents',
                    data: Object.values(sortedStates),
                    backgroundColor: 'rgba(100, 116, 139, 0.5)', // slate-500
                    borderColor: 'rgba(71, 85, 105, 1)', // slate-600
                    borderWidth: 1,
                    borderRadius: 4
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
                        text: 'Incidents by State',
                        font: {
                            size: 16,
                            weight: '500'
                        },
                        color: '#334155' // slate-700
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#334155', // slate-700
                        bodyColor: '#475569', // slate-600
                        borderColor: '#E2E8F0', // slate-200
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                return `Incidents: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#E2E8F0' // slate-200
                        },
                        ticks: {
                            color: '#64748B' // slate-500
                        },
                        title: {
                            display: true,
                            text: 'Number of Incidents',
                            color: '#475569' // slate-600
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748B', // slate-500
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    async initializeIncidentTypeChart(incidents) {
        const ctx = document.getElementById('incidentTypeChart');
        if (!ctx) return;

        const typeData = this.getIncidentTypeDistribution(incidents);
        const sortedTypes = Object.entries(typeData)
            .sort(([,a], [,b]) => b - a)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        // Generate a color palette based on the number of types
        const colors = this.generateColorPalette(Object.keys(sortedTypes).length);

        this.incidentTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(sortedTypes),
                datasets: [{
                    data: Object.values(sortedTypes),
                    backgroundColor: colors.map(c => `${c}80`), // 50% opacity
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            color: '#475569', // slate-600
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Incidents by Type',
                        font: {
                            size: 16,
                            weight: '500'
                        },
                        color: '#334155' // slate-700
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#334155', // slate-700
                        bodyColor: '#475569', // slate-600
                        borderColor: '#E2E8F0', // slate-200
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    generateColorPalette(count) {
        const baseColors = [
            '#64748B', // slate-500
            '#94A3B8', // slate-400
            '#CBD5E1', // slate-300
            '#475569', // slate-600
            '#334155', // slate-700
            '#1E293B', // slate-800
            '#0F172A', // slate-900
            '#F8FAFC', // slate-50
            '#F1F5F9', // slate-100
            '#E2E8F0'  // slate-200
        ];

        // If we have more types than base colors, generate interpolated colors
        if (count > baseColors.length) {
            const interpolated = [];
            for (let i = 0; i < count; i++) {
                const color1 = baseColors[i % baseColors.length];
                const color2 = baseColors[(i + 1) % baseColors.length];
                interpolated.push(this.interpolateColor(color1, color2, i / count));
            }
            return interpolated;
        }

        return baseColors.slice(0, count);
    }

    interpolateColor(color1, color2, factor) {
        const hex = x => {
            x = x.toString(16);
            return (x.length === 1) ? '0' + x : x;
        };

        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);

        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return `#${hex(r)}${hex(g)}${hex(b)}`;
    }

    getStateDistribution(incidents) {
        return incidents.reduce((acc, incident) => {
            if (incident.State) {
                acc[incident.State] = (acc[incident.State] || 0) + 1;
            }
            return acc;
        }, {});
    }

    getIncidentTypeDistribution(incidents) {
        return incidents.reduce((acc, incident) => {
            if (incident['Incident Type']) {
                acc[incident['Incident Type']] = (acc[incident['Incident Type']] || 0) + 1;
            }
            return acc;
        }, {});
    }

    updateCharts(incidents) {
        if (!this.initialized) return;

        try {
            const stateData = this.getStateDistribution(incidents);
            const typeData = this.getIncidentTypeDistribution(incidents);

            // Update state chart
            if (this.stateChart) {
                const sortedStates = Object.entries(stateData)
                    .sort(([,a], [,b]) => b - a)
                    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

                this.stateChart.data.labels = Object.keys(sortedStates);
                this.stateChart.data.datasets[0].data = Object.values(sortedStates);
                this.stateChart.update('none'); // Update without animation
            }

            // Update incident type chart
            if (this.incidentTypeChart) {
                const sortedTypes = Object.entries(typeData)
                    .sort(([,a], [,b]) => b - a)
                    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

                this.incidentTypeChart.data.labels = Object.keys(sortedTypes);
                this.incidentTypeChart.data.datasets[0].data = Object.values(sortedTypes);
                this.incidentTypeChart.update('none'); // Update without animation
            }
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }
}

// Create and export a singleton instance
const chartsManager = new ChartsManager();
export default chartsManager; 