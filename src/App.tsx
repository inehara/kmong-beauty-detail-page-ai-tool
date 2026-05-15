import { useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { JsonViewer } from './components/JsonViewer'
import { createIssueReport } from './core/issue/createIssueReport'
import { runWorkflow } from './core/workflow/runWorkflow'
import type { IssueReport } from './types/issue-report'
import {
  beautySubcategories,
  type BeautySubcategory,
  type WorkflowProgressStep,
  type WorkflowResult,
} from './types/workflow'

const categoryLabels: Record<BeautySubcategory, string> = {
  skincare: 'Skincare',
  makeup: 'Makeup',
  cleansing: 'Cleansing',
  hair_body: 'Hair & Body',
  beauty_tool: 'Beauty Tool',
}

const progressOrder: WorkflowProgressStep[] = [
  'reading_upload',
  'analyzing_original',
  'loading_design_system',
  'creating_spec',
  'generating_after',
  'creating_comparison',
  'uploading_drive',
  'appending_sheet',
  'completed',
]

function App() {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<BeautySubcategory>('skincare')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [progressStep, setProgressStep] = useState<WorkflowProgressStep>('idle')
  const [progressMessage, setProgressMessage] = useState('Ready for mock or live run.')
  const [result, setResult] = useState<WorkflowResult | null>(null)
  const [issueReport, setIssueReport] = useState<IssueReport | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRunning =
    isSubmitting || !['idle', 'completed', 'failed'].includes(progressStep)

  const activeIndex = progressOrder.indexOf(progressStep)
  const analysisConfigured = Boolean(
    import.meta.env.VITE_OPENROUTER_API_KEY &&
      import.meta.env.VITE_OPENROUTER_ANALYSIS_MODEL,
  )
  const activeImageProvider = import.meta.env.VITE_IMAGE_PROVIDER || 'openrouter'
  const activeImageModel =
    activeImageProvider === 'openai'
      ? import.meta.env.VITE_OPENAI_IMAGE_MODEL || 'gpt-image-2'
      : activeImageProvider === 'openrouter'
        ? import.meta.env.VITE_OPENROUTER_IMAGE_MODEL || 'openai/gpt-5.4-image-2'
        : 'mock'
  const mockMode = true
  const canRun = useMemo(
    () =>
      Boolean(
        imageFile &&
          !isRunning &&
          (mockMode || (companyName.trim() && email.trim())),
      ),
    [companyName, email, imageFile, isRunning, mockMode],
  )
  const afterImageSource = result?.afterImageSource || 'mock'
  const afterImageStatus =
    progressStep === 'generating_after'
      ? activeImageProvider === 'openai'
        ? 'Generating after image with OpenAI. This may take up to 3 minutes.'
        : 'Generating after image with OpenRouter GPT Image 2. This may take up to 4 minutes.'
      : result?.afterImageStatus || 'After image has not been generated yet.'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!imageFile) {
      return
    }

    setResult(null)
    setIssueReport(null)
    setIsSubmitting(true)

    try {
      const workflowResult = await runWorkflow(
        {
          companyName: companyName.trim(),
          email: email.trim(),
          category,
          originalImage: imageFile,
        },
        (step, message) => {
          setProgressStep(step)
          setProgressMessage(message)
        },
      )
      setResult(workflowResult)
      setIssueReport(workflowResult.issueReport ?? null)
    } catch (error) {
      setProgressStep('failed')
      setProgressMessage('Workflow failed. Issue report created.')
      setIssueReport(
        createIssueReport({
          error,
          workflowStep: progressStep,
          companyName,
          email,
          context: {
            category,
            fileName: imageFile.name,
          },
        }),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Kmong MVP</p>
          <h1>Beauty Detail Page AI Tool</h1>
        </div>
        <span className={mockMode ? 'mode-badge mock' : 'mode-badge'}>
          {analysisConfigured ? 'OpenRouter analysis ready' : 'Mock-ready'}
        </span>
      </header>

      {mockMode ? (
        <section className="mock-notice" aria-label="Mock Mode notice">
          <strong>Mock Mode</strong>
          <span>
            This run is using mock data. Connect OpenRouter, OpenAI, and Google APIs for real
            analysis, image generation, Drive upload, and Sheet logging.
          </span>
        </section>
      ) : null}

      <section className="workspace">
        <form className="control-panel" onSubmit={handleSubmit}>
          <label>
            Company name for Google Sheet
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Acme Beauty"
              required={!mockMode}
            />
            <span className="field-helper">
              Used only when saving Before/After Drive links to Google Sheet.
            </span>
          </label>

          <label>
            Client email for Google Sheet
            <input
              value={email}
              type="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="client@example.com"
              required={!mockMode}
            />
            <span className="field-helper">
              Used only when saving Before/After Drive links to Google Sheet.
            </span>
          </label>

          <label>
            Original detail page image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              required
            />
          </label>

          <label>
            Beauty subcategory
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as BeautySubcategory)}
            >
              {beautySubcategories.map((subcategory) => (
                <option key={subcategory} value={subcategory}>
                  {categoryLabels[subcategory]}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={!canRun}>
            Run workflow
          </button>

          <div className="progress-box">
            <div className="progress-track">
              <span
                style={{
                  width:
                    activeIndex < 0
                      ? '0%'
                      : `${Math.round((activeIndex / (progressOrder.length - 1)) * 100)}%`,
                }}
              />
            </div>
            <p>{progressMessage}</p>
          </div>
        </form>

        <section className="preview-panel">
          <div className="preview-grid">
            <ImagePreview title="Before image" src={result?.beforeImageUrl} />
            <ImagePreview
              title={
                afterImageSource === 'openai'
                  ? 'After image (OpenAI)'
                  : afterImageSource === 'openrouter'
                  ? 'After image (OpenRouter)'
                  : 'After image (Mock)'
              }
              helperText={
                afterImageSource === 'mock'
                  ? 'Placeholder output generated for workflow testing.'
                  : undefined
              }
              statusText={afterImageStatus}
              fallbackReason={result?.afterImageFallbackReason}
              src={result?.afterImageUrl}
            />
          </div>
          <ImagePreview
            title="Before & After comparison image"
            src={result?.comparisonImageUrl}
            wide
          />
        </section>
      </section>

      {result ? (
        <>
          <section className="output-panel">
            <div className="output-heading">
              <h2>Outputs</h2>
              {mockMode ? (
                <span className="integration-badge">
                  Google integrations are not connected yet.
                </span>
              ) : null}
            </div>
            <dl>
              <div>
                <dt>Before Google Drive link{mockMode ? ' (Mock)' : ''}</dt>
                <dd>
                  <a href={result.beforeDriveLink} target="_blank" rel="noreferrer">
                    {result.beforeDriveLink}
                  </a>
                </dd>
              </div>
              <div>
                <dt>After Google Drive link{mockMode ? ' (Mock)' : ''}</dt>
                <dd>
                  <a href={result.afterDriveLink} target="_blank" rel="noreferrer">
                    {result.afterDriveLink}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Google Sheet append status{mockMode ? ' (Mock)' : ''}</dt>
                <dd>{result.sheetAppend.message}</dd>
              </div>
            </dl>
          </section>

          <section className="analysis-source-panel">
            <div>
              original_analysis.json source:{' '}
              <strong>
                {result.originalAnalysis.analysisSource === 'openrouter'
                  ? 'openrouter'
                  : 'mock'}
              </strong>
            </div>
            <div>
              after_image source: <strong>{result.afterImageSource}</strong>
            </div>
            <div>
              active image provider: <strong>{activeImageProvider}</strong>
            </div>
            <div>
              active image model: <strong>{activeImageModel}</strong>
            </div>
          </section>

          <section className="json-grid">
            <JsonViewer title="original_analysis.json" value={result.originalAnalysis} />
            <JsonViewer
              title="loaded category design system"
              value={result.designSystem}
            />
            <JsonViewer
              title="improved_design_spec.json"
              value={result.improvedDesignSpec}
            />
          </section>
        </>
      ) : null}

      {issueReport ? (
        <section className="error-panel">
          <JsonViewer title="issue_report.json" value={issueReport} />
        </section>
      ) : null}
    </main>
  )
}

type ImagePreviewProps = {
  title: string
  helperText?: string
  statusText?: string
  fallbackReason?: string
  src?: string
  wide?: boolean
}

function ImagePreview({
  title,
  helperText,
  statusText,
  fallbackReason,
  src,
  wide = false,
}: ImagePreviewProps) {
  return (
    <figure className={wide ? 'image-preview wide' : 'image-preview'}>
      <figcaption>
        <span>{title}</span>
        {helperText ? <small>{helperText}</small> : null}
        {statusText ? <small className="status-line">{statusText}</small> : null}
        {fallbackReason ? (
          <small className="fallback-reason">Fallback reason: {fallbackReason}</small>
        ) : null}
      </figcaption>
      {src ? (
        <img src={src} alt={title} />
      ) : (
        <div className="empty-preview">Waiting for workflow output</div>
      )}
    </figure>
  )
}

export default App
