import { google } from "googleapis";

/**
 * Generic Google Sheets sync for form submissions.
 * Appends a row to the configured spreadsheet.
 * Gracefully skips if env vars are not set.
 */

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) return null;

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/**
 * Append a form submission row to Google Sheets.
 *
 * @param formTitle   — used as the sheet tab name (auto-created if missing)
 * @param headerRow   — column header labels in order
 * @param dataRow     — cell values matching headerRow order
 */
export async function appendFormSubmissionToSheet(
  formTitle: string,
  headerRow: string[],
  dataRow: (string | number | null)[]
) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const auth = getAuth();

  if (!sheetId || !auth) {
    console.warn(
      "[googleSheets] Skipping sync — GOOGLE_SHEET_ID or service account env vars not set."
    );
    return;
  }

  const sheets = google.sheets({ version: "v4", auth });

  // Sanitize the tab name (sheets don't allow some special characters)
  const tabName = formTitle.replace(/[\/\\?*\[\]]/g, "").slice(0, 100) || "Submissions";

  try {
    // Check if the tab exists; if not, create it
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingTab = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === tabName
    );

    if (!existingTab) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: tabName },
              },
            },
          ],
        },
      });

      // Write the header row to the new tab
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${tabName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headerRow] },
      });
    } else {
      // Check if headers exist (first row empty = needs headers)
      const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${tabName}!A1:A1`,
      });
      if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${tabName}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [headerRow] },
        });
      }
    }

    // Append the data row
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tabName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [dataRow] },
    });
  } catch (error) {
    console.error("[googleSheets] Failed to sync submission:", error);
  }
}
