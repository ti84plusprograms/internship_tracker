let testing = true;

function checkEmailsAndUpdateSheet() {
  const sheetNames = ["Internship Tracker", "Search Queries", "ML_Dataset"];
  //testing ? resetSheet("Testing") : resetSheet(sheetNames[0]);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const queriesSheet = spreadsheet.getSheetByName(sheetNames[1]);
  const dataSheet = testing ? spreadsheet.getSheetByName("Testing") : spreadsheet.getSheetByName(sheetNames[0]);

  // reset the current sheet which includes adding the header
  resetSheet(dataSheet);

  // Ensure both sheets exist
  if (!queriesSheet || !dataSheet) {
    SpreadsheetApp.getUi().alert("Ensure the sheets named ${sheetNames[0]} and ${sheetNames[1]} exist.");
    return;
  }


  // Read search queries from the 'Search Queries' sheet
  const queries = ml_data == 0 ? queriesSheet.getRange(2, 2, queriesSheet.getLastRow() - 1).getValues().flat() : [`subject:("applying" OR "applied" OR "application" OR "applies")`];

  if (queries.length === 0) {
    SpreadsheetApp.getUi().alert("No queries found in 'Search Queries'. Please add some queries.");
    return;
  }
  const results = [];

  const dataSheetRows = [];
  const mlDatasetRows = [];

  const threads = GmailApp.search('in:inbox OR in:spam');
  let emails = [];

  try {
    emails = threads.flatMap(thread => thread.getMessages());
  } catch (error) {
    Logger.log("Error fetching emails: " + error.message);
  }

  console.log(emails.length)

  emails.forEach(email => {
    if (email.getThread().getMessageCount() === 1) {
      console.log(email.getSubject())
      console.log(email.getPlainBody())
    }
  })

  emails.forEach(email => {
    Logger.log("Remaining Gmail quota: " + GmailApp.getRemainingDailyQuota());
    if (email.getThread().getMessageCount() === 1) {
      const prediction = classifyEmail(email);
      if (prediction === 1) {
        console.log("It was 1");
      } else {
        console.log("It was 0");
      } 
      return;
        const dateApplied = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), "M/d/yyyy");
        const subject = message.getSubject();
        if(queryId == "Q002") {
          console.log(subject);
        }
        const company = subject.match(/at (.+)$/)?.[1] || "Unknown";
        const linkMatch = emailBody.match(/(https?:\/\/[^\s]+)/);
        const link = linkMatch ? linkMatch[1] : "No link found";
        
        // Add data to the main sheet
        dataSheetRows.push([
          queryId,
          subject,
          dateApplied,
          company,
          "Position Unknown",
          "Location Unknown",
          "Applied",
          link
        ]);

        mlDatasetRows.push(
          [
            subject,
            emailBody,
          ]
        )
    };
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
  // autoResizeWithMarginAndWrap(mlSheet, 15, 300);

  
  if(!testing) {
    dataSheet.deleteColumn(1); // delete the queryId since we are not testing
    dataSheet.deleteColumn(2); // delete the subject since we are not testing
  } 

  // // Update the 'Hits Found' column in the 'Search Queries' sheet
  // queries.forEach((query, index) => {
  //   queriesSheet.getRange(index + 2, 4).setValue(results[index][2]); // Update 'Hits Found'
  // });

  removeZeroHitQueries(queriesSheet);

  //SpreadsheetApp.getUi().alert("Queries processed successfully!");

}

function searchEmails() {
  const batchSize = 500;  // The maximum number of threads to fetch in each request
  let pageToken;  // This will be used to paginate through results
  let emails = [];
  
  do {
    // Construct the search query
    const searchQuery = 'after:2023/08/01 in:inbox OR in:spam subject:("applying" OR "applied" OR "application" OR "applies")';

    pageToken = testing ? false : (GmailApp.getThreads(pageToken) ? GmailApp.getThreads(pageToken)[0].getId() : null);
    
    // Search for threads, considering pagination
    console.time("Gmail search");
    const threads = GmailApp.search(searchQuery, pageToken, batchSize);
    console.timeEnd("Gmail search");

    console.time("email push");
    threads.forEach(thread => {
      if (thread.getMessageCount() === 1) {
        emails.push(thread.getMessages()[0]);
      }
    })
    console.timeEnd("email push");
    
  } while (pageToken);  // Keep looping until all pages are fetched
  
  console.log(`Found ${emails.length} emails in Inbox or Spam after August 2023`);
  return emails;
}


function getRelevantEmails() {
  const emails = searchEmails();

  let relevantEmails = [];  // Initialize an empty list to store relevant emails

  emails.forEach(email => {
    const prediction = classifyEmail(email);
    
    if (prediction === 1) {
      relevantEmails.push(email);  // Add to the list if prediction is 1
    }
  });

  // Now operate on the relevantEmails list separately
  relevantEmails.forEach(email => {
    // Process relevant email
    console.log(email.getSubject());
    // Additional processing...
  });
  console.log(`Found ${relevantEmails.length} emails classified`);
}

function classifyEmail(email) {
  let url = "https://7fbe-143-215-91-92.ngrok-free.app"; // Replace with your Flask app URL
  const endpoint = "/predict";
  url += endpoint;

  let subject = "";
  let emailBody = "";

  try {
    subject = email.getSubject();
    emailBody = email.getPlainBody();
  } 
  catch(error) {
    Logger.log("Error classifying email: " + error.message);
  }

  // console.log(subject)
  // console.log(emailBody)

  const payload = {
    subject: subject,
    body: emailBody,
  };
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    return data.prediction; // Returns 1 or 0
  } catch (error) {
    Logger.log("Error classifying email: " + error.message);
    return 0; // Default to not relevant
  }
}


function addHeader(dataSheet) {
  let header = ["QueryID", "Subject", "Date Applied","Company/Organization","Position","Location of Internship", "Application Status", "Link with internship information"];

  if (dataSheet.getSheetName() == "ML_Dataset") 
  {
    header = ["email subject", "email body", "company name (expected output)"];
  }

  const existingRows = dataSheet.getDataRange().getValues();

  // Check if the row already exists
  const headerExists = existingRows.some(row => row.join() === header.join());

  if (!headerExists) {
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

function removeZeroHitQueries(sheet) {
  // Ensure the sheet exists
  if (!sheet) {
    SpreadsheetApp.getUi().alert("The 'Search Queries' sheet does not exist. Please create it and try again.");
    return;
  }
  
  // Get all data in the sheet
  const data = sheet.getDataRange().getValues();
  
  // Check the position of the "Hits Found" column
  const headers = data[0];
  const hitsIndex = headers.indexOf("Hits Found");
  if (hitsIndex === -1) {
    SpreadsheetApp.getUi().alert("The 'Hits Found' column is missing. Please ensure your sheet has this column.");
    return;
  }
  
  // Create a new data array excluding rows where Hits Found is 0
  const filteredData = [headers]; // Start with headers
  for (let i = 1; i < data.length; i++) {
    if (data[i][hitsIndex] !== 0) {
      filteredData.push(data[i]);
      console.log("Data was filtered at row " + i);
    }
  }
  
  // Clear the sheet and write back only the filtered data
  sheet.clear();
  sheet.getRange(1, 1, filteredData.length, headers.length).setValues(filteredData);
  
  // Notify the user
  //SpreadsheetApp.getUi().alert("Queries with 0 hits have been removed successfully.");
}




