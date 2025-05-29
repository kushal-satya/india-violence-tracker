// This script exposes the data manager for debugging purposes
import dataManager from './data.js?v=2';
import mapManager from './map.js?v=2';

// Make the data manager available for debugging
window.dataManager = dataManager;
window.mapManager = mapManager;

// Debug functionality
window.refreshMap = function() {
    if (window.mapManager && window.dataManager) {
        console.log("Manually refreshing map with", dataManager.incidents.length, "incidents");
        mapManager.updateMap(dataManager.getIncidents());
    } else {
        console.error("Map manager or data manager not available");
    }
};

// Debug coordinate validation
window.validateCoordinates = function() {
    if (!window.dataManager || !dataManager.incidents) {
        console.error("No incidents available");
        return;
    }
    
    console.log("Validating coordinates for", dataManager.incidents.length, "incidents");
    
    const incidents = dataManager.incidents;
    let validCount = 0;
    let invalidCount = 0;
    
    incidents.forEach((incident, index) => {
        const lat = parseFloat(incident.lat);
        const lon = parseFloat(incident.lon);
        
        if (!isNaN(lat) && !isNaN(lon) && lat !== null && lon !== null) {
            validCount++;
            if (index < 5) {
                console.log(`Valid coordinates: ${incident.title} - lat: ${lat}, lon: ${lon}`);
            }
        } else {
            invalidCount++;
            if (index < 10) {
                console.log(`Invalid coordinates: ${incident.title} - lat: ${incident.lat} (${typeof incident.lat}), lon: ${incident.lon} (${typeof incident.lon})`);
            }
        }
    });
    
    console.log("Valid coordinates:", validCount);
    console.log("Invalid coordinates:", invalidCount);
    console.log("Validation percentage:", Math.round((validCount / incidents.length) * 100) + "%");
};

// Expose utilities
window.debugUtils = {
    fixCoordinates: function() {
        if (!window.dataManager || !dataManager.incidents) {
            console.error("No incidents available");
            return;
        }
        
        console.log("Attempting to fix coordinates for", dataManager.incidents.length, "incidents");
        
        let fixedCount = 0;
        dataManager.incidents.forEach((incident) => {
            if (incident.lat === null || incident.lon === null || 
                isNaN(parseFloat(incident.lat)) || isNaN(parseFloat(incident.lon))) {
                
                // Try to fix using state
                if (incident.state) {
                    const stateCoords = dataManager.getStateCoordinates(incident.state);
                    if (stateCoords) {
                        incident.lat = stateCoords.lat;
                        incident.lon = stateCoords.lon;
                        fixedCount++;
                    } else {
                        // Default to center of India as absolute last resort
                        incident.lat = 20.5937;
                        incident.lon = 78.9629;
                        fixedCount++;
                    }
                } else {
                    // Without state info, use center of India
                    incident.lat = 20.5937;
                    incident.lon = 78.9629;
                    fixedCount++;
                }
            }
        });
        
        console.log("Fixed coordinates for", fixedCount, "incidents");
        // Refresh the map
        window.refreshMap();
    },
    
    analyzeCoordinates: function() {
        if (!window.dataManager || !dataManager.incidents) {
            console.error("No incidents available");
            return;
        }
        
        const incidents = dataManager.incidents;
        console.log(`Analyzing coordinates for ${incidents.length} incidents:`);
        
        // Count by types
        let nullValues = 0;
        let undefinedValues = 0;
        let stringValues = 0;
        let numberValues = 0;
        let emptyStringValues = 0;
        let nonParsableStrings = 0;
        
        incidents.forEach(incident => {
            // Check lat
            if (incident.lat === null) nullValues++;
            else if (incident.lat === undefined) undefinedValues++;
            else if (typeof incident.lat === 'string') {
                stringValues++;
                if (incident.lat === '') emptyStringValues++;
                else if (isNaN(parseFloat(incident.lat))) nonParsableStrings++;
            }
            else if (typeof incident.lat === 'number') numberValues++;
        });
        
        console.log("Coordinate Analysis:");
        console.log(`- Null values: ${nullValues}`);
        console.log(`- Undefined values: ${undefinedValues}`);
        console.log(`- String values: ${stringValues}`);
        console.log(`- Number values: ${numberValues}`);
        console.log(`- Empty strings: ${emptyStringValues}`);
        console.log(`- Non-parsable strings: ${nonParsableStrings}`);
        
        // Sample of problematic coordinates
        console.log("\nSample problematic incidents:");
        incidents.slice(0, 10).forEach((incident, i) => {
            if (incident.lat === null || incident.lat === undefined || 
                incident.lon === null || incident.lon === undefined ||
                isNaN(parseFloat(incident.lat)) || isNaN(parseFloat(incident.lon))) {
                
                console.log(`Incident ${i}: ${incident.title}`);
                console.log(`- lat: ${incident.lat} (${typeof incident.lat})`);
                console.log(`- lon: ${incident.lon} (${typeof incident.lon})`);
                console.log(`- state: ${incident.state}`);
            }
        });
    }
};

// Run an initial analysis
setTimeout(() => {
    console.log("[Debug] Running initial coordinate analysis");
    window.debugUtils.analyzeCoordinates();
    window.validateCoordinates();
}, 5000);
