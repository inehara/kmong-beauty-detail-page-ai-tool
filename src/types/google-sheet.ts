export type GoogleSheetResultRow = {
  company_name: string
  email: string
  before_drive_link: string
  after_drive_link: string
}

export type GoogleSheetAppendResult = {
  ok: boolean
  mode: 'mock' | 'live'
  spreadsheetId?: string
  range?: string
  message: string
  appendedAt: string
}
