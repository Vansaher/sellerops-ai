from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import llm

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(seller_id: int = 1, db: Session = Depends(get_db)):
    return db.query(models.Order).filter(models.Order.seller_id == seller_id).all()


@router.get("/anomalies", response_model=list[schemas.OrderOut])
def list_anomalies(seller_id: int = 1, db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.seller_id == seller_id).all()
    return [o for o in orders if o.flag_reason is not None]


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return db.get(models.Order, order_id)


@router.post("/{order_id}/draft-resolution", response_model=schemas.OrderResolutionDraft)
def draft_resolution(order_id: int, db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    internal_note, customer_message = llm.draft_order_resolution(order)
    order.resolution_draft = customer_message
    order.resolution_status = "draft"
    db.commit()
    db.refresh(order)
    result = schemas.OrderResolutionDraft.model_validate(order)
    result.internal_note = internal_note
    return result


@router.patch("/{order_id}/resolution", response_model=schemas.OrderOut)
def update_resolution(order_id: int, body: schemas.OrderResolutionUpdate, db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order.resolution_status = body.status
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/send-message", response_model=schemas.OrderOut)
def send_message(order_id: int, body: schemas.OrderMessageSend, db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    thread_id = f"{order.platform.upper()}-ORDER-{order.id}"
    db.add(
        models.Message(
            seller_id=order.seller_id,
            platform=order.platform,
            thread_id=thread_id,
            customer_name=order.customer_ref,
            sender="seller",
            body=body.body,
            status="sent",
        )
    )
    order.resolution_draft = body.body
    order.resolution_status = "sent"
    db.commit()
    db.refresh(order)
    return order
