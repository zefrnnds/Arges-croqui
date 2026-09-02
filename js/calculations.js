function grauParaGMS(grausDec) {
    let d = Math.floor(grausDec);
    let minTot = (grausDec - d) * 60;
    let m = Math.floor(minTot);
    let s = ((minTot - m) * 60).toFixed(1);
    return `${d}° ${m}' ${s}"`;
}

function formatarGraus(degDecimal) {
    const d = Math.floor(degDecimal);
    const minFloat = (degDecimal - d) * 60;
    const m = Math.floor(minFloat);
    const s = Math.round((minFloat - m) * 60);
    return `${d}° ${m}' ${s}"`;
}

function getPontoById(id) { return window.pontos.find(p => p.id === id); }

function calcularEMedirPontos(p1, p2) {
    let x1 = p1.e !== undefined ? p1.e : p1.este, y1 = p1.n !== undefined ? p1.n : p1.norte, z1 = p1.z !== undefined ? p1.z : p1.cota;
    let x2 = p2.e !== undefined ? p2.e : p2.este, y2 = p2.n !== undefined ? p2.n : p2.norte, z2 = p2.z !== undefined ? p2.z : p2.cota;
    let dE = x2 - x1, dN = y2 - y1, dZ = z2 - z1;
    let dh = Math.sqrt(dE * dE + dN * dN);
    let di = Math.sqrt(dE * dE + dN * dN + dZ * dZ);
    let rad = Math.atan2(dE, dN);
    let deg = rad * (180 / Math.PI);
    if (deg < 0) deg += 360;
    window.medicaoAtual = { p1, p2, dh, di, dZ, azimuteGMS: grauParaGMS(deg) };
    const resBox = document.getElementById('resMedicaoCanvas');
    if (resBox) {
        resBox.classList.remove('hidden');
        resBox.innerHTML = `<strong>📏 ${p1.id} ➔ ${p2.id}</strong><br>• DH: <strong>${dh.toFixed(3)} m</strong><br>• DI: <strong>${di.toFixed(3)} m</strong><br>• ΔZ: <strong>${dZ.toFixed(3)} m</strong><br>• Az: <strong>${grauParaGMS(deg)}</strong>`;
    }
}

function calcularDecimal() {
    const input = document.getElementById('valorDecimalInput');
    const resBox = document.getElementById('resCalculoDecimal');
    
    if (!input || !resBox) return;

    const decimal = parseFloat(input.value);

    if (isNaN(decimal)) {
        resBox.textContent = 'Por favor, insira um valor decimal válido.';
        resBox.classList.remove('hidden');
        return;
    }

    const graus = Math.trunc(decimal);
    const minutosDecimal = Math.abs(decimal - graus) * 60;
    const minutos = Math.trunc(minutosDecimal);
    const segundos = ((minutosDecimal - minutos) * 60).toFixed(2);

    resBox.innerHTML = `<strong>Resultado:</strong> ${graus}° ${minutos}' ${segundos}"`;
    resBox.classList.remove('hidden');
}

function calc2Pontos() {
    const p1 = getPontoById(document.getElementById('p1')?.value.trim());
    const p2 = getPontoById(document.getElementById('p2')?.value.trim());
    const resDiv = document.getElementById('res2');
    if (!p1 || !p2) { resDiv?.classList.add('hidden'); return; }
    let x1 = p1.e !== undefined ? p1.e : p1.este, y1 = p1.n !== undefined ? p1.n : p1.norte, z1 = p1.z !== undefined ? p1.z : p1.cota;
    let x2 = p2.e !== undefined ? p2.e : p2.este, y2 = p2.n !== undefined ? p2.n : p2.norte, z2 = p2.z !== undefined ? p2.z : p2.cota;
    const dE = x2 - x1, dN = y2 - y1, dZ = z2 - z1;
    const distH = Math.hypot(dE, dN), dist3D = Math.hypot(dE, dN, dZ);
    let azimuteRad = Math.atan2(dE, dN);
    if (azimuteRad < 0) azimuteRad += 2 * Math.PI;
    const azimuteGraus = (azimuteRad * 180) / Math.PI;
    const declividade = distH > 0 ? (dZ / distH) * 100 : 0;
    if (resDiv) {
        resDiv.innerHTML = `<strong>DH:</strong> ${distH.toFixed(3)} m<br><strong>Dist 3D:</strong> ${dist3D.toFixed(3)} m<br><strong>Azimute:</strong> ${formatarGraus(azimuteGraus)}<br><strong>ΔZ:</strong> ${dZ.toFixed(3)} m<br><strong>Declividade:</strong> ${declividade.toFixed(2)}%`;
        resDiv.classList.remove('hidden');
    }
}

// ÁREA E VOLUME
window.areaSequence = [];
function adicionarPontoArea() {
    if (window.pontos.length === 0) { alert('Nenhum ponto cadastrado.'); return; }
    const select = document.createElement('select');
    select.className = 'form-group';
    select.style.width = '100%'; select.style.padding = '8px';
    select.innerHTML = `<option value="">-- Selecione --</option>` + window.pontos.map(p => `<option value="${p.id}">${p.id}</option>`).join('');
    select.onchange = () => {
        window.areaSequence = [];
        document.querySelectorAll('.area-ponto-select').forEach(s => { if (s.value) { const p = getPontoById(s.value); if (p) window.areaSequence.push(p); } });
    };
    select.classList.add('area-ponto-select');
    document.getElementById('areaSelection').appendChild(select);
}

function calcularArea() {
    const n = window.areaSequence.length;
    if (n < 3) { 
        alert('Selecione pelo menos 3 pontos para calcular área, perímetro e volume.'); 
        return; 
    }

    // 1. Estatísticas de cota (cota de referência = ponto mais baixo)
    let cotaMin = Infinity;
    let cotaMax = -Infinity;
    let somaCotas = 0;
    
    window.areaSequence.forEach(p => {
        let z = p.z !== undefined ? p.z : p.cota;
        if (z < cotaMin) cotaMin = z;
        if (z > cotaMax) cotaMax = z;
        somaCotas += z;
    });
    
    const cotaReferencia = cotaMin;
    const desnivelTotal = cotaMax - cotaMin;
    const cotaMedia = somaCotas / n;

    // 2. Calcular Área 2D e Perímetro (fórmula do agrimensor)
    let area2D = 0;
    let perimetro = 0;
    for (let i = 0; i < n; i++) {
        const p1 = window.areaSequence[i];
        const p2 = window.areaSequence[(i + 1) % n];
        let x1 = p1.e !== undefined ? p1.e : p1.este;
        let y1 = p1.n !== undefined ? p1.n : p1.norte;
        let x2 = p2.e !== undefined ? p2.e : p2.este;
        let y2 = p2.n !== undefined ? p2.n : p2.norte;
        area2D += (x1 * y2) - (x2 * y1);
        perimetro += Math.hypot(x2 - x1, y2 - y1);
    }
    area2D = Math.abs(area2D) / 2;

    // 3. Calcular Volume Bruto por decomposição em triângulos (método preciso)
    // Referência: cota mais baixa (ponto mínimo)
    let volumeBruto = 0;
    const p0 = window.areaSequence[0];
    const x0 = p0.e !== undefined ? p0.e : p0.este;
    const y0 = p0.n !== undefined ? p0.n : p0.norte;
    const z0 = (p0.z !== undefined ? p0.z : p0.cota) - cotaReferencia;

    for (let i = 1; i < n - 1; i++) {
        const p1 = window.areaSequence[i];
        const p2 = window.areaSequence[i + 1];
        
        const x1 = p1.e !== undefined ? p1.e : p1.este;
        const y1 = p1.n !== undefined ? p1.n : p1.norte;
        const x2 = p2.e !== undefined ? p2.e : p2.este;
        const y2 = p2.n !== undefined ? p2.n : p2.norte;
        
        const z1 = (p1.z !== undefined ? p1.z : p1.cota) - cotaReferencia;
        const z2 = (p2.z !== undefined ? p2.z : p2.cota) - cotaReferencia;
        
        // Área do triângulo no plano XY
        const areaTriangulo = Math.abs((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) / 2;
        
        // Volume do prisma triangular
        volumeBruto += areaTriangulo * (z0 + z1 + z2) / 3;
    }

    // 4. Exibir resultado completo
    const resDiv = document.getElementById('resArea');
    if (resDiv) {
        resDiv.innerHTML = `
            <strong>📐 Área e Perímetro:</strong><br>
            • Área Projetada: <strong>${area2D.toFixed(3)} m²</strong> (${(area2D/10000).toFixed(4)} ha)<br>
            • Perímetro: <strong>${perimetro.toFixed(3)} m</strong><br>
            • Vértices: <strong>${n}</strong><br><br>
            
            <strong>📏 Estatísticas de Cota:</strong><br>
            • Cota Mínima (Referência): <strong>${cotaMin.toFixed(3)} m</strong><br>
            • Cota Máxima: <strong>${cotaMax.toFixed(3)} m</strong><br>
            • Cota Média: <strong>${cotaMedia.toFixed(3)} m</strong><br>
            • Desnível Total: <strong>${desnivelTotal.toFixed(3)} m</strong><br><br>
            
            <strong>🧊 Volume Bruto (acima da referência):</strong><br>
            • Volume: <strong>${volumeBruto.toFixed(3)} m³</strong><br>
            <small style="color: var(--text-secondary);">
                💡 Cálculo por decomposição em prismas triangulares.<br>
                Referência automática: ponto de cota mais baixa (${cotaMin.toFixed(3)} m).
            </small>
        `;
        resDiv.classList.remove('hidden');
    }
}

function calcularVolumeUI() {
    const n = window.areaSequence.length;
    if (n < 3) { alert('Selecione pelo menos 3 pontos.'); return; }
    let area2D = 0, somaCota = 0;
    for (let i = 0; i < n; i++) {
        const p1 = window.areaSequence[i], p2 = window.areaSequence[(i + 1) % n];
        let x1 = p1.e !== undefined ? p1.e : p1.este, y1 = p1.n !== undefined ? p1.n : p1.norte;
        let x2 = p2.e !== undefined ? p2.e : p2.este, y2 = p2.n !== undefined ? p2.n : p2.norte;
        let z1 = p1.z !== undefined ? p1.z : p1.cota;
        area2D += (x1 * y2) - (x2 * y1); somaCota += z1;
    }
    area2D = Math.abs(area2D) / 2;
    const cotaMedia = somaCota / n;
    const cotaRef = parseFloat(prompt('Cota de referência/projeto (m):', cotaMedia.toFixed(3)));
    if (isNaN(cotaRef)) return;
    const volume = area2D * (cotaMedia - cotaRef);
    const resDiv = document.getElementById('resArea');
    if (resDiv) {
        resDiv.innerHTML += `<br><strong>Volume Estimado:</strong> ${Math.abs(volume).toFixed(3)} m³ (${volume >= 0 ? 'Aterro' : 'Corte'})`;
    }
}

// POLIGONAL
window.leiturasCampo = [];
function adicionarLeituraCampo() {
    const estacao = document.getElementById('obsEstacao').value.trim().toUpperCase();
    const re = document.getElementById('obsRe').value.trim().toUpperCase();
    const vante = document.getElementById('obsVante').value.trim().toUpperCase();
    const angulo = parseFloat(document.getElementById('obsAngulo').value);
    const distancia = parseFloat(document.getElementById('obsDistancia').value);
    if (!estacao || !re || !vante || isNaN(angulo) || isNaN(distancia)) { alert('Preencha todos os campos.'); return; }
    window.leiturasCampo.push({ estacao, re, vante, angulo, distancia });
    atualizarTabelaLeituras();
    document.getElementById('obsEstacao').value = vante;
    document.getElementById('obsRe').value = estacao;
    document.getElementById('obsVante').value = '';
    document.getElementById('obsAngulo').value = '';
    document.getElementById('obsDistancia').value = '';
    document.getElementById('obsVante').focus();
}

function atualizarTabelaLeituras() {
    const tbody = document.getElementById('tabelaLeiturasBody');
    if (!tbody) return;
    if (window.leiturasCampo.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma leitura.</td></tr>`; return; }
    tbody.innerHTML = window.leiturasCampo.map(obs => `<tr><td><strong>${obs.estacao}</strong></td><td>${obs.re}</td><td>${obs.vante}</td><td>${obs.angulo.toFixed(4)}°</td><td>${obs.distancia.toFixed(3)} m</td></tr>`).join('');
}

function processarPoligonalCampo() {
    if (window.leiturasCampo.length < 3) { alert('Adicione pelo menos 3 leituras.'); return; }
    const n = window.leiturasCampo.length;
    const somaAngulos = window.leiturasCampo.reduce((sum, obs) => sum + obs.angulo, 0);
    const erroAngular = somaAngulos - ((n - 2) * 180);
    const correcao = -erroAngular / n;
    let azimuteAtual = 0, perimetroTotal = 0;
    const trechos = window.leiturasCampo.map(obs => {
        azimuteAtual = (azimuteAtual + (obs.angulo + correcao) + 180) % 360;
        if (azimuteAtual < 0) azimuteAtual += 360;
        const rad = (azimuteAtual * Math.PI) / 180;
        perimetroTotal += obs.distancia;
        return { vante: obs.vante, distancia: obs.distancia, dX: obs.distancia * Math.sin(rad), dY: obs.distancia * Math.cos(rad) };
    });
    const erroX = trechos.reduce((sum, t) => sum + t.dX, 0);
    const erroY = trechos.reduce((sum, t) => sum + t.dY, 0);
    const erroLinear = Math.hypot(erroX, erroY);
    const precisao = erroLinear > 0.0001 ? Math.round(perimetroTotal / erroLinear) : 0;
    
    let xAtual = 1000, yAtual = 1000;
    trechos.forEach(t => {
        xAtual += (t.dX - erroX * (t.distancia / perimetroTotal));
        yAtual += (t.dY - erroY * (t.distancia / perimetroTotal));
        const idx = window.pontos.findIndex(p => p.id === t.vante);
        const novoPonto = { id: t.vante, e: Number(xAtual.toFixed(3)), este: Number(xAtual.toFixed(3)), n: Number(yAtual.toFixed(3)), norte: Number(yAtual.toFixed(3)), z: 0, cota: 0, desc: 'Poligonal' };
        if (idx === -1) window.pontos.push(novoPonto);
        else { window.pontos[idx].e = window.pontos[idx].este = Number(xAtual.toFixed(3)); window.pontos[idx].n = window.pontos[idx].norte = Number(yAtual.toFixed(3)); }
    });
    
    salvarSessoesStorage();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    desenharCroqui();
    
    const resDiv = document.getElementById('resPoligonalCampo');
    if (resDiv) {
        resDiv.innerHTML = `<strong>Perímetro:</strong> ${perimetroTotal.toFixed(3)} m<br><strong>Erro Angular:</strong> ${erroAngular.toFixed(4)}°<br><strong>Erro Linear:</strong> ${erroLinear.toFixed(4)} m<br><strong>Precisão:</strong> 1 : ${precisao.toLocaleString('pt-BR')}`;
        resDiv.classList.remove('hidden');
    }
}
/* ==========================================================================
   FERRAMENTA DE CONVERSÃO EM LOTE (X, Y, Z)
========================================================================== */
function converterCoordenadas(operacao) {
    if (window.pontos.length === 0) {
        alert('A caderneta está vazia. Nada para converter.');
        return;
    }

    const fator = parseFloat(document.getElementById('conversionFactor').value);
    if (isNaN(fator) || fator === 0) {
        alert('Informe um fator de conversão válido (diferente de zero).');
        return;
    }

    const aplicarX = document.getElementById('applyToX').checked;
    const aplicarY = document.getElementById('applyToY').checked;
    const aplicarZ = document.getElementById('applyToZ').checked;

    if (!aplicarX && !aplicarY && !aplicarZ) {
        alert('Selecione pelo menos um eixo (X, Y ou Z) para aplicar a conversão.');
        return;
    }

    const acao = operacao === 'dividir' ? 'divididos' : 'multiplicados';
    const eixosSelecionados = [];
    if (aplicarX) eixosSelecionados.push('X');
    if (aplicarY) eixosSelecionados.push('Y');
    if (aplicarZ) eixosSelecionados.push('Z');

    const confirmacao = confirm(
        `⚠️ ATENÇÃO: Esta operação irá modificar ${window.pontos.length} pontos.\n\n` +
        `Eixos afetados: ${eixosSelecionados.join(', ')}\n` +
        `Operação: ${operacao === 'dividir' ? 'Dividir' : 'Multiplicar'} por ${fator}\n\n` +
        `Deseja continuar? (Recomendamos exportar um backup antes)`
    );

    if (!confirmacao) return;

    let pontosAfetados = 0;

    window.pontos.forEach(p => {
        // Eixo X (Este)
        if (aplicarX) {
            let x = p.e !== undefined ? p.e : p.este;
            let novoX = operacao === 'dividir' ? x / fator : x * fator;
            p.e = novoX;
            p.este = novoX;
        }

        // Eixo Y (Norte)
        if (aplicarY) {
            let y = p.n !== undefined ? p.n : p.norte;
            let novoY = operacao === 'dividir' ? y / fator : y * fator;
            p.n = novoY;
            p.norte = novoY;
        }

        // Eixo Z (Cota)
        if (aplicarZ) {
            let z = p.z !== undefined ? p.z : p.cota;
            let novoZ = operacao === 'dividir' ? z / fator : z * fator;
            p.z = novoZ;
            p.cota = novoZ;
        }

        pontosAfetados++;
    });

    // Salvar e atualizar a interface
    if (typeof salvarSessoesStorage === 'function') salvarSessoesStorage();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    if (typeof desenharCroqui === 'function') desenharCroqui();

    // Mostrar resultado
    const resDiv = document.getElementById('conversionResult');
    if (resDiv) {
        const simbolo = operacao === 'dividir' ? '÷' : '×';
        resDiv.innerHTML = `
            ✅ <strong>Conversão concluída!</strong><br>
            • Pontos afetados: <strong>${pontosAfetados}</strong><br>
            • Operação: ${eixosSelecionados.join(', ')} ${simbolo} ${fator}<br>
            • Tabela e croqui atualizados.
        `;
        resDiv.classList.remove('hidden');
        setTimeout(() => resDiv.classList.add('hidden'), 6000);
    }
}

/* ==========================================================================
   LOCAÇÃO POR COORDENADAS POLARES
========================================================================== */
function calcularLocacaoPolar() {
    const idEst = document.getElementById('locEstacao').value.trim().toUpperCase();
    const idRe = document.getElementById('locRe').value.trim().toUpperCase();
    const idAlvo = document.getElementById('locAlvo').value.trim().toUpperCase();
    const resDiv = document.getElementById('resLocacaoPolar');

    if (!idEst || !idRe || !idAlvo) {
        alert('Preencha os três pontos: Estação, Ré e Alvo.');
        return;
    }

    const pE = window.pontos.find(p => p.id.toUpperCase() === idEst);
    const pR = window.pontos.find(p => p.id.toUpperCase() === idRe);
    const pA = window.pontos.find(p => p.id.toUpperCase() === idAlvo);

    if (!pE || !pR || !pA) {
        alert('Um ou mais pontos não foram encontrados na caderneta atual.');
        if (resDiv) resDiv.classList.add('hidden');
        return;
    }

    if (pE.id.toUpperCase() === pR.id.toUpperCase()) {
        alert('A Estação e a Ré não podem ser o mesmo ponto.');
        return;
    }

    const xE = pE.e !== undefined ? pE.e : pE.este;
    const yE = pE.n !== undefined ? pE.n : pE.norte;
    const zE = pE.z !== undefined ? pE.z : pE.cota;

    const xR = pR.e !== undefined ? pR.e : pR.este;
    const yR = pR.n !== undefined ? pR.n : pR.norte;

    const xA = pA.e !== undefined ? pA.e : pA.este;
    const yA = pA.n !== undefined ? pA.n : pA.norte;
    const zA = pA.z !== undefined ? pA.z : pA.cota;

    let azER = Math.atan2(xR - xE, yR - yE) * (180 / Math.PI);
    if (azER < 0) azER += 360;

    let azEA = Math.atan2(xA - xE, yA - yE) * (180 / Math.PI);
    if (azEA < 0) azEA += 360;

    let anguloHz = azEA - azER;
    if (anguloHz < 0) anguloHz += 360;

    const dX = xA - xE;
    const dY = yA - yE;
    const dZ = zA - zE;
    const distH = Math.hypot(dX, dY);
    const dist3D = Math.hypot(dX, dY, dZ);

    function decToGMS(dec) {
        const g = Math.floor(dec);
        const mF = (dec - g) * 60;
        const m = Math.floor(mF);
        const s = ((mF - m) * 60).toFixed(1);
        return `${g}° ${m}' ${s}"`;
    }

    const sentidoRotacao = anguloHz <= 180 ? 'Horário (↻)' : 'Anti-horário (↺)';
    const anguloMenor = anguloHz <= 180 ? anguloHz : 360 - anguloHz;

    if (resDiv) {
        resDiv.innerHTML = `
            <strong>📍 Pontos Utilizados:</strong><br>
            • Estação (${pE.id}): X=${xE.toFixed(3)}, Y=${yE.toFixed(3)}, Z=${zE.toFixed(3)}<br>
            • Ré (${pR.id}): X=${xR.toFixed(3)}, Y=${yR.toFixed(3)}<br>
            • Alvo (${pA.id}): X=${xA.toFixed(3)}, Y=${yA.toFixed(3)}, Z=${zA.toFixed(3)}<br><br>
            
            <strong> Azimutes:</strong><br>
            • Azimute E→R: <strong>${decToGMS(azER)}</strong> (${azER.toFixed(4)}°)<br>
            • Azimute E→A: <strong>${decToGMS(azEA)}</strong> (${azEA.toFixed(4)}°)<br><br>
            
            <strong>🎯 DADOS PARA LOCAÇÃO:</strong><br>
            • Ângulo Hz: <strong>${decToGMS(anguloHz)}</strong><br>
            • Sentido: <strong>${sentidoRotacao}</strong><br>
            • DH: <strong>${distH.toFixed(3)} m</strong><br>
            • DI: <strong>${dist3D.toFixed(3)} m</strong><br>
            • ΔZ: <strong>${dZ.toFixed(3)} m</strong><br><br>
            
            <small style="color: var(--text-secondary);">
                💡 <strong>Campo:</strong> Estacione em ${pE.id}, zere em ${pR.id}, gire ${decToGMS(anguloHz)} (${sentidoRotacao.toLowerCase()}), meça ${distH.toFixed(3)}m.
            </small>
        `;
        resDiv.classList.remove('hidden');
    }
}

window.calcularLocacaoPolar = calcularLocacaoPolar;

// Expor a função globalmente
window.converterCoordenadas = converterCoordenadas;
window.calc2Pontos = calc2Pontos;
window.adicionarPontoArea = adicionarPontoArea;
window.calcularArea = calcularArea;
window.calcularVolumeUI = calcularVolumeUI;
window.adicionarLeituraCampo = adicionarLeituraCampo;
window.processarPoligonalCampo = processarPoligonalCampo;