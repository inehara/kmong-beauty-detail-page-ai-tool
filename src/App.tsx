import { useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { JsonViewer } from './components/JsonViewer'
import { createIssueReport } from './core/issue/createIssueReport'
import { runWorkflow } from './core/workflow/runWorkflow'
import type { IssueReport } from './types/issue-report'
import {
  beautySubcategories,
  type BeautySubcategory,
  type ReferenceStyleInfluence,
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

const generationModeLabels = {
  content_extraction_direct_reference_rebuild:
    'Content extraction / Direct reference rebuild',
} as const

const referenceStyleInfluenceLabels: Record<ReferenceStyleInfluence, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
}

function App() {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState<BeautySubcategory>('skincare')
  const [referenceStyleInfluence, setReferenceStyleInfluence] =
    useState<ReferenceStyleInfluence>('high')
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
        : 'Generating after image with OpenRouter GPT Image 2 using direct reference contact sheet. This may take up to 6 minutes.'
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
          referenceStyleInfluence,
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

          <label>
            Reference style influence
            <select
              value={referenceStyleInfluence}
              onChange={(event) =>
                setReferenceStyleInfluence(
                  event.target.value as ReferenceStyleInfluence,
                )
              }
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <span className="field-helper">
              High strongly applies the selected Kmong category design system.
            </span>
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
          {isCategoryMismatch(result) ? (
            <section className="category-warning" role="status">
              The uploaded image appears to be{' '}
              <strong>
                {categoryLabels[result.originalAnalysis.detectedCategory ?? result.category]}
              </strong>
              , but selected category is{' '}
              <strong>{categoryLabels[result.category]}</strong>. The reference style may
              not match. Switch category for better results.
            </section>
          ) : null}

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

          <section className="output-panel">
            <div className="output-heading">
              <h2>Workflow design system metadata</h2>
              <span className="integration-badge">
                {getLoadedJsonSourceLabel(result)}
              </span>
            </div>
            <dl>
              <div>
                <dt>designSystemJsonPathUsed</dt>
                <dd>{result.designSystemJsonPathUsed || 'unknown'}</dd>
              </div>
              <div>
                <dt>referenceSourceFileNamesUsed</dt>
                <dd>{formatList(result.referenceSourceFileNamesUsed)}</dd>
              </div>
              <div>
                <dt>analysisSourceFileNamesUsed</dt>
                <dd>{formatList(result.analysisSourceFileNamesUsed)}</dd>
              </div>
              <div>
                <dt>designSystemGeneratedAt</dt>
                <dd>{result.designSystemGeneratedAt || 'unknown'}</dd>
              </div>
              <div>
                <dt>referenceImageCountUsed</dt>
                <dd>{result.referenceImageCountUsed}</dd>
              </div>
              <div>
                <dt>analysisCompletenessStatus</dt>
                <dd>{result.analysisCompletenessStatus || 'unknown'}</dd>
              </div>
              <div>
                <dt>analysisCompletenessScore</dt>
                <dd>{result.analysisCompletenessScore ?? 'unknown'}</dd>
              </div>
              <div>
                <dt>requiresAdditionalAnalysis</dt>
                <dd>{String(result.requiresAdditionalAnalysis)}</dd>
              </div>
              <div>
                <dt>missingAnalysisWarnings</dt>
                <dd>{formatList(result.missingAnalysisWarnings)}</dd>
              </div>
              <div>
                <dt>referenceImagesPassedToGeneration</dt>
                <dd>{formatList(result.referenceImagesPassedToGeneration)}</dd>
              </div>
              <div>
                <dt>referenceContactSheetPath</dt>
                <dd>{result.referenceContactSheetPath || 'not used'}</dd>
              </div>
              <div>
                <dt>referenceContactSheetMode</dt>
                <dd>{result.referenceContactSheetMode || 'unknown'}</dd>
              </div>
              <div>
                <dt>referenceImageCountPassedToGeneration</dt>
                <dd>{result.referenceImageCountPassedToGeneration}</dd>
              </div>
              <div>
                <dt>generationUsedDirectReferenceImages</dt>
                <dd>{String(result.generationUsedDirectReferenceImages)}</dd>
              </div>
              <div>
                <dt>originalContentBoardGenerated</dt>
                <dd>{String(result.originalContentBoardGenerated)}</dd>
              </div>
              <div>
                <dt>originalContentBoardMode</dt>
                <dd>{result.originalContentBoardMode || 'not used'}</dd>
              </div>
              <div>
                <dt>originalContentBoardDimensions</dt>
                <dd>{formatDimensions(result.originalContentBoardDimensions)}</dd>
              </div>
            </dl>
          </section>

          <section className="analysis-source-panel">
            <div>
              Generation mode:{' '}
              <strong>
                {
                  generationModeLabels[
                    result.improvedDesignSpec.generationMode
                  ]
                }
              </strong>
            </div>
            <div>
              Original layout preservation: <strong>Low</strong>
            </div>
            <div>
              Content preservation: <strong>High</strong>
            </div>
            <div>
              Reference design influence: <strong>High</strong>
            </div>
            <div>
              Reference images passed to generation:{' '}
              <strong>{formatList(result.referenceImagesPassedToGeneration)}</strong>
            </div>
            <div>
              Reference contact sheet path:{' '}
              <strong>{result.referenceContactSheetPath || 'not used'}</strong>
            </div>
            <div>
              Reference contact sheet mode:{' '}
              <strong>{result.referenceContactSheetMode || 'unknown'}</strong>
            </div>
            <div>
              Original content board generated:{' '}
              <strong>{String(result.originalContentBoardGenerated)}</strong>
            </div>
            <div>
              Number of reference images passed to generation:{' '}
              <strong>{result.referenceImageCountPassedToGeneration}</strong>
            </div>
            <div>
              Selected subcategory:{' '}
              <strong>{categoryLabels[result.category]}</strong>
            </div>
            <div>
              Detected original category:{' '}
              <strong>
                {categoryLabels[result.originalAnalysis.detectedCategory ?? result.category]}
              </strong>
            </div>
            <div>
              Reference style influence:{' '}
              <strong>
                {
                  referenceStyleInfluenceLabels[
                    result.improvedDesignSpec.referenceStyleInfluence
                  ]
                }
              </strong>
            </div>
            <div>
              Design system sourceType:{' '}
              <strong>{result.designSystem.sourceType || 'seed'}</strong>
            </div>
            <div>
              Design system referenceImageCount:{' '}
              <strong>{result.designSystem.referenceImageCount ?? 0}</strong>
            </div>
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

          <ReferenceDesignSystemDetails result={result} />

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

function ReferenceDesignSystemDetails({ result }: { result: WorkflowResult }) {
  const designSystem = result.designSystem
  const completeness = designSystem.analysisCompleteness
  const requiresAdditionalAnalysis =
    completeness?.requiresAdditionalAnalysis ?? false

  return (
    <section className="reference-details-panel">
      <div className="output-heading">
        <h2>Loaded reference design system details</h2>
        <span className={getReferenceStatusClass(completeness?.status)}>
          {getReferenceAnalysisStatusLabel(completeness?.status)}
        </span>
      </div>

      {getDesignSystemWarning(designSystem) ? (
        <div className="category-warning">{getDesignSystemWarning(designSystem)}</div>
      ) : null}
      {!result.generationUsedDirectReferenceImages ? (
        <div className="category-warning">
          Reference contact sheet could not be loaded. Using JSON-only guidance.
        </div>
      ) : null}
      {isContactSheetNotOptimized(designSystem) ? (
        <div className="category-warning">
          Reference contact sheet is not optimized. Regenerate cropped contact sheet.
        </div>
      ) : null}

      <dl>
        <div>
          <dt>selected subcategory</dt>
          <dd>{categoryLabels[result.category]}</dd>
        </div>
        <div>
          <dt>detected original category</dt>
          <dd>
            {categoryLabels[result.originalAnalysis.detectedCategory ?? result.category]}
          </dd>
        </div>
        <div>
          <dt>design system sourceType</dt>
          <dd>{designSystem.sourceType || 'seed'}</dd>
        </div>
        <div>
          <dt>design system sourceStatus</dt>
          <dd>{designSystem.sourceStatus || 'mvp_seed_fallback'}</dd>
        </div>
        <div>
          <dt>design system generatedAt</dt>
          <dd>{designSystem.generatedAt || 'unknown'}</dd>
        </div>
        <div>
          <dt>design system JSON path</dt>
          <dd>{designSystem.designSystemJsonPath || 'unknown'}</dd>
        </div>
        <div>
          <dt>referenceImageCount</dt>
          <dd>{designSystem.referenceImageCount ?? 0}</dd>
        </div>
        <div>
          <dt>aggregationSummary.totalReferenceImagesIncluded</dt>
          <dd>{designSystem.aggregationSummary?.totalReferenceImagesIncluded ?? 0}</dd>
        </div>
        <div>
          <dt>analysisCompleteness.status</dt>
          <dd>{completeness?.status || 'unknown'}</dd>
        </div>
        <div>
          <dt>analysisCompleteness.averageCompletenessScore</dt>
          <dd>{completeness?.averageCompletenessScore ?? 'unknown'}</dd>
        </div>
        <div>
          <dt>analysisCompleteness.requiresAdditionalAnalysis</dt>
          <dd>{String(requiresAdditionalAnalysis)}</dd>
        </div>
        <div>
          <dt>publicReferenceContactSheetPath</dt>
          <dd>{designSystem.publicReferenceContactSheetPath || 'none'}</dd>
        </div>
        <div>
          <dt>publicReferenceImagePaths</dt>
          <dd>{formatList(designSystem.publicReferenceImagePaths ?? [])}</dd>
        </div>
        <div>
          <dt>referenceContactSheetGenerated</dt>
          <dd>{String(designSystem.referenceContactSheetGenerated ?? false)}</dd>
        </div>
        <div>
          <dt>referenceContactSheetMode</dt>
          <dd>{designSystem.referenceContactSheetMode || 'unknown'}</dd>
        </div>
        <div>
          <dt>contactSheetDimensions</dt>
          <dd>{formatDimensions(designSystem.contactSheetDimensions)}</dd>
        </div>
        <div>
          <dt>referenceContactSheetTileCount</dt>
          <dd>{designSystem.referenceContactSheetTileCount ?? 0}</dd>
        </div>
        <div>
          <dt>contactSheetReadableForGeneration</dt>
          <dd>{String(designSystem.contactSheetReadableForGeneration ?? false)}</dd>
        </div>
        <div>
          <dt>referenceImageCountAvailableForGeneration</dt>
          <dd>{designSystem.referenceImageCountAvailableForGeneration ?? 0}</dd>
        </div>
        <div>
          <dt>generationUsedDirectReferenceImages</dt>
          <dd>{String(result.generationUsedDirectReferenceImages)}</dd>
        </div>
        <div>
          <dt>referenceImageCountPassedToGeneration</dt>
          <dd>{result.referenceImageCountPassedToGeneration}</dd>
        </div>
      </dl>

      {designSystem.publicReferenceContactSheetPath ? (
        <figure className="contact-sheet-preview">
          <figcaption>Reference contact sheet preview</figcaption>
          <img
            src={designSystem.publicReferenceContactSheetPath}
            alt="Kmong reference contact sheet"
          />
        </figure>
      ) : null}

      <details>
        <summary>Reference files used to build this design system</summary>
        <div className="trace-list">
          {(designSystem.referenceSources ?? []).map((source) => {
            const analysisFile = designSystem.analysisSourceFiles?.find(
              (file) => file.sourceReferenceFile === source.fileName,
            )

            return (
              <div className="trace-item" key={source.fileName}>
                <strong>{source.fileName}</strong>
                <span>{source.relativePath}</span>
                <span>includedInAggregation: {String(source.includedInAggregation)}</span>
                <span>analysisStatus: {source.analysisStatus}</span>
                <span>
                  analysisCompletenessScore: {source.analysisCompletenessScore}
                </span>
                <span>
                  requiresAdditionalAnalysis:{' '}
                  {String(source.requiresAdditionalAnalysis)}
                </span>
                <span>
                  analysis JSON: {analysisFile?.fileName || 'missing'}{' '}
                  {analysisFile?.relativePath ? `(${analysisFile.relativePath})` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </details>

      <details>
        <summary>Missing or incomplete reference analysis</summary>
        <div className="trace-list">
          <div className="trace-item">
            <strong>incompleteReferenceFiles</strong>
            <span>{formatList(completeness?.incompleteReferenceFiles ?? [])}</span>
          </div>
          {(designSystem.referenceAnalysisTrace ?? [])
            .filter((trace) => trace.missingDesignElementFields.length > 0)
            .map((trace) => (
              <div className="trace-item" key={trace.fileName}>
                <strong>{trace.fileName}</strong>
                <span>
                  missingDesignElementFields:{' '}
                  {formatList(trace.missingDesignElementFields)}
                </span>
              </div>
            ))}
          <div className="trace-item">
            <strong>missingAnalysisWarnings</strong>
            <span>{formatList(designSystem.missingAnalysisWarnings ?? [])}</span>
          </div>
          {requiresAdditionalAnalysis ? (
            <div className="trace-item">
              <strong>recommendation</strong>
              <span>Additional analysis is needed before relying on this design system.</span>
            </div>
          ) : null}
        </div>
      </details>

      <details>
        <summary>Design system file trace</summary>
        <dl>
          <div>
            <dt>loaded category JSON path</dt>
            <dd>{designSystem.designSystemJsonPath || 'unknown'}</dd>
          </div>
          <div>
            <dt>manifest path</dt>
            <dd>{designSystem.aggregationSummary?.manifestPath || 'unknown'}</dd>
          </div>
          <div>
            <dt>generated source JSON path</dt>
            <dd>
              {designSystem.aggregationSummary?.generatedDesignSystemJsonPath ||
                'unknown'}
            </dd>
          </div>
          <div>
            <dt>JSON source kind</dt>
            <dd>{getLoadedJsonSourceLabel(result)}</dd>
          </div>
          <div>
            <dt>passed design element completeness validation</dt>
            <dd>{String(completeness?.status === 'complete')}</dd>
          </div>
        </dl>
      </details>
    </section>
  )
}

function isCategoryMismatch(result: WorkflowResult) {
  return Boolean(
    result.originalAnalysis.detectedCategory &&
      result.originalAnalysis.detectedCategory !== result.category,
  )
}

function formatList(values: string[]) {
  return values.length > 0 ? values.join(', ') : 'none'
}

function formatDimensions(dimensions?: { width: number; height: number }) {
  return dimensions ? `${dimensions.width} x ${dimensions.height}` : 'unknown'
}

function isContactSheetNotOptimized(designSystem: WorkflowResult['designSystem']) {
  if (!designSystem.publicReferenceContactSheetPath) {
    return false
  }

  return (
    designSystem.referenceContactSheetMode !== 'cropped_grid' ||
    designSystem.contactSheetReadableForGeneration === false
  )
}

function getLoadedJsonSourceLabel(result: WorkflowResult) {
  const sourceStatus = result.designSystem.sourceStatus

  if (sourceStatus === 'generated_from_reference_images') {
    return 'Loaded JSON source: generated reference design system'
  }

  if (sourceStatus === 'generated_from_reference_images_partial') {
    return 'Loaded JSON source: partial generated reference design system'
  }

  return 'Loaded JSON source: MVP seed fallback'
}

function getReferenceAnalysisStatusLabel(status?: string) {
  if (status === 'complete') {
    return 'Reference analysis status: Complete'
  }

  if (status === 'partial') {
    return 'Reference analysis status: Partial - additional analysis recommended'
  }

  return 'Reference analysis status: Incomplete - additional analysis required'
}

function getReferenceStatusClass(status?: string) {
  return status === 'complete'
    ? 'validation-badge complete'
    : status === 'partial'
      ? 'validation-badge partial'
      : 'validation-badge incomplete'
}

function getDesignSystemWarning(designSystem: WorkflowResult['designSystem']) {
  if (designSystem.sourceType !== 'kmong_reference_analysis') {
    return 'Generated reference design system not found for this category. Using MVP seed fallback.'
  }

  if (
    designSystem.analysisCompleteness?.status === 'partial' ||
    designSystem.analysisCompleteness?.status === 'incomplete'
  ) {
    return 'This category design system was generated from reference images, but some design elements were not fully analyzed. Additional analysis may be needed.'
  }

  return ''
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
