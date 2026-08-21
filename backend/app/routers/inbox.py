from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import llm

router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("", response_model=list[schemas.MessageOut])
def list_messages(seller_id: int = 1, db: Session = Depends(get_db)):
    return db.query(models.Message).filter(models.Message.seller_id == seller_id).all()


@router.post("/{message_id}/draft-reply", response_model=schemas.MessageOut)
def draft_reply(message_id: int, db: Session = Depends(get_db)):
    source = db.get(models.Message, message_id)
    if not source:
        raise HTTPException(status_code=404, detail="Message not found")

    body, risk = llm.draft_reply(db, source.seller_id, source.body)
    draft = models.Message(
        seller_id=source.seller_id,
        platform=source.platform,
        thread_id=source.thread_id,
        sender="ai_draft",
        body=body,
        status="draft",
        risk=risk,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.patch("/{message_id}", response_model=schemas.MessageOut)
def update_message(message_id: int, update: schemas.MessageDraftUpdate, db: Session = Depends(get_db)):
    message = db.get(models.Message, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if update.body is not None:
        message.body = update.body
    message.status = update.status
    db.commit()
    db.refresh(message)
    return message
