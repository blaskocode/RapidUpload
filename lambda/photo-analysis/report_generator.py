import io
import json
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import red, green, orange, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Category colors for bounding boxes
CATEGORY_COLORS = {
    'damage': (255, 0, 0, 128),           # Red with transparency
    'material': (0, 255, 0, 128),         # Green with transparency
    'loose_material': (255, 191, 0, 128), # Amber with transparency
    'other': (255, 165, 0, 128)           # Orange with transparency
}

def create_annotated_image(image_bytes, detections):
    """Draw bounding boxes on image and return as bytes."""

    # Open image with Pillow
    image = Image.open(io.BytesIO(image_bytes))

    # Convert to RGBA for transparency support
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Create overlay for semi-transparent boxes
    overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    img_width, img_height = image.size

    # Try to load a font, fall back to default if not available
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except:
        font = ImageFont.load_default()

    for detection in detections:
        bbox = detection.get('boundingBox')
        if not bbox:
            continue

        # Convert normalized coordinates to pixels
        left = int(float(bbox.get('left', 0)) * img_width)
        top = int(float(bbox.get('top', 0)) * img_height)
        width = int(float(bbox.get('width', 0)) * img_width)
        height = int(float(bbox.get('height', 0)) * img_height)

        # Get category color
        category = detection.get('category', 'other')
        color = CATEGORY_COLORS.get(category, CATEGORY_COLORS['other'])

        # Draw rectangle (semi-transparent fill)
        draw.rectangle(
            [left, top, left + width, top + height],
            outline=color[:3],
            width=3
        )

        # Draw label background (without confidence)
        label = f"{detection.get('label', 'Unknown')}"
        label_bbox = draw.textbbox((left, top - 20), label, font=font)
        draw.rectangle(label_bbox, fill=(0, 0, 0, 180))
        draw.text((left, top - 20), label, fill=(255, 255, 255, 255), font=font)

    # Composite overlay onto original image
    result = Image.alpha_composite(image, overlay)

    # Convert back to RGB for PDF compatibility
    result = result.convert('RGB')

    # Save to bytes
    output = io.BytesIO()
    result.save(output, format='JPEG', quality=90)
    output.seek(0)

    return output.getvalue()


def generate_pdf_report(property_name, photos_data, output_path=None):
    """
    Generate a PDF report with annotated images and analysis summaries.

    Args:
        property_name: Name of the property
        photos_data: List of dicts containing:
            - image_bytes: Original image bytes
            - detections: List of detection objects
            - claude_analysis: JSON string of Claude's analysis
            - filename: Original filename
        output_path: Optional file path. If None, returns bytes.

    Returns:
        PDF bytes if output_path is None, else writes to file.
    """

    # Create PDF buffer
    buffer = io.BytesIO()

    # Create document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )

    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=30
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12
    )
    normal_style = styles['Normal']

    # Build content
    story = []

    # Title
    story.append(Paragraph(f"Roof Inspection Report", title_style))
    story.append(Paragraph(f"Property: {property_name}", heading_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Spacer(1, 20))

    # Summary section
    total_damage = 0
    total_materials = 0
    total_loose_materials = 0
    total_volume = 0.0
    severity_counts = {'none': 0, 'minor': 0, 'moderate': 0, 'severe': 0}

    for photo_data in photos_data:
        detections = photo_data.get('detections', [])
        total_damage += len([d for d in detections if d.get('category') == 'damage'])
        total_materials += len([d for d in detections if d.get('category') == 'material'])

        # Count loose materials and sum volumes
        loose = [d for d in detections if d.get('category') == 'loose_material']
        total_loose_materials += len(loose)
        for d in loose:
            # Use user override if available, otherwise AI estimate
            volume = d.get('userVolumeOverride') or d.get('volumeEstimate')
            if volume:
                total_volume += float(volume)

        # Parse Claude analysis for severity
        try:
            claude = json.loads(photo_data.get('claude_analysis', '{}'))
            severity = claude.get('damageAssessment', {}).get('severity', 'none')
            if severity in severity_counts:
                severity_counts[severity] += 1
        except:
            pass

    story.append(Paragraph("Executive Summary", heading_style))

    summary_data = [
        ['Total Photos Analyzed', str(len(photos_data))],
        ['Damage Detections', str(total_damage)],
        ['Material Detections', str(total_materials)],
        ['Loose Material Detections', str(total_loose_materials)],
        ['Estimated Total Volume', f"{total_volume:.1f} cubic yards" if total_volume > 0 else "N/A"],
        ['Severe Damage Photos', str(severity_counts['severe'])],
        ['Moderate Damage Photos', str(severity_counts['moderate'])],
        ['Minor Damage Photos', str(severity_counts['minor'])],
    ]

    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), (0.94, 0.94, 0.94)),  # Light gray (240/255)
        ('TEXTCOLOR', (0, 0), (-1, -1), black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, (0.78, 0.78, 0.78)),  # Gray (200/255)
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 30))

    # Individual photo sections
    for i, photo_data in enumerate(photos_data, 1):
        story.append(Paragraph(f"Photo {i}: {photo_data.get('filename', 'Unknown')}", heading_style))

        # Create annotated image
        image_bytes = photo_data.get('image_bytes')
        detections = photo_data.get('detections', [])

        if image_bytes:
            annotated_bytes = create_annotated_image(image_bytes, detections)

            # Add image to PDF (max width 6 inches)
            img = RLImage(io.BytesIO(annotated_bytes))
            img_width = 6 * inch
            aspect = img.imageHeight / img.imageWidth
            img_height = img_width * aspect
            img._restrictSize(img_width, img_height)
            story.append(img)
            story.append(Spacer(1, 10))

        # Detection details
        damage_detections = [d for d in detections if d.get('category') == 'damage']
        material_detections = [d for d in detections if d.get('category') == 'material']
        loose_detections = [d for d in detections if d.get('category') == 'loose_material']

        if damage_detections:
            story.append(Paragraph("Damage Detected:", normal_style))
            for d in damage_detections:
                story.append(Paragraph(
                    f"  - {d.get('label')}",
                    normal_style
                ))

        if material_detections:
            story.append(Paragraph("Materials Detected:", normal_style))
            for d in material_detections:
                count = d.get('count', 1)
                story.append(Paragraph(
                    f"  - {d.get('label')}: {count} unit(s)",
                    normal_style
                ))

        if loose_detections:
            story.append(Paragraph("Loose Materials Detected:", normal_style))
            for d in loose_detections:
                # Use user override if available, otherwise AI estimate
                volume = d.get('userVolumeOverride') or d.get('volumeEstimate')
                is_confirmed = d.get('userVolumeOverride') is not None
                confidence = d.get('volumeConfidence', '')

                if volume:
                    confirmed_text = " (confirmed)" if is_confirmed else ""
                    confidence_text = f" [{confidence} confidence]" if confidence and not is_confirmed else ""
                    story.append(Paragraph(
                        f"  - {d.get('label')}: ~{float(volume):.1f} cubic yards{confirmed_text}{confidence_text}",
                        normal_style
                    ))
                else:
                    story.append(Paragraph(
                        f"  - {d.get('label')}: Volume could not be estimated",
                        normal_style
                    ))

        # Claude analysis
        try:
            claude = json.loads(photo_data.get('claude_analysis', '{}'))
            damage_assessment = claude.get('damageAssessment', {})
            if damage_assessment:
                story.append(Paragraph("AI Assessment:", normal_style))
                story.append(Paragraph(
                    f"  Severity: {damage_assessment.get('severity', 'Unknown').upper()}",
                    normal_style
                ))
                story.append(Paragraph(
                    f"  {damage_assessment.get('description', '')}",
                    normal_style
                ))

            recommendations = claude.get('recommendations')
            if recommendations:
                story.append(Paragraph(f"  Recommendation: {recommendations}", normal_style))
        except:
            pass

        story.append(Spacer(1, 20))

    # Build PDF
    doc.build(story)

    # Return bytes
    buffer.seek(0)
    pdf_bytes = buffer.getvalue()

    if output_path:
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)

    return pdf_bytes
