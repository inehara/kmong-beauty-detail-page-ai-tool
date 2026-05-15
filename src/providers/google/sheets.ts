import type {
  GoogleSheetAppendResult,
  GoogleSheetResultRow,
} from '../../types/google-sheet'

export async function appendResultRowToSheet(
  row: GoogleSheetResultRow,
): Promise<GoogleSheetAppendResult> {
  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEET_ID
  const mockRow = {
    ...row,
    company_name: row.company_name.trim() || 'Mock Company',
    email: row.email.trim() || 'mock@example.com',
  }

  if (!spreadsheetId) {
    return {
      ok: true,
      mode: 'mock',
      message: `Mock row accepted for ${mockRow.company_name} (${mockRow.email}).`,
      appendedAt: new Date().toISOString(),
    }
  }

  // TODO: Move Google Sheets calls to backend API routes before real deployment.
  return {
    ok: true,
    mode: 'mock',
    spreadsheetId,
    range: 'A:D',
    message: `Mock append prepared for ${mockRow.email}.`,
    appendedAt: new Date().toISOString(),
  }
}
