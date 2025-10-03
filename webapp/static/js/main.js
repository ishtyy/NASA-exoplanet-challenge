document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const evaluateBtn = document.getElementById('evaluateBtn');
    const planetIdInput = document.getElementById('planetIdInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const infographicContainer = document.getElementById('infographic-content');

    // --- Chart Config ---
    const CHART_COLORS = { aqua: '#64FFDA', orange: '#ff764a', yellow: '#ffa600', purple: '#7a5195', blue: '#003f5c', slate: '#8892B0' };
    const FONT_COLOR = '#CCD6F6';
    const GRID_COLOR = 'rgba(100, 116, 139, 0.2)';

    // ==========================================================
    // LIVE VETTING TOOL LOGIC
    // ==========================================================
    if (evaluateBtn) {
        evaluateBtn.addEventListener('click', evaluatePlanet);
        planetIdInput.addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') evaluatePlanet(); 
        });
    }

    async function evaluatePlanet() {
        const starName = planetIdInput.value.trim();
        if (!starName) {
            showError("Please enter a star name to evaluate.");
            return;
        }

        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        resultsContainer.innerHTML = `<div class="text-center p-8"><p class="text-lg text-gray-400">Searching archive for ${starName}, please wait...</p></div>`;
        resultsContainer.classList.remove('hidden');

        try {
            const response = await fetch('/predict', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ star_name: starName }) 
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                // Backend returned HTML instead of JSON
                const text = await response.text();
                throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}...`);
            }

            if (!response.ok) throw new Error(data.error || 'Prediction failed.');
            displayResults(data);
        } catch (error) {
            showError(error.message);
        } finally {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                <p class="font-bold">An Error Occurred</p>
                <p>${message}</p>
            </div>`;
    }

    function displayResults(data) {
        const { prediction, confidence_scores, light_curve_data, base_model_predictions } = data;
        const predictionColor = (prediction === 'CONFIRMED' || prediction === 'CANDIDATE') ? 'text-green-400' : 'text-red-400';
        
        let basePredictionsHTML = Object.entries(base_model_predictions).map(([model, pred]) => {
            const color = (pred === 'CONFIRMED' || pred === 'CANDIDATE') ? 'text-green-400' : 'text-red-400';
            return `<div class="flex justify-between items-center text-sm p-2 bg-gray-900 bg-opacity-50 rounded">
                        <span class="font-semibold text-[#8892B0]">${model}:</span>
                        <span class="font-bold ${color}">${pred}</span>
                    </div>`;
        }).join('');

        resultsContainer.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-6">
                <div>
                    <div class="glass-card p-4 rounded-lg mb-6">
                        <p class="text-sm text-center text-[#8892B0] mb-2">Final Stacked Model Verdict</p>
                        <p class="text-5xl text-center font-extrabold ${predictionColor}">${prediction}</p>
                    </div>
                    <div class="glass-card p-4 rounded-lg mb-6">
                        <h4 class="text-lg font-semibold text-center text-white mb-3">Behind the Curtain: Base Model Votes</h4>
                        <div class="space-y-2">${basePredictionsHTML}</div>
                    </div>
                    <div class="glass-card p-4 rounded-lg">
                        <h4 class="text-lg font-semibold text-center text-white mb-3">Final Confidence Scores</h4>
                        <div class="chart-container h-48"><canvas id="confidenceChart"></canvas></div>
                    </div>
                </div>
                <div class="glass-card p-4 rounded-lg">
                    <h3 class="text-2xl font-bold text-white mb-4 text-center">Phase-Folded Light Curve</h3>
                    <div class="chart-container h-96"><canvas id="resultLightCurveChart"></canvas></div>
                </div>
            </div>`;

        new Chart(document.getElementById('confidenceChart').getContext('2d'), { 
            type: 'bar',
            data: { 
                labels: Object.keys(confidence_scores),
                datasets: [{ 
                    data: Object.values(confidence_scores),
                    backgroundColor: [CHART_COLORS.orange, CHART_COLORS.aqua, CHART_COLORS.purple] 
                }] 
            },
            options: { 
                indexAxis: 'y', 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    x: { ticks: { color: FONT_COLOR, callback: (v) => v.toFixed(2) }, grid: { color: GRID_COLOR }},
                    y: { ticks: { color: FONT_COLOR }, grid: { display: false }}
                }, 
                plugins: { legend: { display: false } } 
            } 
        });

        new Chart(document.getElementById('resultLightCurveChart').getContext('2d'), { 
            type: 'scatter',
            data: { 
                datasets: [{ 
                    data: light_curve_data,
                    backgroundColor: 'rgba(100, 255, 218, 0.7)', 
                    pointRadius: 2.5 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    x: { title: { display: true, text: 'Phase', color: FONT_COLOR }, ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }},
                    y: { title: { display: true, text: 'Normalized Flux', color: FONT_COLOR }, ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }}
                },
                plugins: { legend: { display: false } }
            } 
        });
    }

    // ==========================================================
    // INFOGRAPHIC LOGIC
    // ==========================================================
    async function initializeInfographic() {
        try {
            const response = await fetch('/static/data/k2_data.json');
            if (!response.ok) throw new Error('Could not load infographic data file (k2_data.json).');
            const k2Data = await response.json();
            
            infographicContainer.innerHTML = `
                <div class="w-full max-w-6xl mx-auto glass-card rounded-lg shadow-2xl p-6 md:p-8 text-center mb-12">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="p-4">
                            <p class="text-6xl font-bold stat-number" id="totalPlanets">0</p>
                            <p class="text-lg text-[#8892B0] mt-2">Unique Planets</p>
                        </div>
                        <div class="p-4">
                            <p class="text-6xl font-bold stat-number" id="multiPlanetSystems">0</p>
                            <p class="text-lg text-[#8892B0] mt-2">Multi-Planet Systems</p>
                        </div>
                        <div class="p-4">
                            <p class="text-6xl font-bold stat-number" id="discoveryYears">0</p>
                            <p class="text-lg text-[#8892B0] mt-2">Years of Discovery</p>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-12">
                    <div class="glass-card rounded-lg p-6">
                        <h3 class="text-xl font-bold text-white mb-4 text-center">Discovery Method</h3>
                        <div class="chart-container h-96"><canvas id="discoveryMethodChart"></canvas></div>
                    </div>
                    <div class="glass-card rounded-lg p-6">
                        <h3 class="text-xl font-bold text-white mb-4 text-center">Planet Size Distribution</h3>
                        <div class="chart-container h-96"><canvas id="planetRadiusChart"></canvas></div>
                    </div>
                </div>
                <div class="glass-card rounded-lg p-6 mb-12">
                    <h3 class="text-xl font-bold text-white mb-4 text-center">Planet Population: Radius vs. Period</h3>
                    <div class="chart-container h-[500px]"><canvas id="radiusVsPeriodChart"></canvas></div>
                </div>
                <div class="glass-card rounded-lg p-6 mb-12">
                    <h3 class="text-xl font-bold text-white mb-4 text-center">Host Star Properties (Mass vs. Radius)</h3>
                    <div class="chart-container h-[500px]"><canvas id="stellarPropertiesChart"></canvas></div>
                </div>
            `;
            
            setupInfographicCharts(k2Data);
        } catch (error) {
            infographicContainer.innerHTML = `<p class="text-center text-red-400 font-semibold">${error.message}</p>`;
        }
    }

    function setupInfographicCharts(k2Data) {
        document.getElementById('totalPlanets').innerText = k2Data.length;
        document.getElementById('multiPlanetSystems').innerText = new Set(k2Data.filter(p => p.sy_pnum > 1).map(p => p.hostname)).size;
        document.getElementById('discoveryYears').innerText = new Set(k2Data.map(p => p.disc_year)).size;
        
        createDiscoveryMethodChart(k2Data);
        createPlanetRadiusChart(k2Data);
        createRadiusVsPeriodChart(k2Data);
        createStellarPropertiesChart(k2Data);
    }
    
    function createDiscoveryMethodChart(data) {
        const methodCounts = data.reduce((acc, p) => { 
            acc[p.discoverymethod] = (acc[p.discoverymethod] || 0) + 1; 
            return acc; 
        }, {});
        new Chart(document.getElementById('discoveryMethodChart'), {
            type: 'pie',
            data: { 
                labels: Object.keys(methodCounts), 
                datasets: [{ 
                    data: Object.values(methodCounts), 
                    backgroundColor: Object.values(CHART_COLORS) 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { position: 'top', labels: { color: FONT_COLOR }}}}
        });
    }

    function createPlanetRadiusChart(data) {
        const bins = { 'Rocky (<1.6 R⊕)': 0, 'Super-Earth (1.6-4 R⊕)': 0, 'Neptune-like (4-10 R⊕)': 0, 'Gas Giant (>10 R⊕)': 0 };
        data.forEach(p => { 
            if (p.pl_rade < 1.6) bins['Rocky (<1.6 R⊕)']++;
            else if (p.pl_rade < 4) bins['Super-Earth (1.6-4 R⊕)']++;
            else if (p.pl_rade < 10) bins['Neptune-like (4-10 R⊕)']++;
            else if (p.pl_rade > 10) bins['Gas Giant (>10 R⊕)']++;
        });
        new Chart(document.getElementById('planetRadiusChart'), {
            type: 'bar',
            data: { 
                labels: Object.keys(bins), 
                datasets: [{ 
                    data: Object.values(bins), 
                    backgroundColor: Object.values(CHART_COLORS).slice(1,5) 
                }] 
            },
            options: { 
                indexAxis: 'y', 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { ticks: { color: FONT_COLOR }, grid: { display: false }},
                    x: { ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }}
                }, 
                plugins: { legend: { display: false }}
            }
        });
    }

    function createRadiusVsPeriodChart(data) {
        const scatterData = data.filter(p => p.pl_orbper > 0 && p.pl_rade > 0).map(p => ({ x: p.pl_orbper, y: p.pl_rade }));
        new Chart(document.getElementById('radiusVsPeriodChart'), {
            type: 'scatter',
            data: { datasets: [{ data: scatterData, backgroundColor: 'rgba(100, 255, 218, 0.7)', pointRadius: 4 }] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    x: { type: 'logarithmic', title: { display: true, text: 'Orbital Period (days)', color: FONT_COLOR }, ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }},
                    y: { type: 'logarithmic', title: { display: true, text: 'Planet Radius (Earth Radii)', color: FONT_COLOR }, ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }}
                },
                plugins: { legend: { display: false }}
            }
        });
    }

    function createStellarPropertiesChart(data) {
        const stellarData = data.filter(p => p.st_mass > 0 && p.st_rad > 0).map(p => ({ x: p.st_mass, y: p.st_rad }));
        new Chart(document.getElementById('stellarPropertiesChart'), {
            type: 'scatter',
            data: { datasets: [{ label: 'Host Stars', data: stellarData, backgroundColor: 'rgba(255, 118, 74, 0.7)', pointRadius: 4 }] },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    x: { type: 'logarithmic', title: { display: true, text: 'Stellar Mass (Solar Mass)', color: FONT_COLOR }, ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }},
                    y: { type: 'logarithmic', title: { display: true, text: 'Stellar Radius (Solar Radii)', color: FONT_COLOR }, ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }}
                },
                plugins: { legend: { display: false }}
            }
        });
    }

    initializeInfographic();
});
