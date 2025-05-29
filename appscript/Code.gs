// Google Apps Script for India Violence Tracker
// Enhanced version with language translation, keyword filtering, and duplicate detection

// ============= CONFIGURATION =============
const CONFIG = {
  // Sheet names
  SHEETS: {
    FEEDS: 'feeds',
    INCIDENTS: 'IncidentData',
    PUBLIC: 'PublicData',
    LOGS: 'SystemLogs',
    DUPLICATES: 'DuplicateTracker',
    LOCATIONS: 'LocationCache'
  },
  
  // Headers for different sheets
  HEADERS: {
    FEEDS: ['Name', 'Section', 'URL', 'Active', 'Last Checked', 'Status', 'Last Success', 'Error Count', 'Next Article Index'],
    INCIDENTS: [
      'Incident ID',
      'Headline',
      'Summary',
      'Incident Date',
      'Published At',
      'Location',
      'District',
      'State',
      'Latitude',
      'Longitude',
      'Victim Group',
      'Incident Type',
      'Alleged Perpetrator',
      'Police Action',
      'Source URL',
      'Source Name',
      'RSS Feed ID',
      'Content Hash',
      'Language',
      'Confidence Score',
      'Verified Manually',
      'Last Updated'
    ],
    PUBLIC: [
      'incident_id',
      'headline',
      'summary', 
      'incident_date',
      'published_at',
      'location',
      'district',
      'state',
      'lat',
      'lon',
      'victim_group',
      'incident_type',
      'alleged_perp',
      'police_action',
      'source_url',
      'source_name',
      'rss_feed_id',
      'confidence_score',
      'verified_manually'
    ],
    LOGS: ['Timestamp', 'Level', 'Function', 'Message', 'Details'],
    DUPLICATES: ['URL Hash', 'Content Hash', 'Incident ID', 'Source URL', 'Title', 'Date Added'],
    LOCATIONS: ['Location Text', 'State', 'District', 'City', 'Latitude', 'Longitude', 'Last Updated']
  },
  
  // Enhanced keywords for filtering
  KEYWORDS: {
    violence: [
      'violence', 'attack', 'assault', 'murder', 'killing', 'death', 'lynching', 'beating', 'thrashing',
      'rape', 'molestation', 'harassment', 'torture', 'brutality', 'shot', 'stabbed', 'injured', 'hurt',
      'हिंसा', 'हमला', 'मार', 'हत्या', 'पीटा'
    ],
    communities: [
      'dalit', 'dalits', 'scheduled caste', 'sc', 'adivasi', 'tribal', 'scheduled tribe', 'st',
      'muslim', 'muslims', 'christian', 'christians', 'minority', 'minorities', 'obc',
      'backward class', 'bahujan', 'harijan', 'girijan',
      'दलित', 'आदिवासी', 'मुस्लिम', 'ईसाई', 'अल्पसंख्यक'
    ],
    discrimination: [
      'discrimination', 'atrocity', 'hate crime', 'caste', 'casteist', 'communal', 'religious',
      'untouchability', 'boycott', 'ostracized', 'excluded', 'denied entry',
      'भेदभाव', 'अत्याचार', 'जातिवाद', 'साम्प्रदायिक'
    ]
  },
  
  // Processing settings
  MAX_ARTICLES_PER_RUN: 50,
  MAX_ARTICLES_PER_FEED_BATCH: 10,
  MAX_LOG_ENTRIES: 2000,
  DUPLICATE_CHECK_DAYS: 30,
  UPDATE_FREQUENCY: 2, // Hours between runs
  
  // Gemini API Configuration
  GEMINI_MODEL_NAME: "gemini-1.5-flash-latest",
  GEMINI_TRANSLATE_MODEL: "gemini-1.5-flash-latest",
  
  // Language settings
  SUPPORTED_LANGUAGES: ['hi', 'en'], // Hindi and English
  DEFAULT_LANGUAGE: 'en'
};

// ============= SHEET MANAGEMENT =============

function initializeSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Create all required sheets
    Object.entries(CONFIG.SHEETS).forEach(([key, sheetName]) => {
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        logSystemEvent(`Sheet "${sheetName}" created.`, 'INFO', 'initializeSheets');
      }
      
      const headers = CONFIG.HEADERS[key.toUpperCase()]; 
      if (headers) {
        setupSheetHeaders(sheet, headers, sheetName);
      }
      
      // Apply sheet-specific formatting
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
        case CONFIG.SHEETS.DUPLICATES:
          formatDuplicatesSheet(sheet);
          break;
        case CONFIG.SHEETS.LOCATIONS:
          formatLocationsSheet(sheet);
          break;
      }
    });
    
    setupSheetProtection(ss); 
    
    // Initialize feeds data
    const feedsSheet = ss.getSheetByName(CONFIG.SHEETS.FEEDS);
    if (feedsSheet && feedsSheet.getLastRow() <= 1) { 
      addInitialFeeds(feedsSheet);
    }
    
    logSystemEvent('All sheets initialized successfully', 'INFO', 'initializeSheets');
    return true;
  } catch (error) {
    logSystemEvent(`Error initializing sheets: ${error.message}`, 'ERROR', 'initializeSheets', error.stack);
    return false;
  }
}

function setupSheetHeaders(sheet, headers, sheetName) {
  let existingHeadersMatch = false;
  if (sheet.getLastRow() > 0 && sheet.getLastColumn() >= headers.length) {
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    existingHeadersMatch = currentHeaders.every((val, index) => val === headers[index]);
  }

  if (!existingHeadersMatch) {
    if (sheet.getLastRow() > 0) {
      logSystemEvent(`Updating headers in sheet "${sheetName}"`, 'WARNING', 'setupSheetHeaders');
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaders(sheet, headers.length);
  }
}

function formatHeaders(sheet, numColumns) {
  if (numColumns > 0 && sheet) { 
    sheet.getRange(1, 1, 1, numColumns)
      .setBackground('#1f2937') 
      .setFontColor('#ffffff')
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
  const verificationStatusCol = CONFIG.HEADERS.INCIDENTS.indexOf('Verified Manually') + 1;
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
  setColWidth('Incident ID', 120); setColWidth('Headline', 300); setColWidth('Summary', 200);
  setColWidth('Incident Date', 120); setColWidth('Published At', 120); setColWidth('Location', 200);
  setColWidth('State', 100); setColWidth('District', 100); setColWidth('Victim Group', 120);
  setColWidth('Latitude', 100); setColWidth('Longitude', 100); setColWidth('Source URL', 250);
  setColWidth('Incident Type', 150); setColWidth('Verified Manually', 150);
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
  setColWidth('Timestamp', 180); setColWidth('Level', 80); setColWidth('Function', 120); setColWidth('Message', 500); setColWidth('Details', 300);
  
  if (sheet.getMaxRows() > 1) {
    try {
      const logDataRange = sheet.getRange(2, 1, sheet.getMaxRows() -1 , CONFIG.HEADERS.LOGS.length);
      if (logDataRange) { 
        // Clear any existing banding first
        const existingBandings = sheet.getBandings();
        existingBandings.forEach(banding => banding.remove());
        
        // Now apply new banding
        logDataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY)
                    .setHeaderRowColor('#e2e8f0'); 
      }
    } catch (bandingError) {
      logSystemEvent(`Could not apply banding to logs sheet: ${bandingError.message}`, 'WARNING', 'formatLogsSheet');
    }
  }
}

function formatLogsSheetSilent(sheet) {
  if (!sheet) return;
  const setColWidth = (headerName, width) => {
      try {
          const colIndex = CONFIG.HEADERS.LOGS.indexOf(headerName) + 1;
          if (colIndex > 0) sheet.setColumnWidth(colIndex, width);
      } catch(e){ 
        console.warn(`Error formatting Logs sheet column '${headerName}': ${e.message}`);
      }
  };
  setColWidth('Timestamp', 180); setColWidth('Level', 80); setColWidth('Function', 120); setColWidth('Message', 500); setColWidth('Details', 300);
  
  if (sheet.getMaxRows() > 1) {
    try {
      const logDataRange = sheet.getRange(2, 1, sheet.getMaxRows() -1 , CONFIG.HEADERS.LOGS.length);
      if (logDataRange) { 
        // Clear any existing banding first
        const existingBandings = sheet.getBandings();
        existingBandings.forEach(banding => banding.remove());
        
        // Now apply new banding
        logDataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY)
                    .setHeaderRowColor('#e2e8f0'); 
      }
    } catch (bandingError) {
      console.warn(`Could not apply banding to logs sheet: ${bandingError.message}`);
    }
  }
}

function formatDuplicatesSheet(sheet) {
  if (!sheet) return;
  const setColWidth = (headerName, width) => {
      try {
          const colIndex = CONFIG.HEADERS.DUPLICATES.indexOf(headerName) + 1;
          if (colIndex > 0) sheet.setColumnWidth(colIndex, width);
      } catch(e){ logSystemEvent(`Error formatting Duplicates sheet column '${headerName}': ${e.message}`, 'WARNING');}
  };
  setColWidth('URL Hash', 120);
  setColWidth('Content Hash', 120);
  setColWidth('Incident ID', 120);
  setColWidth('Source URL', 350);
  setColWidth('Title', 300);
  setColWidth('Date Added', 150);
}

function formatLocationsSheet(sheet) {
  if (!sheet) return;
  const setColWidth = (headerName, width) => {
      try {
          const colIndex = CONFIG.HEADERS.LOCATIONS.indexOf(headerName) + 1;
          if (colIndex > 0) sheet.setColumnWidth(colIndex, width);
      } catch(e){ logSystemEvent(`Error formatting Locations sheet column '${headerName}': ${e.message}`, 'WARNING');}
  };
  setColWidth('Location Text', 200);
  setColWidth('State', 100);
  setColWidth('District', 100);
  setColWidth('City', 100);
  setColWidth('Latitude', 100);
  setColWidth('Longitude', 100);
  setColWidth('Last Updated', 150);
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
    // Google News RSS feeds
    ['Google News - Dalit', 'Dalit', 'https://rss.app/feeds/P8K5BBCE7t1JWZQ3.xml', true, 0],
    ['Google News - Dalit Violence', 'Dalit Violence', 'https://rss.app/feeds/B2SZJnVStF6ULAjJ.xml', true, 0],
    ['Google News - Adivasi Rights', 'Adivasi', 'https://rss.app/feeds/C3TYH5DDG2KXWER4.xml', true, 0],
    ['Google News - Tribal Violence', 'Tribal', 'https://rss.app/feeds/D4UZI6EEH3LYXFS5.xml', true, 0],
    ['Google News - Minority Rights', 'Minority', 'https://rss.app/feeds/E5VAJ7FFI4MZYGT6.xml', true, 0],
    ['Google News - Caste Violence', 'Caste Violence', 'https://rss.app/feeds/F6WBK8GGJ5NAZHU7.xml', true, 0],
    ['Google News - SC ST Atrocities', 'SC/ST Atrocities', 'https://rss.app/feeds/G7XCL9HHK6OBAIV8.xml', true, 0],
    ['Google News - Communal Violence', 'Communal', 'https://rss.app/feeds/H8YDM0IIL7PCBJW9.xml', true, 0],
    ['Google News - Religious Violence', 'Religious', 'https://rss.app/feeds/I9ZEN1JJM8QDCKX0.xml', true, 0],
    
    // Major National News Sources
    ['The Hindu - National', 'National', 'https://www.thehindu.com/news/national/feeder/default.rss', true, 0],
    ['The Hindu - Politics', 'Politics', 'https://www.thehindu.com/news/national/feeder/default.rss', true, 0],
    ['Times of India - India', 'National', 'https://timesofindia.indiatimes.com/rssfeeds/1466318071.cms', true, 0],
    ['Indian Express - India', 'National', 'https://indianexpress.com/section/india/feed/', true, 0],
    ['NDTV India', 'National', 'https://feeds.feedburner.com/ndtvnews-latest', true, 0],
    ['Hindustan Times - India News', 'National', 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', true, 0],
    ['News18 India', 'National', 'https://www.news18.com/rss/india.xml', true, 0],
    ['Republic World', 'National', 'https://www.republicworld.com/feeds/trending.xml', true, 0],
    ['Zee News - India', 'National', 'https://zeenews.india.com/rss/india-national-news.xml', true, 0],
    ['India Today', 'National', 'https://www.indiatoday.in/rss/1206514', true, 0],
    ['The Print', 'National', 'https://theprint.in/feed/', true, 0],
    
    // Progressive and Rights-focused Publications
    ['The Wire - Rights', 'Rights', 'https://thewire.in/rss/category/rights', true, 0],
    ['The Wire - Dalit', 'Dalit', 'https://thewire.in/rss/category/rights/dalit', true, 0],
    ['The Wire - Communalism', 'Communal', 'https://thewire.in/rss/category/communalism', true, 0],
    ['The Wire - Caste', 'Caste', 'https://thewire.in/rss/category/caste', true, 0],
    ['Scroll.in', 'Progressive', 'https://scroll.in/feed', true, 0],
    ['The Caravan', 'Progressive', 'https://caravanmagazine.in/rss.xml', true, 0],
    ['Outlook India', 'Progressive', 'https://www.outlookindia.com/rss/main', true, 0],
    ['Frontline Magazine', 'Progressive', 'https://frontline.thehindu.com/rss/', true, 0],
    ['Countercurrents', 'Progressive', 'https://countercurrents.org/feed/', true, 0],
    ['Sabrang India', 'Human Rights', 'https://sabrangindia.in/rss.xml', true, 0],
    ['People\'s Democracy', 'Progressive', 'https://peoplesdemocracy.in/feed/', true, 0],
    
    // Regional News Sources - North India
    ['Amar Ujala - National', 'Regional North', 'https://www.amarujala.com/rss/national.xml', true, 0],
    ['Dainik Bhaskar', 'Regional North', 'https://www.bhaskar.com/rss-feed/1027/', true, 0],
    ['Dainik Jagran', 'Regional North', 'https://www.jagran.com/rss/news/national.xml', true, 0],
    ['Punjab Kesari', 'Regional North', 'https://www.punjabkesari.in/rss/1', true, 0],
    ['The Tribune', 'Regional North', 'https://www.tribuneindia.com/rss/nation', true, 0],
    ['Patrika', 'Regional North', 'https://www.patrika.com/rss/india-news.xml', true, 0],
    
    // Regional News Sources - South India
    ['Deccan Herald', 'Regional South', 'https://www.deccanherald.com/rss/national.rss', true, 0],
    ['The New Indian Express', 'Regional South', 'https://www.newindianexpress.com/rss/nation.xml', true, 0],
    ['The News Minute', 'Regional South', 'https://www.thenewsminute.com/rss.xml', true, 0],
    ['Deccan Chronicle', 'Regional South', 'https://www.deccanchronicle.com/rss/nation.xml', true, 0],
    ['Mathrubhumi', 'Regional South', 'https://www.mathrubhumi.com/rss/india', true, 0],
    ['Dinamalar', 'Regional South', 'https://www.dinamalar.com/rss/rss_india.xml', true, 0],
    
    // Regional News Sources - West India
    ['Mumbai Mirror', 'Regional West', 'https://mumbaimirror.indiatimes.com/rss.cms', true, 0],
    ['Mid Day', 'Regional West', 'https://www.mid-day.com/rss.aspx', true, 0],
    ['Free Press Journal', 'Regional West', 'https://www.freepressjournal.in/rss/india.xml', true, 0],
    ['Gujarat Samachar', 'Regional West', 'https://www.gujaratsamachar.com/rss/national.xml', true, 0],
    ['Divya Bhaskar', 'Regional West', 'https://www.divyabhaskar.co.in/rss/national.xml', true, 0],
    
    // Regional News Sources - East India
    ['The Telegraph', 'Regional East', 'https://www.telegraphindia.com/rss/nation', true, 0],
    ['Ananda Bazar Patrika', 'Regional East', 'https://www.anandabazar.com/rss/nation.xml', true, 0],
    ['Ei Samay', 'Regional East', 'https://eisamay.indiatimes.com/rss.cms', true, 0],
    ['The Statesman', 'Regional East', 'https://www.thestatesman.com/rss/india.xml', true, 0],
    
    // State-specific News Sources
    ['UP - Amar Ujala UP', 'Uttar Pradesh', 'https://www.amarujala.com/rss/uttar-pradesh.xml', true, 0],
    ['Bihar - Dainik Jagran Bihar', 'Bihar', 'https://www.jagran.com/rss/news/bihar.xml', true, 0],
    ['MP - Patrika MP', 'Madhya Pradesh', 'https://www.patrika.com/rss/madhya-pradesh-news.xml', true, 0],
    ['Rajasthan - Patrika Rajasthan', 'Rajasthan', 'https://www.patrika.com/rss/rajasthan-news.xml', true, 0],
    ['Haryana - Dainik Bhaskar Haryana', 'Haryana', 'https://www.bhaskar.com/rss-feed/2/haryana/', true, 0],
    ['Punjab - Tribune Punjab', 'Punjab', 'https://www.tribuneindia.com/rss/punjab', true, 0],
    ['Gujarat - Divya Bhaskar Gujarat', 'Gujarat', 'https://www.divyabhaskar.co.in/rss/gujarat.xml', true, 0],
    ['Maharashtra - Mid Day Maharashtra', 'Maharashtra', 'https://www.mid-day.com/rss/maharashtra.aspx', true, 0],
    ['Karnataka - Deccan Herald Karnataka', 'Karnataka', 'https://www.deccanherald.com/rss/karnataka.rss', true, 0],
    ['Tamil Nadu - The Hindu Tamil Nadu', 'Tamil Nadu', 'https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss', true, 0],
    ['Andhra Pradesh - Deccan Chronicle AP', 'Andhra Pradesh', 'https://www.deccanchronicle.com/rss/andhra-pradesh.xml', true, 0],
    ['Telangana - Deccan Chronicle Telangana', 'Telangana', 'https://www.deccanchronicle.com/rss/telangana.xml', true, 0],
    ['Kerala - Mathrubhumi Kerala', 'Kerala', 'https://www.mathrubhumi.com/rss/kerala', true, 0],
    ['West Bengal - Telegraph WB', 'West Bengal', 'https://www.telegraphindia.com/rss/west-bengal', true, 0],
    ['Odisha - New Indian Express Odisha', 'Odisha', 'https://www.newindianexpress.com/rss/odisha.xml', true, 0],
    ['Jharkhand - Jagran Jharkhand', 'Jharkhand', 'https://www.jagran.com/rss/news/jharkhand.xml', true, 0],
    ['Chhattisgarh - Patrika CG', 'Chhattisgarh', 'https://www.patrika.com/rss/chhattisgarh-news.xml', true, 0],
    ['Assam - The Sentinel Assam', 'Assam', 'https://www.sentinelassam.com/rss/assam.xml', true, 0],
    
    // Specialized Human Rights and Social Justice Sources
    ['Human Rights Watch India', 'Human Rights', 'https://www.hrw.org/rss/tags/india', true, 0],
    ['Amnesty International India', 'Human Rights', 'https://amnesty.org.in/feed/', true, 0],
    ['PUCL', 'Human Rights', 'https://www.pucl.org/feed/', true, 0],
    ['Dalit Camera', 'Dalit Rights', 'https://www.dalitcamera.com/feed/', true, 0],
    ['Round Table India', 'Dalit Rights', 'https://roundtableindia.co.in/feed/', true, 0],
    ['The Mooknayak', 'Dalit Rights', 'https://themooknayak.com/feed/', true, 0],
    ['Dalit Post', 'Dalit Rights', 'https://dalitpost.in/feed/', true, 0],
    ['Adivasi Resurgence', 'Tribal Rights', 'https://adivasiresurgence.com/feed/', true, 0],
    ['Indigenous Perspectives', 'Tribal Rights', 'https://indigenousperspectives.org/feed/', true, 0],
    ['Minority Rights Group', 'Minority Rights', 'https://minorityrights.org/feed/', true, 0],
    
    // Alternative and Independent Media
    ['Alt News', 'Fact Check', 'https://www.altnews.in/feed/', true, 0],
    ['The Quint', 'Independent', 'https://www.thequint.com/rss', true, 0],
    ['Newslaundry', 'Independent', 'https://www.newslaundry.com/feed', true, 0],
    ['The Citizen', 'Independent', 'https://www.thecitizen.in/feed/', true, 0],
    ['Maktoob Media', 'Minority', 'https://maktoobmedia.com/feed/', true, 0],
    ['TwoCircles.net', 'Minority', 'https://twocircles.net/feed/', true, 0],
    ['The Kashmir Walla', 'Regional J&K', 'https://thekashmirwalla.com/feed/', true, 0],
    ['Kashmir Reader', 'Regional J&K', 'https://kashmirreader.com/feed/', true, 0],
    
    // Hindi News Sources
    ['BBC Hindi', 'Hindi National', 'https://feeds.bbci.co.uk/hindi/rss.xml', true, 0],
    ['Navbharat Times', 'Hindi National', 'https://navbharattimes.indiatimes.com/rssfeeds/1466318821.cms', true, 0],
    ['NDTV India Hindi', 'Hindi National', 'https://feeds.feedburner.com/NdtvHindi-MukhyaSamachar', true, 0],
    ['Aaj Tak', 'Hindi National', 'https://www.aajtak.in/rss.cms', true, 0],
    ['ABP News', 'Hindi National', 'https://www.abplive.com/rss/india', true, 0],
    ['India TV Hindi', 'Hindi National', 'https://www.indiatvnews.com/rss/india.xml', true, 0],
    ['Zee Hindustan', 'Hindi National', 'https://zeenews.india.com/hindi/rss/india.xml', true, 0]
  ];
  
  if (initialFeeds.length > 0 && sheet) { 
    const dataToInsert = initialFeeds.map(feed => [feed[0], feed[1], feed[2], feed[3], '', '', '', 0, feed[4]]); // Added Next Article Index
    sheet.getRange(sheet.getLastRow() + 1, 1, dataToInsert.length, dataToInsert[0].length).setValues(dataToInsert);
    logSystemEvent(`Added ${initialFeeds.length} initial feeds to "${sheet.getName()}".`, 'INFO', 'addInitialFeeds');
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
    You are an expert analyst for tracking violence incidents in India. Analyze the following news item to determine if it reports a verifiable incident of violence, hate crime, discrimination, or atrocity specifically targeting Dalit, Bahujan, Adivasi, or minority communities in India. 

    IMPORTANT: General crime news is NOT relevant unless it clearly specifies caste/community-based targeting or mentions specific marginalized communities.

    News Item Content:
    ${newsContent}

    LOCATION EXTRACTION INSTRUCTIONS:
    - Extract the most specific location mentioned (village/town/city level if available)
    - For latitude/longitude: Use your knowledge of Indian geography to provide approximate coordinates
    - Common Indian states: Uttar Pradesh, Bihar, Maharashtra, Tamil Nadu, Karnataka, Gujarat, etc.
    - Format state names properly (e.g., "Uttar Pradesh" not "UP")
    - If multiple locations mentioned, use the incident location, not just source location
    
    RELEVANCE CRITERIA:
    ✓ RELEVANT: Violence against Dalits, Adivasis, Muslims, Christians, other minorities
    ✓ RELEVANT: Caste-based discrimination, untouchability, social boycott
    ✓ RELEVANT: Communal violence, religious targeting
    ✗ NOT RELEVANT: General crime without community targeting
    ✗ NOT RELEVANT: Political news without community violence
    ✗ NOT RELEVANT: Economic/development news

    Return ONLY valid JSON in this exact structure:
    {
      "isRelevant": boolean,
      "relevanceReason": "Brief explanation for relevance/irrelevance with specific community mentioned",
      "incidentDetails": {
        "incidentDate": "YYYY-MM-DD (actual incident date if mentioned, null if not found)",
        "location": {
          "fullText": "Complete location as mentioned (e.g., 'Shamli district, Uttar Pradesh')",
          "cityVillage": "Specific city/village name",
          "district": "District name",
          "state": "Full state name (e.g., 'Uttar Pradesh')",
          "latitude": 28.9631,
          "longitude": 77.3127
        },
        "victimCommunity": ["Specific communities: Dalit, Adivasi, Muslim, Christian, Sikh, etc."],
        "incidentType": ["Categories: Physical Assault, Murder, Rape, Social Boycott, Property Damage, Verbal Abuse, Discrimination, Police Inaction"],
        "policeActionTaken": "What police action was mentioned, if any",
        "perpetratorsMentioned": "Description of alleged perpetrators"
      },
      "confidenceScore": "High/Medium/Low"
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

    // Ensure all required sheets exist
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
    
    // Get active feeds for processing
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

    // Get the next feed to process
    const feedToProcess = activeFeeds[lastProcessedFeedIndex];
    logSystemEvent(`Processing feed #${lastProcessedFeedIndex + 1}/${activeFeeds.length}: ${feedToProcess.name} (${feedToProcess.url})`, 'INFO');

    let feedProcessedSuccessfully = false; 
    let errorDetailForStatus = '';
    let currentFeedNextArticleIndex = feedToProcess.nextArticleIndex || 0;
    let articlesProcessedInThisRun = 0;

    try {
      // Fetch the RSS feed items
      logSystemEvent(`Fetching RSS feed from ${feedToProcess.url}`, 'INFO');
      const allFeedItems = fetchRSSFeed(feedToProcess.url); 
      
      if (allFeedItems && allFeedItems.length > 0) {
        logSystemEvent(`Successfully fetched ${allFeedItems.length} items from feed: ${feedToProcess.name}`, 'INFO');
        
        // Determine which articles to process
        const articlesToConsider = allFeedItems.slice(currentFeedNextArticleIndex); 
        const articlesForThisBatch = articlesToConsider.slice(0, CONFIG.MAX_ARTICLES_PER_FEED_BATCH);

        logSystemEvent(`Fetched ${allFeedItems.length} total items from ${feedToProcess.name}. Starting from index ${currentFeedNextArticleIndex}. Processing up to ${articlesForThisBatch.length} in this batch.`, 'INFO');
        
        // Process the articles
        const newIncidentsFromThisFeedBatch = processFeedItems(articlesForThisBatch, feedToProcess, incidentsSheet, publicSheet);
        
        articlesProcessedInThisRun = articlesForThisBatch.length;
        currentFeedNextArticleIndex += articlesProcessedInThisRun;

        if (newIncidentsFromThisFeedBatch.length > 0) {
             logSystemEvent(`Added ${newIncidentsFromThisFeedBatch.length} new incidents from feed: ${feedToProcess.name}.`, 'INFO');
        } else {
             logSystemEvent(`No new incidents added from feed: ${feedToProcess.name}. ${articlesForThisBatch.length} articles processed but none matched criteria or were duplicates.`, 'INFO');
        }
      } else {
          logSystemEvent(`No items fetched or returned from feed: ${feedToProcess.name}. This could indicate an issue with the feed URL or format.`, 'WARNING');
          currentFeedNextArticleIndex = 0; // Reset the index when feed is empty
      }
      feedProcessedSuccessfully = true;
    } catch (error) {
      errorDetailForStatus = error.message; 
      logSystemEvent(`Error processing feed ${feedToProcess.name} (URL: ${feedToProcess.url}): ${error.message} \nStack: ${error.stack}`, 'ERROR');
    }

    let nextArticleIndexForSheet;
    
    // Avoid re-fetching the feed unnecessarily
    if (feedProcessedSuccessfully) {
      if (articlesProcessedInThisRun > 0) {
        // Save current feed processing state
        nextArticleIndexForSheet = currentFeedNextArticleIndex;
        logSystemEvent(`Feed ${feedToProcess.name} processed successfully. Next article index set to ${nextArticleIndexForSheet}`, 'INFO');
      } else {
        // If we had no articles to process, reset to 0 to start from beginning next time
        nextArticleIndexForSheet = 0;
        logSystemEvent(`No articles to process for feed: ${feedToProcess.name}. Resetting its next article index to 0.`, 'INFO');
      }
    } else {
      // On error, keep the old index to retry the same batch
      nextArticleIndexForSheet = feedToProcess.nextArticleIndex;
      logSystemEvent(`Feed ${feedToProcess.name} processing failed. Keeping next article index at ${nextArticleIndexForSheet} for retry.`, 'INFO');
    }
    
    updateFeedStatus(feedsSheet, feedToProcess.rowIndexInSheet, feedProcessedSuccessfully, errorDetailForStatus, nextArticleIndexForSheet);
    
    scriptProperties.setProperty('lastProcessedFeedIndex', String(lastProcessedFeedIndex + 1)); 
        
    cleanupOldData(incidentsSheet); 
    cleanupLogs();
    
  } catch (error) {
    logSystemEvent(`Critical error in fetchAndProcessData: ${error.message} \nStack: ${error.stack}`, 'ERROR', 'fetchAndProcessData');
  }
}

// ============= LANGUAGE DETECTION AND TRANSLATION =============

function detectLanguage(text) {
  try {
    // Simple heuristic - if contains Devanagari script, it's likely Hindi
    const devanagariPattern = /[\u0900-\u097F]/;
    if (devanagariPattern.test(text)) {
      return 'hi'; // Hindi
    }
    
    // Check for common Hindi words in Latin script
    const hindiWordsInLatin = ['aur', 'hai', 'hain', 'tha', 'the', 'mein', 'se', 'ko', 'ka', 'ki', 'ke'];
    const words = text.toLowerCase().split(/\s+/);
    const hindiWordCount = words.filter(word => hindiWordsInLatin.includes(word)).length;
    
    if (hindiWordCount > words.length * 0.1) { // If more than 10% Hindi words
      return 'hi';
    }
    
    return 'en'; // Default to English
  } catch (error) {
    logSystemEvent(`Error detecting language: ${error.message}`, 'WARNING', 'detectLanguage');
    return 'en'; // Default to English on error
  }
}

function translateWithGemini(text, targetLanguage = 'en') {
  const scriptProperties = PropertiesService.getScriptProperties();
  const API_KEY = scriptProperties.getProperty('GEMINI_API_KEY');

  if (!API_KEY) {
    logSystemEvent("Gemini API Key not found for translation", "ERROR", 'translateWithGemini');
    return text; // Return original text if no API key
  }

  const prompt = `Translate the following text to ${targetLanguage === 'en' ? 'English' : 'Hindi'}. Return only the translation, no additional text:

${text}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { 
      temperature: 0.1, 
      maxOutputTokens: 1024 
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_TRANSLATE_MODEL}:generateContent`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true 
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(response.getContentText());
      if (responseData.candidates && responseData.candidates[0] && 
          responseData.candidates[0].content && responseData.candidates[0].content.parts && 
          responseData.candidates[0].content.parts[0]) {
        return responseData.candidates[0].content.parts[0].text.trim();
      }
    } else {
      logSystemEvent(`Translation API error: ${responseCode}`, 'WARNING', 'translateWithGemini');
    }
  } catch (error) {
    logSystemEvent(`Translation error: ${error.message}`, 'ERROR', 'translateWithGemini');
  }
  
  return text; // Return original text on error
}

// ============= KEYWORD FILTERING =============

function shouldProcessWithKeywords(item) {
  try {
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const content = `${title} ${description}`;
    
    // Check for violence keywords
    const hasViolenceKeywords = CONFIG.KEYWORDS.violence.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    // Check for community keywords
    const hasCommunityKeywords = CONFIG.KEYWORDS.communities.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    // Check for discrimination keywords
    const hasDiscriminationKeywords = CONFIG.KEYWORDS.discrimination.some(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    // Must have at least one violence/discrimination keyword AND one community keyword
    const shouldProcess = (hasViolenceKeywords || hasDiscriminationKeywords) && hasCommunityKeywords;
    
    if (!shouldProcess) {
      logSystemEvent(`Filtered out item (no relevant keywords): "${title.substring(0, 50)}..."`, 'INFO', 'shouldProcessWithKeywords');
    }
    
    return shouldProcess;
  } catch (error) {
    logSystemEvent(`Error in keyword filtering: ${error.message}`, 'ERROR', 'shouldProcessWithKeywords');
    return false; // Err on the side of caution
  }
}

// ============= CONTENT HASHING AND DUPLICATE DETECTION =============

function generateContentHash(text) {
  try {
    // Simple hash function - normalize text and create a hash
    const normalized = text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Simple hash algorithm (djb2)
    let hash = 5381;
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
    }
    return Math.abs(hash).toString(16);
  } catch (error) {
    logSystemEvent(`Error generating content hash: ${error.message}`, 'ERROR', 'generateContentHash');
    return null;
  }
}

function generateUrlHash(url) {
  try {
    // Normalize URL - remove query parameters and fragments
    const normalizedUrl = url.split('?')[0].split('#')[0].toLowerCase().trim();
    
    let hash = 5381;
    for (let i = 0; i < normalizedUrl.length; i++) {
      hash = ((hash << 5) + hash) + normalizedUrl.charCodeAt(i);
    }
    return Math.abs(hash).toString(16);
  } catch (error) {
    logSystemEvent(`Error generating URL hash: ${error.message}`, 'ERROR', 'generateUrlHash');
    return null;
  }
}

function isAdvancedDuplicate(item, incidentsSheet, duplicatesSheet) {
  try {
    if (!item.link || !incidentsSheet) return false;
    
    const urlHash = generateUrlHash(item.link);
    const contentHash = generateContentHash(`${item.title || ''} ${item.description || ''}`);
    
    if (!urlHash || !contentHash) return false;
    
    // Check URL duplicates in incidents sheet
    const sourceUrlColumn = CONFIG.HEADERS.INCIDENTS.indexOf('Source URL') + 1;
    if (sourceUrlColumn > 0 && incidentsSheet.getLastRow() >= 2) {
      const existingUrls = incidentsSheet.getRange(2, sourceUrlColumn, incidentsSheet.getLastRow() - 1, 1)
        .getValues().flat();
      if (existingUrls.includes(item.link.trim())) {
        return true;
      }
    }
    
    // Check hash duplicates in duplicates sheet
    if (duplicatesSheet && duplicatesSheet.getLastRow() >= 2) {
      const hashData = duplicatesSheet.getRange(2, 1, duplicatesSheet.getLastRow() - 1, 2).getValues();
      for (const row of hashData) {
        if (row[0] === urlHash || row[1] === contentHash) {
          return true;
        }
      }
    }
    
    // If not duplicate, record the hashes
    if (duplicatesSheet) {
      recordDuplicateHash(duplicatesSheet, urlHash, contentHash, '', item.link, item.title || '');
    }
    
    return false;
  } catch (error) {
    logSystemEvent(`Error in advanced duplicate check: ${error.message}`, 'ERROR', 'isAdvancedDuplicate');
    return false;
  }
}

function recordDuplicateHash(duplicatesSheet, urlHash, contentHash, incidentId, sourceUrl, title) {
  try {
    if (!duplicatesSheet) return;
    
    const newRow = [
      urlHash,
      contentHash,
      incidentId,
      sourceUrl,
      title.substring(0, 200), // Truncate title
      new Date().toISOString()
    ];
    
    duplicatesSheet.appendRow(newRow);
  } catch (error) {
    logSystemEvent(`Error recording duplicate hash: ${error.message}`, 'ERROR', 'recordDuplicateHash');
  }
}

// ============= LOCATION GEOCODING =============

function getLocationCoordinates(locationText, locationsSheet) {
  try {
    if (!locationText || locationText.trim() === '') return { latitude: null, longitude: null };
    
    const normalizedLocation = locationText.trim().toLowerCase();
    
    // Check cache first
    if (locationsSheet && locationsSheet.getLastRow() >= 2) {
      const locationData = locationsSheet.getRange(2, 1, locationsSheet.getLastRow() - 1, CONFIG.HEADERS.LOCATIONS.length).getValues();
      for (const row of locationData) {
        if (row[0] && row[0].toLowerCase() === normalizedLocation) {
          return {
            latitude: row[4] || null,
            longitude: row[5] || null,
            state: row[1] || '',
            district: row[2] || '',
            city: row[3] || ''
          };
        }
      }
    }
    
    // Simple location parsing for Indian places
    const locationParts = locationText.split(',').map(part => part.trim());
    let state = '', district = '', city = '';
    
    // Basic parsing logic
    if (locationParts.length >= 3) {
      city = locationParts[0];
      district = locationParts[1];
      state = locationParts[2];
    } else if (locationParts.length === 2) {
      city = locationParts[0];
      state = locationParts[1];
    } else {
      city = locationParts[0];
    }
    
    // Use a simple coordinate lookup for major Indian states/cities
    const coordinates = getIndianLocationCoordinates(state, district, city);
    
    // Cache the result
    if (locationsSheet) {
      cacheLocationData(locationsSheet, locationText, state, district, city, coordinates.latitude, coordinates.longitude);
    }
    
    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      state: state,
      district: district,
      city: city
    };
  } catch (error) {
    logSystemEvent(`Error getting location coordinates: ${error.message}`, 'ERROR', 'getLocationCoordinates');
    return { latitude: null, longitude: null, state: '', district: '', city: '' };
  }
}

function getIndianLocationCoordinates(state, district, city) {
  // Simple lookup table for major Indian locations
  const stateCoordinates = {
    'uttar pradesh': { latitude: 26.8467, longitude: 80.9462 },
    'bihar': { latitude: 25.0961, longitude: 85.3131 },
    'west bengal': { latitude: 22.9868, longitude: 87.8550 },
    'madhya pradesh': { latitude: 22.9734, longitude: 78.6569 },
    'tamil nadu': { latitude: 11.1271, longitude: 78.6569 },
    'rajasthan': { latitude: 27.0238, longitude: 74.2179 },
    'karnataka': { latitude: 15.3173, longitude: 75.7139 },
    'gujarat': { latitude: 22.2587, longitude: 71.1924 },
    'andhra pradesh': { latitude: 15.9129, longitude: 79.7400 },
    'odisha': { latitude: 20.9517, longitude: 85.0985 },
    'kerala': { latitude: 10.8505, longitude: 76.2711 },
    'jharkhand': { latitude: 23.6102, longitude: 85.2799 },
    'assam': { latitude: 26.2006, longitude: 92.9376 },
    'punjab': { latitude: 31.1471, longitude: 75.3412 },
    'chhattisgarh': { latitude: 21.2787, longitude: 81.8661 },
    'haryana': { latitude: 29.0588, longitude: 76.0856 },
    'himachal pradesh': { latitude: 31.1048, longitude: 77.1734 },
    'jammu and kashmir': { latitude: 34.0837, longitude: 74.7973 },
    'telangana': { latitude: 18.1124, longitude: 79.0193 },
    'arunachal pradesh': { latitude: 28.2180, longitude: 94.7278 },
    'manipur': { latitude: 24.6637, longitude: 93.9063 },
    'meghalaya': { latitude: 25.4670, longitude: 91.3662 },
    'mizoram': { latitude: 23.1645, longitude: 92.9376 },
    'nagaland': { latitude: 26.1584, longitude: 94.5624 },
    'sikkim': { latitude: 27.5330, longitude: 88.5122 },
    'tripura': { latitude: 23.9408, longitude: 91.9882 },
    'uttarakhand': { latitude: 30.0668, longitude: 79.0193 },
    'goa': { latitude: 15.2993, longitude: 74.1240 },
    'delhi': { latitude: 28.7041, longitude: 77.1025 }
  };
  
  const stateKey = state.toLowerCase().trim();
  if (stateCoordinates[stateKey]) {
    return stateCoordinates[stateKey];
  }
  
  return { latitude: null, longitude: null };
}

function cacheLocationData(locationsSheet, locationText, state, district, city, latitude, longitude) {
  try {
    if (!locationsSheet) return;
    
    const newRow = [
      locationText,
      state,
      district,
      city,
      latitude,
      longitude,
      new Date().toISOString()
    ];
    
    locationsSheet.appendRow(newRow);
  } catch (error) {
    logSystemEvent(`Error caching location data: ${error.message}`, 'ERROR', 'cacheLocationData');
  }
}

function fetchRSSFeed(url) {
  try {
    logSystemEvent(`Attempting to fetch RSS feed from: ${url}`, 'INFO', 'fetchRSSFeed');
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
      logSystemEvent(`HTTP Error ${responseCode} for URL ${url}. Response: ${contentText ? contentText.substring(0, 200) : 'No content'}`, 'ERROR', 'fetchRSSFeed');
      return [];
    }
    if (!contentText) {
      logSystemEvent(`Empty response for URL ${url}`, 'ERROR', 'fetchRSSFeed');
      return [];
    }

    logSystemEvent(`Successfully fetched content from ${url}, parsing XML...`, 'INFO', 'fetchRSSFeed');
    
    // Try to parse as XML
    try {
      const xml = XmlService.parse(contentText);
      const root = xml.getRootElement();
      let items = [];
      
      // First check if this is an RSS feed
      try {
        // Handle standard RSS format
        const channel = root.getChild('channel');
        if (channel && channel.getChildren('item').length > 0) {
          const itemsXml = channel.getChildren('item');
          
          items = itemsXml.map(item => {
            try {
              let description = '';
              try {
                description = item.getChild('description') ? item.getChild('description').getValue() : '';
              } catch (e) {
                description = '';
                logSystemEvent(`Error getting description for an item in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
              }
              
              if (!description) {
                try {
                  description = item.getChild('summary') ? item.getChild('summary').getValue() : '';
                } catch (e) {
                  description = '';
                }
              }
              
              description = description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
              
              let title = '';
              try {
                title = item.getChild('title') ? item.getChild('title').getValue() : '';
              } catch (e) {
                title = '';
                logSystemEvent(`Error getting title for an item in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
              }
              
              let link = '';
              try {
                link = item.getChild('link') ? item.getChild('link').getValue() : '';
              } catch (e) {
                link = '';
                logSystemEvent(`Error getting link for an item in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
              }
              
              let pubDate = '';
              try {
                pubDate = item.getChild('pubDate') ? item.getChild('pubDate').getValue() : '';
                if (!pubDate) {
                  const dcNamespace = XmlService.getNamespace('dc', 'http://purl.org/dc/elements/1.1/');
                  if (item.getChild('date', dcNamespace)) {
                    pubDate = item.getChild('date', dcNamespace).getValue();
                  }
                }
              } catch (e) {
                pubDate = '';
                logSystemEvent(`Error getting pubDate for an item in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
              }
              
              let guid = '';
              try {
                guid = item.getChild('guid') ? item.getChild('guid').getValue() : '';
                if (!guid && link) {
                  guid = link;
                }
              } catch (e) {
                guid = link || '';
                logSystemEvent(`Error getting guid for an item in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
              }

              return {
                title: title,
                description: description.substring(0, 1000), 
                link: link,
                pubDate: pubDate,
                guid: guid
              };
            } catch (itemError) {
              logSystemEvent(`Error processing an item in RSS feed ${url}: ${itemError.message}`, 'WARNING', 'fetchRSSFeed');
              return null; // Return null for items that fail to process
            }
          }).filter(item => item !== null); // Filter out null items
          
          logSystemEvent(`Successfully parsed RSS feed from ${url}. Found ${items.length} items.`, 'INFO', 'fetchRSSFeed');
          return items;
        }
      } catch (rssError) {
        logSystemEvent(`Error processing RSS format for ${url}: ${rssError.message}. Will try Atom format.`, 'INFO', 'fetchRSSFeed');
      }
      
      // If we get here, try Atom format
      try {
        if (root.getName().toLowerCase() === 'feed') {
          const atomNamespace = root.getNamespace();
          const itemsXml = root.getChildren('entry', atomNamespace);
          
          if (itemsXml && itemsXml.length > 0) {
            items = itemsXml.map(item => {
              try {
                let description = '';
                try {
                  description = item.getChild('summary', atomNamespace) ? item.getChild('summary', atomNamespace).getText() : '';
                  if (!description) {
                    description = item.getChild('content', atomNamespace) ? item.getChild('content', atomNamespace).getText() : '';
                  }
                } catch (e) {
                  description = '';
                  logSystemEvent(`Error getting description for an Atom entry in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
                }
                
                description = description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
                
                let title = '';
                try {
                  title = item.getChild('title', atomNamespace) ? item.getChild('title', atomNamespace).getText() : '';
                } catch (e) {
                  title = '';
                  logSystemEvent(`Error getting title for an Atom entry in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
                }
                
                let link = '';
                try {
                  const linkElement = item.getChild('link', atomNamespace);
                  if (linkElement) {
                    const hrefAttr = linkElement.getAttribute('href');
                    if (hrefAttr) {
                      link = hrefAttr.getValue();
                    } else {
                      link = linkElement.getText();
                    }
                  }
                } catch (e) {
                  link = '';
                  logSystemEvent(`Error getting link for an Atom entry in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
                }
                
                let pubDate = '';
                try {
                  pubDate = item.getChild('published', atomNamespace) ? item.getChild('published', atomNamespace).getText() : '';
                  if (!pubDate) {
                    pubDate = item.getChild('updated', atomNamespace) ? item.getChild('updated', atomNamespace).getText() : '';
                  }
                } catch (e) {
                  pubDate = '';
                  logSystemEvent(`Error getting pubDate for an Atom entry in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
                }
                
                let guid = '';
                try {
                  guid = item.getChild('id', atomNamespace) ? item.getChild('id', atomNamespace).getText() : '';
                  if (!guid && link) {
                    guid = link;
                  }
                } catch (e) {
                  guid = link || '';
                  logSystemEvent(`Error getting guid for an Atom entry in feed ${url}: ${e.message}`, 'WARNING', 'fetchRSSFeed');
                }
                
                return {
                  title: title,
                  description: description.substring(0, 1000),
                  link: link,
                  pubDate: pubDate,
                  guid: guid
                };
              } catch (itemError) {
                logSystemEvent(`Error processing an Atom entry in feed ${url}: ${itemError.message}`, 'WARNING', 'fetchRSSFeed');
                return null; // Return null for items that fail to process
              }
            }).filter(item => item !== null); // Filter out null items
            
            logSystemEvent(`Successfully parsed Atom feed from ${url}. Found ${items.length} items.`, 'INFO', 'fetchRSSFeed');
            return items;
          }
        }
      } catch (atomError) {
        logSystemEvent(`Error processing Atom format for ${url}: ${atomError.message}`, 'WARNING', 'fetchRSSFeed');
      }
      
      // If we get here, we couldn't parse as RSS or Atom
      if (items.length === 0) {
        logSystemEvent(`Could not find valid 'item' or 'entry' elements in feed from ${url}. Root element is '${root.getName()}'`, 'WARNING', 'fetchRSSFeed');
        return [];
      }
      
      return items;
    } catch (xmlError) {
      // If XML parsing fails completely, log the error and return empty array
      logSystemEvent(`Failed to parse XML from ${url}: ${xmlError.message}. Content starts with: ${contentText.substring(0, 200)}`, 'ERROR', 'fetchRSSFeed');
      
      // Try a fallback method if XML parsing fails
      try {
        logSystemEvent(`Trying fallback parsing method for ${url}...`, 'INFO', 'fetchRSSFeed');
        
        // Simple regex-based extraction for common RSS patterns
        const titleRegex = /<title>(.*?)<\/title>/g;
        const linkRegex = /<link>(.*?)<\/link>/g;
        const linkHrefRegex = /<link[^>]*href=["'](.*?)["'][^>]*>/g;
        const descRegex = /<description>(.*?)<\/description>/g;
        const contentRegex = /<content:encoded>(.*?)<\/content:encoded>/g;
        const guidRegex = /<guid.*?>(.*?)<\/guid>/g;
        const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/g;
        
        let items = [];
        let itemMatches = contentText.match(/<item>[\s\S]*?<\/item>/g) || contentText.match(/<entry>[\s\S]*?<\/entry>/g) || [];
        
        for (let i = 0; i < itemMatches.length && i < 50; i++) {
          try {
            const itemText = itemMatches[i];
            
            // Extract title
            let title = '';
            const titleMatch = titleRegex.exec(itemText);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>?/gm, '');
            }
            titleRegex.lastIndex = 0; // Reset regex
            
            // Extract link
            let link = '';
            const linkMatch = linkRegex.exec(itemText);
            if (linkMatch && linkMatch[1]) {
              link = linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>?/gm, '');
            } else {
              const linkHrefMatch = linkHrefRegex.exec(itemText);
              if (linkHrefMatch && linkHrefMatch[1]) {
                link = linkHrefMatch[1];
              }
            }
            linkRegex.lastIndex = 0;
            linkHrefRegex.lastIndex = 0;
            
            // Extract description/content
            let description = '';
            const descMatch = descRegex.exec(itemText);
            if (descMatch && descMatch[1]) {
              description = descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>?/gm, '');
            } else {
              const contentMatch = contentRegex.exec(itemText);
              if (contentMatch && contentMatch[1]) {
                description = contentMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>?/gm, '');
              }
            }
            descRegex.lastIndex = 0;
            contentRegex.lastIndex = 0;
            
            // Extract guid
            let guid = link; // Default to link
            const guidMatch = guidRegex.exec(itemText);
            if (guidMatch && guidMatch[1]) {
              guid = guidMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>?/gm, '');
            }
            guidRegex.lastIndex = 0;
            
            // Extract pubDate
            let pubDate = '';
            const pubDateMatch = pubDateRegex.exec(itemText);
            if (pubDateMatch && pubDateMatch[1]) {
              pubDate = pubDateMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>?/gm, '');
            }
            pubDateRegex.lastIndex = 0;
            
            if (title && link) {
              items.push({
                title: title,
                description: description.substring(0, 1000).replace(/\s+/g, ' ').trim(),
                link: link,
                pubDate: pubDate,
                guid: guid
              });
            }
          } catch (itemError) {
            logSystemEvent(`Error in fallback parsing for an item in ${url}: ${itemError.message}`, 'WARNING', 'fetchRSSFeed');
            continue;
          }
        }
        
        if (items.length > 0) {
          logSystemEvent(`Successfully parsed feed using fallback method from ${url}. Found ${items.length} items.`, 'INFO', 'fetchRSSFeed');
          return items;
        }
      } catch (fallbackError) {
        logSystemEvent(`Fallback parsing also failed for ${url}: ${fallbackError.message}`, 'ERROR', 'fetchRSSFeed');
      }
      
      return [];
    }
  } catch (error) {
    logSystemEvent(`Failed to fetch or parse RSS feed from ${url}: ${error.message}`, 'ERROR', 'fetchRSSFeed');
    return []; // Return empty array instead of throwing an error
  }
}

// Modified to append data immediately
function processFeedItems(items, feed, incidentsSheet, publicSheet) {
  const processedIncidentsThisBatch = []; 
  if (!items || items.length === 0) {
    return processedIncidentsThisBatch;
  }

  // Get additional sheets for enhanced functionality
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const duplicatesSheet = ss.getSheetByName(CONFIG.SHEETS.DUPLICATES);
  const locationsSheet = ss.getSheetByName(CONFIG.SHEETS.LOCATIONS);

  items.forEach(item => {
    const itemTitleForLog = item.title ? item.title.substring(0,50) : (item.link || 'No Title/Link');
    try {
      if (!item.link || item.link.trim() === '') {
        logSystemEvent(`Skipping item with no valid link: ${itemTitleForLog}`, 'INFO', 'processFeedItems');
        return; 
      }

      // Enhanced duplicate detection
      if (isAdvancedDuplicate(item, incidentsSheet, duplicatesSheet)) {
        logSystemEvent(`Skipping duplicate item: ${itemTitleForLog}`, 'INFO', 'processFeedItems');
        return; 
      }

      // Keyword filtering - only process items that match our criteria
      if (!shouldProcessWithKeywords(item)) {
        return; // Item filtered out by keywords
      }

      // Language detection and translation if needed
      const detectedLanguage = detectLanguage(`${item.title || ''} ${item.description || ''}`);
      let processedItem = { ...item };
      
      if (detectedLanguage === 'hi') {
        logSystemEvent(`Hindi content detected for: ${itemTitleForLog}. Translating...`, 'INFO', 'processFeedItems');
        processedItem.title = translateWithGemini(item.title || '', 'en');
        processedItem.description = translateWithGemini(item.description || '', 'en');
        processedItem.originalLanguage = 'hi';
      } else {
        processedItem.originalLanguage = 'en';
      }

      const geminiAnalysis = callGeminiForNewsAnalysis(processedItem, feed);

      if (geminiAnalysis && geminiAnalysis.isRelevant === true && geminiAnalysis.incidentDetails) {
        const incidentRecord = createIncidentRecord(processedItem, feed, geminiAnalysis, locationsSheet);
        if (incidentRecord) {
          appendNewIncidents(incidentsSheet, [incidentRecord]); 
          updatePublicSheetIfNeeded(publicSheet, [incidentRecord]); 
          processedIncidentsThisBatch.push(incidentRecord); 
        }
      } else if (geminiAnalysis) { 
         logSystemEvent(`Incident not relevant or issue with Gemini analysis for: "${itemTitleForLog}". Reason: ${geminiAnalysis.relevanceReason || 'No reason provided.'}`, 'INFO', 'processFeedItems');
      } else { 
         logSystemEvent(`No valid Gemini analysis returned (null/undefined) for: ${itemTitleForLog}`, 'WARNING', 'processFeedItems');
      }
    } catch (e) {
      logSystemEvent(`Error processing item "${itemTitleForLog}": ${e.message} \nStack: ${e.stack}`, 'ERROR', 'processFeedItems');
    }
    Utilities.sleep(2000); 
  });
  return processedIncidentsThisBatch;
}


function createIncidentRecord(item, feed, geminiAnalysis, locationsSheet) {
  try {
    const details = geminiAnalysis.incidentDetails || {}; 
    const location = details.location || {}; 

    // Get enhanced location data with coordinates
    const locationText = location.fullText || '';
    const locationData = getLocationCoordinates(locationText, locationsSheet);

    // Generate content hash for this incident
    const contentHash = generateContentHash(`${item.title || ''} ${item.description || ''}`);

    return {
      incidentId: Utilities.getUuid(),
      headline: item.title || '',
      summary: item.description ? item.description.substring(0, 1000) : '', 
      incidentDate: details.incidentDate || null, 
      publishedAt: item.pubDate || null,
      location: locationText,
      district: locationData.district || location.district || '',
      state: locationData.state || location.state || '',
      latitude: locationData.latitude || location.latitude || null,
      longitude: locationData.longitude || location.longitude || null,
      victimGroup: Array.isArray(details.victimCommunity) ? details.victimCommunity.join(', ') : (details.victimCommunity || ''),
      incidentType: Array.isArray(details.incidentType) ? details.incidentType.join(', ') : (details.incidentType || ''),
      allegedPerp: details.perpetratorsMentioned || '',
      policeAction: details.policeActionTaken || '',
      sourceUrl: item.link || '',
      sourceName: feed.name || '',
      rssFeedId: feed.url || '',
      contentHash: contentHash,
      language: item.originalLanguage || 'en',
      confidenceScore: geminiAnalysis.confidenceScore || 'Medium',
      verifiedManually: 'Verified by Gemini',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logSystemEvent(`Error creating incident record from Gemini data for "${item.title || 'N/A'}": ${error.message} \nStack: ${error.stack}`, 'ERROR', 'createIncidentRecord');
    return null;
  }
}

function appendNewIncidents(sheet, incidentsToAppend) { 
  if (!sheet || !incidentsToAppend || incidentsToAppend.length === 0) {
    return;
  }
  try {
    const incidentRows = incidentsToAppend.map(incident => [ 
      incident.incidentId,
      incident.headline,
      incident.summary,
      incident.incidentDate,
      incident.publishedAt,
      incident.location,
      incident.district,
      incident.state,
      incident.latitude,
      incident.longitude,
      incident.victimGroup,
      incident.incidentType,
      incident.allegedPerp,
      incident.policeAction,
      incident.sourceUrl,
      incident.sourceName,
      incident.rssFeedId,
      incident.contentHash,
      incident.language,
      incident.confidenceScore,
      incident.verifiedManually,
      incident.lastUpdated
    ]);

    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, incidentRows.length, CONFIG.HEADERS.INCIDENTS.length)
      .setValues(incidentRows);
    logSystemEvent(`Appended ${incidentRows.length} new incidents to "${sheet.getName()}".`, 'INFO', 'appendNewIncidents');
  } catch (error) {
    logSystemEvent(`Error appending incidents to "${sheet.getName()}": ${error.message} \nStack: ${error.stack}`, 'ERROR', 'appendNewIncidents');
  }
}

function updatePublicSheetIfNeeded(publicSheet, newIncidentsToConsider) { 
  if (!publicSheet) {
      logSystemEvent('Public sheet not found for update.', 'ERROR', 'updatePublicSheetIfNeeded');
      return;
  }
  if (!newIncidentsToConsider || newIncidentsToConsider.length === 0) {
    return;
  }

  try {
    const relevantIncidentsForPublic = newIncidentsToConsider.filter(inc => 
        inc.verifiedManually === 'Verified by Gemini' || inc.verifiedManually === 'Verified Manually'
    );

    if (relevantIncidentsForPublic.length === 0) {
        return;
    }
    
    const publicRows = relevantIncidentsForPublic.map(incident => {
        const locationSummary = [incident.location, incident.district, incident.state].filter(Boolean).join(', ');
        return [
            incident.incidentId,
            incident.headline,
            incident.summary,
            incident.incidentDate,
            incident.publishedAt,
            locationSummary,
            incident.district,
            incident.state,
            incident.latitude,
            incident.longitude,
            incident.victimGroup,
            incident.incidentType,
            incident.allegedPerp,
            incident.policeAction,
            incident.sourceUrl,
            incident.sourceName,
            incident.rssFeedId,
            incident.confidenceScore,
            incident.verifiedManually
        ];
    });

    const lastRow = publicSheet.getLastRow();
    publicSheet.getRange(lastRow + 1, 1, publicRows.length, CONFIG.HEADERS.PUBLIC.length)
      .setValues(publicRows);

    logSystemEvent(`Updated public sheet "${publicSheet.getName()}" with ${publicRows.length} verified incidents.`, 'INFO', 'updatePublicSheetIfNeeded');
    exportPublicDataAsJson(); 
  } catch (error) {
    logSystemEvent(`Error updating public sheet "${publicSheet.getName()}": ${error.message}`, 'ERROR', 'updatePublicSheetIfNeeded', error.stack);
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
      logSystemEvent(`Column "${dateColName}" for cleanup not found. Check CONFIG.HEADERS.INCIDENTS.`, 'ERROR', 'cleanupOldData');
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
            logSystemEvent(`Could not parse date "${rowDateString}" in row ${i+2} during cleanup. Error: ${dateError.message}`, 'WARNING', 'cleanupOldData');
        }
      }
    }

    if (rowsToDeleteIndices.length > 0) {
      rowsToDeleteIndices.sort((a, b) => b - a); 
      rowsToDeleteIndices.forEach(rowIndex => {
        sheet.deleteRow(rowIndex);
      });
      logSystemEvent(`Cleaned up ${rowsToDeleteIndices.length} old incidents from "${sheet.getName()}".`, 'INFO', 'cleanupOldData');
    }
  } catch (error) {
    logSystemEvent(`Error cleaning up old data from "${sheet.getName()}": ${error.message}`, 'ERROR', 'cleanupOldData', error.stack);
  }
}

function logSystemEvent(message, level = 'INFO', functionName = '', details = '') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
    
    if (!logSheet) { 
        logSheet = ss.insertSheet(CONFIG.SHEETS.LOGS, 0); 
        const logHeaders = CONFIG.HEADERS.LOGS || ['Timestamp', 'Level', 'Function', 'Message', 'Details']; 
        if (logSheet.getLastRow() === 0) { 
            logSheet.appendRow(logHeaders);
            formatHeaders(logSheet, logHeaders.length); 
            // Format the logs sheet but don't log the formatting process to avoid recursion
            try {
              formatLogsSheetSilent(logSheet);
            } catch (formatError) {
              console.warn('Could not format logs sheet:', formatError.message);
            }
        }
        console.warn('Log sheet was missing and has been recreated.');
    }
    
    logSheet.insertRowBefore(2); 
    const timestamp = new Date();
    
    // Ensure we always provide exactly 5 values to match CONFIG.HEADERS.LOGS
    const rowData = [
      timestamp.toISOString(), 
      level.toString(),
      functionName.toString(),        
      message.toString().substring(0, 30000),
      details.toString().substring(0, 10000)
    ];
    
    logSheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
    console.log(`${timestamp.toLocaleTimeString()} [${level}] ${functionName ? functionName + ': ' : ''}${message}`); 
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
    logSystemEvent(`Error cleaning up logs: ${error.message}`, 'ERROR', 'cleanupLogs'); 
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
      logSystemEvent(`Time trigger created/replaced to run fetchAndProcessData (processing one feed) every ${CONFIG.UPDATE_FREQUENCY} hours.`, 'INFO', 'createOrReplaceTrigger');
      triggerCreated = true;
    } else { 
      logSystemEvent('CONFIG.UPDATE_FREQUENCY is not set for hourly. Manual trigger setup or adjustment needed for more frequent runs.', 'WARNING', 'createOrReplaceTrigger');
    }
  } catch (e) {
    logSystemEvent(`Error creating/replacing trigger: ${e.message}`, 'ERROR', 'createOrReplaceTrigger');
  }
  return triggerCreated; 
}

// ============= PUBLIC DATA EXPORT =============
function exportPublicDataAsJson() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const publicSheet = ss.getSheetByName(CONFIG.SHEETS.PUBLIC);
    if (!publicSheet) {
        logSystemEvent(`Public sheet "${CONFIG.SHEETS.PUBLIC}" not found for JSON export.`, 'ERROR', 'exportPublicDataAsJson');
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
    logSystemEvent(`Error exporting public data to JSON: ${error.message}`, 'ERROR', 'exportPublicDataAsJson', error.stack);
  }
}

function updateJsonSheet(jsonDataString) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const jsonSheetName = 'public_json_data';
    let jsonSheet = ss.getSheetByName(jsonSheetName); 
    if (!jsonSheet) {
      jsonSheet = ss.insertSheet(jsonSheetName);
      logSystemEvent(`Created new sheet "${jsonSheetName}" for JSON output.`, 'INFO', 'updateJsonSheet');
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

      const verificationStatusColIndex = CONFIG.HEADERS.INCIDENTS.indexOf('Verified Manually') + 1;

      if (editedCol === verificationStatusColIndex && newValue === 'Verified Manually') {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const incidentsSheet = editedSheet; 
        const publicSheet = ss.getSheetByName(CONFIG.SHEETS.PUBLIC);

        if (!publicSheet) {
          logSystemEvent('onEdit: PublicData sheet not found. Cannot sync manual verification.', 'ERROR', 'onEdit');
          return;
        }

        logSystemEvent(`onEdit: Manual verification to "${newValue}" detected in "${CONFIG.SHEETS.INCIDENTS}", row ${editedRow}. Attempting to sync to PublicData.`, 'INFO', 'onEdit');

        // Get necessary data directly from the edited row values
        const incidentRowValues = incidentsSheet.getRange(editedRow, 1, 1, CONFIG.HEADERS.INCIDENTS.length).getValues()[0];
        
        const incidentObject = {};
        CONFIG.HEADERS.INCIDENTS.forEach((header, index) => {
            incidentObject[header] = incidentRowValues[index];
        });

        const incidentId = incidentObject['Incident ID'];

        if (!incidentId) {
            logSystemEvent(`onEdit: Incident ID is missing in row ${editedRow} of IncidentData. Cannot sync.`, 'WARNING', 'onEdit');
            return;
        }

        // Check if this incident ID already exists in PublicData
        const publicIncidentIdColPublic = CONFIG.HEADERS.PUBLIC.indexOf('incident_id') + 1;
        let isAlreadyPublic = false;
        if (publicSheet.getLastRow() >= 2 && publicIncidentIdColPublic > 0) {
            const publicIncidentIds = publicSheet.getRange(2, publicIncidentIdColPublic, publicSheet.getLastRow() - 1, 1).getValues().flat();
            if (publicIncidentIds.includes(incidentId)) {
                isAlreadyPublic = true;
                logSystemEvent(`onEdit: Incident ID "${incidentId}" is already in PublicData. No new append needed.`, 'INFO', 'onEdit');
                // Consider if you want to UPDATE the existing row in PublicData here if other details might change.
                // For now, it just prevents re-appending.
            }
        }

        if (!isAlreadyPublic) {
          const location = incidentObject['Location'] || '';
          const district = incidentObject['District'] || '';
          const state = incidentObject['State'] || '';
          const locationSummary = [location, district, state].filter(Boolean).join(', ');

          const publicRowData = [
            incidentId,
            incidentObject['Headline'],
            incidentObject['Summary'],
            incidentObject['Incident Date'],
            incidentObject['Published At'],
            locationSummary,
            district,
            state,
            incidentObject['Latitude'],
            incidentObject['Longitude'],
            incidentObject['Victim Group'],
            incidentObject['Incident Type'],
            incidentObject['Alleged Perpetrator'],
            incidentObject['Police Action'],
            incidentObject['Source URL'],
            incidentObject['Source Name'],
            incidentObject['RSS Feed ID'],
            incidentObject['Confidence Score'],
            incidentObject['Verified Manually']
          ];

          publicSheet.appendRow(publicRowData);
          logSystemEvent(`onEdit: Incident ID "${incidentId}" (manually verified) appended to PublicData.`, 'INFO', 'onEdit');
          exportPublicDataAsJson(); // Update the JSON export
        }
      }
    }
  } catch (error) {
    try {
      logSystemEvent(`onEdit Error: ${error.message}`, 'ERROR', 'onEdit', error.stack);
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