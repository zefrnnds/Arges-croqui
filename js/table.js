function renderizarTabela(filtro = '') {
    const tbody = document.getElementById('tableBody');
    const countBadge = document.getElementById('pontosCount');
    if (!tbody) return;
    tbody.innerHTML = '';
    const ptsFiltrados = window.pontos.filter(p =>
        p.id.toLowerCase().includes(filtro.toLowerCase()) || (p.desc && p.desc.toLowerCase().includes(filtro.toLowerCase()))
    );
    if (countBadge) countBadge.textContent = `${window.pontos.length} pts`;
    
    if (ptsFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">Nenhum ponto registrado.</td></tr>`;
        desenharCroqui(); return;
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

function editarPontoDirect(index, campo, valor) {
    if (campo === 'desc') { window.pontos[index].desc = valor.trim(); }
    else {
        const num = parseFloat(valor.replace(',', '.'));
        if (!isNaN(num)) {
            window.pontos[index][campo] = num;
            if (campo === 'e') window.pontos[index].este = num;
            if (campo === 'n') window.pontos[index].norte = num;
            if (campo === 'z') window.pontos[index].cota = num;
        }
    }
    salvarSessoesStorage();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    desenharCroqui();
}

function filtrarTabela() {
    const input = document.getElementById('searchInput');
    renderizarTabela(input ? input.value : '');
}

function abrirModalAdd() { document.getElementById('modalAdd').classList.remove('hidden'); }
function fecharModalAdd() { document.getElementById('modalAdd').classList.add('hidden'); }

function salvarNovoPonto() {
    const id = document.getElementById('newId').value.trim();
    const e = parseFloat(document.getElementById('newE').value);
    const n = parseFloat(document.getElementById('newN').value);
    const z = parseFloat(document.getElementById('newZ').value) || 0;
    const desc = document.getElementById('newDesc').value.trim();
    if (!id || isNaN(e) || isNaN(n)) { alert("Preencha ID, Este (X) e Norte (Y)!"); return; }
    window.pontos.push({ id, e, este: e, n, norte: n, z, cota: z, desc });
    salvarSessoesStorage();
    renderizarTabela();
    if (typeof atualizarDatalists === 'function') atualizarDatalists();
    fecharModalAdd();
    ['newId', 'newE', 'newN', 'newDesc'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('newZ').value = '0';
}

function atualizarDatalists() {
    const datalist = document.getElementById('listaPontos');
    if (!datalist) return;
    datalist.innerHTML = '';
    window.pontos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = `${p.id} - ${p.desc || ''}`;
        datalist.appendChild(opt);
    });
}

window.filtrarTabela = filtrarTabela;
window.abrirModalAdd = abrirModalAdd;
window.fecharModalAdd = fecharModalAdd;
window.salvarNovoPonto = salvarNovoPonto;
window.editarPontoDirect = editarPontoDirect;
window.renderizarTabela = renderizarTabela;
window.atualizarDatalists = atualizarDatalists;