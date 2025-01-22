function populateSearchQueries() {
  // Open the active spreadsheet
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName("Search Queries");
  
  // Ensure the sheet exists
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet 'Search Queries' does not exist. Please create it and add the necessary headers.");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const hitsIndex = headers.indexOf("Hits Found");
  if (hitsIndex === -1) {
    SpreadsheetApp.getUi().alert("The 'Hits Found' column is missing. Please ensure your sheet has this column.");
    return;
  }

  if (sheet.getRange(2, hitsIndex, 1, 1).isBlank()) {
    originalQueries(sheet);
    return;
  }

   // clear the sheet
   sheet.clear();

  // Write the new data
  sheet.getRange(1, 1, data.length, headers.length).setValues(data);

  // Notify the user
  SpreadsheetApp.getUi().alert("Search queries added successfully!");
}

function originalQueries(sheet){
  const queries = [
    ["Q001", `subject:"You applied for"`, "Captures LinkedIn application confirmations"],
    ["Q002", `subject:"application received"`, "Generic confirmation emails"],
    ["Q003", `subject:"Thanks for applying"`, "Acknowledgment emails from companies"],
    ["Q004", `from:linkedin.com AND subject:"application" -from:"LinkedIn Job Alerts"`, "LinkedIn alerts"],
    ["Q005", `from:indeed.com AND subject:"application"`, "Indeed application emails"],
    ["Q006", `from:glassdoor.com AND subject:"application"`, "Glassdoor application emails"],
    ["Q007", `subject:"Thank you for your application"`, "Acknowledgment emails"],
    ["Q008", `subject:"Your application has been submitted"`, "Submission confirmation"],
    ["Q009", `subject:"Your application is complete"`, "Submission completed"],
    ["Q010", `subject:"Job application confirmation"`, "Explicit job application confirmations"],
    ["Q011", `subject:"Internship application received"`, "Internship-specific confirmations"],
    ["Q012", `subject:"Internship opportunity"`, "Replies about internships"],
    ["Q013", `subject:"Career opportunity"`, "Broad phrasing, including internships"],
    ["Q015", `subject:"We received your application"`, "Acknowledgment emails"],
    ["Q016", `subject:"Follow-up on your application"`, "Replies or updates from employers"],
    ["Q017", `subject:"Update on your application"`, "Status updates"],
    ["Q018", `subject:"Internship application acknowledgment"`, "Acknowledgments for internships"],
    ["Q019", `from:no-reply AND subject:"application"`, "No-reply acknowledgment emails"],
    ["Q020", `subject:"Your application to"`, "Broad subject to capture submissions"]
  ];

  // Write the data to the sheet
  const startRow = 2; // Start writing from the second row
  const startColumn = 1; // First column (A)
  
  // // Clear existing data (except headers)
  // sheet.getRange(startRow, startColumn, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();

  // Write the new data
  sheet.getRange(startRow, startColumn, queries.length, queries[0].length).setValues(queries);

  // Notify the user
  SpreadsheetApp.getUi().alert("Original queries were added successfully!");

}


