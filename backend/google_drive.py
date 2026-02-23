"""
Google Drive integration - upload PDFs to patient folders.
Uses service account with domain-wide delegation.
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


def get_or_create_patient_folder(patient_name: str) -> str:
    """Find or create a single folder for the patient. Returns folder ID."""
    service = _get_drive_service()
    
    # Search for existing folder
    safe_name = patient_name.replace("'", "\\'")
    query = (
        f"name = '{safe_name}' and "
        f"mimeType = 'application/vnd.google-apps.folder' and "
        f"'{DRIVE_ID}' in parents and "
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

    # Create new folder
    folder_metadata = {
        "name": patient_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [DRIVE_ID],
    }
    folder = service.files().create(
        body=folder_metadata,
        supportsAllDrives=True,
        fields="id",
    ).execute()
    return folder["id"]


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
