// Google Apps Script for Dalit Violence Tracker
// Complete solution with feed management, data processing, Gemini AI integration, and public access

// ============= CONFIGURATION =============
const CONFIG = {
  // Sheet names
  SHEETS: {
    FEEDS: 'feeds',
    INCIDENTS: 'IncidentData',
    MASTER: 'MasterData', // This sheet is in CONFIG but not explicitly used in provided code. Review if needed.
    LOGS: 'SystemLogs',
    PUBLIC: 'PublicData'  // This will be the only publicly accessible sheet
  },
  
  // Headers for different sheets
  HEADERS: {
    FEEDS: ['Name', 'Section', 'URL', 'Active', 'Last Checked', 'Status', 'Last Success', 'Error Count', 'Next Article Index'], // Added Next Article Index
    INCIDENTS: [
      'Incident ID',
      'Title',
      'Description', // Short description from RSS
      'Date of Incident', // Expected from Gemini
      'Date Published',   // From RSS
      'Location Text',    // Raw location text from Gemini (fullText)
      'State',            // Expected from Gemini
      'District',         // Expected from Gemini
      'City/Village',     // Expected from Gemini
      'Latitude',         // Expected from Gemini
      'Longitude',        // Expected from Gemini
      'Victim Community', // Expected from Gemini
      'Incident Type',    // Expected from Gemini
      'Perpetrators',     // Potentially from Gemini, or manual
      'Police Action',    // Potentially from Gemini, or manual
      'Source URL',       // From RSS
      'Source Name',      // From Feeds sheet
      'Source Section',   // From Feeds sheet
      'RSS Feed Source',  // From Feeds sheet
      'Gemini Analysis',  // Store raw Gemini response (JSON string) for review
      'Last Updated',     // Timestamp of processing
      'Verification Status', // Could be updated by Gemini or manually
      'Notes'             // Manual notes
    ],
    PUBLIC: [ // Simplified for public view
      'Incident ID',
      'Title',
      'Date of Incident',
      'Location Summary', // e.g., City, District, State
      'State',
      'Victim Community',
      'Incident Type',
      'Source Name',
      'Source URL',
      'Last Updated'
    ],
    LOGS: ['Timestamp', 'Level', 'Message']
  },
  
  // Keywords for initial filtering (Gemini will do more advanced filtering)
  KEYWORDS: {
    communities: ['dalit', 'bahujan', 'adivasi', 'minority', 'sc', 'st', 'obc', 'scheduled caste', 'scheduled tribe', 'harijan', 'girijan'],
    incidents: ['violence', 'attack', 'discrimination', 'atrocity', 'hate crime', 'assault', 'harassment', 'murder', 'killing', 'beating', 'lynching', 'rape', 'molestation', 'casteist slur', 'threatened', 'killed', 'injured', 'abused']
  },
  
  // Update settings
  UPDATE_FREQUENCY: 1, // Hours - This will now be the frequency for processing ONE feed. Adjust as needed.
                      // Consider changing to minutes if you have many feeds: .everyMinutes(30) for example.
  MAX_ARTICLES_PER_FEED_BATCH: 35, // Number of articles to process from a single feed in one execution run
  MAX_LOG_ENTRIES: 1000,
  
  // Gemini API Configuration
  // IMPORTANT: Store your actual API key in Script Properties (Project Settings > Script Properties)
  // under the name 'GEMINI_API_KEY'.
  GEMINI_MODEL_NAME: "gemini-1.5-flash-latest" 
};

// ============= SHEET MANAGEMENT =============

function initializeSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    Object.entries(CONFIG.SHEETS).forEach(([key, sheetName]) => {
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        logSystemEvent(`Sheet "${sheetName}" created.`, 'INFO');
      }
      
      const headers = CONFIG.HEADERS[key.toUpperCase()]; 
      if (headers) {
        let existingHeadersMatch = false;
        if (sheet.getLastRow() > 0 && sheet.getLastColumn() >= headers.length) {
            const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
            existingHeadersMatch = currentHeaders.every((val, index) => val === headers[index]);
        }

        if (!existingHeadersMatch) {
            if (sheet.getLastRow() > 0 && !existingHeadersMatch) {
                 logSystemEvent(`Headers in sheet "${sheetName}" are different or incomplete. Re-applying headers.`, 'WARNING');
            }
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            formatHeaders(sheet, headers.length);
        }
      }
      
      switch(sheetName) { 
        case CONFIG.SHEETS.FEEDS:
          formatFeedsSheet(sheet);
          break;
        case CONFIG.SHEETS.INCIDENTS:
          formatIncidentsSheet(sheet);
          break;
        case CONFIG.SHEETS.PUBLIC:
          formatPublicSheet(sheet);
          break;
        case CONFIG.SHEETS.LOGS:
          formatLogsSheet(sheet); 
          break;
      }
    });
    
    setupSheetProtection(ss); 
    
    const feedsSheet = ss.getSheetByName(CONFIG.SHEETS.FEEDS);
    if (feedsSheet && feedsSheet.getLastRow() <= 1) { 
      addInitialFeeds(feedsSheet);
    }
    
    logSystemEvent('System sheets checked/initialized successfully', 'INFO');
    return true;
  } catch (error) {
    logSystemEvent(`Error initializing sheets: ${error.message} \nStack: ${error.stack}`, 'ERROR');
    return false;
  }
}

function formatHeaders(sheet, numColumns) {
  if (numColumns > 0 && sheet) { 
    sheet.getRange(1, 1, 1, numColumns)
      .setBackground('#e2e8f0') 
      .setFontWeight('bold')
      .setFontFamily('Arial')
      .setWrap(true);
    sheet.setFrozenRows(1);
  }
}

function formatFeedsSheet(sheet) {
   if (!sheet) return;
   const numHeaderCols = CONFIG.HEADERS.FEEDS.length;
    if (sheet.getLastColumn() < numHeaderCols) {
        sheet.insertColumnsAfter(sheet.getLastColumn(), numHeaderCols - sheet.getLastColumn());
    }
    // Using try-catch for each setColumnWidth for robustness
    const setColWidth = (headerName, width) => {
        try {
            const colIndex = CONFIG.HEADERS.FEEDS.indexOf(headerName) + 1;
            if (colIndex > 0) sheet.setColumnWidth(colIndex, width);
        } catch(e) { logSystemEvent(`Error setting width for Feeds sheet column '${headerName}': ${e.message}`, 'WARNING');}
    };
    setColWidth('Name', 150); setColWidth('Section', 120); setColWidth('URL', 350);
    setColWidth('Active', 70); setColWidth('Last Checked', 150); setColWidth('Status', 100);
    setColWidth('Last Success', 150); setColWidth('Error Count', 100); setColWidth('Next Article Index', 120);


    if (sheet.getMaxRows() > 1) {
        const activeColIndex = CONFIG.HEADERS.FEEDS.indexOf('Active') + 1;
        if (activeColIndex > 0) {
            const activeRange = sheet.getRange(2, activeColIndex, sheet.getMaxRows() - 1, 1);
            const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
            activeRange.setDataValidation(rule);
        }
    }
}

function formatIncidentsSheet(sheet) {
  if (!sheet) return;
  const verificationStatusCol = CONFIG.HEADERS.INCIDENTS.indexOf('Verification Status') + 1;
  if (verificationStatusCol > 0 && sheet.getMaxRows() > 1) {
    const statusRange = sheet.getRange(2, verificationStatusCol, sheet.getMaxRows() - 1, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Unverified', 'Verified by Gemini', 'Needs Manual Review', 'False Positive', 'Verified Manually'], true)
      .build();
    statusRange.setDataValidation(rule);
  }
  const setColWidth = (headerName, width) => {
      try {
          const colIndex = CONFIG.HEADERS.INCIDENTS.indexOf(headerName) + 1;
          if (colIndex > 0) sheet.setColumnWidth(colIndex, width);
      } catch(e){ logSystemEvent(`Error formatting Incidents sheet column '${headerName}': ${e.message}`, 'WARNING');}
  };
  setColWidth('Incident ID', 120); setColWidth('Title', 300); setColWidth('Description', 200);
  setColWidth('Date of Incident', 120); setColWidth('Date Published', 120); setColWidth('Location Text', 200);
  setColWidth('State', 100); setColWidth('District', 100); setColWidth('City/Village', 100);
  setColWidth('Latitude', 100); setColWidth('Longitude', 100); setColWidth('Source URL', 250);
  setColWidth('Gemini Analysis', 200); setColWidth('Verification Status', 150);
}

function formatPublicSheet(sheet) {
    if (!sheet) return;
    const setColWidth = (headerName, width) => {
        try {
            const colIndex = CONFIG.HEADERS.PUBLIC.indexOf(headerName) + 1;
            if (colIndex > 0) sheet.setColumnWidth(colIndex, width);
        } catch(e){ logSystemEvent(`Error formatting Public sheet column '${headerName}': ${e.message}`, 'WARNING');}
    };
    setColWidth('Incident ID', 120); setColWidth('Title', 300); setColWidth('Date of Incident', 120);
    setColWidth('Location Summary', 250); setColWidth('State', 100); setColWidth('Source URL', 250);
}

function formatLogsSheet(sheet) {
  if (!sheet) return;
  const setColWidth = (headerName, width) => {
      try {
          const colIndex = CONFIG.HEADERS.LOGS.indexOf(headerName) + 1;
          if (colIndex > 0) sheet.setColumnWidth(colIndex, width);
      } catch(e){ logSystemEvent(`Error formatting Logs sheet column '${headerName}': ${e.message}`, 'WARNING');}
  };
  setColWidth('Timestamp', 180); setColWidth('Level', 80); setColWidth('Message', 500);
  
  if (sheet.getMaxRows() > 1) {
    const logDataRange = sheet.getRange(2, 1, sheet.getMaxRows() -1 , CONFIG.HEADERS.LOGS.length);
    if (logDataRange) { 
        logDataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY)
                    .setHeaderRowColor('#e2e8f0'); 
    }
  }
}

function setupSheetProtection(ss) {
  const currentUser = Session.getActiveUser() ? Session.getActiveUser().getEmail() : null; 
  if (!currentUser && Session.getEffectiveUser()) { 
      logSystemEvent('Active user email is null for protection setup. Effective user: ' + (Session.getEffectiveUser() ? Session.getEffectiveUser().getEmail() : 'null'), 'WARNING');
  }

  Object.values(CONFIG.SHEETS).forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const protection = sheet.protect().setDescription(`${sheetName} Content Protection`);
      if (currentUser) { 
        protection.addEditor(currentUser);
      }
      if (sheetName === CONFIG.SHEETS.PUBLIC || sheetName === 'public_json_data') { 
        protection.setUnprotectedRanges([]); 
        logSystemEvent(`Sheet "${sheetName}" is public. Ensure spreadsheet sharing settings are "Anyone with the link can view".`, 'INFO');
      }
    }
  });
}


// ============= FEED MANAGEMENT =============
function addInitialFeeds(sheet) {
  const initialFeeds = [
    ['Google News - Dalit', 'Dalit', 'https://rss.app/feeds/P8K5BBCE7t1JWZQ3.xml', true, 0], // Name, Section, URL, Active, Next Article Index (0)
    ['Google News - Dalit Violence', 'Dalit Violence', 'https://rss.app/feeds/B2SZJnVStF6ULAjJ.xml', true, 0],
    ['The Wire - Rights/Dalit', 'Dalit', 'https://thewire.in/rss/category/rights/dalit', true, 0],
    // ... (User to complete this list from their prompt Section VII, adding ,0 at the end of each)
  ];
  
  if (initialFeeds.length > 0 && sheet) { 
    const dataToInsert = initialFeeds.map(feed => [feed[0], feed[1], feed[2], feed[3], '', '', '', 0, feed[4]]); // Added Next Article Index
    sheet.getRange(sheet.getLastRow() + 1, 1, dataToInsert.length, dataToInsert[0].length).setValues(dataToInsert);
    logSystemEvent(`Added ${initialFeeds.length} initial feeds to "${sheet.getName()}".`, 'INFO');
  }
}

function getActiveFeeds(feedsSheet) {
  if (!feedsSheet) {
    logSystemEvent('Feeds sheet not found in getActiveFeeds', 'ERROR');
    return [];
  }
  const lastRow = feedsSheet.getLastRow();
  if (lastRow < 2) { 
      logSystemEvent('No data rows in Feeds sheet.', 'INFO');
      return []; 
  }

  const data = feedsSheet.getRange(2, 1, lastRow -1, CONFIG.HEADERS.FEEDS.length).getValues(); 
  const activeFeeds = [];
  const urlCol = CONFIG.HEADERS.FEEDS.indexOf('URL');
  const activeCol = CONFIG.HEADERS.FEEDS.indexOf('Active');
  const nameCol = CONFIG.HEADERS.FEEDS.indexOf('Name');
  const sectionCol = CONFIG.HEADERS.FEEDS.indexOf('Section');
  const nextArticleIndexCol = CONFIG.HEADERS.FEEDS.indexOf('Next Article Index');


  if (urlCol === -1 || activeCol === -1 || nameCol === -1 || sectionCol === -1 || nextArticleIndexCol === -1) {
      logSystemEvent('Could not find required columns in Feeds sheet. Check CONFIG.HEADERS.FEEDS.', 'ERROR');
      return [];
  }

  data.forEach((row, index) => { 
    const isActive = row[activeCol]; 
    const urlVal = row[urlCol];
    if (isActive === true && urlVal && urlVal.toString().trim().startsWith('http')) {
      activeFeeds.push({
        name: row[nameCol],
        section: row[sectionCol],
        url: urlVal.toString().trim(),
        rowIndexInSheet: index + 2, // Actual row number in the sheet
        nextArticleIndex: Number(row[nextArticleIndexCol]) || 0 // Default to 0 if not a number
      });
    }
  });
  logSystemEvent(`Found ${activeFeeds.length} active feeds.`, 'INFO');
  return activeFeeds;
}

function updateFeedStatus(feedsSheet, feedRowIndex, success, errorDetails = '', nextArticleIndexToStore = null) {
  if (!feedsSheet || feedRowIndex < 2) { 
    logSystemEvent(`Invalid parameters for updateFeedStatus: feedsSheet or feedRowIndex (${feedRowIndex})`, 'ERROR');
    return;
  }
  try {
    const now = new Date();
    const colIndices = {
        lastChecked: CONFIG.HEADERS.FEEDS.indexOf('Last Checked') + 1,
        status: CONFIG.HEADERS.FEEDS.indexOf('Status') + 1,
        lastSuccess: CONFIG.HEADERS.FEEDS.indexOf('Last Success') + 1,
        errorCount: CONFIG.HEADERS.FEEDS.indexOf('Error Count') + 1,
        nextArticle: CONFIG.HEADERS.FEEDS.indexOf('Next Article Index') + 1
    };

    if (colIndices.lastChecked > 0) feedsSheet.getRange(feedRowIndex, colIndices.lastChecked).setValue(now);
    if (colIndices.status > 0) feedsSheet.getRange(feedRowIndex, colIndices.status).setValue(success ? 'Processed' : 'Error');
    
    if (success) {
      if (colIndices.lastSuccess > 0) feedsSheet.getRange(feedRowIndex, colIndices.lastSuccess).setValue(now);
      if (colIndices.errorCount > 0) feedsSheet.getRange(feedRowIndex, colIndices.errorCount).setValue(0); 
    } else {
      if (colIndices.errorCount > 0) {
        const errorCountCell = feedsSheet.getRange(feedRowIndex, colIndices.errorCount);
        errorCountCell.setValue((Number(errorCountCell.getValue()) || 0) + 1);
      }
      const feedNameCell = feedsSheet.getRange(feedRowIndex, CONFIG.HEADERS.FEEDS.indexOf('Name') + 1);
      const feedName = feedNameCell ? feedNameCell.getValue() : 'Unknown Feed';
      logSystemEvent(`Feed processing error for "${feedName}" (row ${feedRowIndex}): ${errorDetails}`, 'ERROR');
    }
    if (nextArticleIndexToStore !== null && colIndices.nextArticle > 0) {
        feedsSheet.getRange(feedRowIndex, colIndices.nextArticle).setValue(nextArticleIndexToStore);
    }

  } catch (e) {
    logSystemEvent(`Exception in updateFeedStatus for row ${feedRowIndex}: ${e.message} \nStack: ${e.stack}`, 'ERROR');
  }
}

// ============= DATA PROCESSING =============

function isDuplicate(itemUrl, incidentsSheet) {
  if (!itemUrl || !incidentsSheet) return false;
  try {
    const sourceUrlColumn = CONFIG.HEADERS.INCIDENTS.indexOf('Source URL') + 1;
    if (sourceUrlColumn === 0) {
      logSystemEvent('Source URL column not found for duplicate check. Check CONFIG.HEADERS.INCIDENTS.', 'ERROR');
      return false; 
    }
    const lastRow = incidentsSheet.getLastRow();
    if (lastRow < 2) return false; 

    const existingUrls = incidentsSheet.getRange(2, sourceUrlColumn, lastRow -1 , 1).getValues().flat();
    return existingUrls.includes(itemUrl.trim());
  } catch (error) {
    logSystemEvent(`Error checking for duplicates for URL "${itemUrl}": ${error.message}`, 'ERROR');
    return false; 
  }
}

function callGeminiForNewsAnalysis(item, feed) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const API_KEY = scriptProperties.getProperty('GEMINI_API_KEY');

  if (!API_KEY) {
    logSystemEvent("Gemini API Key not found in Script Properties. Please set GEMINI_API_KEY. Skipping Gemini analysis.", "ERROR");
    return {isRelevant: false, relevanceReason: "Gemini API Key not configured in Script Properties.", incidentDetails: {}};
  }
  if (!CONFIG.GEMINI_MODEL_NAME) {
    logSystemEvent("Gemini model name not configured. Skipping Gemini analysis.", "ERROR");
    return {isRelevant: false, relevanceReason: "Gemini model name not configured.", incidentDetails: {}};
  }

  const newsContent = `Title: ${item.title || 'N/A'}\nDescription: ${item.description || 'N/A'}\nSource URL: ${item.link || 'N/A'}\nSource Feed: ${feed.name || 'N/A'} (${feed.section || 'N/A'})`;
  
  const prompt = `
    Analyze the following news item from India. Determine if it reports a verifiable incident of violence, hate crime, discrimination, or atrocity specifically targeting Dalit, Bahujan, Adivasi, or minority communities in India. General crime news is NOT the target unless it clearly specifies caste/community-based targeting.

    News Item Content:
    ${newsContent}

    If the news item IS relevant and describes such an incident, extract the following information and provide it in a VALID JSON format.
    If the news item is NOT relevant, return JSON with "isRelevant": false, a "relevanceReason", and an empty "incidentDetails" object.
    For all text fields in "incidentDetails", if information is not found or not applicable, use an empty string "" or null. For latitude/longitude, use null if not determinable.

    JSON Output Structure:
    {
      "isRelevant": boolean,
      "relevanceReason": "Brief explanation for relevance or irrelevance.",
      "incidentDetails": {
        "incidentDate": "YYYY-MM-DD (Best estimate of actual incident date, not publishing date. Null if not found.)",
        "location": {
          "fullText": "Specific location string (e.g., 'Village, District, State').",
          "cityVillage": "City or Village name.",
          "district": "District name.",
          "state": "State name (full name, e.g., 'Uttar Pradesh').",
          "latitude": "Approximate latitude (decimal), null if not determinable.",
          "longitude": "Approximate longitude (decimal), null if not determinable."
        },
        "victimCommunity": ["Array of specific communities targeted, e.g., ["Dalit"]],
        "incidentType": ["Array of incident categories, e.g., ["Physical Assault"]],
        "policeActionTaken": "Summary of police action mentioned.",
        "perpetratorsMentioned": "Description of alleged perpetrators."
      },
      "confidenceScore": "High/Medium/Low (Your confidence in relevance and extraction)."
    }
  `;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { 
      temperature: 0.2, 
      maxOutputTokens: 2048,
      responseMimeType: "application/json" 
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL_NAME}:generateContent`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true 
  };
  
  const itemTitleForLog = item.title ? item.title.substring(0,70) : (item.link || 'No Title/Link');

  try {
    logSystemEvent(`Calling Gemini API (${CONFIG.GEMINI_MODEL_NAME}) for: ${itemTitleForLog}...`, 'INFO');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    let responseBody = response.getContentText(); 

    if (responseCode === 200) {
      let jsonStringToParse = responseBody; // Start with the full response body
      try {
          // Remove markdown backticks first if they exist, common for Gemini
          jsonStringToParse = jsonStringToParse.replace(/^```json\s*|\s*```\s*$/g, "").trim();
          
          // More robustly find the JSON object part
          const firstBrace = jsonStringToParse.indexOf('{');
          const lastBrace = jsonStringToParse.lastIndexOf('}');

          if (firstBrace !== -1 && lastBrace > firstBrace) {
            jsonStringToParse = jsonStringToParse.substring(firstBrace, lastBrace + 1);
          } else {
            // If no braces found after cleaning, it's unlikely to be the JSON we want
            logSystemEvent(`Could not find JSON object delimiters {} in Gemini response for "${itemTitleForLog}". Cleaned response: ${jsonStringToParse.substring(0,500)}`, 'ERROR');
            return { isRelevant: false, relevanceReason: "Gemini response did not contain clear JSON object.", incidentDetails: {}, geminiRawOutput: responseBody };
          }

          const structuredAnalysis = JSON.parse(jsonStringToParse);
          
          if (structuredAnalysis.isRelevant !== undefined) {
             logSystemEvent(`Gemini analysis received for: ${itemTitleForLog} - Relevant: ${structuredAnalysis.isRelevant}`, 'INFO');
             return structuredAnalysis;
          } else if (structuredAnalysis.candidates && structuredAnalysis.candidates[0] && structuredAnalysis.candidates[0].content && structuredAnalysis.candidates[0].content.parts && structuredAnalysis.candidates[0].content.parts[0] && structuredAnalysis.candidates[0].content.parts[0].text) {
              const geminiTextOutput = structuredAnalysis.candidates[0].content.parts[0].text;
              // This text itself should be the JSON string we asked for. Clean it too.
              const cleanedNestedJson = geminiTextOutput.replace(/^```json\s*|\s*```\s*$/g, "").trim();
              const finalJson = JSON.parse(cleanedNestedJson); 
              logSystemEvent(`Gemini analysis received (via nested text) for: ${itemTitleForLog} - Relevant: ${finalJson.isRelevant}`, 'INFO');
              return finalJson;
          }
          logSystemEvent(`Gemini response for "${itemTitleForLog}" parsed but missing 'isRelevant'. Parsed: ${JSON.stringify(structuredAnalysis).substring(0,500)}`, 'WARNING');
          return { isRelevant: false, relevanceReason: "Parsed Gemini response missing key fields.", incidentDetails: {}, geminiRawOutput: responseBody };

      } catch (e) {
          logSystemEvent(`Error parsing Gemini's JSON output for "${itemTitleForLog}": ${e.message}. String attempted to parse: '${jsonStringToParse.substring(0,1000)}'`, 'ERROR');
          return { isRelevant: false, relevanceReason: "Error parsing Gemini JSON output.", incidentDetails: {}, geminiRawOutput: responseBody, errorParsingGeminiJson: e.message };
      }
    } else if (responseCode === 429) { 
        logSystemEvent(`Gemini API Rate Limit Error for "${itemTitleForLog}": ${responseCode} - ${responseBody.substring(0,500)}.`, 'ERROR');
        return {isRelevant: false, relevanceReason: `Gemini API Rate Limit Error ${responseCode}`, incidentDetails: {}};
    } else { 
      let geminiErrorReason = `Gemini API Error ${responseCode}`;
      try {
        const errorJson = JSON.parse(responseBody);
        if (errorJson.error && errorJson.error.message) {
          geminiErrorReason += `: ${errorJson.error.message}`;
        }
      } catch (parseError) {
        geminiErrorReason += `: ${responseBody.substring(0,500)}`; 
      }
      logSystemEvent(`Gemini API Error for "${itemTitleForLog}": ${geminiErrorReason}`, 'ERROR');
      return {isRelevant: false, relevanceReason: geminiErrorReason, incidentDetails: {}};
    }
  } catch (error) { 
    logSystemEvent(`Exception calling Gemini API for "${itemTitleForLog}": ${error.message} \nStack: ${error.stack}`, 'ERROR');
    return {isRelevant: false, relevanceReason: "Exception during Gemini API call.", incidentDetails: {}};
  }
}


function fetchAndProcessData() {
  const scriptProperties = PropertiesService.getScriptProperties();
  let lastProcessedFeedIndex = parseInt(scriptProperties.getProperty('lastProcessedFeedIndex')) || 0;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let feedsSheet = ss.getSheetByName(CONFIG.SHEETS.FEEDS); 
    let incidentsSheet = ss.getSheetByName(CONFIG.SHEETS.INCIDENTS);
    let publicSheet = ss.getSheetByName(CONFIG.SHEETS.PUBLIC);


    if (!feedsSheet || !incidentsSheet || !publicSheet) { 
      logSystemEvent('Core sheets not found. Running initialization.', 'WARNING');
      if (!initializeSheets()) { 
         logSystemEvent('Initialization failed. Aborting fetchAndProcessData.', 'ERROR');
         return;
      }
      feedsSheet = ss.getSheetByName(CONFIG.SHEETS.FEEDS); 
      incidentsSheet = ss.getSheetByName(CONFIG.SHEETS.INCIDENTS); 
      publicSheet = ss.getSheetByName(CONFIG.SHEETS.PUBLIC);
      if (!feedsSheet || !incidentsSheet || !publicSheet) {
          logSystemEvent('Core sheets still missing after re-initialization. Aborting.', 'ERROR');
          return;
      }
    }
    
    const activeFeeds = getActiveFeeds(feedsSheet);
    if (activeFeeds.length === 0) {
      logSystemEvent('No active feeds found to process.', 'INFO');
      scriptProperties.setProperty('lastProcessedFeedIndex', '0'); // Reset for next cycle
      return;
    }

    if (lastProcessedFeedIndex >= activeFeeds.length) {
        lastProcessedFeedIndex = 0; // Start new cycle
        logSystemEvent('Completed a full cycle of feeds. Starting new cycle.', 'INFO');
    }

    const feedToProcess = activeFeeds[lastProcessedFeedIndex];
    logSystemEvent(`Processing feed #${lastProcessedFeedIndex + 1}/${activeFeeds.length}: ${feedToProcess.name}`, 'INFO');

    let feedProcessedSuccessfully = false; 
    let errorDetailForStatus = '';
    let currentFeedNextArticleIndex = feedToProcess.nextArticleIndex || 0;
    let articlesProcessedInThisRun = 0;

    try {
      const allFeedItems = fetchRSSFeed(feedToProcess.url); 
      
      if (allFeedItems && allFeedItems.length > 0) {
        const articlesToConsider = allFeedItems.slice(currentFeedNextArticleIndex); 
        const articlesForThisBatch = articlesToConsider.slice(0, CONFIG.MAX_ARTICLES_PER_FEED_BATCH);

        logSystemEvent(`Fetched ${allFeedItems.length} total items from ${feedToProcess.name}. Starting from index ${currentFeedNextArticleIndex}. Processing up to ${articlesForThisBatch.length} in this batch.`, 'INFO');
        
        const newIncidentsFromThisFeedBatch = processFeedItems(articlesForThisBatch, feedToProcess, incidentsSheet, publicSheet); 
        
        articlesProcessedInThisRun = articlesForThisBatch.length;
        currentFeedNextArticleIndex += articlesProcessedInThisRun;

        if (newIncidentsFromThisFeedBatch.length > 0) {
             logSystemEvent(`Added ${newIncidentsFromThisFeedBatch.length} new incidents from feed: ${feedToProcess.name}.`, 'INFO');
        }
      } else {
          logSystemEvent(`No items fetched or returned from feed: ${feedToProcess.name}`, 'WARNING');
          currentFeedNextArticleIndex = 0; 
      }
      feedProcessedSuccessfully = true;
    } catch (error) {
      errorDetailForStatus = error.message; 
      logSystemEvent(`Error processing feed ${feedToProcess.name} (URL: ${feedToProcess.url}): ${error.message} \nStack: ${error.stack}`, 'ERROR');
    }

    let nextArticleIndexForSheet;
    const totalItemsInCurrentFeed = (fetchRSSFeed(feedToProcess.url) || []).length; // Re-fetch to get current total count
    if (feedProcessedSuccessfully && currentFeedNextArticleIndex >= totalItemsInCurrentFeed && totalItemsInCurrentFeed > 0) {
        nextArticleIndexForSheet = 0; 
        logSystemEvent(`All articles processed for feed: ${feedToProcess.name}. Resetting its next article index to 0.`, 'INFO');
    } else if (feedProcessedSuccessfully) {
        nextArticleIndexForSheet = currentFeedNextArticleIndex;
    } else {
        nextArticleIndexForSheet = feedToProcess.nextArticleIndex; // Keep old index on error, to retry same batch.
    }
    updateFeedStatus(feedsSheet, feedToProcess.rowIndexInSheet, feedProcessedSuccessfully, errorDetailForStatus, nextArticleIndexForSheet);
    
    scriptProperties.setProperty('lastProcessedFeedIndex', String(lastProcessedFeedIndex + 1)); 
        
    cleanupOldData(incidentsSheet); 
    cleanupLogs();
    
  } catch (error) {
    logSystemEvent(`Critical error in fetchAndProcessData: ${error.message} \nStack: ${error.stack}`, 'ERROR');
  }
}

function fetchRSSFeed(url) {
  try {
    const response = UrlFetchApp.fetch(url, { 
        muteHttpExceptions: true, 
        followRedirects: true, 
        validateHttpsCertificates: true, 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
    });
    const responseCode = response.getResponseCode();
    const contentText = response.getContentText();

    if (responseCode !== 200) {
      throw new Error(`HTTP Error ${responseCode} for URL ${url}. Response: ${contentText ? contentText.substring(0, 200) : 'No content'}`);
    }
    if (!contentText) {
        throw new Error(`Empty response for URL ${url}`);
    }

    const xml = XmlService.parse(contentText);
    const root = xml.getRootElement();
    let itemsXml;
    
    const channel = root.getChild('channel');
    if (channel && channel.getChildren('item').length > 0) {
        itemsXml = channel.getChildren('item');
    } 
    else if (root.getName().toLowerCase() === 'feed' && root.getChildren('entry', root.getNamespace()).length > 0) { 
        itemsXml = root.getChildren('entry', root.getNamespace());
        return itemsXml.map(item => {
            let description = item.getChild('summary', root.getNamespace())?.getText() || item.getChild('content', root.getNamespace())?.getText() || '';
            description = description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

            let link = '';
            const linkElement = item.getChild('link', root.getNamespace());
            if (linkElement) {
                if (linkElement.getAttribute('href')) { 
                    link = linkElement.getAttribute('href').getValue();
                } else {
                    link = linkElement.getText(); 
                }
            }
            
            return {
                title: item.getChild('title', root.getNamespace())?.getText() || '',
                description: description.substring(0, 1000), 
                link: link,
                pubDate: item.getChild('published', root.getNamespace())?.getText() || item.getChild('updated', root.getNamespace())?.getText() || '',
                guid: item.getChild('id', root.getNamespace())?.getText() || link 
            };
        });
    } else {
        logSystemEvent(`Could not find 'item' or 'entry' elements in RSS/Atom feed from ${url}`, 'WARNING');
        return [];
    }

    return itemsXml.map(item => {
        let description = item.getChild('description')?.getValue() || item.getChild('summary')?.getValue() || '';
        description = description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();

        return {
            title: item.getChild('title')?.getValue() || '',
            description: description.substring(0, 1000), 
            link: item.getChild('link')?.getValue() || '',
            pubDate: item.getChild('pubDate')?.getValue() || item.getChild('dc:date', XmlService.getNamespace('dc'))?.getValue() || '', 
            guid: item.getChild('guid')?.getValue() || item.getChild('link')?.getValue() || '' 
        };
    });

  } catch (error) {
    logSystemEvent(`Failed to fetch or parse RSS feed from ${url}: ${error.message}`, 'ERROR');
    throw error; 
  }
}

// Modified to append data immediately
function processFeedItems(items, feed, incidentsSheet, publicSheet) {
  const processedIncidentsThisBatch = []; 
  if (!items || items.length === 0) {
    return processedIncidentsThisBatch;
  }

  items.forEach(item => {
    const itemTitleForLog = item.title ? item.title.substring(0,50) : (item.link || 'No Title/Link');
    try {
      if (!item.link || item.link.trim() === '' || isDuplicate(item.link, incidentsSheet)) {
        logSystemEvent(`Skipping duplicate or item with no valid link: ${itemTitleForLog}`, 'INFO');
        return; 
      }

      const geminiAnalysis = callGeminiForNewsAnalysis(item, feed);

      if (geminiAnalysis && geminiAnalysis.isRelevant === true && geminiAnalysis.incidentDetails) {
        const incidentRecord = createIncidentRecord(item, feed, geminiAnalysis);
        if (incidentRecord) {
          appendNewIncidents(incidentsSheet, [incidentRecord]); 
          updatePublicSheetIfNeeded(publicSheet, [incidentRecord]); 
          processedIncidentsThisBatch.push(incidentRecord); 
        }
      } else if (geminiAnalysis) { 
         logSystemEvent(`Incident not relevant or issue with Gemini analysis for: "${itemTitleForLog}". Reason: ${geminiAnalysis.relevanceReason || 'No reason provided.'}`, 'INFO');
      } else { 
         logSystemEvent(`No valid Gemini analysis returned (null/undefined) for: ${itemTitleForLog}`, 'WARNING');
      }
    } catch (e) {
      logSystemEvent(`Error processing item "${itemTitleForLog}": ${e.message} \nStack: ${e.stack}`, 'ERROR');
    }
    Utilities.sleep(2000); 
  });
  return processedIncidentsThisBatch;
}


function createIncidentRecord(item, feed, geminiAnalysis) {
  try {
    const details = geminiAnalysis.incidentDetails || {}; 
    const location = details.location || {}; 

    return {
      incidentId: Utilities.getUuid(),
      title: item.title || '',
      description: item.description ? item.description.substring(0, 1000) : '', 
      dateOfIncident: details.incidentDate || null, 
      datePublished: item.pubDate || null,
      locationText: location.fullText || '',
      state: location.state || '',
      district: location.district || '',
      cityVillage: location.cityVillage || '',
      latitude: location.latitude === "" ? null : (location.latitude || null), 
      longitude: location.longitude === "" ? null : (location.longitude || null), 
      victimCommunity: Array.isArray(details.victimCommunity) ? details.victimCommunity.join(', ') : (details.victimCommunity || ''),
      incidentType: Array.isArray(details.incidentType) ? details.incidentType.join(', ') : (details.incidentType || ''),
      perpetrators: details.perpetratorsMentioned || '',
      policeAction: details.policeActionTaken || '',
      sourceUrl: item.link || '',
      sourceName: feed.name || '',
      sourceSection: feed.section || '',
      rssFeedSource: feed.url || '',
      geminiAnalysis: JSON.stringify(geminiAnalysis), 
      lastUpdated: new Date().toISOString(),
      verificationStatus: geminiAnalysis.isRelevant ? 
                            (geminiAnalysis.confidenceScore && geminiAnalysis.confidenceScore.toLowerCase() === 'high' ? 'Verified by Gemini' : 'Needs Manual Review') : 
                            'Needs Manual Review', 
      notes: `${geminiAnalysis.relevanceReason || ''}${geminiAnalysis.confidenceScore ? ` (Confidence: ${geminiAnalysis.confidenceScore})` : ''}`.trim()
    };
  } catch (error) {
    logSystemEvent(`Error creating incident record from Gemini data for "${item.title || 'N/A'}": ${error.message} \nStack: ${error.stack}`, 'ERROR');
    return null;
  }
}

function appendNewIncidents(sheet, incidentsToAppend) { 
  if (!sheet || !incidentsToAppend || incidentsToAppend.length === 0) {
    return;
  }
  try {
    const incidentRows = incidentsToAppend.map(incident => [ 
      incident.incidentId, incident.title, incident.description,
      incident.dateOfIncident, incident.datePublished, incident.locationText,
      incident.state, incident.district, incident.cityVillage,
      incident.latitude, incident.longitude, incident.victimCommunity,
      incident.incidentType, incident.perpetrators, incident.policeAction,
      incident.sourceUrl, incident.sourceName, incident.sourceSection,
      incident.rssFeedSource, incident.geminiAnalysis, incident.lastUpdated,
      incident.verificationStatus, incident.notes
    ]);

    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, incidentRows.length, CONFIG.HEADERS.INCIDENTS.length)
      .setValues(incidentRows);
    logSystemEvent(`Appended ${incidentRows.length} new incidents to "${sheet.getName()}".`, 'INFO');
  } catch (error) {
    logSystemEvent(`Error appending incidents to "${sheet.getName()}": ${error.message} \nStack: ${error.stack}`, 'ERROR');
  }
}

function updatePublicSheetIfNeeded(publicSheet, newIncidentsToConsider) { 
  if (!publicSheet) {
      logSystemEvent('Public sheet not found for update.', 'ERROR');
      return;
  }
  if (!newIncidentsToConsider || newIncidentsToConsider.length === 0) {
    return;
  }

  try {
    const relevantIncidentsForPublic = newIncidentsToConsider.filter(inc => 
        inc.verificationStatus === 'Verified by Gemini' || inc.verificationStatus === 'Verified Manually'
    );

    if (relevantIncidentsForPublic.length === 0) {
        return;
    }
    
    const publicRows = relevantIncidentsForPublic.map(incident => {
        const locationSummary = [incident.cityVillage, incident.district, incident.state].filter(Boolean).join(', ');
        return [
            incident.incidentId, incident.title, incident.dateOfIncident,
            locationSummary, incident.state, incident.victimCommunity,
            incident.incidentType, incident.sourceName, incident.sourceUrl,
            incident.lastUpdated
        ];
    });

    const lastRow = publicSheet.getLastRow();
    publicSheet.getRange(lastRow + 1, 1, publicRows.length, CONFIG.HEADERS.PUBLIC.length)
      .setValues(publicRows);

    logSystemEvent(`Updated public sheet "${publicSheet.getName()}" with ${publicRows.length} verified incidents.`, 'INFO');
    exportPublicDataAsJson(); 
  } catch (error) {
    logSystemEvent(`Error updating public sheet "${publicSheet.getName()}": ${error.message} \nStack: ${error.stack}`, 'ERROR');
  }
}


function cleanupOldData(sheet) {
  if (!sheet) return;
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return; 

    const data = sheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.INCIDENTS.length).getValues();
    const dateColName = 'Date Published'; 
    const dateColIndex = CONFIG.HEADERS.INCIDENTS.indexOf(dateColName); 
    
    if (dateColIndex === -1) {
      logSystemEvent(`Column "${dateColName}" for cleanup not found. Check CONFIG.HEADERS.INCIDENTS.`, 'ERROR');
      return;
    }

    const now = new Date();
    const retentionDays = parseInt(PropertiesService.getScriptProperties().getProperty('DATA_RETENTION_DAYS')) || 365; 
    const cutoffDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));
        
    let rowsToDeleteIndices = []; 
    for (let i = 0; i < data.length; i++) { 
      const rowDateString = data[i][dateColIndex];
      if (rowDateString) {
        try {
            const rowDate = new Date(rowDateString);
            if (!isNaN(rowDate.valueOf()) && rowDate < cutoffDate) { 
                rowsToDeleteIndices.push(i + 2); 
            }
        } catch (dateError) {
            logSystemEvent(`Could not parse date "${rowDateString}" in row ${i+2} during cleanup. Error: ${dateError.message}`, 'WARNING');
        }
      }
    }

    if (rowsToDeleteIndices.length > 0) {
      rowsToDeleteIndices.sort((a, b) => b - a); 
      rowsToDeleteIndices.forEach(rowIndex => {
        sheet.deleteRow(rowIndex);
      });
      logSystemEvent(`Cleaned up ${rowsToDeleteIndices.length} old incidents from "${sheet.getName()}".`, 'INFO');
    }
  } catch (error) {
    logSystemEvent(`Error cleaning up old data from "${sheet.getName()}": ${error.message} \nStack: ${error.stack}`, 'ERROR');
  }
}

function logSystemEvent(message, level = 'INFO') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
    
    if (!logSheet) { 
        logSheet = ss.insertSheet(CONFIG.SHEETS.LOGS, 0); 
        const logHeaders = CONFIG.HEADERS.LOGS || ['Timestamp', 'Level', 'Message']; 
        if (logSheet.getLastRow() === 0) { 
            logSheet.appendRow(logHeaders);
            formatHeaders(logSheet, logHeaders.length); 
            formatLogsSheet(logSheet); 
        }
        console.warn('Log sheet was missing and has been recreated.');
    }
    
    logSheet.insertRowBefore(2); 
    const timestamp = new Date();
    logSheet.getRange(2, 1, 1, CONFIG.HEADERS.LOGS.length).setValues([[
      timestamp.toISOString(), 
      level.toString(),        
      message.toString().substring(0, 30000) 
    ]]);
    console.log(`${timestamp.toLocaleTimeString()} [${level}] ${message}`); 
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Failed to log system event ("${message}") to sheet: ${error.message} \nStack: ${error.stack}`);
  }
}

function cleanupLogs() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
    if (!logSheet) return;

    const lastRow = logSheet.getLastRow();
    const maxEntries = CONFIG.MAX_LOG_ENTRIES > 0 ? CONFIG.MAX_LOG_ENTRIES : 500; 
    
    if (lastRow > maxEntries + 1) { 
      const numToDelete = lastRow - (maxEntries + 1);
      logSheet.deleteRows(maxEntries + 2, numToDelete); 
      console.log(`Cleaned up ${numToDelete} old log entries.`);
    }
  } catch (error) {
      logSystemEvent(`Error cleaning up logs: ${error.message}`, 'ERROR'); 
  }
}

// ============= TRIGGER MANAGEMENT =============
function createOrReplaceTrigger() {
  let triggerCreated = false;
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'fetchAndProcessData') {
        ScriptApp.deleteTrigger(trigger);
        logSystemEvent('Deleted existing time trigger for fetchAndProcessData.', 'INFO');
      }
    });
    
    if (CONFIG.UPDATE_FREQUENCY > 0) { 
      ScriptApp.newTrigger('fetchAndProcessData')
        .timeBased()
        .everyHours(CONFIG.UPDATE_FREQUENCY) 
        .create();
      logSystemEvent(`Time trigger created/replaced to run fetchAndProcessData (processing one feed) every ${CONFIG.UPDATE_FREQUENCY} hours.`, 'INFO');
      triggerCreated = true;
    } else { 
      logSystemEvent('CONFIG.UPDATE_FREQUENCY is not set for hourly. Manual trigger setup or adjustment needed for more frequent runs.', 'WARNING');
    }
  } catch (e) {
    logSystemEvent(`Error creating/replacing trigger: ${e.message}`, 'ERROR');
  }
  return triggerCreated; 
}

// ============= PUBLIC DATA EXPORT =============
function exportPublicDataAsJson() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const publicSheet = ss.getSheetByName(CONFIG.SHEETS.PUBLIC);
    if (!publicSheet) {
        logSystemEvent(`Public sheet "${CONFIG.SHEETS.PUBLIC}" not found for JSON export.`, 'ERROR');
        return;
    }
    const lastRow = publicSheet.getLastRow();
    let jsonDataString = "[]"; 

    if (lastRow >= 2) { 
        const data = publicSheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.PUBLIC.length).getValues();
        const headers = CONFIG.HEADERS.PUBLIC;
        
        const publicDataArray = data.map(row => {
          const item = {};
          headers.forEach((header, index) => {
            const key = header.replace(/\s+/g, ''); 
            item[key] = row[index];
          });
          return item;
        });
        jsonDataString = JSON.stringify(publicDataArray, null, 2);
    } 
    
    updateJsonSheet(jsonDataString);

  } catch (error) {
    logSystemEvent(`Error exporting public data to JSON: ${error.message} \nStack: ${error.stack}`, 'ERROR');
  }
}

function updateJsonSheet(jsonDataString) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jsonSheetName = 'public_json_data';
    let jsonSheet = ss.getSheetByName(jsonSheetName); 
    if (!jsonSheet) {
      jsonSheet = ss.insertSheet(jsonSheetName);
      logSystemEvent(`Created new sheet "${jsonSheetName}" for JSON output.`, 'INFO');
    } else {
      jsonSheet.clearContents(); 
    }
    
    jsonSheet.getRange('A1').setValue(jsonDataString); 
    jsonSheet.setColumnWidth(1, 800); 
    
    const protection = jsonSheet.protect().setDescription('Public JSON Data Protection');
    const currentUser = Session.getActiveUser() ? Session.getActiveUser().getEmail() : null;
    if (currentUser) {
        protection.addEditor(currentUser);
    }
}


// ============= ON EDIT TRIGGER for Manual Verification Sync =============
/**
 * Automatically syncs manually verified incidents to the PublicData sheet.
 * This is a simple trigger and runs when a user edits the spreadsheet.
 * @param {Object} e The event object.
 */
function onEdit(e) {
  try {
    const editedRange = e.range;
    const editedSheet = editedRange.getSheet();
    
    if (editedSheet.getName() === CONFIG.SHEETS.INCIDENTS && editedRange.getRow() > 1) { // Check if IncidentData and not header
      const editedRow = editedRange.getRow();
      const editedCol = editedRange.getColumn();
      const newValue = e.value;

      const verificationStatusColIndex = CONFIG.HEADERS.INCIDENTS.indexOf('Verification Status') + 1;

      if (editedCol === verificationStatusCol && newValue === 'Verified Manually') {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const incidentsSheet = editedSheet; 
        const publicSheet = ss.getSheetByName(CONFIG.SHEETS.PUBLIC);

        if (!publicSheet) {
          logSystemEvent('onEdit: PublicData sheet not found. Cannot sync manual verification.', 'ERROR');
          return;
        }

        logSystemEvent(`onEdit: Manual verification to "${newValue}" detected in "${CONFIG.SHEETS.INCIDENTS}", row ${editedRow}. Attempting to sync to PublicData.`, 'INFO');

        // Get necessary data directly from the edited row values
        const incidentRowValues = incidentsSheet.getRange(editedRow, 1, 1, CONFIG.HEADERS.INCIDENTS.length).getValues()[0];
        
        const incidentObject = {};
        CONFIG.HEADERS.INCIDENTS.forEach((header, index) => {
            incidentObject[header] = incidentRowValues[index];
        });

        const incidentId = incidentObject['Incident ID'];

        if (!incidentId) {
            logSystemEvent(`onEdit: Incident ID is missing in row ${editedRow} of IncidentData. Cannot sync.`, 'WARNING');
            return;
        }

        // Check if this incident ID already exists in PublicData
        const publicIncidentIdColPublic = CONFIG.HEADERS.PUBLIC.indexOf('Incident ID') + 1;
        let isAlreadyPublic = false;
        if (publicSheet.getLastRow() >= 2 && publicIncidentIdColPublic > 0) {
            const publicIncidentIds = publicSheet.getRange(2, publicIncidentIdColPublic, publicSheet.getLastRow() - 1, 1).getValues().flat();
            if (publicIncidentIds.includes(incidentId)) {
                isAlreadyPublic = true;
                logSystemEvent(`onEdit: Incident ID "${incidentId}" is already in PublicData. No new append needed.`, 'INFO');
                // Consider if you want to UPDATE the existing row in PublicData here if other details might change.
                // For now, it just prevents re-appending.
            }
        }

        if (!isAlreadyPublic) {
          const cityVillage = incidentObject['City/Village'] || '';
          const district = incidentObject['District'] || '';
          const state = incidentObject['State'] || '';
          const locationSummary = [cityVillage, district, state].filter(Boolean).join(', ');

          const publicRowData = [
            incidentId,
            incidentObject['Title'],
            incidentObject['Date of Incident'],
            locationSummary,
            state, 
            incidentObject['Victim Community'],
            incidentObject['Incident Type'],
            incidentObject['Source Name'],
            incidentObject['Source URL'],
            new Date().toISOString() // Update 'Last Updated' to reflect this sync time
          ];

          publicSheet.appendRow(publicRowData);
          logSystemEvent(`onEdit: Incident ID "${incidentId}" (manually verified) appended to PublicData.`, 'INFO');
          exportPublicDataAsJson(); // Update the JSON export
        }
      }
    }
  } catch (error) {
    try {
      logSystemEvent(`onEdit Error: ${error.message} \nStack: ${error.stack}`, 'ERROR');
    } catch (logError) {
      // Fallback if logSystemEvent itself fails (e.g., sheet issues)
      console.error(`onEdit Error: ${error.message}. Also failed to log to sheet: ${logError.message}`);
    }
  }
}


// ============= MENU ITEMS & MANUAL RUNS =============
function onOpen(e) { 
  SpreadsheetApp.getUi()
    .createMenu('DalitTracker Admin')
    .addItem('Initialize/Verify Sheets', 'initializeSheetsAndAlert')
    .addItem('Fetch Next Feed (Manual)', 'manualTriggerRunSingleFeed') 
    .addItem('Create/Replace Time Trigger', 'createOrReplaceTriggerAndAlert')
    .addItem('Export Public Data to JSON Sheet', 'exportPublicDataAsJsonAndAlert')
    .addItem('Reset Processed Feed Index', 'resetFeedIndexAndAlert')
    .addToUi();
}

function initializeSheetsAndAlert(){
    if(initializeSheets()){
        SpreadsheetApp.getUi().alert('Sheet initialization/verification complete.');
    } else {
        SpreadsheetApp.getUi().alert('Sheet initialization/verification failed. Check logs.');
    }
}
function createOrReplaceTriggerAndAlert(){
    if(createOrReplaceTrigger()){
        SpreadsheetApp.getUi().alert('Time trigger created/replaced successfully.');
    } else {
        SpreadsheetApp.getUi().alert('Failed to create/replace time trigger. Check logs.');
    }
}
function exportPublicDataAsJsonAndAlert(){
    exportPublicDataAsJson(); 
    SpreadsheetApp.getUi().alert('Public data export to JSON sheet attempted. Check logs and "public_json_data" sheet.');
}

function manualTriggerRunSingleFeed() { 
    logSystemEvent('Manual run: fetchAndProcessData (single feed) initiated by user.', 'INFO');
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput("Processing next feed... Check logs for progress. This might take a few minutes.<br>You can close this dialog."), "Processing News");
    try {
        fetchAndProcessData(); 
        logSystemEvent('Manual run: fetchAndProcessData (single feed) completed.', 'INFO');
        SpreadsheetApp.getUi().alert('Manual data fetch for one feed complete. Check logs for details.');
    } catch (e) {
        logSystemEvent(`Error during manual run (single feed): ${e.message}`, "ERROR");
        SpreadsheetApp.getUi().alert(`Error during manual run (single feed): ${e.message}. Check logs.`);
    }
}

function resetFeedIndexAndAlert(){
    PropertiesService.getScriptProperties().setProperty('lastProcessedFeedIndex', '0'); // Store as string
    // PropertiesService.getScriptProperties().deleteProperty('currentFeedNextArticleIndex'); // This was an idea, not fully implemented per feed
     const feedsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.FEEDS);
    if (feedsSheet) {
        const nextArticleIndexCol = CONFIG.HEADERS.FEEDS.indexOf('Next Article Index') + 1;
        if (nextArticleIndexCol > 0 && feedsSheet.getLastRow() > 1) {
            feedsSheet.getRange(2, nextArticleIndexCol, feedsSheet.getLastRow() -1, 1).setValue(0);
            logSystemEvent('Reset Next Article Index for all feeds to 0.', 'INFO');
        }
    }
    logSystemEvent('Feed processing index reset to 0. Next run will start from the first feed.', 'INFO');
    SpreadsheetApp.getUi().alert('Feed processing index has been reset. The script will start from the first feed on its next run. All feeds will restart article processing from the beginning.');
}
