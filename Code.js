function checkEmailsAndUpdateSheet() {
  let testing = true;
  const sheetNames = ["Internship Tracker", "Search Queries"];
  //testing ? resetSheet("Testing") : resetSheet(sheetNames[0]);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const queriesSheet = spreadsheet.getSheetByName(sheetNames[1]);
  const dataSheet = testing ? spreadsheet.getSheetByName("Testing") : spreadsheet.getSheetByName(sheetNames[0]);

  // reset the current sheet which includes adding the header
  resetSheet(dataSheet)

  // Ensure both sheets exist
  if (!queriesSheet || !dataSheet) {
    SpreadsheetApp.getUi().alert("Ensure the sheets named ${sheetNames[0]} and ${sheetNames[1]} exist.");
    return;
  }


  // Read search queries from the 'Search Queries' sheet
  const queryIds = queriesSheet.getRange(2,1, queriesSheet.getLastRow() - 1).getValues().flat();
  const queries = queriesSheet.getRange(2, 2, queriesSheet.getLastRow() - 1).getValues().flat();
  const results = [];

  // Combine queryIds and queries into a single array of arrays (using map)
  const queriesArray = queryIds.map((id, index) => {
  return [id, queries[index]]; // Return each pair of [queryId, query]
  });

  // Debugging: Log the combined queriesArray to ensure both IDs and queries are correct
  console.log(queriesArray);

  const dataSheetRows = [];
  
  queriesArray.forEach(([queryId, query]) => {
    console.log(queryId);
    const threads = GmailApp.search(query); // Search Gmail with the query
    results.push([queryId, query, threads.length]); // Store query and hit count
    
    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
        const emailBody = message.getBody();
        const dateApplied = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), "M/d/yyyy");
        const subject = message.getSubject();
        const company = subject.match(/at (.+)$/)?.[1] || "Unknown";
        const linkMatch = emailBody.match(/(https?:\/\/[^\s]+)/);
        const link = linkMatch ? linkMatch[1] : "No link found";
        
        // Add data to the main sheet
        dataSheetRows.push([
          queryId,
          dateApplied,
          company,
          "Position Unknown",
          "Location Unknown",
          "Applied",
          link
        ]);
      });
    });
  });

  dataSheetRows.sort((a, b) => {
  const dateA = new Date(a[1]);
  const dateB = new Date(b[1]);
  return dateA - dateB;  // Sort in ascending order (earlier dates first)
  });

  dataSheetRows.forEach(row => {
    dataSheet.appendRow(row);
  });

  // make the columns so they fit the data adequately
  autoResizeWithMarginAndWrap(dataSheet, 15, 300);

  if(!testing) {
    dataSheet.deleteColumn(1);
  } 

  // Update the 'Hits Found' column in the 'Search Queries' sheet
  queries.forEach((query, index) => {
    queriesSheet.getRange(index + 2, 4).setValue(results[index][2]); // Update 'Hits Found'
  });

  SpreadsheetApp.getUi().alert("Queries processed successfully!");

}

function addHeader(dataSheet) {

  const header = ["QueryID","Date Applied","Company/Organization","Position","Location of Internship", "Application Status", "Link with internship information"]

  const existingRows = dataSheet.getDataRange().getValues();

  // Check if the row already exists
  const headerExists = existingRows.some(row => row.join() === header.join());

  if (!headerExists) {
    // clear all the data (will comment out when not needed anymore)
    //dataSheet.clear();
    // Add the new row
    dataSheet.appendRow(header);
  } else {
    console.log("header exists");
  }
}

function resetSheet(dataSheet) {
  const maxRows = dataSheet.getMaxRows();
  const maxColumns = dataSheet.getMaxColumns();
  const fullRange = dataSheet.getRange(1, 1, maxRows, maxColumns);

  if (!dataSheet) {
    console.error(`Sheet with the name "${sheetName}" not found!`);
    return;
  }

  // Step 1: Clear all data (including formats and validation)
  dataSheet.clear(); // Clears content, formats, data validation, etc.

  // Step 2: Remove any filters
  if (dataSheet.getFilter()) {
    dataSheet.getFilter().remove(); // Removes any active filters
  }

  // // Step 3: Clear all formatting
  // dataSheet.clearFormats(); // Clears all formatting (e.g., colors, borders, font styles)

  // Step 4: Unmerge all merged cells
  const mergedRanges = fullRange.getMergedRanges();
  if (mergedRanges.length > 0) {
    mergedRanges.forEach(range => range.breakApart()); // Unmerges any merged cells
  } else {
    console.log("No merged ranges found.");
  }
  
  // Reset row heights to default value
  for (let i = 1; i <= maxRows; i++) {
    dataSheet.setRowHeight(i, 21); // Default row height is 21
  }

  // Reset column widths to default value
  for (let j = 1; j <= maxColumns; j++) {
    dataSheet.setColumnWidth(j, 100); // Default column width is 100
  }

  // Step 6: Remove any data validation
  const range = dataSheet.getDataRange();
  range.clearDataValidations(); // Clears any data validation rules

  // Step 7: Set font size for the entire sheet
  fullRange.setFontSize(14); // Set font size for entire sheet

  // Step 8: Make the headers bold
  const headersRange = dataSheet.getRange(1, 1, 1, maxColumns); // Select the first row (headers)
  headersRange.setFontWeight("bold");

  addHeader(dataSheet);
}

function autoResizeWithMarginAndWrap(sheet, extraWidth, wrapThreshold) {

  if (!sheet) {
    console.error(`Sheet with the name "${sheetName}" not found!`);
    return;
  }

  // Get the number of columns
  const maxColumns = sheet.getLastColumn();

  // Step 1: Auto-resize all columns
  sheet.autoResizeColumns(1, maxColumns - 1);
  sheet.setColumnWidth(maxColumns, wrapThreshold)


  // Step 2: Adjust column widths and enable wrapping for wide columns
  for (let col = 1; col <= maxColumns; col++) {
    const currentWidth = sheet.getColumnWidth(col);

    // Add extra width to the column
    const newWidth = currentWidth + extraWidth;
    sheet.setColumnWidth(col, newWidth);

    // Enable text wrapping if the column width exceeds the threshold
    if (newWidth > wrapThreshold) {
      const columnRange = sheet.getRange(1, col, sheet.getMaxRows());
      columnRange.setWrap(true);
    }
  }

  console.log(`Auto-resized columns with an extra width of ${extraWidth} px and enabled wrapping for columns over ${wrapThreshold} px.`);
}




