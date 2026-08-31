/* ==========================================================================
   2. IMPORTAÇÃO E EXPORTAÇÃO DE ARQUIVOS
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
            
            if (!text || text.trim() === '') {
                alert('Arquivo vazio.');
                return;
            }

            // 1. Verifica se é o formato Topcon GTS (.xyz / Criptografado com x+ e y+)
            if (text.includes('x+') || text.includes('y+') || text.includes('_111111111100') || text.startsWith('+')) {
                processarTopconGTS(text);
                return;
            }

            // 2. Caso contrário, processa como CSV / TXT com linhas
            rawLines = text.split(/\r?\n/).filter(line => line.trim() !== '');

            if (rawLines.length === 0) {
                alert('Nenhuma linha válida encontrada no arquivo.');
                return;
            }

            // Pré-visualização para CSV/TXT
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

    // Auto-detectar padrões comuns
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

    if (idxE === -1 || idxN === -1) {
        alert('Selecione pelo menos as colunas para Este (X) e Norte (Y).');
        return;
    }

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
            pontos.push({ 
                id, 
                e: esteVal, este: esteVal, 
                n: norteVal, norte: norteVal, 
                z: isNaN(cotaVal) ? 0 : cotaVal, cota: isNaN(cotaVal) ? 0 : cotaVal, 
                desc 
            });
            carregados++;
        }
    });

    document.getElementById('mappingSection')?.classList.add('hidden');
    salvarESincronizar();
    alert(`${carregados} pontos carregados com sucesso!`);
}

function processarTopconGTS(conteudoTexto) {
    let carregados = 0;
    const linhas = conteudoTexto.split(/\r?\n/).filter(line => line.trim() !== '');

    linhas.forEach((line) => {
        if (!line.includes('x+')) return;

        const posX = line.indexOf('x+');
        const posY = line.indexOf('y+');
        const posZ = line.indexOf('z+');

        if (posX !== -1 && posY !== -1) {
            let id = line.substring(0, posX).replace(/[_+|]/g, '').trim();
            if (!id) {
                id = `P${pontos.length + 1}`;
            }

            const parseCoordGTS = (pos) => {
                if (pos === -1) return 0.0;
                let sub = line.substring(pos + 2, pos + 12).trim();
                let numStr = sub.replace(',', '.');
                let num = parseFloat(numStr);
                
                if (isNaN(num)) return 0.0;

                let digitos = numStr.replace(/\D/g, '');
                if (digitos.length >= 8 && Math.abs(num) > 100000) {
                    return num / 1000.0;
                } else if (digitos.length >= 6 && Math.abs(num) > 10000) {
                    return num / 100.0;
                }
                return num;
            };

            const esteVal = parseCoordGTS(posX);
            const norteVal = parseCoordGTS(posY);
            const cotaVal = parseCoordGTS(posZ);

            if (!isNaN(esteVal) && !isNaN(norteVal)) {
                pontos.push({
                    id: id,
                    e: esteVal, este: esteVal,
                    n: norteVal, norte: norteVal,
                    z: cotaVal, cota: cotaVal,
                    desc: 'Topcon GTS'
                });
                carregados++;
            }
        }
    });

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
    if (pontos.length === 0) {
        alert('A caderneta está vazia.');
        return;
    }
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
    if (pontos.length === 0) {
        alert('A caderneta está vazia.');
        return;
    }

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
