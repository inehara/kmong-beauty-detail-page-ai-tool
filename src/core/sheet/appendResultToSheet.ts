import { appendResultRowToSheet } from '../../providers/google/sheets'
import type { GoogleSheetAppendResult } from '../../types/google-sheet'

type AppendResultInput = {
  companyName: string
  email: string
  beforeDriveLink: string
  afterDriveLink: string
}

export function appendResultToSheet({
  companyName,
  email,
  beforeDriveLink,
  afterDriveLink,
}: AppendResultInput): Promise<GoogleSheetAppendResult> {
  return appendResultRowToSheet({
    company_name: companyName,
    email,
    before_drive_link: beforeDriveLink,
    after_drive_link: afterDriveLink,
  })
}
