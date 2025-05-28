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

  // let emails = getRelevantEmails()
  let emails = searchEmails()
  console.log("Length of Emails: ", len(emails))

  emails.forEach(message => {
    const dateApplied = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), "M/d/yyyy");
    const subject = message.getSubject();
    const emailBody = message.getBody();

    // Call your Perplexity API extraction function (see previous answers for implementation)
    var application = callPerplexityAPI(subject, cleanCell(emailBody));

    // Only process if internship/job related
    if (application.internship_related === 1) {
      // Optionally, extract link as before
      const linkMatch = emailBody.match(/(https?:\/\/[^\s]+)/);
      const link = linkMatch ? linkMatch[1] : "No link found";

      // Use the extracted company, position, and status
      updateSheetWithApplication(dataSheet, {
        dateApplied: dateApplied,
        subject: subject,
        company: application.company,
        position: application.position,
        location: application.location || "Location Unknown",
        status: application.status,
        link: link
      });
    }

  // For ML dataset (optional, if you want to keep this)
  mlDatasetRows.push([
    subject,
    emailBody,
  ]);
  
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

function processEmailsBatch() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var lastProcessed = Number(scriptProperties.getProperty('LAST_PROCESSED_INDEX')) || 0;
  const batchSize = 10; // Adjust as needed

  var emails = searchEmails();
  const sheetNames = ["Internship Tracker", "Search Queries", "ML_Dataset"];
  //testing ? resetSheet("Testing") : resetSheet(sheetNames[0]);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const queriesSheet = spreadsheet.getSheetByName(sheetNames[1]);
  const dataSheet = testing ? spreadsheet.getSheetByName("Testing") : spreadsheet.getSheetByName(sheetNames[0]);

  // reset the current sheet which includes adding the header
  resetSheet(dataSheet);

  // console.log("First 10 emails")
  // if (testing) {
  //   for (var i = 0; i < 30; i++) 
  //   {
  //     console.log("Email #" + (i+1) + ": " + emails[i].getSubject())
  //   }
  //   console.log("Done testing!")
  // }


  if (testing) {
    console.log(`Testing mode is ON. Will process first 3 emails out of ${emails.length}.`);
    console.time("Total testing time");
    for (var i = 0; i < 3 && i < emails.length; i++) {
      var label = `Email #${i + 1} processing time`;
      console.time(label);
      console.log(`Processing email #${i + 1}: Subject - "${emails[i].getSubject()}"`);
      try {
        processSingleEmail(emails[i], dataSheet);
        console.log(`Successfully processed email #${i + 1}.`);
      } catch (error) {
        console.error(`Error processing email #${i + 1}: ${error.message}`);
      }
      console.timeEnd(label);
    }
    console.timeEnd("Total testing time");
    console.log("Done testing! Exiting function.");
    return;
  }``

  var end = Math.min(lastProcessed + batchSize, emails.length);

  for (var i = lastProcessed; i < end; i++) {
    processSingleEmail(emails[i], dataSheet);
  }

  // Save progress and schedule next batch if needed
  if (end < emails.length) {
    scriptProperties.setProperty('LAST_PROCESSED_INDEX', end);
    ScriptApp.newTrigger('processEmailsBatch')
      .timeBased()
      .after(1 * 60 * 1000) // Run again in 1 minute
      .create();
  } else {
    scriptProperties.deleteProperty('LAST_PROCESSED_INDEX');
    // Optionally: notify user that processing is complete
  }
}

function processSingleEmail(message, dataSheet) {
  const processLabel = `processSingleEmail: ${message.getSubject()}`;
  console.time(processLabel);

  console.time("Format and Extract System Fields");
  const dateApplied = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), "M/d/yyyy");
  const subject = message.getSubject();
  const emailBody = cleanCell(message.getBody());
  const linkMatch = emailBody.match(/(https?:\/\/[^\s]+)/);
  const link = linkMatch ? linkMatch[1] : "No link found";
  console.log(`[processSingleEmail] dateApplied: ${dateApplied}, subject: ${subject}, link: ${link}`);
  console.timeEnd("Format and Extract System Fields");

  var headers = dataSheet.getDataRange().getValues()[0];

  var systemFields = {
    [headers[0]]: dateApplied,        // computed in script
    [headers[1]]: subject,            // from message
    [headers[headers.length - 1]]: link // extracted in script, if any
    // Add more as needed
  };

  var llmHeaders = headers.filter(h => !(h in systemFields));
  console.log(`[processSingleEmail] LLM headers: ${llmHeaders.join(", ")}`);

  console.time("LLM Extraction API Call");
  var application = callAdaptiveAPI(subject, emailBody, llmHeaders);
  console.timeEnd("LLM Extraction API Call");

  // Only process if internship/job related
  if (application.internship_related === 1) {
    console.time("Update Google Sheet");
    updateSheetWithApplication(dataSheet, application, headers, systemFields);
    console.timeEnd("Update Google Sheet");
    console.log(`[processSingleEmail] Application was internship/job related and sheet was updated.`);
  } else {
    console.log(`[processSingleEmail] Application was NOT internship/job related, skipping sheet update.`);
  }

  console.timeEnd(processLabel);
}


function searchEmails() {
  const maxEmailsPerSearch = 500;
  let emails = [];
  const searchQuery = 'in:inbox OR in:spam subject:("applying" OR "applied" OR "application" OR "applies")';
  
  console.time("Total Gmail search");

  let threads;
  let start = 0;
  do {
    console.time("Gmail search");
    threads = GmailApp.search(searchQuery, start, maxEmailsPerSearch);
    console.timeEnd("Gmail search");

    console.time("Email filtering");
    const newEmails = threads
      .filter(thread => thread.getMessageCount() === 1)
      .map(thread => {
        const message = thread.getMessages()[0];
        // console.log(`Added email with subject: ${message.getSubject()} (ID: ${message.getId()})`);
        return message;
      });

    emails.push(...newEmails); // Flattened
    console.timeEnd("Email filtering");

    start += maxEmailsPerSearch; // Always move offset forward

  } while (threads.length === maxEmailsPerSearch);

  console.timeEnd("Total Gmail search");
  console.log(`Found ${emails.length} emails in Inbox or Spam.`);
  return emails;
}

function getRelevantEmails() {
  const emails = searchEmails();

  let relevantEmails = [];  // Initialize an empty list to store relevant emails

  emails.forEach(email => {
    const prediction = classifyEmail(email)
    
    if (prediction === 1) {
      relevantEmails.push(email);  // Add to the list if prediction is 1
    }
  });

  // Now operate on the relevantEmails list separately
  relevantEmails.forEach(email => {
    // Process relevant email
    // console.log(email.getSubject());
    // Additional processing...
  });
  console.log(`Found ${relevantEmails.length} relevant emails`);
  return relevantEmails;
}

function classifyEmail(email) {
  let url = "https://0434-143-215-83-228.ngrok-free.app"; // Replace with your Flask app URL
  const endpoint = "/predict";
  url += endpoint;

  let subject = "";
  let emailBody = "";

  try {
    subject = email.getSubject();
    console.time("Cleaning Email Body")
    emailBody = cleanCell(email.getBody());
    console.timeEnd("Cleaning Email Body")
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
    muteHttpExceptions: true,
    timeout: 180
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    console.log("Body:" + emailBody)
    console.log("Prediction: " + data.prediction)
    return data.prediction; // Returns 1 or 0
  } catch (error) {
    Logger.log("Error classifying email: " + error.message);
    return 0; // Default to not relevant
  }
}

function callAdaptiveAPI(subject, body, headers) {
  const callLabel = `callAdaptiveAPI: ${subject}`;
  console.time(callLabel);

  console.time("Build JSON Schema & Prompt");
  var jsonProperties = {};
  headers.forEach(function(h) {
    jsonProperties[fieldToJsonKey(h)] = { "type": "string" };
  });
  jsonProperties["internship_related"] = { "type": "integer" };

  var sampleJson = headers
    .map(h => `"${fieldToJsonKey(h)}": "..."`)
    .join(",\n  ");

  var prompt = `
  Given the following email subject and body, classify if it is internship/job related (1 for yes, 0 for no). If yes, extract the following fields as concise string values (use an empty string if not present):
  Company/Organization: The name of the company or organization.
  Position: The job or internship title.
  Location of Internship: The location of the job (if not specified, use "Remote" if remote is mentioned, otherwise an empty string).
  Application Status: The current status of the application (e.g., "Under review").
  Return as JSON:
  {
    "internship_related": 1,
    ${sampleJson}
  }
  If not internship/job related, return:
  {
    "internship_related": 0
  }
  Email Subject: ${subject}
  Email Body: ${body}
  `;
  console.log(`[callAdaptiveAPI] Prompt built for subject "${subject}":\n${prompt}`);
  console.log(`[callAdaptiveAPI] JSON schema properties: ${JSON.stringify(jsonProperties)}`);
  console.timeEnd("Build JSON Schema & Prompt");

  var apiKey = getPerplexityApiKey();
  var url = "https://api.perplexity.ai/chat/completions";
  var payload = {
    model: "sonar",
    messages: [
      { role: "system", content: "Be precise and concise." },
      { role: "user", content: prompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        schema: {
          type: "object",
          properties: jsonProperties,
          required: ["internship_related"]
        }
      }
    }
  };
  var options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  console.time("API Request");
  try {
    var response = UrlFetchApp.fetch(url, options);
    var rawResponse = response.getContentText();
    console.log(`[callAdaptiveAPI] Raw API response: ${rawResponse}`);
    var result = JSON.parse(rawResponse);
    var answer = result.choices[0].message.content;
    var parsedAnswer = JSON.parse(answer);
    console.log(`[callAdaptiveAPI] Parsed LLM output: ${JSON.stringify(parsedAnswer)}`);
    console.timeEnd("API Request");
    console.timeEnd(callLabel);
    return parsedAnswer;
  } catch (e) {
    console.error(`[callAdaptiveAPI] Error querying API for "${subject}": ${e}`);
    console.timeEnd("API Request");
    console.timeEnd(callLabel);
    return { internship_related: 0 };
  }
}

// Helper to convert header names to suitable JSON keys
function fieldToJsonKey(header) {
  // Convert to camelCase or snake_case if you prefer
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // replace non-alphanum with underscore
    .replace(/^_|_$/g, ''); // trim underscores
}

function updateSheetWithApplication(dataSheet, application, headers, systemFields) {
  const updateLabel = `updateSheetWithApplication: ${application.company || ""} - ${application.position || ""}`;
  console.time(updateLabel);

  if (application.internship_related !== 1) {
    console.log(`[updateSheetWithApplication] Application not internship/job related. Skipping sheet update.`);
    console.timeEnd(updateLabel);
    return;
  }

  console.time("Build newRow");
  // Build a row with values for all headers (fallback to blank if missing)
  var newRow = headers.map(function(header) {
    if (header in systemFields) {
      return systemFields[header];
    } else {
      var key = fieldToJsonKey(header);
      return application[key] !== undefined ? application[key] : "";
    }
  });
  console.log(`[updateSheetWithApplication] newRow to be written: ${JSON.stringify(newRow)}`);
  console.timeEnd("Build newRow");

  // Find matching row (based on company+position, customize if more fields matter)
  var companyCol = headers.indexOf("Company/Organization");
  var positionCol = headers.indexOf("Position");

  // Defensive log: show headers for index debug
  console.log(`[updateSheetWithApplication] Headers: ${JSON.stringify(headers)}`);
  console.log(`[updateSheetWithApplication] companyCol index: ${companyCol}, positionCol index: ${positionCol}`);

  var data = dataSheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (
      data[i][companyCol] === application[fieldToJsonKey("Company/Organization")] &&
      data[i][positionCol] === application[fieldToJsonKey("Position")]
    ) {
      rowIndex = i;
      break;
    }
  }
  console.log(`[updateSheetWithApplication] Matching row index: ${rowIndex}`);

  if (rowIndex !== -1) {
    console.time("Update existing row");
    // Update row (can update all fields, or just some)
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] !== "Date Applied" && headers[j] !== "Subject") { // only update relevant fields
        dataSheet.getRange(rowIndex + 1, j + 1).setValue(newRow[j]);
        console.log(`[updateSheetWithApplication] Updated row ${rowIndex + 1}, column ${j + 1} (${headers[j]}) to "${newRow[j]}"`);
      }
    }
    console.timeEnd("Update existing row");
  } else {
    console.time("Append new row");
    dataSheet.appendRow(newRow);
    console.log(`[updateSheetWithApplication] Appended new row: ${JSON.stringify(newRow)}`);
    console.timeEnd("Append new row");
  }

  console.timeEnd(updateLabel);
}



// function callPerplexityAPI(subject, body) {
//   var apiKey = getPerplexityApiKey();
//   var url = "https://api.perplexity.ai/chat/completions";
//   var prompt = `
//   Given the following email subject and body, classify if it is internship/job related (1 for yes, 0 for no). If yes, extract:
//   - Company Name
//   - Position Applied
//   - Application Status (applied, under review, rejected, accepted, etc.)

//   If a row for the same company and position already exists, only update the status to the latest value.

//   Return as JSON:
//   {
//     "internship_related": 1,
//     "company": "...",
//     "position": "...",
//     "status": "..."
//   }
//   If not internship/job related, return:
//   {
//     "internship_related": 0
//   }

//   Email Subject: ${subject}
//   Email Body: ${cleanCell(body)}`;

//   var payload = {
//     model: "sonar",
//     messages: [
//       { role: "system", content: "Be precise and concise." },
//       { role: "user", content: prompt }
//     ],
//     response_format: {
//       type: "json_schema",
//       json_schema: {
//         schema: {
//           type: "object",
//           properties: {
//             internship_related: { type: "integer" },
//             company: { type: "string" },
//             position: { type: "string" },
//             status: { type: "string" }
//           },
//           required: ["internship_related"]
//         }
//       }
//     }
//   };

//   var options = {
//     method: "post",
//     contentType: "application/json",
//     headers: { "Authorization": "Bearer " + apiKey },
//     payload: JSON.stringify(payload),
//     muteHttpExceptions: true
//   };

//   var response = UrlFetchApp.fetch(url, options);
//   var result = JSON.parse(response.getContentText());
//   var answer = result.choices[0].message.content;
//   return JSON.parse(answer);
// }

// function updateSheetWithApplication(dataSheet, application) {
//   if (application.internship_related !== 1) return;

//   var data = dataSheet.getDataRange().getValues();
//   var headers = data[0];
//   var companyCol = headers.indexOf("Company/Organization");
//   var positionCol = headers.indexOf("Position");
//   var statusCol = headers.indexOf("Application Status");

//   // Search for existing row
//   var found = false;
//   for (var i = 1; i < data.length; i++) {
//     if (
//       data[i][companyCol] === application.company &&
//       data[i][positionCol] === application.position
//     ) {
//       // Update status
//       dataSheet.getRange(i + 1, statusCol + 1).setValue(application.status);
//       found = true;
//       break;
//     }
//   }
//   if (!found) {
//     // Append new row
//     dataSheet.appendRow([
//     application.dateApplied || new Date(), // Use passed-in date, fallback to now
//     application.subject || "",
//     application.company,
//     application.position,
//     application.location || "",
//     application.status,
//     application.link || ""
//     ]);
//   }
// }


function cleanCell(rawHtml) {
  let url = "https://internship-tracker-bq0q.onrender.com"
  const endpoint = "/clean-email";
  url += endpoint;
  const payload = JSON.stringify({ email_body: rawHtml });

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true,  // Ensure we don't throw an error on non-2xx status codes
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();  // Get raw response
    Logger.log("Response: " + responseText);  // Log the raw response
    const data = JSON.parse(responseText);  // Try to parse JSON from the response
    return data.cleaned_body || ""; // Return cleaned body
  } catch (error) {
    Logger.log("Error cleaning email: " + error);
    return rawHtml; // Return the original raw HTML in case of an error
  }
}

function testChainedAPIs() {
  var rawHtml = "<b>Hello</b>";
  var cleaned = cleanCell(rawHtml);
  Logger.log("Cleaned: " + cleaned);

  var predictUrl = "https://0434-143-215-83-228.ngrok-free.app/predict";
  var payload = {
    subject: "Test",
    body: cleaned
  };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  var response = UrlFetchApp.fetch(predictUrl, options);
  Logger.log("Prediction: " + response.getContentText());
}

function addHeader(dataSheet) {
  let header = ["Date Applied","Subject", "Company/Organization","Position","Location of Internship", "Application Status", "Link with internship information"];

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

function getPerplexityApiKey() {
  var scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('PERPLEXITY_API_KEY');
}




