// Texto do "relatório simples": todos os formulários da lista, em ordem
// cronológica e organizados por semana, sem IA. Só descreve o que está
// registrado — nada é inventado ou interpretado.

const CLIMA: Record<string, string> = { SOL: 'sol', NUBLADO: 'nublado', CHUVA: 'chuva' };

const ESTADIO: Record<string, string> = {
  VEGETATIVO: 'vegetativo',
  ELONGACAO: 'elongação',
  FLORESCIMENTO: 'florescimento',
};

// Os 5 itens fixos do checklist de manejo, na ordem do formulário.
const MANEJO: Array<{ campo: string; rotulo: string }> = [
  { campo: 'checklist_irrigacao', rotulo: 'irrigação' },
  { campo: 'checklist_capina', rotulo: 'capina' },
  { campo: 'checklist_adubacao', rotulo: 'adubação de cobertura' },
  { campo: 'checklist_plantio', rotulo: 'plantio/replantio' },
  { campo: 'checklist_pragas', rotulo: 'controle de pragas' },
];

// A data do registro é gravada à meia-noite UTC: formatar em UTC evita
// que o fuso do servidor mude o dia.
function formatarData(data: Date): string {
  const dia = String(data.getUTCDate()).padStart(2, '0');
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${data.getUTCFullYear()}`;
}

function blocoDoFormulario(f: any, indice: number, varios: boolean): string {
  const data: Date = f.date ?? f.createdAt;
  const titulo = `${f.week != null ? `Semana ${f.week}` : `Registro ${indice + 1}`} — ${formatarData(data)}`;
  const linhas: string[] = [titulo];

  const condicoes: string[] = [];
  if (f.weather) condicoes.push(`Clima: ${CLIMA[f.weather] ?? f.weather}.`);
  if (f.phenological_stage) {
    condicoes.push(`Estádio fenológico: ${ESTADIO[f.phenological_stage] ?? f.phenological_stage}.`);
  }
  if (typeof f.estimated_height_cm === 'number') {
    condicoes.push(`Altura estimada: ${f.estimated_height_cm} cm.`);
  }
  if (condicoes.length > 0) linhas.push(condicoes.join(' '));

  const feitos = MANEJO.filter((item) => f[item.campo] === true).map((item) => item.rotulo);
  linhas.push(
    feitos.length > 0
      ? `Manejo realizado: ${feitos.join(', ')}.`
      : 'Manejo realizado: nenhuma atividade marcada.',
  );

  linhas.push(`Fotos registradas: ${f.photos?.length ?? 0}.`);

  const observacoes = typeof f.observations === 'string' ? f.observations.trim() : '';
  if (observacoes) linhas.push(`Observações: ${observacoes}`);

  if (varios && f.user?.name) linhas.push(`Registrado por: ${f.user.name}.`);

  return linhas.join('\n');
}

export function montarTextosSimples(lista: any, formularios: any[]) {
  const datas: Date[] = formularios.map((f) => f.date ?? f.createdAt);
  const total = formularios.length;
  const varios = new Set(formularios.map((f) => f.user_id)).size > 1;

  const introduction =
    `Este relatório reúne, de forma organizada, ${total === 1 ? 'o registro' : `os ${total} registros`} ` +
    `do canteiro "${lista.canteiro.name}" (${lista.plant.name}), ` +
    `realizados entre ${formatarData(datas[0])} e ${formatarData(datas[datas.length - 1])}.`;

  const development = formularios
    .map((f, indice) => blocoDoFormulario(f, indice, varios))
    .join('\n\n');

  return { introduction, development };
}
