/**
 * Remove os dados de teste acumulados no banco (usuários "Aluno Teste",
 * instituições "Instituição Teste ...", canteiros "Canteiro Teste ...", etc.)
 * e tudo que depende deles.
 *
 *   node scripts/limpar-dados-teste.cjs              # PREVIEW, não altera nada
 *   node scripts/limpar-dados-teste.cjs --executar   # aplica, em uma transação
 *
 * Por que existe: as FKs do projeto são ON DELETE RESTRICT, então não dá para
 * apagar um usuário sem antes remover, na ordem certa, measurements/checklists/
 * photos -> formulários -> relatórios -> listas -> vínculos -> canteiros.
 *
 * Segurança: os e-mails em MANTER_EMAILS nunca são tocados. Revise essa lista
 * antes de rodar.
 */
require('dotenv/config');
const { Client } = require('pg');

const EXECUTAR = process.argv.includes('--executar');

// Pessoas reais — nunca remover.
const MANTER_EMAILS = [
  'deivysonr52@gmail.com',
  'merciobueno@gmail.com',
  'Guilhermepdo2013@gmail.com',
  'Iwersongss@gmail.com',
];

// Canteiros claramente sintéticos (regex case-insensitive sobre o nome).
const PADRAO_CANTEIRO_TESTE = '^(canteiro teste|canteiro de teste|testecanteiro|six seven)';

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
  await c.connect();
  const q = (s, p) => c.query(s, p).then((r) => r.rows);
  const manter = `(${MANTER_EMAILS.map((_, i) => '$' + (i + 1)).join(',')})`;

  const usuarios = await q(`select id, name, email from "User" where email not in ${manter} order by email`, MANTER_EMAILS);
  const idsUsuarios = usuarios.map((u) => u.id);

  const canteiros = await q(`select id, name from "Canteiro" where name ~* $1 order by name`, [PADRAO_CANTEIRO_TESTE]);
  const idsCanteiros = canteiros.map((x) => x.id);

  const instituicoes = await q(`select id, name from "Institution" where name like 'Instituição Teste%' order by name`);
  const idsInst = instituicoes.map((x) => x.id);

  const listas = await q(
    `select id from "ListaDeFormularios" where canteiro_id = any($1) or created_by = any($2)`,
    [idsCanteiros, idsUsuarios],
  );
  const idsListas = listas.map((x) => x.id);

  const formularios = await q(
    `select id, observations from "Formulario" where list_id = any($1) or user_id = any($2)`,
    [idsListas, idsUsuarios],
  );
  const idsForms = formularios.map((x) => x.id);

  const relatorios = await q(
    `select id from "Relatorio" where list_id = any($1) or user_id = any($2) or canteiro_id = any($3)`,
    [idsListas, idsUsuarios, idsCanteiros],
  );
  const idsRel = relatorios.map((x) => x.id);

  const conta = async (t, col, ids) => (await q(`select count(*)::int n from "${t}" where "${col}" = any($1)`, [ids]))[0].n;

  console.log('================ SERÁ REMOVIDO ================');
  console.log(`\nUsuários (${usuarios.length}):`);
  usuarios.forEach((u) => console.log(`   ${u.email.padEnd(34)} ${u.name}`));
  console.log(`\nInstituições (${instituicoes.length}):`);
  instituicoes.forEach((i) => console.log(`   ${i.name}`));
  console.log(`\nCanteiros (${canteiros.length}):`);
  canteiros.forEach((x) => console.log(`   ${x.name}`));
  console.log(`\nListas: ${listas.length} | Formulários: ${formularios.length} | Relatórios: ${relatorios.length}`);
  console.log(
    `Filhos arrastados -> measurements: ${await conta('Measurement', 'form_id', idsForms)}` +
      ` | checklists: ${await conta('Checklist', 'form_id', idsForms)}` +
      ` | photos: ${await conta('Photo', 'form_id', idsForms)}`,
  );

  console.log('\n================ SERÁ MANTIDO ================');
  (await q(`select email, name from "User" where email in ${manter}`, MANTER_EMAILS))
    .forEach((u) => console.log(`   ${u.email.padEnd(34)} ${u.name}`));
  const cantOk = await q(`select name from "Canteiro" where id <> all($1) order by name`, [idsCanteiros]);
  console.log(`   canteiros: ${cantOk.map((x) => x.name).join(', ')}`);
  const formOk = await q(`select count(*)::int n from "Formulario" where id <> all($1)`, [idsForms]);
  const medOk = await q(`select count(*)::int n from "Measurement" where form_id <> all($1)`, [idsForms]);
  console.log(`   formulários: ${formOk[0].n} | measurements: ${medOk[0].n}`);

  if (!EXECUTAR) {
    console.log('\n>>> PREVIEW — nada foi alterado. Rode com --executar para aplicar.');
    await c.end();
    return;
  }

  await c.query('BEGIN');
  try {
    const del = async (label, sql, params) => {
      const r = await c.query(sql, params);
      console.log(`   ${label.padEnd(24)} ${r.rowCount}`);
    };
    console.log('\n================ EXECUTANDO ================');
    await del('ResumoIA', `delete from "ResumoIA" where list_id = any($1) or user_id = any($2)`, [idsListas, idsUsuarios]);
    await del('Measurement', `delete from "Measurement" where form_id = any($1)`, [idsForms]);
    await del('Checklist', `delete from "Checklist" where form_id = any($1)`, [idsForms]);
    await del('Photo', `delete from "Photo" where form_id = any($1)`, [idsForms]);
    await del('Relatorio', `delete from "Relatorio" where id = any($1)`, [idsRel]);
    await del('Formulario', `delete from "Formulario" where id = any($1)`, [idsForms]);
    await del('ListaDeFormularios', `delete from "ListaDeFormularios" where id = any($1)`, [idsListas]);
    await del('UserCanteiro', `delete from "UserCanteiro" where canteiro_id = any($1) or user_id = any($2)`, [idsCanteiros, idsUsuarios]);
    await del('AlunoTurma', `delete from "AlunoTurma" where user_id = any($1)`, [idsUsuarios]);
    await del('Canteiro', `delete from "Canteiro" where id = any($1)`, [idsCanteiros]);
    await del('RefreshToken', `delete from "RefreshToken" where "userId" = any($1)`, [idsUsuarios]);
    await del('Turma', `delete from "Turma" where created_by = any($1)`, [idsUsuarios]);
    await del('User', `delete from "User" where id = any($1)`, [idsUsuarios]);
    await del('Institution', `delete from "Institution" where id = any($1)`, [idsInst]);
    await c.query('COMMIT');
    console.log('\n>>> COMMIT concluído.');
  } catch (e) {
    await c.query('ROLLBACK');
    console.error('\n>>> ROLLBACK — nada foi alterado:', e.message);
    process.exitCode = 1;
  }
  await c.end();
})();
