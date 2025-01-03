function populateDataset() {

  // Open the active spreadsheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const queriesSheet = spreadsheet.getSheetByName("Search Queries");
  const mlSheet = spreadsheet.getSheetByName("ML_Dataset");

  const header = ["email subject", "email body", "company name (expected output)"];
  let existingRows = mlSheet.getDataRange().getValues();

  // Check if the row already exists
  const headerExists = existingRows.some(row => row.join() === header.join());

  if (!headerExists) {
    // Add the new row
    mlSheet.appendRow(header);
  } else {
    console.log("header exists");
  }

  const queries = queriesSheet.getRange(2, 2, queriesSheet.getLastRow() - 1).getValues().flat();

  if (queries.length === 0) {
    SpreadsheetApp.getUi().alert("No queries found in 'Search Queries'. Please add some queries.");
    return;
  }

  queries.forEach(query => {
    const threads = GmailApp.search(query); // Search Gmail with the query
    threads.forEach(thread => {
      const messages = thread.getMessages();
      messages.forEach(message => {
        const subject = message.getSubject();
        const body = message.getBody();
        // Log data in 'Sheet1'
        ml_rows.push([
          subject,
          body,
          "output"
        ]);
      });
    });
  });

  ml_rows.forEach(row => {
    mlSheet.appendRow(row);
  });

  const range = mlSheet.getDataRange();
  range.removeDuplicates();

}

function cleanData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const mlSheet = spreadsheet.getSheetByName("ML_Dataset");

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
