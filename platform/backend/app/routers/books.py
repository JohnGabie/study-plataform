import os
import re
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.book import Book
from app.models.book_prefs import BookPrefs

router = APIRouter(prefix="/books", tags=["books"])

UPLOADS_DIR = Path("app/uploads/books")
COVERS_DIR  = Path("app/uploads/covers")


def _slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def _extract_cover(pdf_path: Path, out_path: Path) -> None:
    try:
        import fitz  # pymupdf
        doc = fitz.open(str(pdf_path))
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        pix.save(str(out_path))
        doc.close()
    except Exception:
        pass  # cover extraction is best-effort


# ── Schemas ───────────────────────────────────────────────────────────────────
class BookListItem(BaseModel):
    slug: str
    title: str
    author: str
    year: Optional[int]
    phase: Optional[int]
    available: bool
    content_type: str
    cover_url: Optional[str]

    class Config:
        from_attributes = True


class BookDetail(BaseModel):
    slug: str
    title: str
    author: str
    year: Optional[int]
    phase: Optional[int]
    content_type: str
    content: Optional[str]
    cover_url: Optional[str]

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[BookListItem])
def list_books(db: Session = Depends(get_db)):
    books = db.query(Book).order_by(Book.created_at).all()
    return [
        BookListItem(
            slug=b.slug, title=b.title, author=b.author,
            year=b.year, phase=b.phase, available=True,
            content_type=b.content_type,
            cover_url=f"/covers/{Path(b.cover_path).name}" if b.cover_path else None,
        )
        for b in books
    ]


@router.get("/{slug}", response_model=BookDetail)
def get_book(slug: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.slug == slug).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    content = None
    if book.content_type == "markdown":
        try:
            content = Path(book.file_path).read_text(encoding="utf-8")
        except Exception:
            content = ""

    return BookDetail(
        slug=book.slug, title=book.title, author=book.author,
        year=book.year, phase=book.phase,
        content_type=book.content_type, content=content,
        cover_url=f"/covers/{Path(book.cover_path).name}" if book.cover_path else None,
    )


@router.get("/{slug}/pdf")
def get_book_pdf(slug: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.slug == slug, Book.content_type == "pdf").first()
    if not book:
        raise HTTPException(status_code=404, detail="PDF not found")
    pdf_path = Path(book.file_path)
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file missing on disk")
    return FileResponse(str(pdf_path), media_type="application/pdf", headers={"Content-Disposition": "inline"})


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_book(
    file: UploadFile = File(...),
    cover: Optional[UploadFile] = File(None),
    title: str = Form(...),
    author: str = Form(...),
    year: Optional[int] = Form(None),
    phase: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    slug = _slugify(title)
    if db.query(Book).filter(Book.slug == slug).first():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    original_ext = Path(file.filename or "").suffix.lower() or ".bin"
    content_type = "pdf" if original_ext == ".pdf" else "markdown"

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    COVERS_DIR.mkdir(parents=True, exist_ok=True)

    file_path = UPLOADS_DIR / f"{slug}{original_ext}"
    file_path.write_bytes(await file.read())

    cover_path: Optional[Path] = None
    if cover and cover.filename:
        cover_ext = Path(cover.filename).suffix.lower() or ".png"
        cover_path = COVERS_DIR / f"{slug}{cover_ext}"
        cover_path.write_bytes(await cover.read())
    elif content_type == "pdf":
        cover_out = COVERS_DIR / f"{slug}.png"
        _extract_cover(file_path, cover_out)
        if cover_out.exists():
            cover_path = cover_out

    book = Book(
        id=str(uuid.uuid4()),
        slug=slug,
        title=title,
        author=author,
        year=year,
        phase=phase,
        content_type=content_type,
        file_path=str(file_path),
        cover_path=str(cover_path) if cover_path else None,
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    return {
        "slug": book.slug,
        "title": book.title,
        "cover_url": f"/covers/{cover_path.name}" if cover_path else None,
    }


# ── Book preferences (dark mode, view mode) ───────────────────────────────────

class PrefsSchema(BaseModel):
    dark_mode: bool = False
    view_mode: str  = "single"


@router.get("/{slug}/prefs", response_model=PrefsSchema)
def get_prefs(slug: str, db: Session = Depends(get_db)):
    prefs = db.query(BookPrefs).filter(BookPrefs.slug == slug).first()
    if not prefs:
        return PrefsSchema()
    return PrefsSchema(dark_mode=prefs.dark_mode, view_mode=prefs.view_mode)


@router.patch("/{slug}/prefs", response_model=PrefsSchema)
def update_prefs(slug: str, body: PrefsSchema, db: Session = Depends(get_db)):
    prefs = db.query(BookPrefs).filter(BookPrefs.slug == slug).first()
    if not prefs:
        prefs = BookPrefs(slug=slug, dark_mode=body.dark_mode, view_mode=body.view_mode)
        db.add(prefs)
    else:
        prefs.dark_mode = body.dark_mode
        prefs.view_mode = body.view_mode
    db.commit()
    return PrefsSchema(dark_mode=prefs.dark_mode, view_mode=prefs.view_mode)
