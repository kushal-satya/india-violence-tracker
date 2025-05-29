// Charts module
import dataManager from './data.js?v=2';

class ChartsManager {
    constructor() {
        this.stateChart = null;
        this.incidentTypeChart = null;
        this.victimGroupChart = null;
        this.initialized = false;
        this.chartColors = {
            primary: {
                light: 'rgba(99, 102, 241, 0.2)',
                DEFAULT: 'rgba(99, 102, 241, 0.8)',
                dark: 'rgba(99, 102, 241, 1)'
            },
            secondary: {
                light: 'rgba(139, 92, 246, 0.2)',
                DEFAULT: 'rgba(139, 92, 246, 0.8)',
                dark: 'rgba(139, 92, 246, 1)'
            },
            accent: {
                light: 'rgba(16, 185, 129, 0.2)',
                DEFAULT: 'rgba(16, 185, 129, 0.8)',
                dark: 'rgba(16, 185, 129, 1)'
            }
        };
        // Add observer for dark mode changes
        const observer = new MutationObserver(() => {
            if (this.initialized) {
                this.updateCharts(dataManager.getIncidents());
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    async initialize(incidents) {
        if (this.initialized) {
            this.updateCharts(incidents);
            return;
        }

        try {
            await Promise.all([
                this.initializeStateChart(incidents),
                this.initializeIncidentTypeChart(incidents),
                this.initializeVictimGroupChart(incidents)
            ]);
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing charts:', error);
            document.getElementById('errorBanner')?.classList.remove('hidden');
            throw new Error('Failed to initialize charts');
        }
    }

    async initializeStateChart(incidents) {
        const ctx = document.getElementById('stateChart');
        if (!ctx) return;

        // Destroy previous chart if exists
        if (this.stateChart) {
            this.stateChart.destroy();
            this.stateChart = null;
        }

        let stateData = this.getStateDistribution(incidents);
        let sortedStatesArr = Object.entries(stateData).sort(([,a], [,b]) => b - a);
        
        if (sortedStatesArr.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full py-12 text-gray-500 dark:text-gray-400">
                    <svg class="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No data available for state-wise distribution</p>
                </div>
            `;
            return;
        }

        // Sort and limit to top 10
        let topStates = sortedStatesArr.slice(0, 10);
        let otherCount = sortedStatesArr.slice(10).reduce((sum, [,v]) => sum + v, 0);
        let labels = topStates.map(([k]) => this.truncateLabel(k));
        let values = topStates.map(([,v]) => v);
        
        if (otherCount > 0) {
            labels.push('Other');
            values.push(otherCount);
        }

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#E5E7EB' : '#374151';
        const gridColor = isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 1)';
        
        this.stateChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Incidents',
                    data: values,
                    backgroundColor: this.chartColors.primary.light,
                    borderColor: this.chartColors.primary.dark,
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: this.chartColors.primary.DEFAULT
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
                            weight: '600',
                            family: 'Inter'
                        },
                        color: textColor,
                        padding: { bottom: 16 }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#374151' : '#E5E7EB',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (ctx) => sortedStatesArr[ctx[0].dataIndex]?.[0] || ctx[0].label,
                            label: (ctx) => `${ctx.raw} incidents`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { 
                            color: gridColor,
                            drawBorder: false
                        },
                        ticks: { 
                            color: textColor,
                            font: { family: 'Inter' },
                            padding: 8
                        },
                        title: { 
                            display: true, 
                            text: 'Number of Incidents', 
                            color: textColor,
                            font: { family: 'Inter' }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { 
                            color: textColor,
                            font: { family: 'Inter' },
                            maxRotation: 45,
                            minRotation: 45,
                            padding: 8
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

        // Destroy previous chart if exists
        if (this.incidentTypeChart) {
            this.incidentTypeChart.destroy();
            this.incidentTypeChart = null;
        }

        let typeData = this.getIncidentTypeDistribution(incidents);
        let sortedTypesArr = Object.entries(typeData).sort(([,a], [,b]) => b - a);
        
        if (sortedTypesArr.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full py-12 text-gray-500 dark:text-gray-400">
                    <svg class="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No data available for incident types</p>
                </div>
            `;
            return;
        }

        // Sort and limit to top 10
        let topTypes = sortedTypesArr.slice(0, 10);
        let otherCount = sortedTypesArr.slice(10).reduce((sum, [,v]) => sum + v, 0);
        let labels = topTypes.map(([k]) => this.truncateLabel(k));
        let values = topTypes.map(([,v]) => v);
        
        if (otherCount > 0) {
            labels.push('Other');
            values.push(otherCount);
        }

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#E5E7EB' : '#374151';
        const colors = this.generateColorPalette(labels.length, isDark);
        
        this.incidentTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.map(c => `${c}40`),
                    borderColor: colors,
                    borderWidth: 2,
                    hoverBackgroundColor: colors.map(c => `${c}60`)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            color: textColor,
                            font: { 
                                family: 'Inter',
                                size: 12
                            },
                            boxWidth: 12,
                            boxHeight: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        },
                        title: {
                            display: true,
                            text: 'Legend',
                            color: textColor,
                            font: {
                                family: 'Inter',
                                size: 14,
                                weight: '600'
                            },
                            padding: { bottom: 8 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Incidents by Type',
                        font: { 
                            size: 16, 
                            weight: '600',
                            family: 'Inter'
                        },
                        color: textColor,
                        padding: { bottom: 16 }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#374151' : '#E5E7EB',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            },
                            title: (ctx) => sortedTypesArr[ctx[0].dataIndex]?.[0] || ctx[0].label
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

    generateColorPalette(count, isDark = false) {
        const baseColors = isDark ? [
            '#6366F1', // indigo-500
            '#8B5CF6', // violet-500
            '#EC4899', // pink-500
            '#F59E0B', // amber-500
            '#10B981', // emerald-500
            '#3B82F6', // blue-500
            '#F43F5E', // rose-500
            '#14B8A6', // teal-500
            '#F97316', // orange-500
            '#A855F7'  // purple-500
        ] : [
            '#4F46E5', // indigo-600
            '#7C3AED', // violet-600
            '#DB2777', // pink-600
            '#D97706', // amber-600
            '#059669', // emerald-600
            '#2563EB', // blue-600
            '#E11D48', // rose-600
            '#0D9488', // teal-600
            '#EA580C', // orange-600
            '#9333EA'  // purple-600
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
        const stateCounts = {};
        incidents.forEach(incident => {
            if (incident.state) {
                stateCounts[incident.state] = (stateCounts[incident.state] || 0) + 1;
            }
        });
        return stateCounts;
    }

    getIncidentTypeDistribution(incidents) {
        const typeCounts = {};
        incidents.forEach(incident => {
            if (incident.incident_type) {
                typeCounts[incident.incident_type] = (typeCounts[incident.incident_type] || 0) + 1;
            }
        });
        return typeCounts;
    }

    getVictimGroupDistribution(incidents) {
        const groupCounts = {};
        incidents.forEach(incident => {
            if (incident.victim_group) {
                groupCounts[incident.victim_group] = (groupCounts[incident.victim_group] || 0) + 1;
            }
        });
        return groupCounts;
    }

    getVictimGroupColors() {
        return {
            'Dalit': '#2563EB',      // blue-600
            'Muslim': '#7C3AED',     // violet-600
            'Christian': '#059669',   // emerald-600
            'Tribal': '#D97706',     // amber-600
            'OBC': '#DC2626',        // red-600
            'General': '#4B5563',    // gray-600
            'Other': '#6B7280'       // gray-500
        };
    }

    async initializeVictimGroupChart(incidents) {
        const ctx = document.getElementById('victimGroupChart');
        if (!ctx) return;

        // Destroy previous chart if exists
        if (this.victimGroupChart) {
            this.victimGroupChart.destroy();
            this.victimGroupChart = null;
        }

        let victimData = this.getVictimGroupDistribution(incidents);
        let sortedVictimsArr = Object.entries(victimData).sort(([,a], [,b]) => b - a);
        
        if (sortedVictimsArr.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full py-12 text-gray-500 dark:text-gray-400">
                    <svg class="h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <p>No data available for victim groups</p>
                </div>
            `;
            return;
        }

        // Sort and limit to top 10
        let topVictims = sortedVictimsArr.slice(0, 10);
        let otherCount = sortedVictimsArr.slice(10).reduce((sum, [,v]) => sum + v, 0);
        let labels = topVictims.map(([k]) => k);
        let values = topVictims.map(([,v]) => v);
        
        if (otherCount > 0) {
            labels.push('Other');
            values.push(otherCount);
        }

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#E5E7EB' : '#374151';
        const victimGroupColors = this.getVictimGroupColors();
        const colors = labels.map(label => victimGroupColors[label] || '#6B7280');
        
        this.victimGroupChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.map(c => `${c}40`),
                    borderColor: colors,
                    borderWidth: 2,
                    hoverBackgroundColor: colors.map(c => `${c}60`)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            color: textColor,
                            font: { 
                                family: 'Inter',
                                size: 12
                            },
                            boxWidth: 12,
                            boxHeight: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        },
                        title: {
                            display: true,
                            text: 'Legend',
                            color: textColor,
                            font: {
                                family: 'Inter',
                                size: 14,
                                weight: '600'
                            },
                            padding: { bottom: 8 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Incidents by Victim Group',
                        font: { 
                            size: 16, 
                            weight: '600',
                            family: 'Inter'
                        },
                        color: textColor,
                        padding: { bottom: 16 }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? '#374151' : '#E5E7EB',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            },
                            title: (ctx) => sortedVictimsArr[ctx[0].dataIndex]?.[0] || ctx[0].label
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

    updateCharts(incidents) {
        if (!this.initialized) return;

        try {
            Promise.all([
                this.initializeStateChart(incidents),
                this.initializeIncidentTypeChart(incidents),
                this.initializeVictimGroupChart(incidents)
            ]).catch(error => {
                console.error('Error updating charts:', error);
                document.getElementById('errorBanner')?.classList.remove('hidden');
            });
        } catch (error) {
            console.error('Error updating charts:', error);
            document.getElementById('errorBanner')?.classList.remove('hidden');
        }
    }

    truncateLabel(label, maxLength = 15) {
        if (!label) return '';
        return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
    }
}

// Create and export a singleton instance
const chartsManager = new ChartsManager();
export default chartsManager; 