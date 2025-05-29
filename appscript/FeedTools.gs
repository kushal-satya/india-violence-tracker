/**
 * Test feed processing for a specific feed by URL.
 * This function allows testing of a single feed to check if it's working properly.
 * Useful for debugging feed issues.
 */
function testFeedProcessing() {
  const ui = SpreadsheetApp.getUi();
  const feedUrlResponse = ui.prompt(
    'Test Feed Processing',
    'Enter the URL of the feed to test:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (feedUrlResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const feedUrl = feedUrlResponse.getResponseText().trim();
  if (!feedUrl || !feedUrl.startsWith('http')) {
    ui.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://', ui.ButtonSet.OK);
    return;
  }
  
  try {
    logSystemEvent(`Testing feed processing for URL: ${feedUrl}`, 'INFO', 'testFeedProcessing');
    
    // Try to fetch the feed
    const feedItems = fetchRSSFeed(feedUrl);
    
    if (!feedItems || feedItems.length === 0) {
      ui.alert('Feed Test Results', 'No items found in the feed. Check logs for details.', ui.ButtonSet.OK);
      return;
    }
    
    let itemSummary = `Successfully fetched ${feedItems.length} items from the feed.\n\nFirst 3 items:`;
    
    // Show first few items
    for (let i = 0; i < Math.min(3, feedItems.length); i++) {
      const item = feedItems[i];
      itemSummary += `\n\n[${i+1}] Title: ${item.title}\nLink: ${item.link}\nDate: ${item.pubDate}`;
    }
    
    ui.alert('Feed Test Results', itemSummary, ui.ButtonSet.OK);
    
  } catch (error) {
    logSystemEvent(`Error testing feed: ${error.message}`, 'ERROR', 'testFeedProcessing');
    ui.alert('Feed Test Error', `Error processing feed: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * View all available feeds and their statuses
 */
function viewFeedStatuses() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const feedsSheet = ss.getSheetByName(CONFIG.SHEETS.FEEDS);
  
  if (!feedsSheet) {
    ui.alert('Feeds Sheet Not Found', 'The feeds sheet could not be found.', ui.ButtonSet.OK);
    return;
  }
  
  const lastRow = feedsSheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('No Feeds', 'No feeds are configured in the system.', ui.ButtonSet.OK);
    return;
  }
  
  // Get all feed data
  const data = feedsSheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.FEEDS.length).getValues();
  
  // Get column indices
  const nameCol = CONFIG.HEADERS.FEEDS.indexOf('Name');
  const urlCol = CONFIG.HEADERS.FEEDS.indexOf('URL');
  const activeCol = CONFIG.HEADERS.FEEDS.indexOf('Active');
  const statusCol = CONFIG.HEADERS.FEEDS.indexOf('Status');
  const lastCheckedCol = CONFIG.HEADERS.FEEDS.indexOf('Last Checked');
  const errorCountCol = CONFIG.HEADERS.FEEDS.indexOf('Error Count');
  const nextArticleIndexCol = CONFIG.HEADERS.FEEDS.indexOf('Next Article Index');
  
  // Build status summary
  let statusSummary = 'Feed Statuses:\n\n';
  let activeCount = 0;
  let errorCount = 0;
  
  data.forEach((row, index) => {
    const isActive = row[activeCol];
    if (isActive === true) {
      activeCount++;
      
      const hasErrors = row[errorCountCol] > 0;
      if (hasErrors) {
        errorCount++;
      }
      
      statusSummary += `[${index + 1}] ${row[nameCol]}\n`;
      statusSummary += `  Status: ${row[statusCol] || 'Not processed'}\n`;
      statusSummary += `  Next Article Index: ${row[nextArticleIndexCol] || 0}\n`;
      statusSummary += `  Error Count: ${row[errorCountCol] || 0}\n`;
      statusSummary += `  Last Checked: ${row[lastCheckedCol] ? new Date(row[lastCheckedCol]).toLocaleString() : 'Never'}\n\n`;
    }
  });
  
  statusSummary += `\nSummary: ${activeCount} active feeds, ${errorCount} with errors.`;
  
  ui.alert('Feed Status Report', statusSummary, ui.ButtonSet.OK);
}

/**
 * Reset the next article index for all feeds to force reprocessing 
 * from the beginning on the next run.
 */
function resetAllFeedIndexes() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Reset Feed Indexes',
    'This will reset the next article index for ALL feeds to 0, causing them to be reprocessed from the beginning on the next run. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const feedsSheet = ss.getSheetByName(CONFIG.SHEETS.FEEDS);
    
    if (!feedsSheet) {
      ui.alert('Error', 'Feeds sheet not found.', ui.ButtonSet.OK);
      return;
    }
    
    const lastRow = feedsSheet.getLastRow();
    if (lastRow < 2) {
      ui.alert('No Feeds', 'No feeds found to reset.', ui.ButtonSet.OK);
      return;
    }
    
    const nextArticleIndexCol = CONFIG.HEADERS.FEEDS.indexOf('Next Article Index') + 1;
    if (nextArticleIndexCol < 1) {
      ui.alert('Error', 'Next Article Index column not found.', ui.ButtonSet.OK);
      return;
    }
    
    // Reset all feed indexes to 0
    const range = feedsSheet.getRange(2, nextArticleIndexCol, lastRow - 1, 1);
    range.setValue(0);
    
    // Also reset the script property
    PropertiesService.getScriptProperties().setProperty('lastProcessedFeedIndex', '0');
    
    logSystemEvent('All feed next article indexes have been reset to 0.', 'INFO', 'resetAllFeedIndexes');
    ui.alert('Success', 'All feed indexes have been reset to 0.', ui.ButtonSet.OK);
    
  } catch (error) {
    logSystemEvent(`Error resetting feed indexes: ${error.message}`, 'ERROR', 'resetAllFeedIndexes');
    ui.alert('Error', `Failed to reset feed indexes: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Creates a menu in the spreadsheet UI for feed management functions
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('India Violence Tracker')
    .addItem('Initialize/Refresh Sheets', 'initializeSheets')
    .addItem('Process Feeds Now', 'fetchAndProcessData')
    .addSeparator()
    .addItem('Test a Feed URL', 'testFeedProcessing')
    .addItem('View Feed Statuses', 'viewFeedStatuses')
    .addItem('Reset All Feed Indexes', 'resetAllFeedIndexes')
    .addSeparator()
    .addItem('Update Public Data', 'refreshPublicData')
    .addToUi();
}
