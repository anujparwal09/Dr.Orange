import io
import json
from datetime import datetime
from flask import Blueprint, request, make_response, jsonify, current_app
from flask_jwt_extended import jwt_required

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                Table, TableStyle, HRFlowable, Image as RLImage, PageBreak)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import qrcode

report_bp = Blueprint('report', __name__)

TREATMENTS = {
    "Citrus_Canker": [
        "1. Apply Bordeaux mixture (1%) or copper oxychloride spray immediately",
        "2. Remove and destroy all infected leaves, twigs, and fallen fruit",
        "3. Disinfect pruning tools with 70% alcohol between cuts",
        "4. Install windbreaks (Casuarina hedges) to reduce bacterial spread",
        "5. Switch to drip irrigation — avoid overhead/sprinkler systems",
        "6. Apply copper-based bactericide after every rainfall event",
        "7. Maintain 5m spacing between trees for air circulation",
        "8. Quarantine affected trees — do not transport to other farms",
        "9. Apply streptomycin sulphate (500ppm) during new flush period",
        "10. Report to local agriculture officer for official disease mapping"
    ],
    "Melanose": [
        "1. Apply carbendazim (0.1%) fungicide during spring flush period",
        "2. Prune out dead wood which harbors the fungus",
        "3. Improve air circulation within the canopy",
        "4. Apply protective fungicides before rainfall",
        "5. Remove fallen fruit and leaves regularly",
        "6. Spray mancozeb (0.25%) as a preventative measure",
        "7. Maintain grove sanitation",
        "8. Use wider tree spacing to reduce humidity",
        "9. Monitor disease severity during wet periods",
        "10. Consult agronomist for advanced treatment schedules"
    ],
    "Greening": [
        "1. Control the vector insect (psyllid) immediately",
        "2. Uproot and burn infected trees to prevent spread",
        "3. Plant only certified disease-free nursery stock",
        "4. Use imidacloprid for effective vector control",
        "5. Conduct regular grove inspections",
        "6. Improve overall tree nutrition and health",
        "7. Monitor neighboring infected groves",
        "8. Implement biological control methods for psyllids",
        "9. Only use authorized budwood for propagation",
        "10. Notify state horticulture department immediately"
    ],
    "Black_Spot": [
        "1. Apply copper-based fungicide sprays regularly",
        "2. Remove affected fruits immediately to stop spread",
        "3. Maintain excellent grove hygiene and sanitation",
        "4. Ensure proper drainage to avoid waterlogging",
        "5. Avoid excessive moisture during warm periods",
        "6. Spray thiophanate methyl (0.1%) if severe",
        "7. Clear post-harvest debris quickly",
        "8. Plant resistant varieties where possible",
        "9. Maintain balanced fertility levels",
        "10. Follow a regular disease monitoring program"
    ],
    "Healthy": [
        "1. Continue current irrigation and fertilization schedule",
        "2. Monitor weekly for early signs of disease",
        "3. Provide balanced NPK fertilizer for fruit growth",
        "4. Maintain proper pruning for optimal air circulation",
        "5. Apply calcium sprays 4-6 weeks pre-harvest for quality",
        "6. Use drip irrigation for consistent soil moisture",
        "7. Protect from mechanical damage during harvest",
        "8. Check soil moisture daily during dry spells",
        "9. Protect beneficial insects for natural pest control",
        "10. Prepare accurate records for the upcoming harvest"
    ]
}

TREATMENTS_HI = {
    "Citrus_Canker": [
        "1. बोर्डो मिश्रण (1%) या कॉपर ऑक्सीक्लोराइड का तुरंत छिड़काव करें",
        "2. संक्रमित पत्तियाँ, टहनियाँ और गिरे फल नष्ट करें",
        "3. कटाई के औज़ार 70% अल्कोहल से साफ करें",
        "4. वायु अवरोधक लगाएं (कैसुरिना की बाड़)",
        "5. ड्रिप सिंचाई अपनाएं — छिड़काव सिंचाई बंद करें",
        "6. हर बारिश के बाद कॉपर-आधारित बैक्टीरिसाइड लगाएं",
        "7. पेड़ों के बीच 5 मीटर की दूरी बनाए रखें",
        "8. प्रभावित पेड़ों को अलग करें",
        "9. नई पत्तियों के समय स्ट्रेप्टोमाइसिन सल्फेट (500ppm) लगाएं",
        "10. स्थानीय कृषि अधिकारी को सूचित करें"
    ],
    "Melanose": [
        "1. वसंत फ्लश के दौरान कार्बेन्डाज़िम (0.1%) कवकनाशी लगाएं",
        "2. मृत लकड़ी की छंटाई करें जो कवक को आश्रय देती है",
        "3. छत्र में वायु संचार बेहतर बनाएं",
        "4. बारिश से पहले सुरक्षात्मक कवकनाशी लगाएं",
        "5. गिरे हुए फल और पत्तियाँ नियमित रूप से हटाएं",
        "6. मैंकोज़ेब (0.25%) का छिड़काव करें",
        "7. बाग की स्वच्छता बनाए रखें",
        "8. नमी कम करने के लिए उचित दूरी बनाए रखें",
        "9. रोग की गंभीरता की निगरानी करें",
        "10. कृषि विशेषज्ञ से परामर्श लें"
    ],
    "Greening": [
        "1. रोग फैलाने वाले कीट (सिला) को नियंत्रित करें",
        "2. संक्रमित पेड़ों को उखाड़ें और जलाएं",
        "3. स्वस्थ नर्सरी पौधे ही लगाएं",
        "4. इमिडाक्लोप्रिड से कीट नियंत्रण करें",
        "5. बाग का नियमित निरीक्षण करें",
        "6. पोषक तत्व प्रबंधन बेहतर करें",
        "7. पास के संक्रमित बागों की जानकारी रखें",
        "8. जैव-नियंत्रण विधियाँ अपनाएं",
        "9. अधिकृत पौधे सामग्री ही उपयोग करें",
        "10. राज्य बागवानी विभाग को सूचित करें"
    ],
    "Black_Spot": [
        "1. कॉपर-आधारित कवकनाशी का नियमित छिड़काव करें",
        "2. प्रभावित फलों को तुरंत हटाएं",
        "3. बाग की सफाई और स्वच्छता बनाए रखें",
        "4. उचित जल निकासी सुनिश्चित करें",
        "5. अत्यधिक नमी से बचाएं",
        "6. थायोफेनेट मिथाइल (0.1%) का छिड़काव करें",
        "7. फसल के बाद अवशेष हटाएं",
        "8. प्रतिरोधी किस्में लगाएं",
        "9. संतुलित उर्वरकता बनाए रखें",
        "10. नियमित रोग निगरानी कार्यक्रम अपनाएं"
    ],
    "Healthy": [
        "1. वर्तमान सिंचाई और उर्वरक कार्यक्रम जारी रखें",
        "2. साप्ताहिक रोग निगरानी करते रहें",
        "3. संतुलित NPK उर्वरक दें",
        "4. उचित छंटाई और वायु संचार बनाए रखें",
        "5. कटाई से 4-6 सप्ताह पहले कैल्शियम स्प्रे करें",
        "6. ड्रिप सिंचाई से पानी दें",
        "7. यांत्रिक क्षति से बचाएं",
        "8. मिट्टी की नमी नियमित जांचें",
        "9. लाभकारी कीटों की रक्षा करें",
        "10. अगली फसल के लिए अभिलेख तैयार करें"
    ]
}

def build_pdf(data: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            topMargin=15 * mm, bottomMargin=15 * mm,
                            leftMargin=20 * mm, rightMargin=20 * mm)

    # Colors
    orange = colors.HexColor('#FF8C00')
    dark_bg = colors.HexColor('#080808')
    cream = colors.HexColor('#FAF5E4')
    muted = colors.HexColor('#8A7F70')
    green_ok = colors.HexColor('#2D8A4E')
    red_alert = colors.HexColor('#FF4500')

    styles = getSampleStyleSheet()
    
    # Custom Styles
    ReportTitle = ParagraphStyle('ReportTitle', fontName='Helvetica-Bold', fontSize=24, textColor=orange, alignment=TA_LEFT, spaceAfter=8)
    Subtitle = ParagraphStyle('Subtitle', fontName='Helvetica', fontSize=12, textColor=muted, alignment=TA_LEFT, spaceAfter=20)
    SectionHead = ParagraphStyle('SectionHead', fontName='Helvetica-Bold', fontSize=14, textColor=cream, spaceBefore=20, spaceAfter=10)
    Body = ParagraphStyle('Body', fontName='Helvetica', fontSize=10, textColor=muted, leading=16)
    TreatmentBody = ParagraphStyle('TreatmentBody', fontName='Helvetica', fontSize=10, textColor=cream, leading=14, spaceAfter=4)
    MetricLabel = ParagraphStyle('MetricLabel', fontName='Helvetica', fontSize=9, textColor=muted)
    MetricValue = ParagraphStyle('MetricValue', fontName='Helvetica-Bold', fontSize=14, textColor=orange)

    story = []

    # PAGE 1: ENGLISH REPORT
    
    # Header
    story.append(HRFlowable(width="100%", thickness=3, color=orange))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Dr.Orange Diagnostic Report", ReportTitle))
    story.append(Paragraph("MBBS in Melanose | AI-Powered Citrus Health Analysis", Subtitle))

    today = datetime.now().strftime("%d %b %Y, %H:%M")
    scan_id = data.get('scan_id', 'Unknown')
    disease = data.get('disease', 'Unknown')
    confidence = data.get('disease_confidence', 0.0)
    quality_score = data.get('quality_score', 0.0)
    shelf_life_days = data.get('shelf_life_days', 0)
    estimated_age_days = data.get('estimated_age_days', 0)
    ripeness_stage = data.get('ripeness_stage', 'Unknown')
    probabilities = data.get('all_probabilities', {})

    meta_data = [
        [Paragraph(f"<b>Report ID:</b> scan_{scan_id}", Body), Paragraph(f"<b>Date:</b> {today}", Body)],
        [Paragraph("<b>Generated by:</b> Dr. Orange AI System", Body), Paragraph("<b>Status:</b> Complete", Body)]
    ]
    t = Table(meta_data, colWidths=[100 * mm, 70 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#111111')),
        ('TEXTCOLOR', (0, 0), (-1, -1), cream),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=orange))

    # Diagnosis
    story.append(Paragraph("🔬 Disease Diagnosis", SectionHead))
    
    is_healthy = disease == 'Healthy'
    box_color = green_ok if is_healthy else red_alert
    bg_color = colors.HexColor('#2D8A4E26') if is_healthy else colors.HexColor('#FF450026')
    
    diag_text = f"{'✓' if is_healthy else '⚠'} {disease.replace('_', ' ')} — {confidence}% Confidence"
    diag_p = Paragraph(f"<font size=16 color='{box_color.hexval()}'><b>{diag_text}</b></font>", ParagraphStyle('Diag', alignment=TA_CENTER))
    
    diag_table = Table([[diag_p]], colWidths=[170 * mm])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_color),
        ('BOX', (0, 0), (-1, -1), 2, box_color),
        ('PADDING', (0, 0), (-1, -1), 15),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER')
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 10))
    
    sev_text = "Status: HEALTHY | No disease detected." if is_healthy else "Severity: HIGH | Immediate treatment recommended."
    story.append(Paragraph(sev_text, Body))

    # Metrics
    story.append(Paragraph("📏 Key Metrics", SectionHead))
    metric_data = [
        [Paragraph("Quality Score", MetricLabel), Paragraph("Shelf Life Remaining", MetricLabel)],
        [Paragraph(f"{quality_score}/10", MetricValue), Paragraph(f"{shelf_life_days} days", MetricValue)],
        [Paragraph("Ripeness Stage", MetricLabel), Paragraph("Estimated Age", MetricLabel)],
        [Paragraph(ripeness_stage.replace('_', ' '), MetricValue), Paragraph(f"{estimated_age_days} days", MetricValue)],
    ]
    mt = Table(metric_data, colWidths=[85 * mm, 85 * mm])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#1a1a1a')),
        ('BACKGROUND', (0,1), (-1,1), dark_bg),
        ('BACKGROUND', (0,3), (-1,3), dark_bg),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#FF8C004D')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#FF8C004D')),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(mt)

    # Confidence Breakdown
    story.append(Paragraph("📊 Confidence Breakdown", SectionHead))
    prob_data = [["Disease Name", "Probability Bar", "%"]]
    
    for d_name, pct in probabilities.items():
        name_p = Paragraph(d_name.replace('_', ' '), Body)
        # Bar chart drawn using a sub-table
        bar = Table([[""]], colWidths=[max(int(100 * (pct / 100.0)), 1) * mm], rowHeights=[6 * mm])
        bar.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), orange if d_name == disease else muted),
        ]))
        pct_p = Paragraph(f"{pct}%", MetricValue)
        prob_data.append([name_p, bar, pct_p])
        
    pt = Table(prob_data, colWidths=[50 * mm, 105 * mm, 15 * mm])
    pt.setStyle(TableStyle([
        ('ALIGN', (2,0), (2,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(pt)

    # AI Disease Analysis (from Gemini report if available)
    gemini_report = data.get('gemini_report', {})
    if isinstance(gemini_report, str):
        try:
            gemini_report = json.loads(gemini_report)
        except:
            gemini_report = {}
    
    if gemini_report and not gemini_report.get('error'):
        story.append(Paragraph("🔍 AI Disease Analysis", SectionHead))
        
        # Severity badge
        severity = gemini_report.get('severity_level', '')
        if severity:
            severity_color = green_ok if severity.lower() == 'low' else (orange if severity.lower() == 'medium' else red_alert)
            sev_p = Paragraph(
                f"<font color='{severity_color.hexval()}'><b>Severity: {severity}</b></font>",
                ParagraphStyle('Sev', fontSize=11, spaceAfter=8)
            )
            story.append(sev_p)
        
        # Overview
        overview = gemini_report.get('overview', gemini_report.get('description', ''))
        if overview:
            OverviewStyle = ParagraphStyle('Overview', fontName='Helvetica', fontSize=10, textColor=cream, 
                                           leading=16, spaceAfter=10,
                                           borderColor=orange, borderWidth=1, borderPadding=10,
                                           backColor=colors.HexColor('#1a1a1a'))
            story.append(Paragraph(overview, OverviewStyle))
        
        # Prevention tips from Gemini
        prevention = gemini_report.get('prevention', [])
        if prevention and isinstance(prevention, list) and len(prevention) > 0:
            story.append(Paragraph("🛡️ Prevention Tips", SectionHead))
            for i, tip in enumerate(prevention):
                tip_text = tip if tip.startswith(str(i+1)) else f"{i+1}. {tip}"
                story.append(Paragraph(tip_text, TreatmentBody))

    # Treatment Recommendations
    story.append(Paragraph("💊 Treatment Recommendations", SectionHead))
    
    # Use Gemini treatment if available, fallback to hardcoded
    gemini_treatments = gemini_report.get('treatment', []) if gemini_report else []
    if gemini_treatments and isinstance(gemini_treatments, list) and len(gemini_treatments) > 0:
        for i, t_line in enumerate(gemini_treatments):
            t_text = t_line if t_line.startswith(str(i+1)) else f"{i+1}. {t_line}"
            story.append(Paragraph(t_text, TreatmentBody))
    else:
        treatments = TREATMENTS.get(disease, TREATMENTS["Healthy"])
        for t_line in treatments:
            story.append(Paragraph(t_line, TreatmentBody))

    # QR Code
    story.append(Spacer(1, 20))
    qr_data = f"Dr.Orange Report | ID: {scan_id} | Disease: {disease} | Quality: {quality_score}/10 | Date: {today}"
    qr = qrcode.QRCode(version=1, box_size=4, border=1)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color='#FAF5E4', back_color='#080808')
    qr_buffer = io.BytesIO()
    img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    story.append(RLImage(qr_buffer, width=30*mm, height=30*mm))
    story.append(Paragraph("Scan to verify report authenticity", MetricLabel))

    # PAGE 2: HINDI REPORT
    story.append(PageBreak())

    disease_names_hi = {
        "Healthy": "स्वस्थ फल — कोई रोग नहीं",
        "Citrus_Canker": "साइट्रस कैंकर (नींबूवर्गीय कैंकर)",
        "Melanose": "मेलानोज़ (कवक रोग)",
        "Black_Spot": "काला धब्बा रोग",
        "Greening": "हरितिमा रोग (ग्रीनिंग)"
    }
    
    ripeness_hi = {
        "Unripe": "कच्चा",
        "Near_Ripe": "लगभग पका",
        "Ripe": "पका हुआ",
        "Overripe": "अत्यधिक पका"
    }

    story.append(HRFlowable(width="100%", thickness=3, color=orange))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("डॉ. ऑरेंज रोग निदान रिपोर्ट", ReportTitle))
    story.append(Paragraph("AI-संचालित संतरा स्वास्थ्य विश्लेषण", Subtitle))

    story.append(Table(meta_data, colWidths=[100 * mm, 70 * mm], style=t.style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=orange))

    # Diagnosis HI
    story.append(Paragraph("🔬 रोग निदान", SectionHead))
    diag_text_hi = f"{'✓' if is_healthy else '⚠'} {disease_names_hi.get(disease, disease)} — {confidence}%"
    diag_p_hi = Paragraph(f"<font size=16 color='{box_color.hexval()}'><b>{diag_text_hi}</b></font>", ParagraphStyle('DiagHi', alignment=TA_CENTER))
    diag_table_hi = Table([[diag_p_hi]], colWidths=[170 * mm])
    diag_table_hi.setStyle(diag_table.style)
    story.append(diag_table_hi)
    story.append(Spacer(1, 10))
    
    sev_text_hi = "स्थिति: स्वस्थ | कोई रोग नहीं." if is_healthy else "गंभीरता: उच्च | तुरंत उपचार की सिफारिश की जाती है."
    story.append(Paragraph(sev_text_hi, Body))

    # Metrics HI
    story.append(Paragraph("📏 मुख्य मापदंड", SectionHead))
    metric_data_hi = [
        [Paragraph("गुणवत्ता स्कोर", MetricLabel), Paragraph("शेष शेल्फ जीवन", MetricLabel)],
        [Paragraph(f"{quality_score}/10", MetricValue), Paragraph(f"{shelf_life_days} दिन", MetricValue)],
        [Paragraph("परिपक्वता अवस्था", MetricLabel), Paragraph("अनुमानित आयु", MetricLabel)],
        [Paragraph(ripeness_hi.get(ripeness_stage, ripeness_stage), MetricValue), Paragraph(f"{estimated_age_days} दिन", MetricValue)],
    ]
    mt_hi = Table(metric_data_hi, colWidths=[85 * mm, 85 * mm])
    mt_hi.setStyle(mt.style)
    story.append(mt_hi)

    # Treatment HI
    story.append(Paragraph("💊 उपचार की सिफारिशें", SectionHead))
    treatments_hi = TREATMENTS_HI.get(disease, TREATMENTS_HI["Healthy"])
    for t_line in treatments_hi:
        story.append(Paragraph(t_line, TreatmentBody))

    story.append(Spacer(1, 20))
    story.append(RLImage(qr_buffer, width=30*mm, height=30*mm))
    story.append(Paragraph("रिपोर्ट सत्यापन", MetricLabel))

    # Color background patch (hack for simple doc template)
    def add_bg(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(dark_bg)
        canvas.rect(0, 0, A4[0], A4[1], fill=1)
        # Footer
        canvas.setStrokeColor(orange)
        canvas.setLineWidth(2)
        canvas.line(20*mm, 15*mm, A4[0]-20*mm, 15*mm)
        canvas.setFillColor(muted)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(20*mm, 10*mm, "Dr. Orange — MBBS in Melanose | © 2025 | Built for Indian Agriculture")
        canvas.drawRightString(A4[0]-20*mm, 10*mm, f"Report generated: {today} | AI-powered diagnosis")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_bg, onLaterPages=add_bg)
    buffer.seek(0)
    return buffer.getvalue()


@report_bp.route('/report', methods=['POST'])
@jwt_required()
def generate_report():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body", "code": "MISSING_BODY"}), 400

    required_fields = ['disease', 'quality_score', 'shelf_life_days']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields in body", "code": "MISSING_FIELDS"}), 400

    try:
        pdf_bytes = build_pdf(data)
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        scan_id = data.get('scan_id', 'unknown')
        response.headers['Content-Disposition'] = f'attachment; filename="dr-orange-report-{scan_id}.pdf"'
        return response
    except Exception as e:
        current_app.logger.error(f"Generate PDF error: {e}")
        return jsonify({"error": "Failed to generate PDF report", "code": "PDF_ERROR"}), 500
