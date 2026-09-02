function salvarSessoesStorage() {
    window.sessoes[window.sessaoAtual] = window.pontos;
    localStorage.setItem('arges_sessoes', JSON.stringify(window.sessoes));
    localStorage.setItem('arges_sessao_atual', window.sessaoAtual);
}

function atualizarSelectSessoes() {
    const select = document.getElementById('selectSessao');
    if (!select) return;
    select.innerHTML = '';
    Object.keys(window.sessoes).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome; opt.textContent = nome;
        if (nome === window.sessaoAtual) opt.selected = true;
        select.appendChild(opt);
    });
}

function trocarSessaoUI() {
    const select = document.getElementById('selectSessao');
    if (!select) return;
    window.sessaoAtual = select.value;
    window.pontos = window.sessoes[window.sessaoAtual] || [];
    window.linhasCroqui = []; window.medicaoAtual = null;
    salvarSessoesStorage();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    redefinirVistaCanvas();
}

function criarNovaSessaoUI() {
    const nome = prompt("Nome da nova Obra / Sessão:");
    if (!nome) return;
    if (window.sessoes[nome]) { alert("Já existe uma obra com este nome."); return; }
    window.sessoes[nome] = []; window.sessaoAtual = nome; window.pontos = [];
    window.linhasCroqui = [];
    salvarSessoesStorage(); atualizarSelectSessoes();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    redefinirVistaCanvas();
}

function excluirSessaoAtualUI() {
    const chaves = Object.keys(window.sessoes);
    if (chaves.length <= 1) { alert("Você precisa ter pelo menos uma obra cadastrada."); return; }
    if (confirm(`Tem certeza que deseja excluir a obra "${window.sessaoAtual}"?`)) {
        delete window.sessoes[window.sessaoAtual];
        window.sessaoAtual = Object.keys(window.sessoes)[0];
        window.pontos = window.sessoes[window.sessaoAtual];
        window.linhasCroqui = [];
        salvarSessoesStorage(); atualizarSelectSessoes();
        if (typeof renderizarTabela === 'function') renderizarTabela();
        if (typeof atualizarDatalists === 'function') atualizarDatalists();
        redefinirVistaCanvas();
    }
}

// IMPORTAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    atualizarSelectSessoes();
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function (evt) {
                const text = evt.target.result; if (!text || text.trim() === '') { alert('Arquivo vazio.'); return; }
                if (text.includes('x+') || text.includes('y+') || text.includes('_111111111100') || text.startsWith('+')) {
                    processarTopconGTS(text); return;
                }
                window.rawLines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (window.rawLines.length === 0) { alert('Nenhuma linha válida.'); return; }
                document.getElementById('previewText').textContent = `${window.rawLines.length} linhas lidas`;
                document.getElementById('previewData').textContent = window.rawLines.slice(0, 5).join('\n');
                preencherOpcoesMapeamento(window.rawLines[0]);
                document.getElementById('mappingSection').classList.remove('hidden');
            };
            reader.readAsText(file);
        });
    }
});

function preencherOpcoesMapeamento(primeiraLinha) {
    const separador = primeiraLinha.includes(',') ? ',' : (primeiraLinha.includes(';') ? ';' : ' ');
    const colunas = primeiraLinha.split(separador).map((c, i) => `Coluna ${i + 1}: ${c.trim()}`);
    ['mapId', 'mapE', 'mapN', 'mapZ', 'mapDesc'].forEach(sId => {
        const select = document.getElementById(sId);
        if (!select) return;
        select.innerHTML = `<option value="-1">Selecione...</option>` + colunas.map((col, idx) => `<option value="${idx}">${col}</option>`).join('');
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
    if (idxE === -1 || idxN === -1) { alert('Selecione pelo menos Este (X) e Norte (Y).'); return; }
    let carregados = 0;
    window.rawLines.forEach((line) => {
        const sep = line.includes(',') ? ',' : (line.includes(';') ? ';' : /\s+/);
        const cols = line.split(sep).map(c => c.trim());
        const id = idxId !== -1 && cols[idxId] ? cols[idxId] : `P${window.pontos.length + 1}`;
        const esteVal = parseFloat(cols[idxE] ? cols[idxE].replace(',', '.') : NaN);
        const norteVal = parseFloat(cols[idxN] ? cols[idxN].replace(',', '.') : NaN);
        const cotaVal = idxZ !== -1 && cols[idxZ] ? parseFloat(cols[idxZ].replace(',', '.')) : 0;
        const desc = idxDesc !== -1 && cols[idxDesc] ? cols[idxDesc] : '';
        if (!isNaN(esteVal) && !isNaN(norteVal)) {
            window.pontos.push({ id, e: esteVal, este: esteVal, n: norteVal, norte: norteVal, z: isNaN(cotaVal) ? 0 : cotaVal, cota: isNaN(cotaVal) ? 0 : cotaVal, desc });
            carregados++;
        }
    });
    document.getElementById('mappingSection').classList.add('hidden');
    salvarESincronizar();
    alert(`${carregados} pontos carregados!`);
}

function processarTopconGTS(conteudoTexto) {
    let carregados = 0;
    // Regex para capturar ID, X, Y, Z
    const regexPonto = /(?:_?([^\_\|\n\r\t]+)[\_\|]+)?x\+?(-?\d+[\.,]?\d*)[\_\|]*\s*y\+?(-?\d+[\.,]?\d*)[\_\|]*\s*z\+?(-?\d+[\.,]?\d*)/gi;
    let match, indexAuto = 1;
    
    while ((match = regexPonto.exec(conteudoTexto)) !== null) {
        let rawId = match[1], rawX = match[2], rawY = match[3], rawZ = match[4];
        let id = (rawId && rawId.trim() !== '_' && rawId.trim() !== '|') ? rawId.trim() : `P${indexAuto}`;
        
        // Função de parse APENAS para X e Y (mantém a conversão mm -> m se o número for inteiro grande)
        const parseCoordXY = (valStr) => {
            if (!valStr) return 0.0;
            let valLimpo = valStr.replace(',', '.');
            if (valLimpo.includes('.')) return parseFloat(valLimpo);
            let num = parseFloat(valLimpo);
            let digitos = valLimpo.replace(/\D/g, '');
            if (digitos.length >= 8 && Math.abs(num) > 100000) return num / 1000.0;
            if (digitos.length >= 6 && Math.abs(num) > 10000) return num / 100.0;
            return num;
        };

        let esteVal = parseCoordXY(rawX);
        let norteVal = parseCoordXY(rawY);
        
        // ✅ CORREÇÃO: Z (Cota) será lido estritamente como número decimal, SEM dividir por 1000
        let cotaVal = 0.0;
        if (rawZ) {
            let zLimpo = rawZ.replace(',', '.');
            cotaVal = parseFloat(zLimpo);
            if (isNaN(cotaVal)) cotaVal = 0.0;
        }

        if (!isNaN(esteVal) && !isNaN(norteVal)) {
            window.pontos.push({ 
                id, 
                e: esteVal, este: esteVal, 
                n: norteVal, norte: norteVal, 
                z: cotaVal, cota: cotaVal, 
                desc: 'Topcon' 
            });
            carregados++; indexAuto++;
        }
    }

    // Fallback para formatos de linha rígida do Topcon (caso o regex não encontre)
    if (carregados === 0) {
        const linhas = conteudoTexto.split(/\r?\n/).filter(line => line.trim() !== '');
        linhas.forEach((line) => {
            if (!line.includes('x+')) return;
            const posX = line.indexOf('x+'); 
            const posY = line.indexOf('y+'); 
            const posZ = line.indexOf('z+');
            
            if (posX !== -1 && posY !== -1) {
                let id = line.substring(0, posX).replace(/[_+|]/g, '').trim() || `P${window.pontos.length + 1}`;
                
                // X e Y divididos por 1000 (formato padrão mm -> m)
                const esteVal = parseInt(line.substring(posX + 2, posX + 11), 10) / 1000;
                const norteVal = parseInt(line.substring(posY + 2, posY + 11), 10) / 1000;
                
                // ✅ CORREÇÃO NO FALLBACK: Z lido diretamente como float, sem dividir por 1000
                let cotaVal = 0.0;
                if (posZ !== -1) {
                    let zString = line.substring(posZ + 2, posZ + 11).trim().replace(',', '.');
                    cotaVal = parseFloat(zString);
                    if (isNaN(cotaVal)) cotaVal = 0.0;
                }

                if (!isNaN(esteVal) && !isNaN(norteVal)) {
                    window.pontos.push({ 
                        id, 
                        e: esteVal, este: esteVal, 
                        n: norteVal, norte: norteVal, 
                        z: cotaVal, cota: cotaVal, 
                        desc: 'Topcon' 
                    });
                    carregados++;
                }
            }
        });
    }
    
    salvarESincronizar();
    alert(`✅ ${carregados} pontos Topcon GTS carregados! (Eixo Z lido sem divisão por 1000)`);
}

function salvarESincronizar() {
    salvarSessoesStorage();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    desenharCroqui();
}

function exportarCaderneta() {
    if (window.pontos.length === 0) { alert('Caderneta vazia.'); return; }
    let csv = 'ID,Este(X),Norte(Y),Cota(Z),Descricao\n';
    window.pontos.forEach(p => {
        let x = p.e !== undefined ? p.e : p.este;
        let y = p.n !== undefined ? p.n : p.norte;
        let z = p.z !== undefined ? p.z : p.cota;
        csv += `${p.id},${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)},"${p.desc || ''}"\n`;
    });
    downloadArquivo(csv, `caderneta_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function exportarXYZ_GTS() {
    if (window.pontos.length === 0) { alert('Caderneta vazia.'); return; }
    let content = '';
    window.pontos.forEach(p => {
        let xVal = p.e !== undefined ? p.e : p.este;
        let yVal = p.n !== undefined ? p.n : p.norte;
        let zVal = p.z !== undefined ? p.z : p.cota;
        const x = Math.max(0, Math.round((xVal || 0) * 1000)).toString().padStart(9, '0');
        const y = Math.max(0, Math.round((yVal || 0) * 1000)).toString().padStart(9, '0');
        const z = Math.max(0, Math.round((zVal || 0))).toString().padStart(9, '0');
        const idPadded = p.id.slice(0, 10).padEnd(10, ' ');
        content += `+${idPadded} _111111111100  x+${x}  y+${y}  z+${z}\r\n`;
    });
    downloadArquivo(content, `caderneta_gts_${new Date().toISOString().split('T')[0]}.xyz`, 'text/plain');
}

function downloadArquivo(conteudo, nomeArquivo, tipoMime) {
    const blob = new Blob([conteudo], { type: `${tipoMime};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = nomeArquivo; link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

