/* ==========================================================================
   CONVERSÕES — ÂNGULOS, COORDENADAS E AZIMUTES
========================================================================== */

// GMS → Decimal
function converterGMSparaDecimal() {
    const g = parseFloat(document.getElementById('gmsG').value) || 0;
    const m = parseFloat(document.getElementById('gmsM').value) || 0;
    const s = parseFloat(document.getElementById('gmsS').value) || 0;

    if (m >= 60 || s >= 60) {
        alert('Minutos e segundos devem ser menores que 60.');
        return;
    }

    const sinal = g < 0 ? -1 : 1;
    const decimal = (Math.abs(g) + (m / 60) + (s / 3600)) * sinal;

    const res = document.getElementById('resGMSparaDecimal');
    if (res) {
        res.innerHTML = `
            <strong>${decimal.toFixed(6)}°</strong><br>
            <small>${g}° ${m}' ${s}" → ${decimal.toFixed(6)}°</small>
        `;
        res.classList.remove('hidden');
    }
}

// Decimal → GMS
function converterDecimalparaGMS() {
    const dec = parseFloat(document.getElementById('anguloDecimal').value);
    if (isNaN(dec)) { alert('Informe um valor válido.'); return; }

    const sinal = dec < 0 ? -1 : 1;
    const abs = Math.abs(dec);
    const g = Math.floor(abs);
    const mFloat = (abs - g) * 60;
    const m = Math.floor(mFloat);
    const s = ((mFloat - m) * 60).toFixed(2);

    const res = document.getElementById('resDecimalparaGMS');
    if (res) {
        res.innerHTML = `
            <strong>${sinal * g}° ${m}' ${s}"</strong><br>
            <small>${dec.toFixed(6)}° → ${sinal * g}° ${m}' ${s}"</small>
        `;
        res.classList.remove('hidden');
    }
}

// Polar → Retangular
function converterPolarparaRetangular() {
    const r = parseFloat(document.getElementById('polarR').value);
    const az = parseFloat(document.getElementById('polarAz').value);
    if (isNaN(r) || isNaN(az)) { alert('Informe distância e azimute.'); return; }

    const azRad = (az * Math.PI) / 180;
    const dX = r * Math.sin(azRad);
    const dY = r * Math.cos(azRad);

    const res = document.getElementById('resPolarparaRet');
    if (res) {
        res.innerHTML = `
            <strong>ΔX (Este): ${dX.toFixed(3)} m</strong><br>
            <strong>ΔY (Norte): ${dY.toFixed(3)} m</strong><br>
            <small>r = ${r.toFixed(3)} m | Az = ${az.toFixed(4)}°</small>
        `;
        res.classList.remove('hidden');
    }
}

// Retangular → Polar
function converterRetangularparaPolar() {
    const dX = parseFloat(document.getElementById('retX').value);
    const dY = parseFloat(document.getElementById('retY').value);
    if (isNaN(dX) || isNaN(dY)) { alert('Informe ΔX e ΔY.'); return; }

    const dist = Math.hypot(dX, dY);
    let azRad = Math.atan2(dX, dY);
    if (azRad < 0) azRad += 2 * Math.PI;
    const azDeg = (azRad * 180) / Math.PI;

    const g = Math.floor(azDeg);
    const mF = (azDeg - g) * 60;
    const m = Math.floor(mF);
    const s = ((mF - m) * 60).toFixed(2);

    const res = document.getElementById('resRetparaPolar');
    if (res) {
        res.innerHTML = `
            <strong>Distância: ${dist.toFixed(3)} m</strong><br>
            <strong>Azimute: ${azDeg.toFixed(4)}° (${g}° ${m}' ${s}")</strong><br>
            <small>ΔX = ${dX.toFixed(3)} m | ΔY = ${dY.toFixed(3)} m</small>
        `;
        res.classList.remove('hidden');
    }
}

// Azimute e Distância entre dois pontos
function calcularAzimuteDistancia() {
    const x1 = parseFloat(document.getElementById('p1X').value);
    const y1 = parseFloat(document.getElementById('p1Y').value);
    const z1 = parseFloat(document.getElementById('p1Z').value) || 0;
    const x2 = parseFloat(document.getElementById('p2X').value);
    const y2 = parseFloat(document.getElementById('p2Y').value);
    const z2 = parseFloat(document.getElementById('p2Z').value) || 0;

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
        alert('Preencha pelo menos Este e Norte dos dois pontos.');
        return;
    }

    const dX = x2 - x1;
    const dY = y2 - y1;
    const dZ = z2 - z1;
    const distH = Math.hypot(dX, dY);
    const dist3D = Math.hypot(dX, dY, dZ);

    let azRad = Math.atan2(dX, dY);
    if (azRad < 0) azRad += 2 * Math.PI;
    const azDeg = (azRad * 180) / Math.PI;

    const g = Math.floor(azDeg);
    const mF = (azDeg - g) * 60;
    const m = Math.floor(mF);
    const s = ((mF - m) * 60).toFixed(2);

    const declividade = distH > 0 ? (dZ / distH) * 100 : 0;

    const res = document.getElementById('resAzimuteDist');
    if (res) {
        res.innerHTML = `
            <strong>📏 Distância:</strong><br>
            • Horizontal (DH): <strong>${distH.toFixed(3)} m</strong><br>
            • Inclinada (DI): <strong>${dist3D.toFixed(3)} m</strong><br><br>
            <strong>🧭 Azimute:</strong><br>
            • Decimal: <strong>${azDeg.toFixed(4)}°</strong><br>
            • GMS: <strong>${g}° ${m}' ${s}"</strong><br><br>
            <strong>📊 Dados Complementares:</strong><br>
            • ΔX (Este): ${dX.toFixed(3)} m<br>
            • ΔY (Norte): ${dY.toFixed(3)} m<br>
            • ΔZ (Desnível): ${dZ.toFixed(3)} m<br>
            • Declividade: ${declividade.toFixed(2)}%<br>
            <small>De (${x1.toFixed(3)}, ${y1.toFixed(3)}) → (${x2.toFixed(3)}, ${y2.toFixed(3)})</small>
        `;
        res.classList.remove('hidden');
    }
}

// Expor globalmente
window.converterGMSparaDecimal = converterGMSparaDecimal;
window.converterDecimalparaGMS = converterDecimalparaGMS;
window.converterPolarparaRetangular = converterPolarparaRetangular;
window.converterRetangularparaPolar = converterRetangularparaPolar;
window.calcularAzimuteDistancia = calcularAzimuteDistancia;