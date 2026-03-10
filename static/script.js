// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("predictionForm");
    
    if (form) {
        initializeForm();
        checkForSampleData();
    }
});

function initializeForm() {
    const form = document.getElementById("predictionForm");
    const resultDiv = document.getElementById("result");
    const resultsSection = document.getElementById("resultsSection");
    const loadingDiv = document.getElementById("loading");
    const errorAlert = document.getElementById("errorAlert");
    const successAlert = document.getElementById("successAlert");
    const locationAlert = document.getElementById("locationAlert");
    
    // Initialize helper text functionality
    initializeHelperText();
    
    // Add event listeners for real-time AQI calculation
    document.querySelectorAll('#predictionForm input[type="number"]').forEach(input => {
        input.addEventListener('input', updateHelperText);
    });
    
    // Add event listeners for location validation
    document.getElementById("state").addEventListener('blur', validateLocation);
    document.getElementById("district").addEventListener('blur', validateLocation);
    
    // Add sample button event listeners
    document.querySelectorAll('.sample-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            loadSampleData(this.dataset.sample);
        });
    });
    
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Show loading and hide previous results
        showLoading();
        hideError();
        hideSuccess();
        hideLocationAlert();
        
        // Get form data
        const formData = getFormData();
        
        try {
            // Make API request
            const response = await fetch("/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Check if error message exists
                const errorMsg = data.error || data.message || "Prediction failed. Please try again.";
                throw new Error(errorMsg);
            }
            
            // Hide loading
            hideLoading();
            
            // Display results
            displayResults(data);
            
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    });
}

function checkForSampleData() {
    // Check if sample data was passed from home page
    const sampleData = localStorage.getItem('sampleData');
    const sampleType = localStorage.getItem('sampleType');
    
    if (sampleData && sampleType) {
        const sample = JSON.parse(sampleData);
        
        // Fill the form with sample data
        document.getElementById('state').value = sample.state;
        document.getElementById('district').value = sample.district;
        document.getElementById('pm25').value = sample.pm25;
        document.getElementById('pm10').value = sample.pm10;
        document.getElementById('no2').value = sample.no2;
        document.getElementById('so2').value = sample.so2;
        document.getElementById('co').value = sample.co;
        document.getElementById('o3').value = sample.o3;
        
        // Update helper text
        updateHelperText();
        
        // Show success message
        showSuccess(`Loaded ${sampleType.replace('_', ' ')} sample data`);
        
        // Clear stored sample data
        localStorage.removeItem('sampleData');
        localStorage.removeItem('sampleType');
    }
}

async function validateLocation() {
    const state = document.getElementById("state").value.trim();
    const district = document.getElementById("district").value.trim();
    
    if (!state || !district) return;
    
    if (state.length < 2 || district.length < 2) {
        showLocationAlert("State and district must be at least 2 characters long.");
        return;
    }
    
    if (state.isdigit() || district.isdigit()) {
        showLocationAlert("Location names should contain letters, not just numbers.");
        return;
    }
    
    try {
        const response = await fetch("/api/validate-location", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ state, district })
        });
        
        const data = await response.json();
        
        if (data.valid) {
            hideLocationAlert();
            showSuccess("Location validated successfully");
        } else {
            showLocationAlert(data.errors.join(". ") + ". " + (data.suggestions || ""));
        }
    } catch (error) {
        console.error("Location validation error:", error);
    }
}

function initializeHelperText() {
    // Set initial helper text
    updateHelperText();
}

function updateHelperText() {
    const inputs = document.querySelectorAll('#predictionForm input[type="number"]');
    inputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        let status = '';
        let color = '';
        
        switch(input.id) {
            case 'pm25':
                if (value <= 12) { status = 'Good'; color = '#2ed573'; }
                else if (value <= 35.4) { status = 'Moderate'; color = '#ffa502'; }
                else if (value <= 55.4) { status = 'Unhealthy for Sensitive Groups'; color = '#ff7f50'; }
                else if (value <= 150.4) { status = 'Unhealthy'; color = '#ff4757'; }
                else if (value <= 250.4) { status = 'Very Unhealthy'; color = '#a020f0'; }
                else { status = 'Hazardous'; color = '#7d1b1b'; }
                break;
            case 'pm10':
                if (value <= 54) { status = 'Good'; color = '#2ed573'; }
                else if (value <= 154) { status = 'Moderate'; color = '#ffa502'; }
                else if (value <= 254) { status = 'Unhealthy'; color = '#ff4757'; }
                else if (value <= 354) { status = 'Very Unhealthy'; color = '#a020f0'; }
                else { status = 'Hazardous'; color = '#7d1b1b'; }
                break;
            case 'no2':
                if (value <= 53) { status = 'Good'; color = '#2ed573'; }
                else if (value <= 100) { status = 'Moderate'; color = '#ffa502'; }
                else if (value <= 360) { status = 'Unhealthy'; color = '#ff4757'; }
                else if (value <= 649) { status = 'Very Unhealthy'; color = '#a020f0'; }
                else { status = 'Hazardous'; color = '#7d1b1b'; }
                break;
            case 'so2':
                if (value <= 35) { status = 'Good'; color = '#2ed573'; }
                else if (value <= 75) { status = 'Moderate'; color = '#ffa502'; }
                else if (value <= 185) { status = 'Unhealthy'; color = '#ff4757'; }
                else { status = 'Very Unhealthy'; color = '#a020f0'; }
                break;
            case 'co':
                if (value <= 4.4) { status = 'Good'; color = '#2ed573'; }
                else if (value <= 9.4) { status = 'Moderate'; color = '#ffa502'; }
                else if (value <= 12.4) { status = 'Unhealthy'; color = '#ff4757'; }
                else if (value <= 15.4) { status = 'Very Unhealthy'; color = '#a020f0'; }
                else { status = 'Hazardous'; color = '#7d1b1b'; }
                break;
            case 'o3':
                if (value <= 54) { status = 'Good'; color = '#2ed573'; }
                else if (value <= 70) { status = 'Moderate'; color = '#ffa502'; }
                else if (value <= 85) { status = 'Unhealthy for Sensitive Groups'; color = '#ff7f50'; }
                else if (value <= 105) { status = 'Unhealthy'; color = '#ff4757'; }
                else if (value <= 200) { status = 'Very Unhealthy'; color = '#a020f0'; }
                else { status = 'Hazardous'; color = '#7d1b1b'; }
                break;
        }
        
        if (status) {
            const helper = input.parentElement.querySelector('.helper-text');
            if (helper) {
                helper.innerHTML = `Current level: <strong style="color:${color}">${status}</strong>`;
            }
        }
    });
}

function validateForm() {
    const state = document.getElementById("state").value.trim();
    const district = document.getElementById("district").value.trim();
    
    // Clear previous errors
    document.getElementById("stateError").textContent = "";
    document.getElementById("districtError").textContent = "";
    
    let isValid = true;
    
    if (!state || state.length < 2) {
        document.getElementById("stateError").textContent = "Please enter a valid state name (minimum 2 characters)";
        document.getElementById("state").focus();
        isValid = false;
    } else if (state.isdigit()) {
        document.getElementById("stateError").textContent = "State name should contain letters, not just numbers";
        document.getElementById("state").focus();
        isValid = false;
    }
    
    if (!district || district.length < 2) {
        document.getElementById("districtError").textContent = "Please enter a valid district name (minimum 2 characters)";
        if (isValid) document.getElementById("district").focus();
        isValid = false;
    } else if (district.isdigit()) {
        document.getElementById("districtError").textContent = "District name should contain letters, not just numbers";
        if (isValid) document.getElementById("district").focus();
        isValid = false;
    }
    
    // Validate numeric inputs
    const numericInputs = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
    for (const id of numericInputs) {
        const input = document.getElementById(id);
        const value = parseFloat(input.value);
        
        if (isNaN(value)) {
            showError(`Please enter a valid number for ${id.toUpperCase()}`);
            if (isValid) input.focus();
            isValid = false;
            break;
        }
        
        if (value < 0) {
            showError(`${id.toUpperCase()} cannot be negative. Please enter a positive number.`);
            if (isValid) input.focus();
            isValid = false;
            break;
        }
    }
    
    return isValid;
}

function getFormData() {
    return {
        state: document.getElementById("state").value.trim(),
        district: document.getElementById("district").value.trim(),
        pm25: parseFloat(document.getElementById("pm25").value),
        pm10: parseFloat(document.getElementById("pm10").value),
        no2: parseFloat(document.getElementById("no2").value),
        so2: parseFloat(document.getElementById("so2").value),
        co: parseFloat(document.getElementById("co").value),
        o3: parseFloat(document.getElementById("o3").value)
    };
}

function showLoading() {
    const loadingDiv = document.getElementById("loading");
    const resultsSection = document.getElementById("resultsSection");
    const resultDiv = document.getElementById("result");
    
    loadingDiv.style.display = 'flex';
    resultsSection.style.display = 'block';
    resultDiv.innerHTML = '';
    
    const riskSummary = document.getElementById("riskSummary");
    if (riskSummary) riskSummary.style.display = 'none';
}

function hideLoading() {
    const loadingDiv = document.getElementById("loading");
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

function showError(message) {
    const errorAlert = document.getElementById("errorAlert");
    if (errorAlert) {
        errorAlert.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorAlert.style.display = 'flex';
        
        // Scroll to error
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function hideError() {
    const errorAlert = document.getElementById("errorAlert");
    if (errorAlert) {
        errorAlert.style.display = 'none';
    }
}

function showSuccess(message) {
    const successAlert = document.getElementById("successAlert");
    if (successAlert) {
        successAlert.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successAlert.style.display = 'flex';
        
        // Hide after 3 seconds
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 3000);
    }
}

function hideSuccess() {
    const successAlert = document.getElementById("successAlert");
    if (successAlert) {
        successAlert.style.display = 'none';
    }
}

function showLocationAlert(message) {
    const locationAlert = document.getElementById("locationAlert");
    const locationAlertText = document.getElementById("locationAlertText");
    
    if (locationAlert && locationAlertText) {
        locationAlertText.textContent = message;
        locationAlert.style.display = 'flex';
    }
}

function hideLocationAlert() {
    const locationAlert = document.getElementById("locationAlert");
    if (locationAlert) {
        locationAlert.style.display = 'none';
    }
}

function displayResults(data) {
    const resultDiv = document.getElementById("result");
    const riskSummary = document.getElementById("riskSummary");
    const highRiskCount = document.getElementById("highRiskCount");
    const lowRiskCount = document.getElementById("lowRiskCount");
    const highestRisk = document.getElementById("highestRisk");
    const locationInfo = document.getElementById("locationInfo");
    
    // Clear previous results
    if (resultDiv) resultDiv.innerHTML = '';
    
    // Check if data is valid
    if (!data || typeof data !== 'object') {
        showError("Invalid response from server. Please try again.");
        return;
    }
    
    // Check if there's an error in the response
    if (data.error) {
        showError(data.error);
        return;
    }
    
    // Count risks and find highest risk
    let highCount = 0;
    let lowCount = 0;
    let highestRiskDisease = { name: '', probability: 0 };
    
    // Filter out summary data and get location
    const diseaseEntries = Object.entries(data).filter(([key]) => !key.startsWith('_'));
    const summary = data._summary || {};
    
    if (diseaseEntries.length === 0) {
        showError("No disease data received from server.");
        return;
    }
    
    // Create result cards
    diseaseEntries.forEach(([disease, info], index) => {
        // Validate data structure
        if (!info || typeof info !== 'object') return;
        
        const riskClass = info.risk === "High Risk" ? "high-risk" : "low-risk";
        const riskIcon = info.risk === "High Risk" ? "fas fa-exclamation-triangle" : "fas fa-check-circle";
        const probability = info.probability || 0;
        
        if (info.risk === "High Risk") highCount++;
        else lowCount++;
        
        if (probability > highestRiskDisease.probability) {
            highestRiskDisease = { name: disease, probability: probability };
        }
        
        const card = document.createElement("div");
        card.className = `result-card ${riskClass}`;
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="disease-info">
                <div class="disease-name">${disease}</div>
                <div class="probability">${probability}% probability</div>
            </div>
            <div class="risk-indicator">
                <i class="${riskIcon}"></i>
                ${info.risk || 'Unknown Risk'}
            </div>
        `;
        
        if (resultDiv) resultDiv.appendChild(card);
    });
    
    // Update summary
    if (highRiskCount) highRiskCount.textContent = highCount;
    if (lowRiskCount) lowRiskCount.textContent = lowCount;
    if (highestRisk) highestRisk.textContent = highestRiskDisease.name || '-';
    if (locationInfo && summary.state && summary.district) {
        locationInfo.textContent = `${summary.state}, ${summary.district}`;
    }
    
    // Show summary
    if (riskSummary) riskSummary.style.display = 'block';
    
    // Scroll to results
    const resultsSection = document.getElementById("resultsSection");
    if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function loadSampleData(sampleType) {
    try {
        const response = await fetch('/sample-data');
        const samples = await response.json();
        
        if (samples[sampleType]) {
            const sample = samples[sampleType];
            
            // Fill the form with sample data
            document.getElementById('state').value = sample.state;
            document.getElementById('district').value = sample.district;
            document.getElementById('pm25').value = sample.pm25;
            document.getElementById('pm10').value = sample.pm10;
            document.getElementById('no2').value = sample.no2;
            document.getElementById('so2').value = sample.so2;
            document.getElementById('co').value = sample.co;
            document.getElementById('o3').value = sample.o3;
            
            // Update helper text
            updateHelperText();
            
            // Clear any errors
            hideError();
            hideLocationAlert();
            
            // Show success message
            showSuccess(`Loaded ${sampleType.replace('_', ' ')} sample data: ${sample.description || ''}`);
        }
    } catch (error) {
        console.error('Error loading sample data:', error);
        // Use fallback sample data
        useFallbackSampleData(sampleType);
    }
}

function useFallbackSampleData(sampleType) {
    const samples = {
        delhi: {
            state: "Delhi",
            district: "Central Delhi",
            pm25: 150.5,
            pm10: 250.3,
            no2: 80.2,
            so2: 30.5,
            co: 1.8,
            o3: 65.7,
            description: "High pollution levels typical of Delhi winters"
        },
        mumbai: {
            state: "Maharashtra",
            district: "Mumbai",
            pm25: 85.2,
            pm10: 120.8,
            no2: 45.3,
            so2: 15.2,
            co: 0.9,
            o3: 55.1,
            description: "Moderate pollution levels"
        },
        clean_city: {
            state: "Sikkim",
            district: "Gangtok",
            pm25: 25.3,
            pm10: 40.1,
            no2: 18.5,
            so2: 8.2,
            co: 0.3,
            o3: 35.4,
            description: "Clean air quality"
        }
    };
    
    if (samples[sampleType]) {
        const sample = samples[sampleType];
        
        document.getElementById('state').value = sample.state;
        document.getElementById('district').value = sample.district;
        document.getElementById('pm25').value = sample.pm25;
        document.getElementById('pm10').value = sample.pm10;
        document.getElementById('no2').value = sample.no2;
        document.getElementById('so2').value = sample.so2;
        document.getElementById('co').value = sample.co;
        document.getElementById('o3').value = sample.o3;
        
        updateHelperText();
        hideError();
        hideLocationAlert();
        showSuccess(`Loaded ${sampleType.replace('_', ' ')} sample data: ${sample.description}`);
    }
}

function resetForm() {
    // Reset form values
    document.getElementById("predictionForm").reset();
    
    // Reset to default values
    document.getElementById("pm25").value = 50;
    document.getElementById("pm10").value = 80;
    document.getElementById("no2").value = 40;
    document.getElementById("so2").value = 20;
    document.getElementById("co").value = 0.8;
    document.getElementById("o3").value = 60;
    
    // Clear errors and results
    hideError();
    hideSuccess();
    hideLocationAlert();
    document.getElementById("resultsSection").style.display = 'none';
    document.getElementById("stateError").textContent = "";
    document.getElementById("districtError").textContent = "";
    
    // Update helper text
    updateHelperText();
    
    // Scroll to top
    window.scrollTo({top: 0, behavior: 'smooth'});
}

// Add isdigit method to String prototype if it doesn't exist
if (!String.prototype.isdigit) {
    String.prototype.isdigit = function() {
        return /^\d+$/.test(this);
    };
}