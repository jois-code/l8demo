import { google } from "googleapis";

/**
 * Generic Google Sheets sync for form submissions.
 * Appends a row to the configured spreadsheet or updates an existing row if the SRN matches.
 * Gracefully skips if env vars are not set.
 */

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) return null;

  // Trim whitespace, strip surrounding single/double quotes, and unescape newlines
  key = key.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/**
 * Append a form submission row to Google Sheets, or update existing row if respondent already submitted.
 *
 * @param formTitle     — used as the sheet tab name (auto-created if missing)
 * @param headerRow     — column header labels in order
 * @param dataRow       — cell values matching headerRow order
 * @param identifierSrn — respondent's SRN to update their existing row in-place
 */
export async function appendFormSubmissionToSheet(
  formTitle: string,
  headerRow: string[],
  dataRow: (string | number | null)[],
  identifierSrn?: string
) {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
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
      // Check if headers exist or need to be expanded
      const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${tabName}!1:1`,
      });
      const currentHeaders = headerCheck.data.values?.[0] || [];
      if (currentHeaders.length < headerRow.length) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${tabName}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [headerRow] },
        });
      }
    }

    // Check if user already exists in the sheet to update in-place
    let updatedExisting = false;
    if (identifierSrn) {
      const allRowsRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${tabName}!A:AN`,
      });
      const allRows = allRowsRes.data.values || [];
      const headers = allRows[0] || headerRow;
      const srnColIdx = headers.findIndex((h: string) =>
        h.toLowerCase().includes("srn")
      );

      if (srnColIdx !== -1) {
        const existingRowIdx = allRows.findIndex(
          (r: any[], idx: number) =>
            idx > 0 &&
            r[srnColIdx]?.toString().trim().toUpperCase() ===
              identifierSrn.trim().toUpperCase()
        );

        if (existingRowIdx !== -1) {
          // Update the existing row (1-indexed row number in Sheets)
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${tabName}!A${existingRowIdx + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [dataRow] },
          });
          updatedExisting = true;
          console.log(
            `[googleSheets] Updated existing row ${existingRowIdx + 1} for SRN ${identifierSrn}`
          );
        }
      }
    }

    if (!updatedExisting) {
      // Append a brand new row at the bottom
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${tabName}!A:A`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [dataRow] },
      });
      console.log(`[googleSheets] Appended new row for SRN ${identifierSrn || "anonymous"}`);
    }
  } catch (error: any) {
    console.error("[googleSheets] Failed to sync submission:", error?.message || error);
    if (error?.response?.data) {
      console.error("[googleSheets] Google API error details:", JSON.stringify(error.response.data));
    }
  }
}
