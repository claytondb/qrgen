// QR Gen - Fast QR Code Generator

// State
let currentType = 'url';
let currentData = '';
let history = [];

// DOM Elements
const qrCanvas = document.getElementById('qr-canvas');
const qrSection = document.getElementById('qr-section');
const generateBtn = document.getElementById('generate-btn');
const historyList = document.getElementById('history-list');

// QR Options
let qrOptions = {
    width: 256,
    color: {
        dark: '#000000',
        light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
};

// Initialize
function init() {
    loadHistory();
    setupEventListeners();
}

function setupEventListeners() {
    // Type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchType(btn.dataset.type);
        });
    });

    // Generate button
    generateBtn.addEventListener('click', generateQR);

    // Customization
    document.getElementById('qr-size').addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        document.getElementById('size-value').textContent = size + 'px';
        qrOptions.width = size;
        if (currentData) regenerateQR();
    });

    document.getElementById('qr-fg').addEventListener('input', (e) => {
        qrOptions.color.dark = e.target.value;
        if (currentData) regenerateQR();
    });

    document.getElementById('qr-bg').addEventListener('input', (e) => {
        qrOptions.color.light = e.target.value;
        if (currentData) regenerateQR();
    });

    // Download buttons
    document.getElementById('download-png').addEventListener('click', downloadPNG);
    document.getElementById('download-svg').addEventListener('click', downloadSVG);
    document.getElementById('copy-btn').addEventListener('click', copyImage);

    // Enter key to generate
    document.querySelectorAll('.input-form input, .input-form textarea').forEach(el => {
        el.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                generateQR();
            }
        });
    });
}

function switchType(type) {
    currentType = type;
    
    // Hide all forms
    document.querySelectorAll('.input-form').forEach(form => {
        form.style.display = 'none';
    });
    
    // Show selected form
    document.getElementById(`form-${type}`).style.display = 'flex';
}

function getDataFromForm() {
    switch (currentType) {
        case 'url':
            return document.getElementById('input-url').value.trim();
            
        case 'text':
            return document.getElementById('input-text').value.trim();
            
        case 'wifi':
            const ssid = document.getElementById('wifi-ssid').value.trim();
            const password = document.getElementById('wifi-password').value;
            const security = document.getElementById('wifi-security').value;
            if (!ssid) return '';
            return `WIFI:S:${ssid};T:${security};P:${password};;`;
            
        case 'email':
            const emailTo = document.getElementById('email-to').value.trim();
            const subject = document.getElementById('email-subject').value.trim();
            const body = document.getElementById('email-body').value.trim();
            if (!emailTo) return '';
            let mailto = `mailto:${emailTo}`;
            const params = [];
            if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
            if (body) params.push(`body=${encodeURIComponent(body)}`);
            if (params.length) mailto += '?' + params.join('&');
            return mailto;
            
        case 'phone':
            const phone = document.getElementById('input-phone').value.trim();
            return phone ? `tel:${phone}` : '';
            
        case 'sms':
            const smsPhone = document.getElementById('sms-phone').value.trim();
            const smsMsg = document.getElementById('sms-message').value.trim();
            if (!smsPhone) return '';
            return smsMsg ? `sms:${smsPhone}?body=${encodeURIComponent(smsMsg)}` : `sms:${smsPhone}`;
            
        default:
            return '';
    }
}

function generateQR() {
    const data = getDataFromForm();
    
    if (!data) {
        alert('Please enter the required information');
        return;
    }
    
    currentData = data;
    regenerateQR();
    
    // Show QR section
    qrSection.style.display = 'block';
    qrSection.scrollIntoView({ behavior: 'smooth' });
    
    // Add to history
    addToHistory(currentType, data);
}

function regenerateQR() {
    if (!currentData) return;
    
    QRCode.toCanvas(qrCanvas, currentData, {
        width: qrOptions.width,
        color: qrOptions.color,
        errorCorrectionLevel: qrOptions.errorCorrectionLevel
    }, function(error) {
        if (error) console.error(error);
    });
}

function downloadPNG() {
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = qrCanvas.toDataURL('image/png');
    link.click();
}

function downloadSVG() {
    QRCode.toString(currentData, {
        type: 'svg',
        width: qrOptions.width,
        color: qrOptions.color,
        errorCorrectionLevel: qrOptions.errorCorrectionLevel
    }, function(error, svg) {
        if (error) {
            console.error(error);
            return;
        }
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'qrcode.svg';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    });
}

async function copyImage() {
    try {
        const blob = await new Promise(resolve => qrCanvas.toBlob(resolve));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        const btn = document.getElementById('copy-btn');
        const original = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = original, 2000);
    } catch (err) {
        // Fallback: copy data URL
        const dataUrl = qrCanvas.toDataURL();
        await navigator.clipboard.writeText(dataUrl);
        alert('Image copied as data URL');
    }
}

function addToHistory(type, data) {
    // Don't add duplicates
    if (history.some(h => h.data === data)) return;
    
    // Generate thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 50;
    thumbCanvas.height = 50;
    
    QRCode.toCanvas(thumbCanvas, data, {
        width: 50,
        margin: 1,
        color: { dark: '#000', light: '#fff' }
    });
    
    const entry = {
        id: Date.now(),
        type,
        data,
        displayData: getDisplayData(type, data),
        thumbnail: thumbCanvas.toDataURL(),
        timestamp: new Date().toISOString()
    };
    
    history.unshift(entry);
    if (history.length > 10) history.pop();
    
    saveHistory();
    renderHistory();
}

function getDisplayData(type, data) {
    switch (type) {
        case 'wifi':
            const match = data.match(/S:([^;]+)/);
            return match ? `WiFi: ${match[1]}` : data;
        case 'email':
            return data.replace('mailto:', '');
        case 'phone':
            return data.replace('tel:', '');
        case 'sms':
            return data.replace('sms:', '').split('?')[0];
        default:
            return data.length > 40 ? data.substring(0, 40) + '...' : data;
    }
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-state">Generated QR codes will appear here</p>';
        return;
    }
    
    historyList.innerHTML = history.map(h => `
        <div class="history-item" onclick="loadFromHistory('${h.id}')">
            <div class="preview">
                <img src="${h.thumbnail}" alt="QR">
            </div>
            <div class="info">
                <div class="type">${h.type}</div>
                <div class="content">${h.displayData}</div>
            </div>
            <button class="delete" onclick="deleteFromHistory('${h.id}'); event.stopPropagation();">✕</button>
        </div>
    `).join('');
}

function loadFromHistory(id) {
    const entry = history.find(h => h.id == id);
    if (!entry) return;
    
    // Switch to correct type
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.type-btn[data-type="${entry.type}"]`).classList.add('active');
    switchType(entry.type);
    
    // Fill in data (simplified - just regenerate)
    currentData = entry.data;
    regenerateQR();
    qrSection.style.display = 'block';
}
window.loadFromHistory = loadFromHistory;

function deleteFromHistory(id) {
    history = history.filter(h => h.id != id);
    saveHistory();
    renderHistory();
}
window.deleteFromHistory = deleteFromHistory;

function saveHistory() {
    localStorage.setItem('qrgen-history', JSON.stringify(history));
}

function loadHistory() {
    const saved = localStorage.getItem('qrgen-history');
    if (saved) {
        history = JSON.parse(saved);
        renderHistory();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
