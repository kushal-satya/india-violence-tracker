// Integration test script for India Violence Tracker
// Tests the complete data flow from Google Apps Script to frontend

const https = require('https');
const fs = require('fs');
const path = require('path');

class IntegrationTester {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runTest(testName, testFunction) {
        this.log(`Running test: ${testName}`);
        this.results.total++;
        
        try {
            await testFunction();
            this.results.passed++;
            this.log(`Test passed: ${testName}`, 'success');
            return true;
        } catch (error) {
            this.results.failed++;
            this.log(`Test failed: ${testName} - ${error.message}`, 'error');
            return false;
        }
    }

    async testFrontendFiles() {
        const requiredFiles = [
            'index.html',
            'simple.html',
            'css/style.css',
            'js/app.js',
            'js/data.js',
            'js/map.js',
            'js/charts.js',
            'js/table.js'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(__dirname, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }
        
        this.log('All required frontend files exist', 'success');
    }

    async testAppScriptStructure() {
        const appScriptPath = path.join(__dirname, 'appscript', 'Code.gs');
        if (!fs.existsSync(appScriptPath)) {
            throw new Error('Google Apps Script file missing: appscript/Code.gs');
        }

        const content = fs.readFileSync(appScriptPath, 'utf8');
        
        // Check for critical functions
        const requiredFunctions = [
            'processRSSFeeds',
            'createIncidentRecord',
            'updatePublicSheetIfNeeded',
            'detectDuplicates',
            'logSystemEvent',
            'onEdit'
        ];

        for (const func of requiredFunctions) {
            if (!content.includes(`function ${func}`) && !content.includes(`${func}(`)) {
                throw new Error(`Required function missing in Apps Script: ${func}`);
            }
        }

        // Check for configuration
        if (!content.includes('const CONFIG = {')) {
            throw new Error('CONFIG object missing in Apps Script');
        }

        this.log('Google Apps Script structure is valid', 'success');
    }

    async testDataURL() {
        return new Promise((resolve, reject) => {
            // Test the Google Sheets public URL from data.js
            const dataJsPath = path.join(__dirname, 'js', 'data.js');
            const dataContent = fs.readFileSync(dataJsPath, 'utf8');
            
            // Extract DATA_URL
            const urlMatch = dataContent.match(/const DATA_URL = "([^"]+)"/);
            if (!urlMatch) {
                return reject(new Error('DATA_URL not found in data.js'));
            }

            const dataUrl = urlMatch[1];
            this.log(`Testing data URL: ${dataUrl.substring(0, 50)}...`);

            https.get(dataUrl, (res) => {
                if (res.statusCode === 200) {
                    this.log('Data URL is accessible', 'success');
                    resolve();
                } else {
                    reject(new Error(`Data URL returned status: ${res.statusCode}`));
                }
            }).on('error', (err) => {
                reject(new Error(`Data URL error: ${err.message}`));
            });
        });
    }

    async testJavaScriptSyntax() {
        const jsFiles = [
            'js/app.js',
            'js/data.js',
            'js/map.js',
            'js/charts.js',
            'js/table.js'
        ];

        for (const file of jsFiles) {
            const filePath = path.join(__dirname, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Basic syntax check - look for obvious issues
            const openBraces = (content.match(/{/g) || []).length;
            const closeBraces = (content.match(/}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                throw new Error(`Mismatched braces in ${file}`);
            }

            // Check for common syntax issues
            if (content.includes('function(') && !content.includes('{')) {
                throw new Error(`Potential syntax error in ${file}`);
            }
        }

        this.log('JavaScript files syntax appears valid', 'success');
    }

    async testHTMLStructure() {
        const htmlFiles = ['index.html', 'simple.html'];
        
        for (const file of htmlFiles) {
            const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
            
            // Check for required elements
            const requiredElements = [
                '<html',
                '<head>',
                '<body',
                '</html>'
            ];

            for (const element of requiredElements) {
                if (!content.includes(element)) {
                    throw new Error(`Missing element ${element} in ${file}`);
                }
            }

            // Check for script inclusions
            if (!content.includes('js/') && file === 'index.html') {
                throw new Error(`No JavaScript files included in ${file}`);
            }
        }

        this.log('HTML structure is valid', 'success');
    }

    async run() {
        this.log('🚀 Starting Integration Tests for India Violence Tracker', 'info');
        this.log('=' .repeat(60), 'info');

        await this.runTest('Frontend Files Check', () => this.testFrontendFiles());
        await this.runTest('Apps Script Structure Check', () => this.testAppScriptStructure());
        await this.runTest('Data URL Accessibility', () => this.testDataURL());
        await this.runTest('JavaScript Syntax Check', () => this.testJavaScriptSyntax());
        await this.runTest('HTML Structure Check', () => this.testHTMLStructure());

        this.log('=' .repeat(60), 'info');
        this.log(`Integration Test Results:`, 'info');
        this.log(`Total Tests: ${this.results.total}`, 'info');
        this.log(`Passed: ${this.results.passed}`, 'success');
        this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
        
        if (this.results.failed === 0) {
            this.log('🎉 All integration tests passed!', 'success');
            this.log('✅ System is ready for deployment', 'success');
        } else {
            this.log('❌ Some tests failed. Please fix the issues before deployment.', 'error');
        }

        return this.results.failed === 0;
    }
}

// Run the tests
if (require.main === module) {
    const tester = new IntegrationTester();
    tester.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test runner error:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTester;
