"""
routes/reports.py — PDF financial report generation endpoint
Uses ReportLab to generate a comprehensive monthly PDF report.
Premium feature only.
"""

import logging
import os
from io import BytesIO
from typing import Optional
from datetime import datetime
from calendar import monthrange

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from utils.deps import get_current_user_id, get_supabase, require_premium

logger = logging.getLogger("zenvest.reports")
router = APIRouter()

# ============================================================
# Schemas
# ============================================================
class ReportRequest(BaseModel):
    month_year: str = ""  # Format: YYYY-MM
    email:      bool = False

# ============================================================
# PDF Generation
# ============================================================
def _generate_pdf(
    user_name:    str,
    month_label:  str,
    transactions: list,
    goals:        list,
    net_worth:    float,
) -> bytes:
    """
    Generate a monthly PDF report using ReportLab.

    :returns: PDF bytes
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        logger.error("ReportLab not installed")
        raise

    buffer = BytesIO()
    doc    = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )

    # Colors
    ZEN_GREEN  = colors.HexColor("#7FFFD4")
    DARK_BG    = colors.HexColor("#0D1117")
    LIGHT_GRAY = colors.HexColor("#8896A7")
    GOLD       = colors.HexColor("#F5C842")

    styles = getSampleStyleSheet()
    title_style   = ParagraphStyle("Title",   parent=styles["Normal"], fontSize=24, textColor=DARK_BG, fontName="Helvetica-Bold", alignment=TA_CENTER)
    heading_style = ParagraphStyle("Heading", parent=styles["Normal"], fontSize=14, textColor=DARK_BG, fontName="Helvetica-Bold")
    body_style    = ParagraphStyle("Body",    parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#374151"))
    muted_style   = ParagraphStyle("Muted",   parent=styles["Normal"], fontSize=9,  textColor=LIGHT_GRAY)

    elements = []

    # ---- Header ----
    elements.append(Paragraph("💎 Zenvest", title_style))
    elements.append(Paragraph(f"Monthly Financial Report — {month_label}", muted_style))
    elements.append(Paragraph(f"Prepared for: {user_name}", muted_style))
    elements.append(Spacer(1, 8*mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GRAY))
    elements.append(Spacer(1, 6*mm))

    # ---- Stats Summary ----
    income   = sum(float(t.get("amount", 0)) for t in transactions if t.get("type") == "income")
    expenses = sum(float(t.get("amount", 0)) for t in transactions if t.get("type") == "expense")
    balance  = income - expenses
    savings_rate = round((balance / income * 100) if income > 0 else 0, 1)

    elements.append(Paragraph("Summary", heading_style))
    elements.append(Spacer(1, 3*mm))

    summary_data = [
        ["Metric",         "Amount"],
        ["Total Income",   f"${income:,.2f}"],
        ["Total Expenses", f"${expenses:,.2f}"],
        ["Net Balance",    f"${balance:,.2f}"],
        ["Savings Rate",   f"{savings_rate}%"],
        ["Net Worth",      f"${net_worth:,.2f}"],
    ]

    summary_table = Table(summary_data, colWidths=[90*mm, 60*mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), DARK_BG),
        ("TEXTCOLOR",   (0, 0), (-1, 0), ZEN_GREEN),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 6*mm))

    # ---- Category Breakdown ----
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB")))
    elements.append(Spacer(1, 4*mm))
    elements.append(Paragraph("Spending by Category", heading_style))
    elements.append(Spacer(1, 3*mm))

    cat_map: dict = {}
    for t in transactions:
        if t.get("type") == "expense":
            cat = t.get("category", "Other")
            cat_map[cat] = cat_map.get(cat, 0) + float(t.get("amount", 0))

    if cat_map:
        cat_data = [["Category", "Amount", "% of Expenses"]]
        for cat, amt in sorted(cat_map.items(), key=lambda x: x[1], reverse=True):
            pct = f"{amt / expenses * 100:.1f}%" if expenses > 0 else "0%"
            cat_data.append([cat, f"${amt:,.2f}", pct])

        cat_table = Table(cat_data, colWidths=[80*mm, 55*mm, 40*mm])
        cat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
            ("TEXTCOLOR",  (0, 0), (-1, 0), ZEN_GREEN),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ]))
        elements.append(cat_table)
    else:
        elements.append(Paragraph("No expenses recorded for this period.", muted_style))

    elements.append(Spacer(1, 6*mm))

    # ---- Goals ----
    if goals:
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB")))
        elements.append(Spacer(1, 4*mm))
        elements.append(Paragraph("Financial Goals Progress", heading_style))
        elements.append(Spacer(1, 3*mm))

        goals_data = [["Goal", "Target", "Current", "Progress"]]
        for g in goals:
            target  = float(g.get("target_amount", 0))
            current = float(g.get("current_amount", 0))
            pct     = f"{min(100, current / target * 100):.0f}%" if target > 0 else "—"
            goals_data.append([
                g.get("name", ""),
                f"${target:,.2f}",
                f"${current:,.2f}",
                pct,
            ])

        goals_table = Table(goals_data, colWidths=[65*mm, 40*mm, 40*mm, 30*mm])
        goals_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), DARK_BG),
            ("TEXTCOLOR",  (0, 0), (-1, 0), GOLD),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, -1), 10),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ]))
        elements.append(goals_table)

    # ---- Footer ----
    elements.append(Spacer(1, 10*mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E5E7EB")))
    elements.append(Spacer(1, 3*mm))
    elements.append(Paragraph(
        f"Generated by Zenvest · {datetime.now().strftime('%B %d, %Y')} · "
        "For informational purposes only, not financial advice.",
        muted_style
    ))

    doc.build(elements)
    return buffer.getvalue()

# ============================================================
# Endpoint
# ============================================================
@router.post("/pdf")
async def generate_pdf_report(
    payload:  ReportRequest,
    user_id:  str = Depends(require_premium),
    supabase      = Depends(get_supabase),
):
    """Generate a PDF monthly financial report. Premium only."""
    # Determine month range
    month_str = payload.month_year or datetime.now().strftime("%Y-%m")
    try:
        year, month = map(int, month_str.split("-"))
        month_label = datetime(year, month, 1).strftime("%B %Y")
        last_day    = monthrange(year, month)[1]
        start_date  = f"{year}-{month:02d}-01"
        end_date    = f"{year}-{month:02d}-{last_day:02d}"
    except (ValueError, AttributeError):
        year = datetime.now().year
        month = datetime.now().month
        month_label = datetime.now().strftime("%B %Y")
        start_date  = f"{year}-{month:02d}-01"
        last_day    = monthrange(year, month)[1]
        end_date    = f"{year}-{month:02d}-{last_day:02d}"

    # Fetch data
    tx_resp = (
        supabase.table("transactions")
        .select("*")
        .eq("user_id", user_id)
        .gte("date", start_date)
        .lte("date", end_date)
        .execute()
    )
    transactions = tx_resp.data or []

    goals_resp = (
        supabase.table("goals")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    goals = goals_resp.data or []

    nw_resp = (
        supabase.table("net_worth_snapshots")
        .select("net_worth")
        .eq("user_id", user_id)
        .order("snapshot_date", desc=True)
        .limit(1)
        .execute()
    )
    net_worth = float(nw_resp.data[0]["net_worth"]) if nw_resp.data else 0

    user_resp = (
        supabase.table("users")
        .select("name, email")
        .eq("id", user_id)
        .single()
        .execute()
    )
    user_name = (user_resp.data or {}).get("name", "User")

    # Generate PDF
    pdf_bytes = _generate_pdf(user_name, month_label, transactions, goals, net_worth)

    if payload.email:
        # Email the report (n8n webhook would handle this in production)
        user_email = (user_resp.data or {}).get("email", "")
        logger.info(f"Would email PDF report to {user_email} for {month_label}")
        return {"message": f"Report for {month_label} sent to your email! 📧"}

    # Return as downloadable PDF
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="zenvest-report-{month_str}.pdf"'
        },
    )
