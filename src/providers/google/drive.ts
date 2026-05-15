export type DriveUploadResult = {
  fileName: string
  driveLink: string
  mode: 'mock' | 'live'
}

export async function uploadImageToDrive(
  imageDataUrl: string,
  fileName: string,
): Promise<DriveUploadResult> {
  const folderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID

  if (!folderId) {
    return {
      fileName,
      driveLink: `https://drive.google.com/mock/${encodeURIComponent(fileName)}`,
      mode: 'mock',
    }
  }

  // TODO: Move Google Drive calls to backend API routes before real deployment.
  // Browser-only MVP intentionally avoids exposing OAuth credentials or service
  // account secrets. Return a deterministic mock link until a backend is added.
  return {
    fileName,
    driveLink: `https://drive.google.com/drive/folders/${folderId}?mockFile=${encodeURIComponent(
      fileName,
    )}&bytes=${imageDataUrl.length}`,
    mode: 'mock',
  }
}
