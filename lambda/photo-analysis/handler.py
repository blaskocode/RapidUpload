import json
import boto3
import base64
import os
from datetime import datetime
from decimal import Decimal

# Initialize clients (lazy-loaded to allow handlers to work without all API keys)
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
_openai_client = None
_gemini_client = None

# Configuration
ANALYSIS_TABLE = os.environ.get('ANALYSIS_TABLE', 'Analysis')
MIN_CONFIDENCE = float(os.environ.get('MIN_CONFIDENCE', '60.0'))
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4o')
AI_PROVIDER = os.environ.get('AI_PROVIDER', 'gemini')
GEMINI_MODEL = 'gemini-2.5-flash'


def get_openai_client():
    """Lazy-load OpenAI client to avoid errors when OPENAI_API_KEY is not set."""
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
    return _openai_client


def get_gemini_client():
    """Lazy-load Gemini client to avoid errors when GEMINI_API_KEY is not set."""
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))
    return _gemini_client


def handler(event, context):
    """
    Lambda handler for photo analysis.

    Event format:
    {
        "analysisId": "uuid",
        "photoId": "uuid",
        "propertyId": "uuid",
        "s3Bucket": "bucket-name",
        "s3Key": "path/to/image.jpg"
    }
    """
    print(f"Processing event: {json.dumps(event)}")

    analysis_id = event['analysisId']
    photo_id = event['photoId']
    property_id = event['propertyId']
    s3_bucket = event['s3Bucket']
    s3_key = event['s3Key']

    table = dynamodb.Table(ANALYSIS_TABLE)

    try:
        # Update status to processing
        table.update_item(
            Key={'AnalysisID': analysis_id},
            UpdateExpression='SET #status = :status',
            ExpressionAttributeNames={'#status': 'Status'},
            ExpressionAttributeValues={':status': 'processing'}
        )

        # Fetch image from S3
        print(f"Fetching image from s3://{s3_bucket}/{s3_key}")
        image_response = s3_client.get_object(Bucket=s3_bucket, Key=s3_key)
        image_bytes = image_response['Body'].read()

        # Determine media type from key
        media_type = "image/jpeg"
        if s3_key.lower().endswith('.png'):
            media_type = "image/png"
        elif s3_key.lower().endswith('.webp'):
            media_type = "image/webp"

        # Call AI provider for detection and analysis
        if AI_PROVIDER == 'openai':
            print("Calling OpenAI GPT-4o Vision")
            analysis_result = analyze_with_openai(image_bytes, media_type)
        else:
            print("Calling Google Gemini 2.5 Flash")
            analysis_result = analyze_with_gemini(image_bytes, media_type)

        # Parse the response and extract detections
        detections = analysis_result.get('detections', [])
        gpt_analysis = json.dumps(analysis_result.get('analysis', {}))

        # Convert values to Decimal for DynamoDB
        for detection in detections:
            # Confidence is optional (Gemini doesn't provide it)
            if detection.get('confidence') is not None:
                detection['confidence'] = Decimal(str(detection.get('confidence', 0)))
            if detection.get('boundingBox'):
                bbox = detection['boundingBox']
                detection['boundingBox'] = {
                    'left': Decimal(str(bbox.get('left', 0))),
                    'top': Decimal(str(bbox.get('top', 0))),
                    'width': Decimal(str(bbox.get('width', 0))),
                    'height': Decimal(str(bbox.get('height', 0)))
                }

        # Update DynamoDB with results
        update_analysis_results(table, analysis_id, detections, gpt_analysis)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'analysisId': analysis_id,
                'status': 'completed',
                'detectionsCount': len(detections)
            })
        }

    except Exception as e:
        print(f"Error processing analysis {analysis_id}: {str(e)}")

        # Update status to failed
        table.update_item(
            Key={'AnalysisID': analysis_id},
            UpdateExpression='SET #status = :status, errorMessage = :error',
            ExpressionAttributeNames={'#status': 'Status'},
            ExpressionAttributeValues={
                ':status': 'failed',
                ':error': str(e)
            }
        )

        raise e


def analyze_with_openai(image_bytes, media_type):
    """
    Call OpenAI GPT-4o Vision for both object detection and damage assessment.
    Returns structured data with detections and analysis.
    """

    image_base64 = base64.b64encode(image_bytes).decode('utf-8')

    prompt = """Analyze this roof/construction image for damage and materials.

TASK 1 - OBJECT DETECTION:
Identify all visible items and provide bounding boxes. For each detection:
- label: What you see (e.g., "Hail damage", "Missing shingles", "Shingle bundle", "Plywood sheet")
- category: One of "damage", "material", or "other"
- confidence: Your confidence 0-100 (be conservative - use 60-80 for uncertain items)
- boundingBox: Normalized coordinates (0-1 scale) with left, top, width, height
- count: For materials, how many of this item are visible

TASK 2 - DAMAGE ASSESSMENT:
Evaluate any roof damage visible:
- severity: "none", "minor", "moderate", or "severe"
- damageTypes: Array of damage types found (e.g., ["hail", "wind", "missing_shingles"])
- description: Brief description of damage observed

TASK 3 - MATERIAL INVENTORY:
Count visible construction materials:
- Focus on shingle bundles, plywood sheets, and other roofing materials
- Provide count and any brand/type visible
- List each detected material type in the materials array

Respond ONLY with valid JSON in this exact format:
{
    "detections": [
        {
            "label": "Shingle bundle",
            "category": "material",
            "confidence": 85,
            "boundingBox": {"left": 0.1, "top": 0.2, "width": 0.3, "height": 0.2},
            "count": 5
        },
        {
            "label": "Hail damage",
            "category": "damage",
            "confidence": 75,
            "boundingBox": {"left": 0.4, "top": 0.3, "width": 0.2, "height": 0.15}
        }
    ],
    "analysis": {
        "damageAssessment": {
            "severity": "moderate",
            "description": "Multiple hail impact marks visible on shingles",
            "damageTypes": ["hail"]
        },
        "materials": {
            "detected": ["Shingle bundles", "Plywood sheets"],
            "description": "5 GAF Timberline shingle bundles and 3 plywood sheets visible"
        },
        "materialInventory": {
            "items": [{"type": "shingles", "count": 5, "notes": "GAF Timberline bundles"}],
            "totalCount": 5
        },
        "overallConfidence": "high",
        "recommendations": "Professional inspection recommended"
    }
}"""

    response = get_openai_client().chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_base64}",
                            "detail": "high"
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ],
        max_tokens=2000,
        response_format={"type": "json_object"}
    )

    response_text = response.choices[0].message.content

    # Handle case where OpenAI returns None (e.g., content filtered)
    if response_text is None:
        # Check if there's a refusal
        refusal = getattr(response.choices[0].message, 'refusal', None)
        if refusal:
            raise ValueError(f"OpenAI refused to process image: {refusal}")
        raise ValueError("OpenAI returned empty response - image may not be processable")

    return json.loads(response_text)


def analyze_with_gemini(image_bytes, media_type):
    """
    Call Google Gemini 2.5 Flash for object detection with bounding boxes and damage assessment.
    Returns structured data with detections and analysis.
    """
    from google.genai import types
    from PIL import Image
    import io

    # Load image to get dimensions for coordinate conversion
    image = Image.open(io.BytesIO(image_bytes))
    img_width, img_height = image.size

    prompt = """Analyze this roof/construction image for damage, materials, and loose material volumes.

TASK 1 - OBJECT DETECTION WITH BOUNDING BOXES:
Detect all visible items and provide bounding boxes. For each detection include:
- box_2d: Bounding box as [ymin, xmin, ymax, xmax] normalized to 0-1000
- label: What you see (e.g., "Hail damage", "Missing shingles", "Shingle bundle", "Plywood sheet", "Gravel pile", "Mulch pile")
- category: One of "damage", "material", "loose_material", or "other"
- count: For discrete materials, how many of this item are visible (default 1)

TASK 2 - DAMAGE ASSESSMENT:
Evaluate any roof damage visible:
- severity: "none", "minor", "moderate", or "severe"
- damageTypes: Array of damage types found (e.g., ["hail", "wind", "missing_shingles"])
- description: Brief description of damage observed

TASK 3 - MATERIAL INVENTORY:
Count visible construction materials:
- Focus on shingle bundles, plywood sheets, and other roofing materials
- Provide count and any brand/type visible

TASK 4 - LOOSE MATERIAL VOLUME ESTIMATION:
For loose materials like gravel, mulch, sand, dirt, or stone piles:
- Identify any reference objects in the image that can help estimate scale (vehicles, pallets, wheelbarrows, buckets, people, standard building materials)
- Estimate the approximate volume in cubic yards
- If no reliable reference is available, explain that volume cannot be estimated accurately

For each loose material detection, include:
- volumeEstimate: Estimated volume as a number (in cubic yards), or null if cannot estimate
- volumeUnit: "cubic_yards"
- volumeConfidence: "high", "medium", "low", or "none"
- volumeReference: What reference object was used for scale (e.g., "pickup truck bed", "standard pallet", "5-gallon bucket") or "no_reference" if none available
- volumeNotes: Explanation of estimate or why it couldn't be calculated

Respond with valid JSON in this exact format:
{
    "detections": [
        {
            "box_2d": [100, 200, 400, 600],
            "label": "Shingle bundle",
            "category": "material",
            "count": 5
        },
        {
            "box_2d": [50, 300, 500, 800],
            "label": "Gravel pile",
            "category": "loose_material",
            "volumeEstimate": 3.5,
            "volumeUnit": "cubic_yards",
            "volumeConfidence": "medium",
            "volumeReference": "pickup truck bed visible for scale",
            "volumeNotes": "Estimated based on comparison to standard 6-foot truck bed"
        }
    ],
    "analysis": {
        "damageAssessment": {
            "severity": "moderate",
            "description": "Multiple hail impact marks visible on shingles",
            "damageTypes": ["hail"]
        },
        "materials": {
            "detected": ["Shingle bundles", "Plywood sheets"],
            "description": "5 GAF Timberline shingle bundles visible"
        },
        "materialInventory": {
            "items": [{"type": "shingles", "count": 5, "notes": "GAF Timberline bundles"}],
            "totalCount": 5
        },
        "looseVolumes": {
            "totalCubicYards": 3.5,
            "items": [
                {
                    "material": "gravel",
                    "estimatedVolume": 3.5,
                    "confidence": "medium",
                    "reference": "pickup truck bed"
                }
            ],
            "notes": "Volume estimates based on visible reference objects"
        },
        "overallConfidence": "high",
        "recommendations": "Professional inspection recommended"
    }
}"""

    # Configure for JSON response
    config = types.GenerateContentConfig(
        response_mime_type="application/json"
    )

    # Call Gemini API
    response = get_gemini_client().models.generate_content(
        model=GEMINI_MODEL,
        contents=[image, prompt],
        config=config
    )

    response_text = response.text

    if response_text is None:
        raise ValueError("Gemini returned empty response - image may not be processable")

    result = json.loads(response_text)

    # Convert Gemini bounding box format to our format
    # Gemini: [y_min, x_min, y_max, x_max] normalized to 0-1000
    # Ours: {left, top, width, height} normalized to 0-1
    converted_detections = []
    for detection in result.get('detections', []):
        box = detection.get('box_2d', [])
        if len(box) == 4:
            y_min, x_min, y_max, x_max = box
            converted_detection = {
                'label': detection.get('label', 'Unknown'),
                'category': detection.get('category', 'other'),
                'boundingBox': {
                    'left': x_min / 1000,
                    'top': y_min / 1000,
                    'width': (x_max - x_min) / 1000,
                    'height': (y_max - y_min) / 1000
                }
            }
            if detection.get('count'):
                converted_detection['count'] = detection['count']

            # Add volume fields for loose materials
            if detection.get('volumeEstimate') is not None:
                converted_detection['volumeEstimate'] = detection['volumeEstimate']
                converted_detection['volumeUnit'] = detection.get('volumeUnit', 'cubic_yards')
                converted_detection['volumeConfidence'] = detection.get('volumeConfidence', 'low')
                converted_detection['volumeReference'] = detection.get('volumeReference', '')
                converted_detection['volumeNotes'] = detection.get('volumeNotes', '')

            converted_detections.append(converted_detection)

    return {
        'detections': converted_detections,
        'analysis': result.get('analysis', {})
    }


def update_analysis_results(table, analysis_id, detections, gpt_analysis):
    """Update DynamoDB with analysis results."""

    # Check for low confidence detections
    low_confidence = any(
        float(d.get('confidence', 100)) < MIN_CONFIDENCE
        for d in detections
    )

    table.update_item(
        Key={'AnalysisID': analysis_id},
        UpdateExpression='''
            SET #status = :status,
                completedAt = :completedAt,
                detections = :detections,
                claudeAnalysis = :gptAnalysis
        ''',
        ExpressionAttributeNames={'#status': 'Status'},
        ExpressionAttributeValues={
            ':status': 'completed',
            ':completedAt': datetime.utcnow().isoformat() + 'Z',
            ':detections': detections,
            ':gptAnalysis': gpt_analysis
        }
    )

    print(f"Updated analysis {analysis_id} with {len(detections)} detections")


def report_handler(event, context):
    """
    Lambda handler for generating PDF reports.

    Event format:
    {
        "propertyId": "uuid",
        "propertyName": "Property Name",
        "photoIds": ["uuid1", "uuid2", ...]
    }

    Returns:
    {
        "statusCode": 200,
        "body": {
            "reportKey": "reports/property-id/report-timestamp.pdf"
        }
    }
    """
    from report_generator import generate_pdf_report

    print(f"Generating report for event: {json.dumps(event)}")

    property_id = event['propertyId']
    property_name = event.get('propertyName', property_id)
    photo_ids = event.get('photoIds', [])

    table = dynamodb.Table(ANALYSIS_TABLE)
    photos_table_name = os.environ.get('PHOTOS_TABLE', 'Photos')
    photos_table = dynamodb.Table(photos_table_name)

    # Gather photo data
    photos_data = []

    for photo_id in photo_ids:
        try:
            # Get analysis result
            analysis_response = table.query(
                IndexName='PhotoID-index',
                KeyConditionExpression='PhotoID = :pid',
                ExpressionAttributeValues={':pid': photo_id},
                Limit=1
            )

            if not analysis_response.get('Items'):
                continue

            analysis = analysis_response['Items'][0]

            # Get photo details
            photo_response = photos_table.get_item(Key={'PhotoID': photo_id})
            photo = photo_response.get('Item', {})

            # Get image from S3
            s3_bucket = photo.get('s3Bucket')
            s3_key = photo.get('s3Key')

            if s3_bucket and s3_key:
                image_response = s3_client.get_object(Bucket=s3_bucket, Key=s3_key)
                image_bytes = image_response['Body'].read()

                photos_data.append({
                    'image_bytes': image_bytes,
                    'detections': analysis.get('detections', []),
                    'claude_analysis': analysis.get('claudeAnalysis', '{}'),
                    'filename': photo.get('filename', 'unknown.jpg')
                })

        except Exception as e:
            print(f"Error processing photo {photo_id}: {str(e)}")
            continue

    if not photos_data:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'No photos with analysis found'})
        }

    # Generate PDF
    pdf_bytes = generate_pdf_report(property_name, photos_data)

    # Upload to S3
    report_key = f"reports/{property_id}/report-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.pdf"

    s3_client.put_object(
        Bucket=os.environ.get('PHOTOS_BUCKET', 'rapidupload-photos'),
        Key=report_key,
        Body=pdf_bytes,
        ContentType='application/pdf'
    )

    print(f"Report uploaded to s3://{os.environ.get('PHOTOS_BUCKET')}/{report_key}")

    return {
        'statusCode': 200,
        'body': json.dumps({
            'reportKey': report_key,
            'photosIncluded': len(photos_data)
        })
    }
