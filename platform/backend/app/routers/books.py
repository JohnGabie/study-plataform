import json
import re
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.book import Book
from app.models.book_prefs import BookPrefs
from app.models.user import User

router = APIRouter(prefix="/books", tags=["books"])

UPLOADS_DIR   = Path("app/uploads/books")
COVERS_DIR    = Path("app/uploads/covers")
TEXTS_DIR     = Path("app/uploads/texts")
BOOK_IMGS_DIR = Path("app/uploads/book-imgs")


def _slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def _extract_cover(pdf_path: Path, out_path: Path) -> None:
    try:
        import fitz
        doc = fitz.open(str(pdf_path))
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        pix.save(str(out_path))
        doc.close()
    except Exception:
        pass


def _bg_extract_text(slug: str, file_path_str: str) -> None:
    """Background task: extract text from a newly uploaded PDF and save to disk."""
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        text_path = _extract_text(Path(file_path_str), slug)
        book = db.query(Book).filter(Book.slug == slug).first()
        if book:
            book.text_path = str(text_path)
            db.commit()
    except Exception as e:
        print(f"[books] background text extraction failed for {slug}: {e}")
    finally:
        db.close()


_OMITTED_RE = re.compile(r"==> picture \[(\d+) x (\d+)\] intentionally omitted <==")


def _extract_text(pdf_path: Path, slug: str) -> Path:
    """Extract PDF to per-page JSON. Returns path to saved file."""
    import fitz
    import pymupdf4llm
    TEXTS_DIR.mkdir(parents=True, exist_ok=True)
    BOOK_IMGS_DIR.mkdir(parents=True, exist_ok=True)

    # pymupdf4llm produces high-quality text with placeholders where images are
    chunks = pymupdf4llm.to_markdown(
        str(pdf_path),
        page_chunks=True,
        embed_images=False,
        show_progress=False,
    )

    doc = fitz.open(str(pdf_path))
    global_img_n = 0
    pages = []

    for page_num, chunk in enumerate(chunks):
        page = doc[page_num]
        pw = page.rect.width

        # Collect images via the documented API: get_images() + get_image_bbox() + extract_image()
        # block.get("image") from get_text("dict") is unreliable (often None)
        raw_entries: list[tuple[float, float, int, int, int]] = []  # (y0, x0, xref, w, h)
        seen_xrefs: set[int] = set()

        for img_tuple in page.get_images(full=True):
            xref = img_tuple[0]
            orig_w = img_tuple[2]
            orig_h = img_tuple[3]
            if xref in seen_xrefs or orig_w < 30 or orig_h < 30:
                continue
            seen_xrefs.add(xref)
            try:
                bbox = page.get_image_bbox(xref)
                raw_entries.append((bbox.y0, bbox.x0, xref, orig_w, orig_h))
            except Exception:
                pass

        # Sort top-to-bottom, left-to-right to match pymupdf4llm placeholder order
        raw_entries.sort(key=lambda e: (e[0], e[1]))

        page_imgs: list[str] = []
        for y0, x0, xref, orig_w, orig_h in raw_entries:
            global_img_n += 1
            x_center = x0 + (orig_w / 2)  # approximate center from left edge

            if x_center < pw * 0.35:
                align = "left"
            elif x_center > pw * 0.65:
                align = "right"
            else:
                align = "center"

            try:
                extracted = doc.extract_image(xref)
                img_bytes = extracted["image"]
                ext = extracted.get("ext", "png")
                fname = f"{slug}_{global_img_n}.{ext}"
                (BOOK_IMGS_DIR / fname).write_bytes(img_bytes)
                page_imgs.append(f"\n![align:{align}](/book-imgs/{fname})\n")
            except Exception:
                page_imgs.append(f"\n*[Imagem {orig_w}×{orig_h}px — pág. {page_num + 1}]*\n")

        # Replace pymupdf4llm placeholders with actual images (same reading order)
        img_iter = iter(page_imgs)
        def replace_placeholder(m: re.Match) -> str:
            return next(img_iter, f"\n*[Imagem {m.group(1)}×{m.group(2)}px — pág. {page_num + 1}]*\n")

        text = _OMITTED_RE.sub(replace_placeholder, chunk.get("text", "")).strip()
        pages.append({"page": page_num + 1, "text": text})

    doc.close()
    text_path = TEXTS_DIR / f"{slug}.json"
    text_path.write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
    return text_path


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
    has_text: bool = False

    class Config:
        from_attributes = True


class PrefsSchema(BaseModel):
    dark_mode: bool = False
    view_mode: str  = "single"
    last_page: int  = 1


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[BookListItem])
def list_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    books = db.query(Book).filter(Book.user_id == current_user.id).order_by(Book.created_at).all()
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
def get_book(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.slug == slug, Book.user_id == current_user.id).first()
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
        has_text=bool(book.text_path and Path(book.text_path).exists()),
    )


@router.get("/{slug}/pdf")
def get_book_pdf(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(
        Book.slug == slug, Book.content_type == "pdf", Book.user_id == current_user.id
    ).first()
    if not book:
        raise HTTPException(status_code=404, detail="PDF not found")
    pdf_path = Path(book.file_path)
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file missing on disk")
    return FileResponse(str(pdf_path), media_type="application/pdf", headers={"Content-Disposition": "inline"})


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    cover: Optional[UploadFile] = File(None),
    title: str = Form(...),
    author: str = Form(...),
    year: Optional[int] = Form(None),
    phase: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
        user_id=current_user.id,
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

    if content_type == "pdf":
        background_tasks.add_task(_bg_extract_text, slug, str(file_path))

    return {
        "slug": book.slug,
        "title": book.title,
        "cover_url": f"/covers/{cover_path.name}" if cover_path else None,
    }


@router.delete("/{slug}", status_code=204)
def delete_book(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.slug == slug, Book.user_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    for path_str in [book.file_path, book.cover_path, book.text_path]:
        if path_str:
            Path(path_str).unlink(missing_ok=True)

    # Remove extracted book images for this slug
    for img_file in BOOK_IMGS_DIR.glob(f"{slug}_*"):
        img_file.unlink(missing_ok=True)

    db.query(BookPrefs).filter(
        BookPrefs.user_id == current_user.id, BookPrefs.slug == slug
    ).delete()
    db.delete(book)
    db.commit()
    return Response(status_code=204)


# ── Text extraction ───────────────────────────────────────────────────────────

@router.post("/{slug}/extract-text")
def extract_text(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.slug == slug, Book.user_id == current_user.id).first()
    if not book or book.content_type != "pdf":
        raise HTTPException(status_code=404, detail="PDF not found")
    pdf_path = Path(book.file_path)
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file missing on disk")

    text_path = _extract_text(pdf_path, slug)
    book.text_path = str(text_path)
    db.commit()

    pages = json.loads(text_path.read_text(encoding="utf-8"))
    return {"total_pages": len(pages)}


@router.get("/{slug}/text")
def get_text(
    slug: str,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.slug == slug, Book.user_id == current_user.id).first()
    if not book or not book.text_path:
        raise HTTPException(status_code=404, detail="Text not extracted yet")
    try:
        pages = json.loads(Path(book.text_path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Text file missing on disk")
    total = len(pages)
    if page > total:
        raise HTTPException(status_code=404, detail="Page out of range")
    return {"page": page, "total": total, "text": pages[page - 1]["text"]}


# ── Book preferences ──────────────────────────────────────────────────────────

@router.get("/{slug}/prefs", response_model=PrefsSchema)
def get_prefs(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = db.query(BookPrefs).filter(
        BookPrefs.user_id == current_user.id, BookPrefs.slug == slug
    ).first()
    if not prefs:
        return PrefsSchema()
    return PrefsSchema(dark_mode=prefs.dark_mode, view_mode=prefs.view_mode, last_page=prefs.last_page)


@router.patch("/{slug}/prefs", response_model=PrefsSchema)
def update_prefs(
    slug: str,
    body: PrefsSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = db.query(BookPrefs).filter(
        BookPrefs.user_id == current_user.id, BookPrefs.slug == slug
    ).first()
    if not prefs:
        prefs = BookPrefs(
            user_id=current_user.id, slug=slug,
            dark_mode=body.dark_mode, view_mode=body.view_mode, last_page=body.last_page,
        )
        db.add(prefs)
    else:
        prefs.dark_mode = body.dark_mode
        prefs.view_mode = body.view_mode
        prefs.last_page = body.last_page
    db.commit()
    return PrefsSchema(dark_mode=prefs.dark_mode, view_mode=prefs.view_mode, last_page=prefs.last_page)
