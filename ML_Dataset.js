let ml_data = 1; // 0 means company extraction dataset, 1 means email classifier dataset
function populateDataset() {
  let clear = true;

  // Open the active spreadsheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const queriesSheet = spreadsheet.getSheetByName("Search Queries");
  const mlSheet = ml_data == 0 ? spreadsheet.getSheetByName("ML_Dataset_company_extraction") : spreadsheet.getSheetByName("ML_Dataset_email_classifier");

  if (!mlSheet) {
    SpreadsheetApp.getUi().alert("Ensure the sheets named ${sheetNames[0]} and ${sheetNames[1]} exist.");
    return;
  }

  if (clear) {
    mlSheet.clear();
  }

  const header = ml_data == 0 ? ["email subject", "email body", "company name (expected output)"] : ["email subject", "email body", "binary classification (expected output)"];
  let existingRows = mlSheet.getDataRange().getValues();

  // Check if the row already exists
  const headerExists = existingRows.some(row => row.join() === header.join());

  if (!headerExists) {
    // Add the new row
    mlSheet.appendRow(header);
  } else {
    console.log("header exists");
  }

  ml_rows = [];

  const queries = ml_data == 0 ? queriesSheet.getRange(2, 2, queriesSheet.getLastRow() - 1).getValues().flat() : [`subject:("applying" OR "applied" OR "application" OR "applies")`];

  if (queries.length === 0) {
    SpreadsheetApp.getUi().alert("No queries found in 'Search Queries'. Please add some queries.");
    return;
  }

  queries.forEach(query => {
  const threads = GmailApp.search(query);
  
  for (let i = 0; i < threads.length; i++) {
    if (threads[i].getMessageCount() !== 1) continue; // Skip threads with multiple emails

    const message = threads[i].getMessages()[0]; // Get the only message in the thread
    ml_rows.push([
      message.getSubject(),
      message.getBody(),
      ""
    ]);
  }
});


  ml_rows.forEach(row => {
    mlSheet.appendRow(row);
  });
  // if (ml_data != 0) {
  //   mlSheet.deleteColumn(3); // delete the column that contains the output
  // }

  const range = mlSheet.getDataRange();
  range.removeDuplicates();
  cleanData();
  autoResizeWithMarginAndWrap(mlSheet, 15, 200);
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
  sheet.setColumnWidth(1, 330);
  sheet.setColumnWidth(2, 700);
  sheet.getDataRange().setWrap(true);

  // // Step 2: Adjust column widths and enable wrapping for wide columns
  // for (let col = 1; col <= maxColumns; col++) {
  //   const currentWidth = sheet.getColumnWidth(col);

  //   // Add extra width to the column
  //   const newWidth = currentWidth + extraWidth;
  //   sheet.setColumnWidth(col, newWidth);

  //   // Enable text wrapping if the column width exceeds the threshold
  //   if (newWidth > wrapThreshold) {
  //     const columnRange = sheet.getRange(1, col, sheet.getMaxRows());
  //     columnRange.setWrap(true);
  //   }
  // }

  console.log(`Auto-resized columns with an extra width of ${extraWidth} px and enabled wrapping for columns over ${wrapThreshold} px.`);
}

function cleanData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const mlSheet = ml_data == 0 ? spreadsheet.getSheetByName("ML_Dataset_company_extraction") : spreadsheet.getSheetByName("ML_Dataset_email_classifier");

  // Get all data in the sheet
  const data = mlSheet.getDataRange().getValues();

  const newData = [];
  
  // Check the position of the "email body" column
  const headers = data[0];
  const hitsIndex = headers.indexOf("email body");
  if (hitsIndex === -1) {
    SpreadsheetApp.getUi().alert("The 'email body' column is missing. Please ensure your sheet has this column.");
    return;
  }

  for (let i = 1; i < data.length; i++) {
    let original = data[i][hitsIndex];
    newData.push([cleanCell(original)]);
  }

  const range = mlSheet.getRange(2, hitsIndex + 1, data.length - 1, 1);
  // console.log(range);
  range.setValues(newData);
  console.log("It worked");
}

function cleanCell(rawHtml) {
  let url = "https://internship-tracker-1095575192028.us-central1.run.app";
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

function testCleanCell() {
  const testCases = [
    { input: "<p>Hello, world!</p>", expected: "Hello, world!" },
    { input: "", expected: "" },
    { input: null, expected: "" },
    { input: "<div>Malformed HTML without closing tags", expected: "Malformed HTML without closing tags" },
  ];

  testCases.forEach((testCase, index) => {
    const result = cleanCell(testCase.input);
    Logger.log(`Test Case ${index + 1}: ${result === testCase.expected ? "Passed" : "Failed"}`);
  });
}


// function cleanCell(rawHtml) {
//   // Parse the HTML content to remove tags and retain only the text.
//   const tempDoc = HtmlService.createHtmlOutput(rawHtml).getContent();
//   const plainText = tempDoc.replace(/<[^>]*>/g, ''); // Remove HTML tags
//   return plainText.replace(/\s+/g, ' ').trim(); // Clean up extra spaces
// }
