# app.py
from flask import Flask, render_template, request, jsonify, send_file
import io
import csv
from weasyprint import HTML
import json

app = Flask(__name__)

# Hardcoded data from documents
USE_CASES = [
    "Chatbot / Customer Support", "Code Assistant (Copilot-style)", "Email Drafting / Summarization",
    "Document Summarization", "Meeting Transcription Summary", "RAG: Enterprise Search (Q&A)",
    "Legal Contract Review", "Medical Report Analysis", "Product Description Generation",
    "Social Media Post Generation", "SQL Query Generation", "Data Analysis / Pandas Code",
    "Translation (Short)", "Translation (Document)", "Creative Writing (Story Prompt)",
    "Agentic Workflow (Task Planning)", "Math / STEM Problem Solving", "Image Captioning + VLM Q&A",
    "Personal Assistant (Calendar)", "Long-Context Research (RAG+)"
]

TOKENS = {
    "chatbot_/_customer_support": {"input": 120, "output": 80},
    "code_assistant_(copilot-style)": {"input": 250, "output": 60},
    "email_drafting_/_summarization": {"input": 400, "output": 120},
    "document_summarization": {"input": 2000, "output": 150},
    "meeting_transcription_summary": {"input": 8000, "output": 300},
    "rag:_enterprise_search_(q&a)": {"input": 1500, "output": 180},
    "legal_contract_review": {"input": 6000, "output": 400},
    "medical_report_analysis": {"input": 3500, "output": 350},
    "product_description_generation": {"input": 80, "output": 200},
    "social_media_post_generation": {"input": 50, "output": 100},
    "sql_query_generation": {"input": 300, "output": 80},
    "data_analysis_/_pandas_code": {"input": 600, "output": 250},
    "translation_(short)": {"input": 100, "output": 100},
    "translation_(document)": {"input": 4000, "output": 4200},
    "creative_writing_(story_prompt)": {"input": 500, "output": 1200},
    "agentic_workflow_(task_planning)": {"input": 800, "output": 500},
    "math_/_stem_problem_solving": {"input": 200, "output": 300},
    "image_captioning_+_vlm_q&a": {"input": 50, "output": 120},
    "personal_assistant_(calendar)": {"input": 150, "output": 100},
    "long-context_research_(rag+)": {"input": 50000, "output": 800}
}

GPU_DATA = {
    "B300": {"benchmark": 7200, "price": 40000, "tdp": 1300, "vram": 288},
    "GB200": {"benchmark": 9500, "price": 65000, "tdp": 1200, "vram": 192},
    "MI355X": {"benchmark": 7200, "price": 30000, "tdp": 1400, "vram": 288}
}

# Constants for costs, updated from searches
UTILIZATION = 0.8
KV_CACHE_PER_TOKEN_BYTES = 156250  # bytes/token for ~70B model FP8
MODEL_VRAM_GB = 100  # Assume 100B model at FP8 quantization
ELECTRICITY_COST_KWH = 0.085  # industrial average
COLOCATION_PER_RACK_MONTH = 800
GPUS_PER_RACK = 8
CHASSIS_COST_PER_SERVER = 200000  # for 8 GPUs
STORAGE_COST_PER_TB = 100
ESTIMATED_STORAGE_TB = 1  # per workload, simple
DEPRECIATION_YEARS = 3
CLOUD_HOURLY_PER_GPU = {"AWS": 3.9, "GCP": 3.5, "Azure": 5.0}
EGRESS_FACTOR = 0.1  # 10% of compute
COOLING_FACTOR = 0.5  # 50% of power cost

@app.route('/')
def index():
    return render_template('index.html', use_cases=USE_CASES)

@app.route('/export_csv', methods=['POST'])
def export_csv():
    data = request.json
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Category', 'Subcategory', 'Value'])
    # Populate from data
    for gpu, details in data.get('gpus', {}).items():
        writer.writerow([gpu, 'GPUs Needed', details['minGpus']])
        writer.writerow([gpu, 'VRAM Needed (GB)', details['vramNeeded']])
        writer.writerow([gpu, 'Capex', details['capex']])
        writer.writerow([gpu, 'Annual Opex', details['annualOpex']])
        writer.writerow([gpu, 'Annual TCO', details['annualTco']])
    for cloud, cost in data.get('clouds', {}).items():
        writer.writerow([cloud, 'Annual Cost', cost])
    output.seek(0)
    return send_file(io.BytesIO(output.getvalue().encode()), mimetype='text/csv', as_attachment=True, download_name='report.csv')

@app.route('/export_pdf', methods=['POST'])
def export_pdf():
    data = request.json
    html = render_template('report.html', data=data)
    pdf = HTML(string=html).write_pdf()
    return send_file(io.BytesIO(pdf), mimetype='application/pdf', as_attachment=True, download_name='report.pdf')

if __name__ == '__main__':
    app.run(debug=True)
