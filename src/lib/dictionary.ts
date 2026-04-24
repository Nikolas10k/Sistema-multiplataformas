type Niche = 'RESTAURANT' | 'PHYSIOTHERAPY' | 'RETAIL' | 'GENERAL';

const dictionaries: Record<Niche, Record<string, string>> = {
  RESTAURANT: {
    'customer': 'Cliente',
    'patients': 'Clientes',
    'appointment': 'Reserva',
    'clinical_file': 'Ficha de Consumo',
    'evolution': 'Pedido',
    'product': 'Produto/Prato',
    'stock': 'Estoque de Insumos',
  },
  PHYSIOTHERAPY: {
    'customer': 'Paciente',
    'patients': 'Pacientes',
    'appointment': 'Sessão',
    'clinical_file': 'Prontuário Eletrônico',
    'evolution': 'Evolução Clínica',
    'product': 'Serviço/Pacote',
    'stock': 'Materiais Médicos',
  },
  RETAIL: {
    'customer': 'Cliente',
    'patients': 'Clientes',
    'appointment': 'Venda Assistida',
    'clinical_file': 'Histórico de Compras',
    'evolution': 'Orçamento',
    'product': 'Mercadoria',
    'stock': 'Estoque de Venda',
  },
  GENERAL: {
    'customer': 'Cliente',
    'patients': 'Clientes',
    'appointment': 'Agendamento',
    'clinical_file': 'Ficha Cadastral',
    'evolution': 'Acompanhamento',
    'product': 'Item',
    'stock': 'Almoxarifado',
  }
};

export function getTerm(key: string, niche: string = 'GENERAL'): string {
  const n = (niche.toUpperCase() as Niche) || 'GENERAL';
  const dict = dictionaries[n] || dictionaries.GENERAL;
  return dict[key] || key;
}

export function getDictionary(niche: string = 'GENERAL') {
  const n = (niche.toUpperCase() as Niche) || 'GENERAL';
  return dictionaries[n] || dictionaries.GENERAL;
}
