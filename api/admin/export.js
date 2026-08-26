const { getSql } = require('../../lib/db');
const { isAuthenticated } = require('../../lib/auth');

// Achata objetos/arrays aninhados (ex.: q11.experiencia.discurso) em colunas
// simples de planilha, sem precisar conhecer o formato de cada pergunta.
function flatten(value, prefix, out) {
  if (value === null || value === undefined) {
    out[prefix] = '';
  } else if (Array.isArray(value)) {
    out[prefix] = value.join('; ');
  } else if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      flatten(value[key], prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out[prefix] = String(value);
  }
  return out;
}

// ";" em vez de "," — o Excel em locale pt-BR (e a maioria dos locales
// europeus) usa "," como separador decimal, então trata "," como separador
// de coluna só quando o CSV vem em locale en-US; com "," ele empilha tudo
// numa célula só. ";" é o separador de lista padrão do Excel em pt-BR.
const DELIMITER = ';';

function csvEscape(value) {
  const resolved = value instanceof Date ? value.toISOString() : value;
  const str = resolved === undefined || resolved === null ? '' : String(resolved);
  if (new RegExp(`["${DELIMITER}\\n\\r]`).test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, message: 'Método não permitido' });
    return;
  }
  if (!isAuthenticated(req)) {
    res.status(401).json({ ok: false, message: 'Não autenticado' });
    return;
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, created_at, consent, payload
      FROM responses
      ORDER BY created_at ASC
    `;

    const baseColumns = ['id', 'created_at', 'consent'];
    const flatRows = rows.map((row) => {
      const flat = flatten(row.payload && row.payload.respostas, '', {});
      return { id: row.id, created_at: row.created_at, consent: row.consent, ...flat };
    });

    const dynamicColumns = new Set();
    for (const row of flatRows) {
      for (const key of Object.keys(row)) {
        if (!baseColumns.includes(key)) dynamicColumns.add(key);
      }
    }
    const columns = baseColumns.concat([...dynamicColumns].sort());

    const lines = [columns.map(csvEscape).join(DELIMITER)];
    for (const row of flatRows) {
      lines.push(columns.map((col) => csvEscape(row[col])).join(DELIMITER));
    }
    // BOM (﻿): sem isso o Excel abre o arquivo assumindo Windows-1252 e
    // quebra os acentos, mesmo o conteúdo sendo UTF-8 válido.
    const csv = '﻿' + lines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="respostas-pesquisa-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csv);
  } catch (err) {
    console.error('[api/admin/export] erro:', err);
    res.status(500).json({ ok: false, message: 'Erro ao exportar respostas' });
  }
};
