import { getDashboardData } from "@/actions/dashboard";
import { getMyTenantContext } from "@/actions/features";
import PrintClient from "./PrintClient";

export default async function PrintReportPage({ searchParams }: { searchParams: { tipo: string } }) {
  const params = await searchParams;
  const tipo = params.tipo || 'geral';
  
  const context = await getMyTenantContext();
  const data = await getDashboardData('monthly');

  const currentDate = new Date().toLocaleDateString('pt-BR');
  const tenantName = context?.tenantName || 'Relatório Gerencial';
  const document = context?.config?.document || 'Não informado';
  const phone = context?.config?.phone || 'Não informado';

  return (
    <div className="print-container" style={{ padding: '40px', backgroundColor: '#fff', minHeight: '100vh', color: '#000' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
        }
      `}} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            {tenantName}
          </h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>CNPJ: {document} • Tel: {phone}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'normal', margin: 0, color: '#333' }}>
            {tipo.toUpperCase()}
          </h2>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Gerado em: {currentDate}</p>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Resumo Financeiro</h3>
        <div style={{ display: 'flex', gap: '40px' }}>
          <div>
            <p style={{ margin: 0, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Faturamento Bruto</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>R$ {data.stats.revenue.toFixed(2)}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Total de Operações</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{data.stats.orders}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontSize: '12px', textTransform: 'uppercase' }}>Ticket Médio</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>R$ {data.stats.avgTicket.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Últimas Movimentações / Vendas</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>ID / Mesa</th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Data / Hora</th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #ddd' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.length > 0 ? data.recentOrders.map((order: any) => (
              <tr key={order.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>#{order.id} {order.table ? `- Mesa ${order.table}` : ''}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{order.time || new Date(order.createdAt).toLocaleString()}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{order.status}</td>
                <td style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #eee' }}>R$ {order.total.toFixed(2)}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Nenhum registro encontrado neste período.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PrintClient />
    </div>
  );
}
