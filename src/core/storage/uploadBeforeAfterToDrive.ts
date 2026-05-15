import { uploadImageToDrive } from '../../providers/google/drive'

export async function uploadBeforeAfterToDrive(
  companyName: string,
  beforeImageUrl: string,
  afterImageUrl: string,
) {
  const safeCompanyName = companyName.trim().replace(/[^a-z0-9가-힣_-]+/gi, '-')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const before = await uploadImageToDrive(
    beforeImageUrl,
    `${safeCompanyName}-${timestamp}-before.png`,
  )
  const after = await uploadImageToDrive(
    afterImageUrl,
    `${safeCompanyName}-${timestamp}-after.png`,
  )

  return {
    beforeDriveLink: before.driveLink,
    afterDriveLink: after.driveLink,
    mode: before.mode === 'live' && after.mode === 'live' ? 'live' : 'mock',
  }
}
