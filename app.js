/* ==========================================================================
ARGES CADERNETA TOPOGRÁFICA - SISTEMA COMPLETO E MOTOR CANVAS INTERATIVO
========================================================================== */
// --- VARIÁVEIS GLOBAIS DE DADOS ---
let sessoes = JSON.parse(localStorage.getItem('arges_sessoes')) || { "Obra Principal": [] };
let sessaoAtual = localStorage.getItem('arges_sessao_atual') || "Obra Principal";
if (!sessoes[sessaoAtual]) sessoes[sessaoAtual] = [];
let pontos = sessoes[sessaoAtual];
let leiturasCampo = [];
let linhasCroqui = [];
let dadosArquivoImportado = [];
let rawLines = [];

// --- VARIÁVEIS DE CONTROLE DO CANVAS ---
let canvas, ctx;
let modoCroqui = 'pan';
let pontoSelecionadoInicio = null;
let medicaoAtual = null;
let zoomScale = 1;
let panOffsetX = 0;
let panOffsetY = 0;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let mousePosCanvas = { x: 0, y: 0 };

// --- NOVAS VARIÁVEIS PARA CONTROLE DE TOQUE (MOBILE) ---
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchMoved = false;
let touchOnPoint = false;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarCanvas();
    atualizarSelectSessoes();
    renderizarTabela();
    atualizarDatalists();
    configurarImportacaoArquivo();
    window.addEventListener('resize', () => {
        ajustarTamanhoCanvas();
        desenharCroqui();
    });
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('Service Worker não registrado:', err);
    });
}

/* ==========================================================================
GESTÃO DE SESSÕES
========================================================================== */
function salvarSessoesStorage() {
    sessoes[sessaoAtual] = pontos;
    localStorage.setItem('arges_sessoes', JSON.stringify(sessoes));
    localStorage.setItem('arges_sessao_atual', sessaoAtual);
}
function atualizarSelectSessoes() {
    const select = document.getElementById('selectSessao');
    if (!select) return;
    select.innerHTML = '';
    Object.keys(sessoes).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        if (nome === sessaoAtual) opt.selected = true;
        select.appendChild(opt);
    });
}
function trocarSessaoUI() {
    const select = document.getElementById('selectSessao');
    if (!select) return;
    sessaoAtual = select.value;
    pontos = sessoes[sessaoAtual] || [];
    linhasCroqui = [];
    medicaoAtual = null;
    salvarSessoesStorage();
    renderizarTabela();
    atualizarDatalists();
    redefinirVistaCanvas();
}
function criarNovaSessaoUI() {
    const nome = prompt("Nome da nova Obra / Sessão:");
    if (!nome) return;
    if (sessoes[nome]) { alert("Já existe uma obra com este nome."); return; }
    sessoes[nome] = [];
    sessaoAtual = nome;
    pontos = sessoes[sessaoAtual];
    linhasCroqui = [];
    salvarSessoesStorage();
    atualizarSelectSessoes();
    renderizarTabela();
    atualizarDatalists();
    redefinirVistaCanvas();
}
function excluirSessaoAtualUI() {
    const chaves = Object.keys(sessoes);
    if (chaves.length <= 1) { alert("Você precisa ter pelo menos uma obra cadastrada."); return; }
    if (confirm(`Tem certeza que deseja excluir a obra "${sessaoAtual}"?`)) {
        delete sessoes[sessaoAtual];
        sessaoAtual = Object.keys(sessoes)[0];
        pontos = sessoes[sessaoAtual];
        linhasCroqui = [];
        salvarSessoesStorage();
        atualizarSelectSessoes();
        renderizarTabela();
        atualizarDatalists();
        redefinirVistaCanvas();
    }
}

/* ==========================================================================
IMPORTAÇÃO E EXPORTAÇÃO (INTACTO - NÃO MEXIDO)
========================================================================== */
function configurarImportacaoArquivo() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;
    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            const text = evt.target.result;
            if (!text || text.trim() === '') { alert('Arquivo vazio.'); return; }
            if (text.includes('x+') || text.includes('y+') || text.includes('_111111111100') || text.startsWith('+')) {
                processarTopconGTS(text);
                return;
            }
            rawLines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (rawLines.length === 0) { alert('Nenhuma linha válida encontrada no arquivo.'); return; }
            const previewDiv = document.getElementById('previewData');
            const previewText = document.getElementById('previewText');
            if (previewText) previewText.textContent = `${rawLines.length} linhas lidas`;
            if (previewDiv) previewDiv.textContent = rawLines.slice(0, 5).join('\n');
            preencherOpcoesMapeamento(rawLines[0]);
            document.getElementById('mappingSection')?.classList.remove('hidden');
        };
        reader.readAsText(file);
    });
}
function preencherOpcoesMapeamento(primeiraLinha) {
    const separador = primeiraLinha.includes(',') ? ',' : (primeiraLinha.includes(';') ? ';' : ' ');
    const colunas = primeiraLinha.split(separador).map((c, i) => `Coluna ${i + 1}: ${c.trim()}`);
    const selects = ['mapId', 'mapE', 'mapN', 'mapZ', 'mapDesc'];
    selects.forEach(sId => {
        const select = document.getElementById(sId);
        if (!select) return;
        select.innerHTML = `<option value="-1">Selecione...</option>` +
            colunas.map((col, idx) => `<option value="${idx}">${col}</option>`).join('');
    });
    if (colunas.length >= 3) {
        if (document.getElementById('mapId')) document.getElementById('mapId').value = "0";
        if (document.getElementById('mapE')) document.getElementById('mapE').value = "1";
        if (document.getElementById('mapN')) document.getElementById('mapN').value = "2";
        if (colunas.length >= 4 && document.getElementById('mapZ')) document.getElementById('mapZ').value = "3";
        if (colunas.length >= 5 && document.getElementById('mapDesc')) document.getElementById('mapDesc').value = "4";
    }
}
function processarArquivoCSV() {
    const idxId = parseInt(document.getElementById('mapId').value);
    const idxE = parseInt(document.getElementById('mapE').value);
    const idxN = parseInt(document.getElementById('mapN').value);
    const idxZ = parseInt(document.getElementById('mapZ').value);
    const idxDesc = parseInt(document.getElementById('mapDesc').value);
    if (idxE === -1 || idxN === -1) { alert('Selecione pelo menos as colunas para Este (X) e Norte (Y).'); return; }
    let carregados = 0;
    rawLines.forEach((line) => {
        const sep = line.includes(',') ? ',' : (line.includes(';') ? ';' : /\s+/);
        const cols = line.split(sep).map(c => c.trim());
        const id = idxId !== -1 && cols[idxId] ? cols[idxId] : `P${pontos.length + 1}`;
        const esteVal = parseFloat(cols[idxE] ? cols[idxE].replace(',', '.') : NaN);
        const norteVal = parseFloat(cols[idxN] ? cols[idxN].replace(',', '.') : NaN);
        const cotaVal = idxZ !== -1 && cols[idxZ] ? parseFloat(cols[idxZ].replace(',', '.')) : 0;
        const desc = idxDesc !== -1 && cols[idxDesc] ? cols[idxDesc] : '';
        if (!isNaN(esteVal) && !isNaN(norteVal)) {
            pontos.push({ id, e: esteVal, este: esteVal, n: norteVal, norte: norteVal, z: isNaN(cotaVal) ? 0 : cotaVal, cota: isNaN(cotaVal) ? 0 : cotaVal, desc });
            carregados++;
        }
    });
    document.getElementById('mappingSection')?.classList.add('hidden');
    salvarESincronizar();
    alert(`${carregados} pontos carregados com sucesso!`);
}
function processarTopconGTS(conteudoTexto) {
    let carregados = 0;
    const regexPonto = /(?:_?([^\_\|\n\r\t]+)[\_\|]+)?x\+?(-?\d+[\.,]?\d*)[\_\|]*\s*y\+?(-?\d+[\.,]?\d*)[\_\|]*\s*z\+?(-?\d+[\.,]?\d*)/gi;
    let match;
    let indexAuto = 1;
    while ((match = regexPonto.exec(conteudoTexto)) !== null) {
        let rawId = match[1]; let rawX = match[2]; let rawY = match[3]; let rawZ = match[4];
        let id = (rawId && rawId.trim() !== '_' && rawId.trim() !== '|') ? rawId.trim() : `P${indexAuto}`;
        const parseCoordTopcon = (valStr) => {
            if (!valStr) return 0.0;
            let valLimpo = valStr.replace(',', '.');
            if (valLimpo.includes('.')) return parseFloat(valLimpo);
            let num = parseFloat(valLimpo);
            let digitos = valLimpo.replace(/\D/g, '');
            if (digitos.length >= 8 && Math.abs(num) > 100000) return num / 1000.0;
            else if (digitos.length >= 6 && Math.abs(num) > 10000) return num / 100.0;
            return num;
        };
        let esteVal = parseCoordTopcon(rawX);
        let norteVal = parseCoordTopcon(rawY);
        let cotaVal = parseCoordTopcon(rawZ);
        if (!isNaN(esteVal) && !isNaN(norteVal)) {
            pontos.push({ id: id, e: esteVal, este: esteVal, n: norteVal, norte: norteVal, z: isNaN(cotaVal) ? 0 : cotaVal, cota: isNaN(cotaVal) ? 0 : cotaVal, desc: 'Topcon GTS' });
            carregados++; indexAuto++;
        }
    }
    if (carregados === 0) {
        const linhas = conteudoTexto.split(/\r?\n/).filter(line => line.trim() !== '');
        linhas.forEach((line) => {
            if (!line.includes('x+')) return;
            const posX = line.indexOf('x+'); const posY = line.indexOf('y+'); const posZ = line.indexOf('z+');
            if (posX !== -1 && posY !== -1) {
                let id = line.substring(0, posX).replace(/[_+|]/g, '').trim() || `P${pontos.length + 1}`;
                const esteVal = parseInt(line.substring(posX + 2, posX + 11), 10) / 1000;
                const norteVal = parseInt(line.substring(posY + 2, posY + 11), 10) / 1000;
                const cotaVal = posZ !== -1 ? parseInt(line.substring(posZ + 2, posZ + 11), 10) / 1000 : 0;
                if (!isNaN(esteVal) && !isNaN(norteVal)) {
                    pontos.push({ id, e: esteVal, este: esteVal, n: norteVal, norte: norteVal, z: cotaVal, cota: cotaVal, desc: 'GTS' });
                    carregados++;
                }
            }
        });
    }
    salvarESincronizar();
    alert(`✅ ${carregados} pontos carregados do arquivo Topcon GTS!`);
}
function salvarESincronizar() {
    salvarSessoesStorage();
    renderizarTabela();
    atualizarDatalists();
    desenharCroqui();
}
function exportarCaderneta() {
    if (pontos.length === 0) { alert('A caderneta está vazia.'); return; }
    const nomeEl = document.getElementById('nomeServico');
    const dataEl = document.getElementById('dataServico');
    const nomeServico = nomeEl ? nomeEl.value.trim() : 'Servico';
    const dataServico = dataEl && dataEl.value ? dataEl.value : new Date().toISOString().split('T')[0];
    let csv = 'ID,Este(X),Norte(Y),Cota(Z),Descricao\n';
    pontos.forEach(p => {
        let x = p.e !== undefined ? p.e : p.este;
        let y = p.n !== undefined ? p.n : p.norte;
        let z = p.z !== undefined ? p.z : p.cota;
        csv += `${p.id},${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)},"${p.desc || ''}"\n`;
    });
    downloadArquivo(csv, `${nomeServico.toLowerCase().replace(/\s+/g, '_')}_${dataServico}.csv`, 'text/csv');
}
function exportarXYZ_GTS() {
    if (pontos.length === 0) { alert('A caderneta está vazia.'); return; }
    const nomeEl = document.getElementById('nomeServico');
    const dataEl = document.getElementById('dataServico');
    const nomeServico = nomeEl ? nomeEl.value.trim() : 'Servico';
    const dataServico = dataEl && dataEl.value ? dataEl.value : new Date().toISOString().split('T')[0];
    let content = '';
    pontos.forEach(p => {
        let xVal = p.e !== undefined ? p.e : p.este;
        let yVal = p.n !== undefined ? p.n : p.norte;
        let zVal = p.z !== undefined ? p.z : p.cota;
        const x = Math.max(0, Math.round((xVal || 0) * 1000)).toString().padStart(9, '0');
        const y = Math.max(0, Math.round((yVal || 0) * 1000)).toString().padStart(9, '0');
        const z = Math.max(0, Math.round((zVal || 0) * 1000)).toString().padStart(9, '0');
        const idPadded = p.id.slice(0, 10).padEnd(10, ' ');
        content += `+${idPadded} _111111111100  x+${x}  y+${y}  z+${z}\r\n`;
    });
    downloadArquivo(content, `${nomeServico.toLowerCase().replace(/\s+/g, '_')}_${dataServico}.xyz`, 'text/plain');
}
function downloadArquivo(conteudo, nomeArquivo, tipoMime) {
    const blob = new Blob([conteudo], { type: `${tipoMime};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ==========================================================================
TABELA E CADERNETA
========================================================================== */
function renderizarTabela(filtro = '') {
    const tbody = document.getElementById('tableBody');
    const countBadge = document.getElementById('pontosCount');
    if (!tbody) return;
    tbody.innerHTML = '';
    const ptsFiltrados = pontos.filter(p =>
        p.id.toLowerCase().includes(filtro.toLowerCase()) ||
        (p.desc && p.desc.toLowerCase().includes(filtro.toLowerCase()))
    );
    if (countBadge) countBadge.textContent = `${pontos.length} pts`;
    if (ptsFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr id="emptyRow">
                <td colspan="5" class="empty-state">
                    <div>Nenhum ponto registrado.</div>
                    <small>Clique em "+ Add Manual" para iniciar a caderneta ou importe um arquivo abaixo.</small>
                </td>
            </tr>`;
        desenharCroqui();
        return;
    }
    ptsFiltrados.forEach((p, idx) => {
        let xVal = p.e !== undefined ? p.e : p.este;
        let yVal = p.n !== undefined ? p.n : p.norte;
        let zVal = p.z !== undefined ? p.z : p.cota;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.id}</strong></td>
            <td contenteditable="true" onblur="editarPontoDirect(${idx}, 'e', this.textContent)">${Number(xVal).toFixed(3)}</td>
            <td contenteditable="true" onblur="editarPontoDirect(${idx}, 'n', this.textContent)">${Number(yVal).toFixed(3)}</td>
            <td contenteditable="true" onblur="editarPontoDirect(${idx}, 'z', this.textContent)">${Number(zVal).toFixed(3)}</td>
            <td contenteditable="true" onblur="editarPontoDirect(${idx}, 'desc', this.textContent)">${p.desc || ''}</td>
        `;
        tbody.appendChild(tr);
    });
    desenharCroqui();
}
function renderTable() { renderizarTabela(); }
function editarPontoDirect(index, campo, valor) {
    if (campo === 'desc') { pontos[index].desc = valor.trim(); }
    else {
        const num = parseFloat(valor.replace(',', '.'));
        if (!isNaN(num)) {
            pontos[index][campo] = num;
            if (campo === 'e') pontos[index].este = num;
            if (campo === 'n') pontos[index].norte = num;
            if (campo === 'z') pontos[index].cota = num;
        }
    }
    salvarSessoesStorage();
    atualizarDatalists();
    desenharCroqui();
}
function filtrarTabela() {
    const input = document.getElementById('searchInput');
    const val = input ? input.value : '';
    renderizarTabela(val);
}
function abrirModalAdd() { const modal = document.getElementById('modalAdd'); if (modal) modal.classList.remove('hidden'); }
function fecharModalAdd() { const modal = document.getElementById('modalAdd'); if (modal) modal.classList.add('hidden'); }
function salvarNovoPonto() {
    const id = document.getElementById('newId').value.trim();
    const e = parseFloat(document.getElementById('newE').value);
    const n = parseFloat(document.getElementById('newN').value);
    const z = parseFloat(document.getElementById('newZ').value) || 0;
    const desc = document.getElementById('newDesc').value.trim();
    if (!id || isNaN(e) || isNaN(n)) { alert("Preencha o Nome/ID, Este (X) e Norte (Y) corretamente!"); return; }
    pontos.push({ id, e, este: e, n, norte: n, z, cota: z, desc });
    salvarSessoesStorage();
    renderizarTabela();
    atualizarDatalists();
    fecharModalAdd();
    document.getElementById('newId').value = '';
    document.getElementById('newE').value = '';
    document.getElementById('newN').value = '';
    document.getElementById('newZ').value = '';
    document.getElementById('newDesc').value = '';
}
function atualizarDatalists() {
    const datalist = document.getElementById('listaPontos');
    if (!datalist) return;
    datalist.innerHTML = '';
    pontos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.id} - ${p.desc || ''}`;
        datalist.appendChild(opt);
    });
}

/* ==========================================================================
MOTOR DO CROQUI CANVAS (CORRIGIDO PARA MOBILE)
========================================================================== */
function inicializarCanvas() {
    canvas = document.getElementById('croquiCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ajustarTamanhoCanvas();

    // MOUSE (DESKTOP)
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    canvas.addEventListener('click', onCanvasClick);

    // TOQUE (MOBILE) - CORIGIDO
    canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
    canvas.addEventListener('touchend', onCanvasTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onCanvasTouchEnd, { passive: false });

    redefinirVistaCanvas();
}
function ajustarTamanhoCanvas() {
    if (!canvas || !canvas.parentElement) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
function setModoCroqui(modo) {
    modoCroqui = modo;
    pontoSelecionadoInicio = null;
    const btnPan = document.getElementById('btnModoPan');
    const btnLinha = document.getElementById('btnModoLinha');
    const btnMedir = document.getElementById('btnModoMedir');
    if (btnPan) btnPan.className = modo === 'pan' ? 'btn btn-primary' : 'btn btn-outline';
    if (btnLinha) btnLinha.className = modo === 'linha' ? 'btn btn-primary' : 'btn btn-outline';
    if (btnMedir) btnMedir.className = modo === 'medir' ? 'btn btn-primary' : 'btn btn-outline';
    const badge = document.getElementById('modoBadge');
    if (badge) {
        badge.textContent = `Modo: ${modo === 'pan' ? 'Navegar' : modo === 'linha' ? 'Desenhar Linha' : 'Medir Distância'}`;
    }
    desenharCroqui();
}
function worldToScreen(eVal, nVal) {
    if (pontos.length === 0) return { x: canvas.width / 2, y: canvas.height / 2 };
    let eMin = Math.min(...pontos.map(p => p.e !== undefined ? p.e : p.este));
    let eMax = Math.max(...pontos.map(p => p.e !== undefined ? p.e : p.este));
    let nMin = Math.min(...pontos.map(p => p.n !== undefined ? p.n : p.norte));
    let nMax = Math.max(...pontos.map(p => p.n !== undefined ? p.n : p.norte));
    let dE = (eMax - eMin) || 20;
    let dN = (nMax - nMin) || 20;
    let centerE = (eMin + eMax) / 2;
    let centerN = (nMin + nMax) / 2;
    let margin = 50;
    let baseScale = Math.min(
        (canvas.width - margin * 2) / dE,
        (canvas.height - margin * 2) / dN
    );
    let finalScale = baseScale * zoomScale;
    let x = (canvas.width / 2) + (eVal - centerE) * finalScale + panOffsetX;
    let y = (canvas.height / 2) - (nVal - centerN) * finalScale + panOffsetY;
    return { x, y };
}
function obterPontoProximoMouse(screenX, screenY, raioMax = 22) {
    let proximo = null;
    let menorDistSq = raioMax * raioMax;
    pontos.forEach(p => {
        let xVal = p.e !== undefined ? p.e : p.este;
        let yVal = p.n !== undefined ? p.n : p.norte;
        let pos = worldToScreen(xVal, yVal);
        let distSq = (pos.x - screenX) ** 2 + (pos.y - screenY) ** 2;
        if (distSq < menorDistSq) {
            menorDistSq = distSq;
            proximo = p;
        }
    });
    return proximo;
}

// --- FUNÇÃO UNIFICADA DE SELEÇÃO (usada por mouse E touch) ---
function processarSelecaoPonto(ponto) {
    if (modoCroqui === 'linha') {
        if (!pontoSelecionadoInicio) {
            pontoSelecionadoInicio = ponto;
        } else {
            if (pontoSelecionadoInicio.id !== ponto.id) {
                linhasCroqui.push({ p1: pontoSelecionadoInicio.id, p2: ponto.id });
                pontoSelecionadoInicio = ponto; // permite continuar a cadeia
            }
        }
        desenharCroqui();
    } else if (modoCroqui === 'medir') {
        if (!pontoSelecionadoInicio) {
            pontoSelecionadoInicio = ponto;
            medicaoAtual = null;
        } else {
            calcularEMedirPontos(pontoSelecionadoInicio, ponto);
            pontoSelecionadoInicio = null;
        }
        desenharCroqui();
    }
}

function desenharCroqui() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    let gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    if (pontos.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum ponto carregado para exibir no croqui.', canvas.width / 2, canvas.height / 2);
        return;
    }
    linhasCroqui.forEach(line => {
        let p1 = pontos.find(p => p.id === line.p1);
        let p2 = pontos.find(p => p.id === line.p2);
        if (p1 && p2) {
            let x1 = p1.e !== undefined ? p1.e : p1.este;
            let y1 = p1.n !== undefined ? p1.n : p1.norte;
            let x2 = p2.e !== undefined ? p2.e : p2.este;
            let y2 = p2.n !== undefined ? p2.n : p2.norte;
            let pos1 = worldToScreen(x1, y1);
            let pos2 = worldToScreen(x2, y2);
            ctx.beginPath();
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
    // Linha temporária seguindo o dedo/mouse
    if (pontoSelecionadoInicio && mousePosCanvas && (modoCroqui === 'linha' || modoCroqui === 'medir')) {
        let xStart = pontoSelecionadoInicio.e !== undefined ? pontoSelecionadoInicio.e : pontoSelecionadoInicio.este;
        let yStart = pontoSelecionadoInicio.n !== undefined ? pontoSelecionadoInicio.n : pontoSelecionadoInicio.norte;
        let pos1 = worldToScreen(xStart, yStart);
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(mousePosCanvas.x, mousePosCanvas.y);
        ctx.strokeStyle = modoCroqui === 'medir' ? '#f59e0b' : '#10b981';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    if (medicaoAtual) {
        let p1 = medicaoAtual.p1; let p2 = medicaoAtual.p2;
        let x1 = p1.e !== undefined ? p1.e : p1.este;
        let y1 = p1.n !== undefined ? p1.n : p1.norte;
        let x2 = p2.e !== undefined ? p2.e : p2.este;
        let y2 = p2.n !== undefined ? p2.n : p2.norte;
        let pos1 = worldToScreen(x1, y1);
        let pos2 = worldToScreen(x2, y2);
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        let midX = (pos1.x + pos2.x) / 2;
        let midY = (pos1.y + pos2.y) / 2;
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${medicaoAtual.dh.toFixed(3)} m`, midX, midY - 8);
    }
    pontos.forEach(p => {
        let xVal = p.e !== undefined ? p.e : p.este;
        let yVal = p.n !== undefined ? p.n : p.norte;
        let pos = worldToScreen(xVal, yVal);
        let isSelected = pontoSelecionadoInicio && pontoSelecionadoInicio.id === p.id;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isSelected ? 9 : 5, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#f59e0b' : '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.id, pos.x + 10, pos.y + 4);
    });
}

// --- MOUSE (DESKTOP) ---
function onCanvasMouseDown(e) {
    if ((e.ctrlKey && e.button === 0) || modoCroqui === 'pan' || e.button === 1) {
        isDragging = true;
        startDragX = e.clientX - panOffsetX;
        startDragY = e.clientY - panOffsetY;
        canvas.style.cursor = 'grabbing';
    }
}
function onCanvasMouseMove(e) {
    let rect = canvas.getBoundingClientRect();
    mousePosCanvas = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (isDragging) {
        panOffsetX = e.clientX - startDragX;
        panOffsetY = e.clientY - startDragY;
        desenharCroqui();
    } else if (pontoSelecionadoInicio) {
        desenharCroqui();
    }
}
function onCanvasMouseUp(e) {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'default';
    }
}
function onCanvasWheel(e) {
    e.preventDefault();
    let zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    zoomScale *= zoomFactor;
    desenharCroqui();
}
function onCanvasClick(e) {
    let rect = canvas.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;
    let pontoClicado = obterPontoProximoMouse(clickX, clickY);
    if (pontoClicado) {
        processarSelecaoPonto(pontoClicado);
    }
}

// --- TOQUE (MOBILE) - REESCRITO ---
function onCanvasTouchStart(e) {
    if (e.touches.length === 1) {
        let touch = e.touches[0];
        let rect = canvas.getBoundingClientRect();
        let x = touch.clientX - rect.left;
        let y = touch.clientY - rect.top;

        touchStartX = x;
        touchStartY = y;
        touchStartTime = Date.now();
        touchMoved = false;

        mousePosCanvas = { x, y };

        // Verifica se tocou em um ponto
        let pontoTocado = obterPontoProximoMouse(x, y);
        touchOnPoint = !!pontoTocado;

        // Só inicia pan se NÃO tocou em um ponto
        if (!touchOnPoint) {
            isDragging = true;
            startDragX = touch.clientX - panOffsetX;
            startDragY = touch.clientY - panOffsetY;
        } else {
            isDragging = false;
        }

        e.preventDefault();
    } else {
        // 2 ou mais dedos: cancela qualquer seleção e faz pan
        isDragging = false;
        touchOnPoint = false;
    }
}
function onCanvasTouchMove(e) {
    if (e.touches.length === 1) {
        let touch = e.touches[0];
        let rect = canvas.getBoundingClientRect();
        let x = touch.clientX - rect.left;
        let y = touch.clientY - rect.top;

        mousePosCanvas = { x, y };

        let dx = x - touchStartX;
        let dy = y - touchStartY;

        // Se moveu mais de 8px, considera como arrasto
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            touchMoved = true;
            // Se começou tocando em ponto mas arrastou, vira pan
            if (touchOnPoint && !isDragging) {
                isDragging = true;
                startDragX = touch.clientX - panOffsetX;
                startDragY = touch.clientY - panOffsetY;
                touchOnPoint = false;
            }
        }

        if (isDragging) {
            panOffsetX = touch.clientX - startDragX;
            panOffsetY = touch.clientY - startDragY;
            desenharCroqui();
        } else if (pontoSelecionadoInicio) {
            // Atualiza a linha temporária seguindo o dedo
            desenharCroqui();
        }

        e.preventDefault();
    }
}
function onCanvasTouchEnd(e) {
    // Se foi um toque rápido SEM movimento = tratar como "clique"
    if (!touchMoved && touchStartTime) {
        let pontoTocado = obterPontoProximoMouse(touchStartX, touchStartY);
        if (pontoTocado) {
            processarSelecaoPonto(pontoTocado);
        }
    }

    isDragging = false;
    touchOnPoint = false;
    touchStartTime = 0;
    touchMoved = false;
}

function redefinirVistaCanvas() {
    zoomScale = 1;
    panOffsetX = 0;
    panOffsetY = 0;
    pontoSelecionadoInicio = null;
    medicaoAtual = null;
    const resBox = document.getElementById('resMedicaoCanvas');
    if (resBox) resBox.classList.add('hidden');
    desenharCroqui();
}
function desfazerLinha() {
    if (linhasCroqui.length > 0) {
        linhasCroqui.pop();
        desenharCroqui();
    }
}
function limparLinhas() {
    linhasCroqui = [];
    pontoSelecionadoInicio = null;
    medicaoAtual = null;
    const resBox = document.getElementById('resMedicaoCanvas');
    if (resBox) resBox.classList.add('hidden');
    desenharCroqui();
}

/* ==========================================================================
CALCULADORAS TOPOGRÁFICAS
========================================================================== */
function grauParaGMS(grausDec) {
    let d = Math.floor(grausDec);
    let minTot = (grausDec - d) * 60;
    let m = Math.floor(minTot);
    let s = ((minTot - m) * 60).toFixed(1);
    return `${d}° ${m}' ${s}"`;
}
function calcularEMedirPontos(p1, p2) {
    let x1 = p1.e !== undefined ? p1.e : p1.este;
    let y1 = p1.n !== undefined ? p1.n : p1.norte;
    let z1 = p1.z !== undefined ? p1.z : p1.cota;
    let x2 = p2.e !== undefined ? p2.e : p2.este;
    let y2 = p2.n !== undefined ? p2.n : p2.norte;
    let z2 = p2.z !== undefined ? p2.z : p2.cota;
    let dE = x2 - x1; let dN = y2 - y1; let dZ = z2 - z1;
    let dh = Math.sqrt(dE * dE + dN * dN);
    let di = Math.sqrt(dE * dE + dN * dN + dZ * dZ);
    let rad = Math.atan2(dE, dN);
    let deg = rad * (180 / Math.PI);
    if (deg < 0) deg += 360;
    let azimuteGMS = grauParaGMS(deg);
    medicaoAtual = { p1, p2, dh, di, dZ, azimuteGMS };
    const resBox = document.getElementById('resMedicaoCanvas');
    if (resBox) {
        resBox.classList.remove('hidden');
        resBox.innerHTML = `
            <strong>📏 Medição: ${p1.id} ➔ ${p2.id}</strong><br>
            • Distância Horizontal (DH): <strong>${dh.toFixed(3)} m</strong><br>
            • Distância Inclinada (DI): <strong>${di.toFixed(3)} m</strong><br>
            • Desnível (ΔZ): <strong>${dZ.toFixed(3)} m</strong><br>
            • Azimute: <strong>${azimuteGMS}</strong>
        `;
    }
}
function calcularLocacaoUI() {
    const est = document.getElementById('locEstacao')?.value;
    const re = document.getElementById('locRe')?.value;
    const alvo = document.getElementById('locAlvo')?.value;
    const ptE = pontos.find(p => p.id === est);
    const ptR = pontos.find(p => p.id === re);
    const ptA = pontos.find(p => p.id === alvo);
    const res = document.getElementById('resLocacao');
    if (!ptE || !ptR || !ptA) return alert("Selecione os pontos de Estação, Ré e Alvo corretamente.");
    let xe = ptE.e !== undefined ? ptE.e : ptE.este;
    let ye = ptE.n !== undefined ? ptE.n : ptE.norte;
    let xr = ptR.e !== undefined ? ptR.e : ptR.este;
    let yr = ptR.n !== undefined ? ptR.n : ptR.norte;
    let xa = ptA.e !== undefined ? ptA.e : ptA.este;
    let ya = ptA.n !== undefined ? ptA.n : ptA.norte;
    let azER = Math.atan2(xr - xe, yr - ye) * (180 / Math.PI);
    if (azER < 0) azER += 360;
    let azEA = Math.atan2(xa - xe, ya - ye) * (180 / Math.PI);
    if (azEA < 0) azEA += 360;
    let anguloHz = azEA - azER;
    if (anguloHz < 0) anguloHz += 360;
    let dE = xa - xe; let dN = ya - ye;
    let dist = Math.sqrt(dE * dE + dN * dN);
    if (res) {
        res.classList.remove('hidden');
        res.innerHTML = `
            <strong>🎯 Dados para Locação de ${ptA.id}:</strong><br>
            • Ângulo a Girar (Hz): <strong>${grauParaGMS(anguloHz)}</strong><br>
            • Distância a Medir (DH): <strong>${dist.toFixed(3)} m</strong><br>
            • Azimute da Linha: <strong>${grauParaGMS(azEA)}</strong>
        `;
    }
}
function calc2Pontos() {
    let id1 = document.getElementById('p1')?.value;
    let id2 = document.getElementById('p2')?.value;
    let pt1 = pontos.find(p => p.id === id1);
    let pt2 = pontos.find(p => p.id === id2);
    let res = document.getElementById('res2');
    if (pt1 && pt2) {
        calcularEMedirPontos(pt1, pt2);
        if (res) res.classList.remove('hidden');
    } else {
        alert("Selecione dois pontos válidos.");
    }
}
