/* ==========================================================================
    MOTOR DO CROQUI CANVAS & SESSÕES - ARGES TOPO (VERSÃO UNIFICADA E CORRIGIDA)
========================================================================== */

// --- INICIALIZAÇÃO SEGURA DAS VARIÁVEIS GLOBAIS ---
if (typeof window.pontos === 'undefined') window.pontos = [];
if (typeof window.linhasCroqui === 'undefined') window.linhasCroqui = [];
if (typeof window.medicaoAtual === 'undefined') window.medicaoAtual = null;
if (typeof window.pontoSelecionadoInicio === 'undefined') window.pontoSelecionadoInicio = null;
if (typeof window.modoCroqui === 'undefined') window.modoCroqui = 'pan';

// Variáveis do Canvas
let canvas = null;
let ctx = null;
let zoomScale = 1;
let panOffsetX = 0;
let panOffsetY = 0;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let mousePosCanvas = { x: 0, y: 0 };

// Toque Mobile
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchMoved = false;
let touchOnPoint = false;
let initialPinchDistance = 0;
let initialZoomScale = 1;

// Medição de Área
let modoArea = false;
let pontosAreaTemp = [];

// Filtro e Exibição
let filtroCamadasAtivo = '';
let opcaoExibicaoAtual = 'id';

console.log('✓ Core.js carregado - Variáveis globais inicializadas');

// --- GESTÃO DE SESSÕES (SESSIONS.JS) ---
if (!window.sessoes || typeof window.sessoes !== 'object') {
    try {
        const raw = localStorage.getItem('arges_sessoes');
        window.sessoes = raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn("⚠️ Cache corrompido, resetando sessões.");
        window.sessoes = null;
        localStorage.removeItem('arges_sessoes');
        localStorage.removeItem('arges_sessao_atual');
    }
    
    if (!window.sessoes || typeof window.sessoes !== 'object' || Object.keys(window.sessoes).length === 0) {
        window.sessoes = { "Obra Principal": [] };
    }
}

if (!window.sessaoAtual || !window.sessoes[window.sessaoAtual]) {
    window.sessaoAtual = Object.keys(window.sessoes)[0] || "Obra Principal";
}

window.pontos = window.sessoes[window.sessaoAtual] || [];
window.linhasCroqui = window.linhasCroqui || [];

console.log("✅ Sessões carregadas com sucesso:", window.sessoes);
console.log("✅ Sessão atual:", window.sessaoAtual);
console.log("✅ Total de pontos:", window.pontos.length);

function salvarSessoesStorage() {
    try {
        window.sessoes[window.sessaoAtual] = window.pontos;
        localStorage.setItem('arges_sessoes', JSON.stringify(window.sessoes));
        localStorage.setItem('arges_sessao_atual', window.sessaoAtual);
    } catch (error) {
        console.error('Erro ao salvar:', error);
    }
}

function atualizarSelectSessoes() {
    const select = document.getElementById('selectSessao');
    if (!select) return;
    
    if (!window.sessoes || typeof window.sessoes !== 'object') {
        window.sessoes = { "Obra Principal": [] };
    }
    
    select.innerHTML = '';
    Object.keys(window.sessoes).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        if (nome === window.sessaoAtual) opt.selected = true;
        select.appendChild(opt);
    });
}

function trocarSessaoUI() {
    const select = document.getElementById('selectSessao');
    if (!select) return;
    window.sessaoAtual = select.value;
    window.pontos = window.sessoes[window.sessaoAtual] || [];
    window.linhasCroqui = [];
    salvarSessoesStorage();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    if (typeof redefinirVistaCanvas === 'function') redefinirVistaCanvas();
}

function criarNovaSessaoUI() {
    const nome = prompt("Nome da nova Obra / Sessão:");
    if (!nome || nome.trim() === '') return;
    const nomeLimpo = nome.trim();
    
    if (window.sessoes[nomeLimpo]) {
        alert("Já existe uma obra com este nome.");
        return;
    }
    
    window.sessoes[nomeLimpo] = [];
    window.sessaoAtual = nomeLimpo;
    window.pontos = [];
    window.linhasCroqui = [];
    
    salvarSessoesStorage();
    atualizarSelectSessoes();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    if (typeof redefinirVistaCanvas === 'function') redefinirVistaCanvas();
}

function excluirSessaoAtualUI() {
    const chaves = Object.keys(window.sessoes);
    if (chaves.length <= 1) {
        alert("Você precisa ter pelo menos uma obra cadastrada.");
        return;
    }
    if (confirm(`Tem certeza que deseja excluir a obra "${window.sessaoAtual}"?`)) {
        delete window.sessoes[window.sessaoAtual];
        window.sessaoAtual = Object.keys(window.sessoes)[0];
        window.pontos = window.sessoes[window.sessaoAtual];
        window.linhasCroqui = [];
        salvarSessoesStorage();
        atualizarSelectSessoes();
        if (typeof renderizarTabela === 'function') renderizarTabela();
        if (typeof atualizarDatalists === 'function') atualizarDatalists();
        if (typeof redefinirVistaCanvas === 'function') redefinirVistaCanvas();
    }
}

// --- INICIALIZAÇÃO DO CANVAS ---
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('croquiCanvas');
    if (!canvas) {
        console.error('Canvas não encontrado!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    ajustarTamanhoCanvas();
    atualizarSelectSessoes();
    
    window.addEventListener('resize', () => {
        ajustarTamanhoCanvas();
        desenharCroqui();
    });

    // Eventos Mouse
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    canvas.addEventListener('click', onCanvasClick);

    // Eventos Touch (Mobile Otimizados com { passive: false })
    canvas.addEventListener('touchstart', onCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
    canvas.addEventListener('touchend', onCanvasTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onCanvasTouchEnd, { passive: false });

    console.log('✓ Canvas inicializado com sucesso e suporte Touch ativo');
    desenharCroqui();
});

function ajustarTamanhoCanvas() {
    if (!canvas || !canvas.parentElement) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

// --- MODOS E FERRAMENTAS ---
function setModoCroqui(modo) {
    window.modoCroqui = modo;
    window.pontoSelecionadoInicio = null;
    
    document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
    
    const btnMap = { 
        'pan': 'btnModoPan', 
        'linha': 'btnModoLinha', 
        'medir': 'btnModoMedir', 
        'area': 'btnModoArea' 
    };
    
    if (btnMap[modo]) {
        const btn = document.getElementById(btnMap[modo]);
        if (btn) btn.classList.add('active');
    }
    
    const badge = document.getElementById('modoBadge');
    if (badge) {
        const textos = {
            'pan': 'Modo: Navegar',
            'linha': 'Modo: Desenhar Linha',
            'medir': 'Modo: Medir Distância',
            'area': 'Modo: Medir Área'
        };
        badge.textContent = textos[modo] || 'Modo: Navegar';
    }
    
    desenharCroqui();
}

// --- MATEMÁTICA DO CANVAS ---
function worldToScreen(eVal, nVal) {
    if (!window.pontos || window.pontos.length === 0) {
        return { x: canvas.width / 2, y: canvas.height / 2 };
    }
    
    let eMin = Math.min(...window.pontos.map(p => p.e !== undefined ? p.e : p.este));
    let eMax = Math.max(...window.pontos.map(p => p.e !== undefined ? p.e : p.este));
    let nMin = Math.min(...window.pontos.map(p => p.n !== undefined ? p.n : p.norte));
    let nMax = Math.max(...window.pontos.map(p => p.n !== undefined ? p.n : p.norte));
    
    let dE = (eMax - eMin) || 20;
    let dN = (nMax - nMin) || 20;
    let centerE = (eMin + eMax) / 2;
    let centerN = (nMin + nMax) / 2;
    
    let margin = 60;
    let baseScale = Math.min(
        (canvas.width - margin * 2) / dE,
        (canvas.height - margin * 2) / dN
    );
    let finalScale = baseScale * zoomScale;
    
    return {
        x: (canvas.width / 2) + (eVal - centerE) * finalScale + panOffsetX,
        y: (canvas.height / 2) - (nVal - centerN) * finalScale + panOffsetY
    };
}

function obterPontoProximoMouse(screenX, screenY, raioMax = 35) { // Raio estendido para facilitar toque em mobile
    let proximo = null;
    let menorDistSq = raioMax * raioMax;
    
    window.pontos.forEach(p => {
        if (!pontoVisivel(p)) return;
        
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

// --- FUNÇÃO AUXILIAR PARA DESENHAR SETA NA PONTA DA LINHA ---
function desenharSeta(x1, y1, x2, y2, cor = '#3b82f6') {
    const headLength = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    
    // Desenha as pontas da seta
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    
    ctx.strokeStyle = cor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.closePath();
}

// --- DESENHO ---
function desenharCroqui() {
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid de fundo
    ctx.strokeStyle = document.body.classList.contains('dark') ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 1;
    let gridSize = 50;
    
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    if (window.pontos.length === 0) {
        ctx.fillStyle = document.body.classList.contains('dark') ? '#94a3b8' : '#64748b';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum ponto carregado.', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Desenhar Linhas do Croqui com setas indicativas de direção
    if (window.linhasCroqui) {
        window.linhasCroqui.forEach(line => {
            let p1 = window.pontos.find(p => p.id === line.p1);
            let p2 = window.pontos.find(p => p.id === line.p2);
            if (p1 && p2) {
                let pos1 = worldToScreen(p1.e !== undefined ? p1.e : p1.este, p1.n !== undefined ? p1.n : p1.norte);
                let pos2 = worldToScreen(p2.e !== undefined ? p2.e : p2.este, p2.n !== undefined ? p2.n : p2.norte);
                desenharSeta(pos1.x, pos1.y, pos2.x, pos2.y, '#3b82f6');
            }
        });
    }

    // Linha de medição/desenho em tempo real (seguindo o mouse ou dedo)
    if (window.pontoSelecionadoInicio && mousePosCanvas && (window.modoCroqui === 'linha' || window.modoCroqui === 'medir')) {
        let pos1 = worldToScreen(
            window.pontoSelecionadoInicio.e !== undefined ? window.pontoSelecionadoInicio.e : window.pontoSelecionadoInicio.este,
            window.pontoSelecionadoInicio.n !== undefined ? window.pontoSelecionadoInicio.n : window.pontoSelecionadoInicio.norte
        );
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(mousePosCanvas.x, mousePosCanvas.y);
        ctx.strokeStyle = window.modoCroqui === 'medir' ? '#f59e0b' : '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Resultado de medição de distância
    if (window.medicaoAtual) {
        let pos1 = worldToScreen(
            window.medicaoAtual.p1.e !== undefined ? window.medicaoAtual.p1.e : window.medicaoAtual.p1.este,
            window.medicaoAtual.p1.n !== undefined ? window.medicaoAtual.p1.n : window.medicaoAtual.p1.norte
        );
        let pos2 = worldToScreen(
            window.medicaoAtual.p2.e !== undefined ? window.medicaoAtual.p2.e : window.medicaoAtual.p2.este,
            window.medicaoAtual.p2.n !== undefined ? window.medicaoAtual.p2.n : window.medicaoAtual.p2.norte
        );
        desenharSeta(pos1.x, pos1.y, pos2.x, pos2.y, '#f59e0b');
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${window.medicaoAtual.dh.toFixed(3)} m`, (pos1.x + pos2.x) / 2, (pos1.y + pos2.y) / 2 - 8);
    }

    // Desenhar Pontos
    window.pontos.forEach(p => {
        if (!pontoVisivel(p)) return;
        
        let xVal = p.e !== undefined ? p.e : p.este;
        let yVal = p.n !== undefined ? p.n : p.norte;
        let pos = worldToScreen(xVal, yVal);
        
        const estaNaArea = pontosAreaTemp.find(ponto => ponto.id === p.id);
        const isSelected = window.pontoSelecionadoInicio && window.pontoSelecionadoInicio.id === p.id;
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isSelected ? 9 : (estaNaArea ? 8 : 5), 0, 2 * Math.PI);
        ctx.fillStyle = estaNaArea ? '#10b981' : (isSelected ? '#f59e0b' : '#3b82f6');
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const texto = obterTextoExibicao(p);
        if (texto && opcaoExibicaoAtual !== 'nenhum') {
            ctx.fillStyle = document.body.classList.contains('dark') ? '#f1f5f9' : '#0f172a';
            ctx.font = opcaoExibicaoAtual === 'ambos' ? '10px sans-serif' : '11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(texto, pos.x + 12, pos.y + 4);
        }
    });

    // Desenhar Polígono de Área
    if (modoArea && pontosAreaTemp.length > 0) {
        ctx.beginPath();
        pontosAreaTemp.forEach((p, idx) => {
            let xVal = p.e !== undefined ? p.e : p.este;
            let yVal = p.n !== undefined ? p.n : p.norte;
            let pos = worldToScreen(xVal, yVal);
            if (idx === 0) ctx.moveTo(pos.x, pos.y);
            else ctx.lineTo(pos.x, pos.y);
        });
        
        if (pontosAreaTemp.length > 2) {
            let firstPos = worldToScreen(
                pontosAreaTemp[0].e !== undefined ? pontosAreaTemp[0].e : pontosAreaTemp[0].este,
                pontosAreaTemp[0].n !== undefined ? pontosAreaTemp[0].n : pontosAreaTemp[0].norte
            );
            ctx.lineTo(firstPos.x, firstPos.y);
        }
        
        ctx.closePath();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        pontosAreaTemp.forEach((p, idx) => {
            let xVal = p.e !== undefined ? p.e : p.este;
            let yVal = p.n !== undefined ? p.n : p.norte;
            let pos = worldToScreen(xVal, yVal);
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 7, 0, 2 * Math.PI);
            ctx.fillStyle = idx === 0 ? '#10b981' : '#f59e0b';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText((idx + 1).toString(), pos.x, pos.y + 3);
        });
    }
}

// --- FILTRO E EXIBIÇÃO ---
function pontoVisivel(ponto) {
    if (!filtroCamadasAtivo) return true;
    const desc = ponto.desc ? ponto.desc.toLowerCase() : '';
    const id = ponto.id ? ponto.id.toLowerCase() : '';
    return desc.includes(filtroCamadasAtivo) || id.includes(filtroCamadasAtivo);
}

function obterTextoExibicao(ponto) {
    switch (opcaoExibicaoAtual) {
        case 'id': return ponto.id;
        case 'descricao': return ponto.desc || '';
        case 'ambos': return ponto.desc ? `${ponto.id} - ${ponto.desc}` : ponto.id;
        case 'nenhum':
        default: return '';
    }
}

function aplicarFiltroCamadas() {
    const input = document.getElementById('filtroCamadas');
    if (input) {
        filtroCamadasAtivo = input.value.toLowerCase().trim();
        desenharCroqui();
    }
}

function limparFiltroCamadas() {
    const input = document.getElementById('filtroCamadas');
    if (input) {
        input.value = '';
        filtroCamadasAtivo = '';
        desenharCroqui();
    }
}

function atualizarExibicaoPontos() {
    const select = document.getElementById('opcaoExibicao');
    if (select) {
        opcaoExibicaoAtual = select.value;
        desenharCroqui();
    }
}

// --- MEDIÇÃO DE ÁREA ---
function ativarMedirArea() {
    modoArea = true;
    pontosAreaTemp = [];
    setModoCroqui('area');
    const resBox = document.getElementById('resMedicaoCanvas');
    if (resBox) resBox.classList.add('hidden');
    desenharCroqui();
}

function adicionarPontoArea(ponto) {
    if (pontosAreaTemp.length > 2 && pontosAreaTemp[0].id === ponto.id) {
        finalizarMedirArea();
        return;
    }
    if (!pontosAreaTemp.find(p => p.id === ponto.id)) {
        pontosAreaTemp.push(ponto);
        desenharCroqui();
    }
}

function finalizarMedirArea() {
    if (pontosAreaTemp.length < 3) {
        alert('Selecione pelo menos 3 pontos para calcular a área.');
        return;
    }

    let area = 0, perimetro = 0;
    const n = pontosAreaTemp.length;
    
    for (let i = 0; i < n; i++) {
        const p1 = pontosAreaTemp[i];
        const p2 = pontosAreaTemp[(i + 1) % n];
        let x1 = p1.e !== undefined ? p1.e : p1.este;
        let y1 = p1.n !== undefined ? p1.n : p1.norte;
        let x2 = p2.e !== undefined ? p2.e : p2.este;
        let y2 = p2.n !== undefined ? p2.n : p2.norte;
        area += (x1 * y2) - (x2 * y1);
        perimetro += Math.hypot(x2 - x1, y2 - y1);
    }
    
    area = Math.abs(area) / 2;
    const areaHectares = area / 10000;
    
    const resBox = document.getElementById('resMedicaoCanvas');
    if (resBox) {
        resBox.innerHTML = `
            <strong>📐 Área Medida:</strong><br>
            • Área: <strong>${area.toFixed(3)} m²</strong><br>
            • Hectares: <strong>${areaHectares.toFixed(4)} ha</strong><br>
            • Perímetro: <strong>${perimetro.toFixed(3)} m</strong><br>
            • Vértices: <strong>${pontosAreaTemp.length}</strong>
        `;
        resBox.classList.remove('hidden');
    }
    
    modoArea = false;
    pontosAreaTemp = [];
    setModoCroqui('pan');
}

// --- EVENTOS MOUSE ---
function onCanvasMouseDown(e) {
    if ((e.ctrlKey && e.button === 0) || window.modoCroqui === 'pan' || e.button === 1) {
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
    } else if (window.pontoSelecionadoInicio || modoArea) {
        desenharCroqui();
    }
}

function onCanvasMouseUp() {
    isDragging = false;
    canvas.style.cursor = 'grab';
}

function onCanvasWheel(e) {
    e.preventDefault();
    let zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    zoomScale = Math.max(0.1, Math.min(zoomScale * zoomFactor, 50));
    desenharCroqui();
}

function onCanvasClick(e) {
    let rect = canvas.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;
    let pontoClicado = obterPontoProximoMouse(clickX, clickY);
    
    if (pontoClicado) {
        if (modoArea) {
            adicionarPontoArea(pontoClicado);
        } else if (window.modoCroqui === 'linha' || window.modoCroqui === 'medir') {
            processarSelecaoPonto(pontoClicado);
        }
    }
}

// --- EVENTOS TOUCH (MOBILE MELHORADOS E ROBUSTOS) ---
function onCanvasTouchStart(e) {
    e.preventDefault(); // Impede scroll indesejado ao interagir com o canvas
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
        
        let pontoTocado = obterPontoProximoMouse(x, y);
        touchOnPoint = !!pontoTocado;
        
        if (!touchOnPoint || window.modoCroqui === 'pan') {
            isDragging = true;
            startDragX = touch.clientX - panOffsetX;
            startDragY = touch.clientY - panOffsetY;
        }
    } else if (e.touches.length === 2) {
        isDragging = false;
        touchOnPoint = false;
        let t1 = e.touches[0];
        let t2 = e.touches[1];
        initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialZoomScale = zoomScale;
    }
}

function onCanvasTouchMove(e) {
    e.preventDefault(); // Impede comportamento padrão de rolagem nativa da página
    if (e.touches.length === 1) {
        let touch = e.touches[0];
        let rect = canvas.getBoundingClientRect();
        let x = touch.clientX - rect.left;
        let y = touch.clientY - rect.top;
        mousePosCanvas = { x, y };
        
        if (Math.abs(x - touchStartX) > 6 || Math.abs(y - touchStartY) > 6) {
            touchMoved = true;
        }
        
        if (isDragging && (!touchOnPoint || window.modoCroqui === 'pan')) {
            panOffsetX = touch.clientX - startDragX;
            panOffsetY = touch.clientY - startDragY;
            desenharCroqui();
        } else if (window.pontoSelecionadoInicio || modoArea) {
            desenharCroqui();
        }
    } else if (e.touches.length === 2) {
        let t1 = e.touches[0];
        let t2 = e.touches[1];
        let currentDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        
        if (initialPinchDistance > 0) {
            let scale = currentDistance / initialPinchDistance;
            let newZoomScale = Math.max(0.1, Math.min(initialZoomScale * scale, 50));
            let rect = canvas.getBoundingClientRect();
            let centerX = ((t1.clientX + t2.clientX) / 2) - rect.left;
            let centerY = ((t1.clientY + t2.clientY) / 2) - rect.top;
            let ratio = newZoomScale / zoomScale;
            panOffsetX = panOffsetX * ratio + (centerX - canvas.width / 2) * (1 - ratio);
            panOffsetY = panOffsetY * ratio + (centerY - canvas.height / 2) * (1 - ratio);
            zoomScale = newZoomScale;
            desenharCroqui();
        }
    }
}

function onCanvasTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length === 0) {
        // Se foi um toque rápido sem arrastar muito, simula o clique em cima do ponto
        if (!touchMoved && touchStartTime && (Date.now() - touchStartTime < 350)) {
            let pontoTocado = obterPontoProximoMouse(touchStartX, touchStartY);
            if (pontoTocado) {
                if (modoArea) {
                    adicionarPontoArea(pontoTocado);
                } else if (window.modoCroqui === 'linha' || window.modoCroqui === 'medir') {
                    processarSelecaoPonto(pontoTocado);
                }
            }
        }
        isDragging = false;
        touchOnPoint = false;
        touchStartTime = 0;
        touchMoved = false;
        initialPinchDistance = 0;
    } else if (e.touches.length === 1) {
        initialPinchDistance = 0;
        let touch = e.touches[0];
        touchStartX = touch.clientX - canvas.getBoundingClientRect().left;
        touchStartY = touch.clientY - canvas.getBoundingClientRect().top;
        isDragging = true;
        startDragX = touch.clientX - panOffsetX;
        startDragY = touch.clientY - panOffsetY;
    }
}

// --- FUNÇÕES AUXILIARES ---
function processarSelecaoPonto(ponto) {
    if (window.modoCroqui === 'linha') {
        if (!window.pontoSelecionadoInicio) {
            window.pontoSelecionadoInicio = ponto;
        } else {
            if (window.pontoSelecionadoInicio.id !== ponto.id) {
                window.linhasCroqui.push({ p1: window.pontoSelecionadoInicio.id, p2: ponto.id });
                window.pontoSelecionadoInicio = ponto;
            }
        }
        desenharCroqui();
    } else if (window.modoCroqui === 'medir') {
        if (!window.pontoSelecionadoInicio) {
            window.pontoSelecionadoInicio = ponto;
            window.medicaoAtual = null;
        } else {
            if (typeof calcularEMedirPontos === 'function') {
                calcularEMedirPontos(window.pontoSelecionadoInicio, ponto);
            }
            window.pontoSelecionadoInicio = null;
        }
        desenharCroqui();
    }
}

function redefinirVistaCanvas() {
    zoomScale = 1;
    panOffsetX = 0;
    panOffsetY = 0;
    window.pontoSelecionadoInicio = null;
    window.medicaoAtual = null;
    modoArea = false;
    pontosAreaTemp = [];
    const resBox = document.getElementById('resMedicaoCanvas');
    if (resBox) resBox.classList.add('hidden');
    desenharCroqui();
}

function desfazerLinha() {
    if (window.linhasCroqui && window.linhasCroqui.length > 0) {
        window.linhasCroqui.pop();
        desenharCroqui();
    }
}

function limparLinhas() {
    window.linhasCroqui = [];
    window.pontoSelecionadoInicio = null;
    window.medicaoAtual = null;
    modoArea = false;
    pontosAreaTemp = [];
    const resBox = document.getElementById('resMedicaoCanvas');
    if (resBox) resBox.classList.add('hidden');
    desenharCroqui();
}

// --- EXPOSIÇÃO GLOBAL UNIFICADA ---
window.setModoCroqui = setModoCroqui;
window.desfazerLinha = desfazerLinha;
window.limparLinhas = limparLinhas;
window.redefinirVistaCanvas = redefinirVistaCanvas;
window.ativarMedirArea = ativarMedirArea;
window.aplicarFiltroCamadas = aplicarFiltroCamadas;
window.limparFiltroCamadas = limparFiltroCamadas;
window.atualizarExibicaoPontos = atualizarExibicaoPontos;
window.desenharCroqui = desenharCroqui;
window.trocarSessaoUI = trocarSessaoUI;
window.criarNovaSessaoUI = criarNovaSessaoUI;
window.excluirSessaoAtualUI = excluirSessaoAtualUI;
window.salvarSessoesStorage = salvarSessoesStorage;
