"""
Google Drive integration - upload PDFs to user > patient folder structure.
Uses service account with domain-wide delegation.

Structure:
  Shared Drive/
  ├── {User Name}/
  │   ├── {Patient Name}/
  │   │   ├── Patient - Program Step (Patient).pdf
  │   │   └── Patient - Program Step (HC).pdf
"""
import os
import io
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "service_account.json")
DRIVE_ID = os.environ.get("GOOGLE_DRIVE_ID", "0AGikKY7QHD7NUk9PVA")
IMPERSONATE_USER = os.environ.get("GOOGLE_DRIVE_IMPERSONATE_USER", "drjason@drshumard.com")
SCOPES = ["https://www.googleapis.com/auth/drive"]


def _get_drive_service():
    """Build Google Drive API service with impersonation."""
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    delegated = credentials.with_subject(IMPERSONATE_USER)
    return build("drive", "v3", credentials=delegated)


def _find_or_create_folder(service, name: str, parent_id: str) -> str:
    """Find or create a folder by name under a parent. Returns folder ID."""
    safe_name = name.replace("'", "\\'")
    query = (
        f"name = '{safe_name}' and "
        f"mimeType = 'application/vnd.google-apps.folder' and "
        f"'{parent_id}' in parents and "
        f"trashed = false"
    )
    results = service.files().list(
        q=query,
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
        corpora="drive",
        driveId=DRIVE_ID,
        fields="files(id, name)",
    ).execute()

    files = results.get("files", [])
    if files:
        return files[0]["id"]

    folder_metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(
        body=folder_metadata,
        supportsAllDrives=True,
        fields="id",
    ).execute()
    return folder["id"]


def get_upload_folder(user_name: str, patient_name: str) -> str:
    """Get or create the nested folder: Shared Drive > User > Patient. Returns patient folder ID."""
    service = _get_drive_service()
    user_folder_id = _find_or_create_folder(service, user_name, DRIVE_ID)
    patient_folder_id = _find_or_create_folder(service, patient_name, user_folder_id)
    return patient_folder_id


def upload_pdf_to_folder(folder_id: str, filename: str, pdf_bytes: bytes) -> dict:
    """Upload a PDF to a specific folder on Google Drive."""
    service = _get_drive_service()

    file_metadata = {
        "name": filename,
        "parents": [folder_id],
    }

    media = MediaIoBaseUpload(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        resumable=True,
    )

    file = service.files().create(
        body=file_metadata,
        media_body=media,
        supportsAllDrives=True,
        fields="id, name, webViewLink",
    ).execute()

    return {
        "file_id": file.get("id"),
        "filename": file.get("name"),
        "web_link": file.get("webViewLink"),
        "folder_id": folder_id,
    }
