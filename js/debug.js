// Debug script for map initialization
console.log("Debug script loaded");

// Check if the map container exists
const mapElement = document.getElementById('map');
console.log("Map container exists:", mapElement ? true : false);

// Check if Leaflet is loaded
console.log("Leaflet loaded:", typeof L !== 'undefined' ? true : false);

// Monitor data loading
window.debugMonitorData = function() {
    console.log("Debug monitor activated");
    
    // Check if dataManager is available 
    if (typeof window.dataManager !== 'undefined') {
        console.log("dataManager available globally:", true);
    } else {
        console.log("dataManager not available globally - will try to access through import");
        
        // Try to import the dataManager
        import('./data.js?v=2').then(module => {
            const dataManager = module.default;
            if (dataManager) {
                console.log("dataManager loaded via import");
                checkIncidents(dataManager);
            }
        }).catch(error => {
            console.error("Failed to import dataManager:", error);
        });
    }
};

// Function to check incident coordinates
function checkIncidents(dataManager) {
    if (!dataManager || !dataManager.incidents) {
        console.log("No incidents available");
        return;
    }
    
    console.log("Total incidents:", dataManager.incidents.length);
    
    // Check for valid coordinates
    let validCount = 0;
    let invalidCount = 0;
    
    dataManager.incidents.forEach((incident, index) => {
        const lat = parseFloat(incident.lat);
        const lon = parseFloat(incident.lon);
        
        if (!isNaN(lat) && !isNaN(lon) && lat !== null && lon !== null) {
            validCount++;
        } else {
            invalidCount++;
            if (index < 5) {
                console.log(`Invalid coordinates: ${incident.title} - lat: ${incident.lat}, lon: ${incident.lon}`);
            }
        }
    });
    
    console.log("Valid coordinates:", validCount);
    console.log("Invalid coordinates:", invalidCount);
    
    // Show the first 3 incidents for debugging
    if (dataManager.incidents.length > 0) {
        console.log("Sample incidents:");
        dataManager.incidents.slice(0, 3).forEach((incident, i) => {
            console.log(`Incident ${i+1}:`, {
                title: incident.title,
                lat: incident.lat,
                lon: incident.lon,
                latType: typeof incident.lat,
                lonType: typeof incident.lon
            });
        });
    }
}

// Function to initialize a test map - only call this when needed
window.initTestMap = function() {
    if (mapElement && typeof L !== 'undefined') {
        // Check if map is already initialized
        if (document.querySelector('.leaflet-container')) {
            console.log("Map is already initialized. Not creating test map.");
            return;
        }
        
        try {
            console.log("Initializing test map...");
            
            // Create a simple map
            const testMap = L.map('map').setView([20.5937, 78.9629], 5);
            
            // Add a tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(testMap);
            
            // Add a marker
            L.marker([20.5937, 78.9629]).addTo(testMap)
                .bindPopup('Test marker')
                .openPopup();
                
            console.log("Test map initialized successfully");
            return testMap;
        } catch (error) {
            console.error("Error initializing test map:", error);
        }
    } else {
        console.error("Cannot initialize map - missing dependencies");
    }
};

// Create a debug UI
const createDebugUI = function() {
    // Create a debug panel
    const debugPanel = document.createElement('div');
    debugPanel.style = 'position: fixed; top: 10px; right: 10px; z-index: 1000; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; font-size: 12px;';
    debugPanel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Debug Controls</div>
        <button id="debug-data-btn" style="display: block; margin-bottom: 5px; padding: 3px; width: 100%;">Analyze Data</button>
        <button id="fix-coords-btn" style="display: block; margin-bottom: 5px; padding: 3px; width: 100%;">Fix Coordinates</button>
        <button id="test-map-btn" style="display: block; margin-bottom: 5px; padding: 3px; width: 100%;">Test Map</button>
        <button id="toggle-debug-btn" style="display: block; padding: 3px; width: 100%;">Hide Panel</button>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Add event listeners
    document.getElementById('debug-data-btn').addEventListener('click', function() {
        window.debugMonitorData();
    });
    
    document.getElementById('fix-coords-btn').addEventListener('click', function() {
        if (window.debugUtils && window.debugUtils.fixCoordinates) {
            window.debugUtils.fixCoordinates();
        } else {
            console.error("Fix coordinates utility not available");
        }
    });
    
    document.getElementById('test-map-btn').addEventListener('click', function() {
        window.initTestMap();
    });
    
    document.getElementById('toggle-debug-btn').addEventListener('click', function() {
        debugPanel.style.display = 'none';
    });
};

// Add the debug UI after a short delay to ensure the page is loaded
setTimeout(createDebugUI, 2000);

// Set timeout to run debug after page load
setTimeout(() => {
    window.debugMonitorData();
}, 3000);
