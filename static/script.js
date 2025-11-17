// static/script.js
console.log('Script loaded');

const tokensData = {
    "chatbot_customer_support": {input: 120, output: 80},
    "code_assistant_copilot-style": {input: 250, output: 60},
    "email_drafting_summarization": {input: 400, output: 120},
    "document_summarization": {input: 2000, output: 150},
    "meeting_transcription_summary": {input: 8000, output: 300},
    "rag_enterprise_search_qa": {input: 1500, output: 180},
    "legal_contract_review": {input: 6000, output: 400},
    "medical_report_analysis": {input: 3500, output: 350},
    "product_description_generation": {input: 80, output: 200},
    "social_media_post_generation": {input: 50, output: 100},
    "sql_query_generation": {input: 300, output: 80},
    "data_analysis_pandas_code": {input: 600, output: 250},
    "translation_short": {input: 100, output: 100},
    "translation_document": {input: 4000, output: 4200},
    "creative_writing_story_prompt": {input: 500, output: 1200},
    "agentic_workflow_task_planning": {input: 800, output: 500},
    "math_stem_problem_solving": {input: 200, output: 300},
    "image_captioning_vlm_qa": {input: 50, output: 120},
    "personal_assistant_calendar": {input: 150, output: 100},
    "long-context_research_rag": {input: 50000, output: 800}
};

const reqPerSession = {
    "chatbot_customer_support": 6,
    "code_assistant_copilot-style": 4,
    "email_drafting_summarization": 3,
    "document_summarization": 1,
    "meeting_transcription_summary": 1,
    "rag_enterprise_search_qa": 2,
    "legal_contract_review": 1,
    "medical_report_analysis": 1,
    "product_description_generation": 2,
    "social_media_post_generation": 3,
    "sql_query_generation": 2,
    "data_analysis_pandas_code": 2,
    "translation_short": 1,
    "translation_document": 1,
    "creative_writing_story_prompt": 1,
    "agentic_workflow_task_planning": 8,
    "math_stem_problem_solving": 2,
    "image_captioning_vlm_qa": 3,
    "personal_assistant_calendar": 5,
    "long-context_research_rag": 1
};

const sessionDuration = {
    "chatbot_customer_support": 120,
    "code_assistant_copilot-style": 180,
    "email_drafting_summarization": 90,
    "document_summarization": 60,
    "meeting_transcription_summary": 300,
    "rag_enterprise_search_qa": 60,
    "legal_contract_review": 240,
    "medical_report_analysis": 180,
    "product_description_generation": 60,
    "social_media_post_generation": 45,
    "sql_query_generation": 60,
    "data_analysis_pandas_code": 120,
    "translation_short": 30,
    "translation_document": 30,
    "creative_writing_story_prompt": 300,
    "agentic_workflow_task_planning": 240,
    "math_stem_problem_solving": 90,
    "image_captioning_vlm_qa": 60,
    "personal_assistant_calendar": 90,
    "long-context_research_rag": 600
};

const gpuData = {
    "B300": {benchmark: 7200, price: 40000, tdp: 1300, vram: 288},
    "GB200": {benchmark: 9500, price: 65000, tdp: 1200, vram: 192},
    "MI355X": {benchmark: 7200, price: 30000, tdp: 1400, vram: 288}
};

const topGpus = ["B300", "GB200", "MI355X"];

const KV_CACHE_PER_TOKEN_BYTES = 156250;  // ~150KB per token for 70B FP8
const MODEL_VRAM_GB = 100;
const ELECTRICITY_COST_KWH = 0.085;
const COLOCATION_PER_RACK_MONTH = 800;
const GPUS_PER_RACK = 8;
const CHASSIS_COST_PER_SERVER = 200000;
const STORAGE_COST_PER_TB = 100;
const ESTIMATED_STORAGE_TB = 1;
const DEPRECIATION_YEARS = 3;
const CLOUD_HOURLY_PER_GPU = {"AWS": 3.9, "GCP": 3.5, "Azure": 5.0};
const EGRESS_FACTOR = 0.1;
const COOLING_FACTOR = 0.5;
const UTILIZATION = 0.8;

let workloads = [];
let reportData = {};

function usersToRps(concurrentUsers, useCaseKey, agentic, avgThinkTimeSec = 10) {
    const req = reqPerSession[useCaseKey] || 2;
    const duration = sessionDuration[useCaseKey] || 120;
    let rpsPerUser = req / duration;
    const effectiveRpsPerUser = rpsPerUser / (1 + avgThinkTimeSec / 5);
    let totalRps = concurrentUsers * effectiveRpsPerUser;
    if (agentic) totalRps *= 4;  // Average multiplier for agentic
    return Math.round(totalRps * 100) / 100;
}

function addWorkload() {
    console.log('Add Workload button clicked');
    const uc = document.getElementById('use_case').value;
    const usersInput = document.getElementById('concurrent_users').value.trim();
    const users = parseInt(usersInput, 10);
    const agentic = document.getElementById('agentic').checked;

    if (isNaN(users) || users < 1 || usersInput === '') {
        alert('Please enter a valid number of concurrent users (at least 1).');
        return;
    }

    if (!tokensData[uc]) {
        alert('Invalid use case selected.');
        return;
    }

    const tok = tokensData[uc];
    let output = tok.output;
    if (agentic) output *= 4;
    const totalTokens = tok.input + output;
    const rps = usersToRps(users, uc, agentic);

    workloads.push({useCase: uc, users, agentic, input: tok.input, output, totalTokens, rps});

    const div = document.getElementById('workloads');
    div.innerHTML += `<p>${uc.replace(/_/g, ' ')}: ${users} users, Agentic: ${agentic}, RPS: ${rps}, Total Tokens: ${totalTokens}</p>`;

    // Clear input for next addition
    document.getElementById('concurrent_users').value = '';
    document.getElementById('agentic').checked = false;
}

function proceedToGPU() {
    console.log('Proceed to GPU button clicked');
    if (workloads.length === 0) {
        alert('Please add at least one workload before proceeding.');
        return;
    }

    let totalRequiredTps = 0;
    let maxVramGb = 0;
    workloads.forEach(w => {
        totalRequiredTps += w.totalTokens * w.rps;
        const vramKv = (w.input + w.output) * KV_CACHE_PER_TOKEN_BYTES / 1e9;
        if (vramKv > maxVramGb) maxVramGb = vramKv;
    });
    const totalVramNeeded = MODEL_VRAM_GB + maxVramGb * 1.2;  // 20% overhead

    const recDiv = document.getElementById('gpu_recs');
    recDiv.innerHTML = '';
    topGpus.forEach(gpu => {
        const bench = gpuData[gpu].benchmark;
        const minGpus = Math.max(1, Math.ceil(totalRequiredTps / (bench * UTILIZATION));
        const gpuVram = gpuData[gpu].vram;
        const vramSufficient = gpuVram >= totalVramNeeded;
        const vramNote = vramSufficient ? '' : ' (Insufficient VRAM for long-context; consider more GPUs or batching)';
        recDiv.innerHTML += `<p>${gpu}: ${minGpus} GPUs needed. Rationale: Required TPS ${totalRequiredTps.toFixed(2)} / (${bench} tokens/sec * ${UTILIZATION} util) = ${minGpus} GPUs. VRAM: ${gpuVram}GB available vs ${totalVramNeeded.toFixed(2)}GB needed${vramNote}.</p>`;
    });

    const sel1 = document.getElementById('gpu1');
    const sel2 = document.getElementById('gpu2');
    sel1.innerHTML = '';
    sel2.innerHTML = '';
    topGpus.forEach(g => {
        sel1.innerHTML += `<option value="${g}">${g}</option>`;
        sel2.innerHTML += `<option value="${g}">${g}</option>`;
    });

    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
}

function compareCosts() {
    console.log('Compare Costs button clicked');
    const gpu1 = document.getElementById('gpu1').value;
    const gpu2 = document.getElementById('gpu2').value;
    if (gpu1 === gpu2) {
        alert('Please select two different GPUs for comparison.');
        return;
    }

    let totalRequiredTps = 0;
    let maxVramGb = 0;
    workloads.forEach(w => {
        totalRequiredTps += w.totalTokens * w.rps;
        const vramKv = (w.input + w.output) * KV_CACHE_PER_TOKEN_BYTES / 1e9;
        if (vramKv > maxVramGb) maxVramGb = vramKv;
    });
    const totalVramNeeded = MODEL_VRAM_GB + maxVramGb * 1.2;

    const compareDiv = document.getElementById('cost_compare');
    compareDiv.innerHTML = '';

    reportData = {gpus: {}, clouds: {}};

    [gpu1, gpu2].forEach(gpu => {
        const d = gpuData[gpu];
        const bench = d.benchmark;
        const minGpus = Math.ceil(totalRequiredTps / (bench * UTILIZATION));
        const gpuCost = minGpus * d.price;
        const servers = Math.ceil(minGpus / GPUS_PER_RACK);
        const serverCost = servers * CHASSIS_COST_PER_SERVER;
        const storageCost = workloads.length * ESTIMATED_STORAGE_TB * STORAGE_COST_PER_TB;
        const capex = gpuCost + serverCost + storageCost;
        const racks = servers;
        const annualColo = racks * COLOCATION_PER_RACK_MONTH * 12;
        const annualPower = minGpus * d.tdp / 1000 * 8760 * ELECTRICITY_COST_KWH * UTILIZATION;
        const annualCooling = annualPower * COOLING_FACTOR;
        const annualOpex = annualColo + annualPower + annualCooling;
        const annualTco = (capex / DEPRECIATION_YEARS) + annualOpex;

        compareDiv.innerHTML += `<h3>On-Prem ${gpu}</h3>
            <p>GPUs Needed: ${minGpus}</p>
            <p>VRAM Needed: ${totalVramNeeded.toFixed(2)} GB (Model + KV Cache for longest context)</p>
            <p>Capex: $${capex.toFixed(0)}</p>
            <p>Annual Opex: $${annualOpex.toFixed(0)}</p>
            <p>Annual TCO: $${annualTco.toFixed(0)}</p>
            <p>Breakout: GPU $${gpuCost.toFixed(0)}, Server $${serverCost.toFixed(0)}, Storage $${storageCost.toFixed(0)}</p>
            <p>Power $${annualPower.toFixed(0)}, Cooling $${annualCooling.toFixed(0)}, Colo $${annualColo.toFixed(0)}</p>`;

        reportData.gpus[gpu] = {
            minGpus, vramNeeded: totalVramNeeded.toFixed(2), capex: capex.toFixed(0), annualOpex: annualOpex.toFixed(0), annualTco: annualTco.toFixed(0),
            gpuCost: gpuCost.toFixed(0), serverCost: serverCost.toFixed(0), storageCost: storageCost.toFixed(0),
            annualPower: annualPower.toFixed(0), annualCooling: annualCooling.toFixed(0), annualColo: annualColo.toFixed(0)
        };
    });

    // Cloud costs
    const clouds = ['AWS', 'GCP', 'Azure'];
    const avgBench = 5000;  // Average benchmark for normalization
    clouds.forEach(cloud => {
        const hourly = CLOUD_HOURLY_PER_GPU[cloud];
        const minGpusAvg = Math.ceil(totalRequiredTps / (avgBench * UTILIZATION));
        let annualCloud = minGpusAvg * hourly * 8760;
        annualCloud += annualCloud * EGRESS_FACTOR;  // Add egress
        compareDiv.innerHTML += `<h3>${cloud} Cloud</h3><p>Annual Cost: $${annualCloud.toFixed(0)} (incl. 10% egress)</p>`;
        reportData.clouds[cloud] = annualCloud.toFixed(0);
    });

    // TCO Chart
    const years = [1, 2, 3, 4, 5];
    const tcoCtx = document.getElementById('tcoChart').getContext('2d');
    new Chart(tcoCtx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: gpu1 + ' On-Prem',
                    data: years.map(y => (parseFloat(reportData.gpus[gpu1].capex) / 3 * Math.min(y, 3)) + (parseFloat(reportData.gpus[gpu1].annualOpex) * y)),
                    borderColor: 'blue'
                },
                {
                    label: gpu2 + ' On-Prem',
                    data: years.map(y => (parseFloat(reportData.gpus[gpu2].capex) / 3 * Math.min(y, 3)) + (parseFloat(reportData.gpus[gpu2].annualOpex) * y)),
                    borderColor: 'green'
                },
                {label: 'AWS', data: years.map(y => parseFloat(reportData.clouds['AWS']) * y), borderColor: 'red'},
                {label: 'GCP', data: years.map(y => parseFloat(reportData.clouds['GCP']) * y), borderColor: 'orange'},
                {label: 'Azure', data: years.map(y => parseFloat(reportData.clouds['Azure']) * y), borderColor: 'purple'}
            ]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'TCO Over Time ($)'
                }
            }
        }
    });

    // Breakeven Chart (cumulative costs)
    const beCtx = document.getElementById('breakevenChart').getContext('2d');
    new Chart(beCtx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {label: gpu1 + ' On-Prem Cumulative', data: years.map(y => (parseFloat(reportData.gpus[gpu1].capex) / 3 * Math.min(y, 3)) + (parseFloat(reportData.gpus[gpu1].annualOpex) * y)), borderColor: 'blue'},
                {label: 'Avg Cloud Cumulative', data: years.map(y => ((parseFloat(reportData.clouds['AWS']) + parseFloat(reportData.clouds['GCP']) + parseFloat(reportData.clouds['Azure'])) / 3 * y), borderColor: 'red'}
            ]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Breakeven: On-Prem vs Avg Cloud ($)'
                }
            }
        }
    });

    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
}

function exportCSV() {
    console.log('Export CSV button clicked');
    fetch('/export_csv', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(reportData)
    }).then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
    }).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'report.csv';
        a.click();
    }).catch(error => console.error('Error exporting CSV:', error));
}

function exportPDF() {
    console.log('Export PDF button clicked');
    fetch('/export_pdf', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(reportData)
    }).then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
    }).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'report.pdf';
        a.click();
    }).catch(error => console.error('Error exporting PDF:', error));
}