import type { IssueReport } from '../../types/issue-report'

type CreateIssueReportInput = {
  error: unknown
  workflowStep: string
  companyName?: string
  email?: string
  context?: Record<string, unknown>
}

export function createIssueReport({
  error,
  workflowStep,
  companyName,
  email,
  context = {},
}: CreateIssueReportInput): IssueReport {
  const normalizedError =
    error instanceof Error ? error : new Error('Unknown workflow error')

  return {
    id: `issue_${Date.now()}`,
    workflowStep,
    companyName,
    email,
    message: normalizedError.message,
    stack: normalizedError.stack,
    context,
    createdAt: new Date().toISOString(),
  }
}
