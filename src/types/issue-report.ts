export type IssueReport = {
  id: string
  workflowStep: string
  companyName?: string
  email?: string
  message: string
  stack?: string
  context: Record<string, unknown>
  createdAt: string
}
