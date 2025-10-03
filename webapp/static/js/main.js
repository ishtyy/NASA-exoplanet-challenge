document.addEventListener('DOMContentLoaded', () => {
    const evaluateBtn = document.getElementById('evaluateBtn');
    const planetIdInput = document.getElementById('planetIdInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');

    const CHART_COLORS = ['#64FFDA', '#ff764a', '#ffa600', '#7a5195', '#003f5c', '#8892B0'];
    const FONT_COLOR = '#CCD6F6';
    const GRID_COLOR = 'rgba(100, 116, 139, 0.2)';
    
    evaluateBtn.addEventListener('click', evaluatePlanet);
    planetIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') evaluatePlanet();
    });

    async function evaluatePlanet() {
        const starName = planetIdInput.value.trim();
        if (!starName) {
            showError("Please enter a star name to evaluate.");
            return;
        }

        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        resultsContainer.innerHTML = `<div class="text-center p-8"><p class="text-lg text-gray-400">Searching the archive for ${starName}, please wait...</p></div>`;
        resultsContainer.classList.remove('hidden');

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ star_name: starName })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Prediction failed due to a server error.');
            }
            
            displayResults(data);

        } catch (error) {
            showError(error.message);
        } finally {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    function showError(message) {
        resultsContainer.innerHTML = `<div class="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert"><p class="font-bold">An Error Occurred</p><p>${message}</p></div>`;
        resultsContainer.classList.remove('hidden');
    }

    function displayResults(data) {
        const { prediction, confidence_scores, light_curve_data } = data;
        const predictionColor = (prediction === 'CONFIRMED' || prediction === 'CANDIDATE') ? 'text-green-400' : 'text-red-400';

        const resultsHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                    <h3 class="text-2xl font-bold text-white mb-4">Vetting Result for ${data.star_name}</h3>
                    <p class="text-5xl font-extrabold ${predictionColor} mb-4">${prediction}</p>
                    <p class="text-[#8892B0] mb-6">Our stacking model analyzed the light curve data and classified this target with the following confidence scores:</p>
                    <div class="chart-container h-64"><canvas id="confidenceChart"></canvas></div>
                </div>
                <div>
                    <h3 class="text-2xl font-bold text-white mb-4">Phase-Folded Light Curve</h3>
                    <div class="chart-container h-80"><canvas id="resultLightCurveChart"></canvas></div>
                </div>
            </div>
        `;
        resultsContainer.innerHTML = resultsHTML;

        // Create Confidence Chart
        new Chart(document.getElementById('confidenceChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(confidence_scores),
                datasets: [{ data: Object.values(confidence_scores), backgroundColor: [CHART_COLORS[1], CHART_COLORS[0], CHART_COLORS[2]] }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: { 
                    x: { ticks: { color: FONT_COLOR, callback: (v) => v.toFixed(2) }, grid: { color: GRID_COLOR }},
                    y: { ticks: { color: FONT_COLOR }, grid: { display: false }}
                },
                plugins: { legend: { display: false } }
            }
        });

        // Create Light Curve Chart
        new Chart(document.getElementById('resultLightCurveChart').getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: [{ data: light_curve_data, backgroundColor: 'rgba(100, 255, 218, 0.7)', pointRadius: 2.5, pointHoverRadius: 5 }]
            },
            options: { responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Phase', color: FONT_COLOR }, ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }},
                    y: { title: { display: true, text: 'Normalized Flux', color: FONT_COLOR }, ticks: { color: FONT_COLOR }, grid: { color: GRID_COLOR }}
                },
                plugins: { legend: { display: false } }
            }
        });
    }
});