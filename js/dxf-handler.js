/* ==========================================================================
   MANIPULAÇÃO DE ARQUIVOS CAD (DXF/DWG)
========================================================================== */

let pontosExtraidosCAD = [];
let arquivoCADSelecionado = null;

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('cadFileInput');

    if (!dropZone || !fileInput) return;

    // Clique na zona de drop abre o seletor de arquivo
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            selecionarArquivoCAD(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selecionarArquivoCAD(e.target.files[0]);
        }
    });
});

function selecionarArquivoCAD(arquivo) {
    arquivoCADSelecionado = arquivo;
    const extensao = arquivo.name.split('.').pop().toLowerCase();

    document.getElementById('fileName').textContent = arquivo.name;
    document.getElementById('fileSize').textContent = (arquivo.size / 1024).toFixed(2) + ' KB';
    document.getElementById('fileInfo').classList.remove('hidden');

    if (extensao === 'dwg') {
        document.getElementById('cadPreviewArea').innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--danger);">
                <strong>⚠️ Formato DWG não suportado diretamente no navegador.</strong><br>
                <small>Por favor, converta este arquivo para .DXF usando o ODA File Converter, QCAD ou AutoCAD e tente novamente.</small>
            </div>
        `;
        document.getElementById('cadActions').classList.add('hidden');
    } else {
        document.getElementById('cadPreviewArea').innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                Arquivo <strong>.${extensao}</strong> selecionado.<br>
                Clique em "Analisar Arquivo" para extrair os pontos.
            </div>
        `;
    }
}

function processarArquivoCAD() {
    if (!arquivoCADSelecionado) {
        alert('Selecione um arquivo primeiro.');
        return;
    }

    const extensao = arquivoCADSelecionado.name.split('.').pop().toLowerCase();
    if (extensao === 'dwg') {
        alert('Arquivos DWG precisam ser convertidos para DXF antes da importação.');
        return;
    }

    if (typeof DxfParser === 'undefined') {
        alert('Erro: Biblioteca de leitura DXF não carregada. Verifique sua conexão com a internet.');
        return;
    }

    document.getElementById('cadPreviewArea').innerHTML = '<p class="text-center" style="padding: 40px;">⏳ Analisando arquivo DXF... Aguarde.</p>';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parser = new DxfParser();
            const dxfData = parser.parseSync(e.target.result);
            
            pontosExtraidosCAD = [];
            
            if (dxfData && dxfData.entities) {
                dxfData.entities.forEach((ent, index) => {
                    // 1. Pontos simples (POINT)
                    if (ent.type === 'POINT' && ent.position) {
                        pontosExtraidosCAD.push({
                            id: `DXF_P${pontosExtraidosCAD.length + 1}`,
                            e: ent.position.x,
                            n: ent.position.y,
                            z: ent.position.z || 0,
                            desc: `POINT_${ent.layer || '0'}`
                        });
                    }
                    // 2. Blocos/Inserts (INSERT)
                    else if (ent.type === 'INSERT' && ent.position) {
                        pontosExtraidosCAD.push({
                            id: `${ent.name || 'BL'}_${pontosExtraidosCAD.length + 1}`,
                            e: ent.position.x,
                            n: ent.position.y,
                            z: ent.position.z || 0,
                            desc: `INSERT_${ent.layer || '0'}`
                        });
                    }
                    // 3. Vértices de Polilinhas (LWPOLYLINE / POLYLINE)
                    else if ((ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') && ent.vertices) {
                        ent.vertices.forEach((v, vIdx) => {
                            pontosExtraidosCAD.push({
                                id: `DXF_V${pontosExtraidosCAD.length + 1}`,
                                e: v.x || 0,
                                n: v.y || 0,
                                z: v.z || 0,
                                desc: `VERTEX_${ent.layer || '0'}`
                            });
                        });
                    }
                });
            }

            exibirPreviewCAD();

        } catch (err) {
            console.error(err);
            document.getElementById('cadPreviewArea').innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--danger);">
                    <strong>❌ Erro ao ler o arquivo DXF.</strong><br>
                    <small>O arquivo pode estar corrompido ou em um formato DXF muito antigo/novo não suportado pelo parser.</small><br>
                    <small style="color: var(--text-secondary);">Detalhe: ${err.message}</small>
                </div>
            `;
        }
    };
    reader.readAsText(arquivoCADSelecionado);
}

function exibirPreviewCAD() {
    const previewArea = document.getElementById('cadPreviewArea');
    
    if (pontosExtraidosCAD.length === 0) {
        previewArea.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--warning);">
                <strong>⚠️ Nenhuma entidade de ponto encontrada.</strong><br>
                <small>O arquivo pode conter apenas linhas, textos ou hachuras, que não geram pontos de coordenada direta.</small>
            </div>
        `;
        document.getElementById('cadActions').classList.add('hidden');
        return;
    }

    let html = `
        <p style="margin-bottom: 12px;"><strong>${pontosExtraidosCAD.length}</strong> pontos/entidades encontrados.</p>
        <div class="table-scroll" style="max-height: 300px;">
            <table class="preview-table">
                <thead>
                    <tr>
                        <th>ID Proposto</th>
                        <th>Este (X)</th>
                        <th>Norte (Y)</th>
                        <th>Cota (Z)</th>
                        <th>Descrição</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Mostra no máximo os primeiros 100 pontos para não travar o navegador
    const limitePreview = Math.min(pontosExtraidosCAD.length, 100);
    for (let i = 0; i < limitePreview; i++) {
        const p = pontosExtraidosCAD[i];
        html += `
            <tr>
                <td>${p.id}</td>
                <td>${p.e.toFixed(3)}</td>
                <td>${p.n.toFixed(3)}</td>
                <td>${p.z.toFixed(3)}</td>
                <td>${p.desc}</td>
            </tr>
        `;
    }

    if (pontosExtraidosCAD.length > 100) {
        html += `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">... e mais ${pontosExtraidosCAD.length - 100} pontos</td></tr>`;
    }

    html += `</tbody></table></div>`;
    previewArea.innerHTML = html;
    document.getElementById('cadActions').classList.remove('hidden');
}

function confirmarImportacaoCAD() {
    if (pontosExtraidosCAD.length === 0) return;

    let adicionados = 0;
    let ignorados = 0;

    pontosExtraidosCAD.forEach(ponto => {
        // Evita duplicatas exatas de ID
        const existe = window.pontos.find(p => p.id === ponto.id);
        if (!existe) {
            window.pontos.push({
                id: ponto.id,
                e: ponto.e, este: ponto.e,
                n: ponto.n, norte: ponto.n,
                z: ponto.z, cota: ponto.z,
                desc: ponto.desc
            });
            adicionados++;
        } else {
            ignorados++;
        }
    });

    // Salva e atualiza a interface principal
    if (typeof salvarSessoesStorage === 'function') salvarSessoesStorage();
    if (typeof renderizarTabela === 'function') renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    if (typeof desenharCroqui === 'function') desenharCroqui();

    alert(`✅ Importação concluída!\n\nPontos adicionados: ${adicionados}\nIgnorados (IDs duplicados): ${ignorados}`);
    
    limparPreviewCAD();
    
    // Opcional: mudar para a aba da caderneta automaticamente
    // document.querySelector('[data-window="caderneta"]').click();
}

function limparPreviewCAD() {
    pontosExtraidosCAD = [];
    arquivoCADSelecionado = null;
    document.getElementById('cadFileInput').value = '';
    document.getElementById('fileInfo').classList.add('hidden');
    document.getElementById('cadPreviewArea').innerHTML = '<p class="text-muted text-center" style="padding: 40px 0;">Nenhum arquivo analisado ainda.</p>';
    document.getElementById('cadActions').classList.add('hidden');
}

// Expor globalmente
window.processarArquivoCAD = processarArquivoCAD;
window.confirmarImportacaoCAD = confirmarImportacaoCAD;
window.limparPreviewCAD = limparPreviewCAD;