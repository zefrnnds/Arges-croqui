function processarTopconGTS(conteudoTexto) {
    let carregados = 0;
    
    // Expressão regular original robusta para o formato GTS
    const regexPonto = /(?:_?([^\_\|\n\r\t]+)[\_\|]+)?x\+?(-?\d+[\.,]?\d*)[\_\|]*\s*y\+?(-?\d+[\.,]?\d*)[\_\|]*\s*z\+?(-?\d+[\.,]?\d*)/gi;

    let match;
    let indexAuto = 1;

    while ((match = regexPonto.exec(conteudoTexto)) !== null) {
        let rawId = match[1];
        let rawX = match[2];
        let rawY = match[3];
        let rawZ = match[4];

        let id = (rawId && rawId.trim() !== '_' && rawId.trim() !== '|') ? rawId.trim() : `P${indexAuto}`;

        const parseCoordTopcon = (valStr) => {
            if (!valStr) return 0.0;
            let valLimpo = valStr.replace(',', '.');
            
            if (valLimpo.includes('.')) return parseFloat(valLimpo);

            let num = parseFloat(valLimpo);
            let digitos = valLimpo.replace(/\D/g, '');

            if (digitos.length >= 8 && Math.abs(num) > 100000) {
                return num / 1000.0;
            } else if (digitos.length >= 6 && Math.abs(num) > 10000) {
                return num / 100.0;
            }
            return num;
        };

        let esteVal = parseCoordTopcon(rawX);
        let norteVal = parseCoordTopcon(rawY);
        let cotaVal = parseCoordTopcon(rawZ);

        if (!isNaN(esteVal) && !isNaN(norteVal)) {
            pontos.push({
                id: id,
                e: esteVal, este: esteVal,
                n: norteVal, norte: norteVal,
                z: isNaN(cotaVal) ? 0 : cotaVal, cota: isNaN(cotaVal) ? 0 : cotaVal,
                desc: 'Topcon GTS'
            });
            carregados++;
            indexAuto++;
        }
    }

    // Fallback caso a regex não pegue diretamente, varrendo linha por linha
    if (carregados === 0) {
        const linhas = conteudoTexto.split(/\r?\n/).filter(line => line.trim() !== '');
        linhas.forEach((line) => {
            if (!line.includes('x+')) return;
            
            const posX = line.indexOf('x+');
            const posY = line.indexOf('y+');
            const posZ = line.indexOf('z+');

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
