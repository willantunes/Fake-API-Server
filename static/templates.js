document.addEventListener('DOMContentLoaded', () => {
  const templateSpecs = [
    {
      path: '/users', method: 'GET', description: 'Lista todos os usuários', statusCode: '200', responseType: 'json', body: JSON.stringify({
        users: [
          { id: 1, name: "João Silva", email: "joao@example.com", role: "admin" },
          { id: 2, name: "Maria Souza", email: "maria@example.com", role: "user" },
          { id: 3, name: "Carlos Pereira", email: "carlos@example.com", role: "user" }
        ],
        pagination: { page: 1, perPage: 10, total: 3, pages: 1 }
      }, null, 2) },
    { path: '/auth', method: 'GET', description: 'Login, logout, refresh token e registro de usuários', statusCode: '200', responseType: 'json', body: JSON.stringify({
        success: true,
        data: {
          token: "{{token}}", refreshToken: "{{refreshToken}}",
          user: { id: "{{userId}}", name: "{{userName}}", email: "{{userEmail}}", role: "{{userRole}}" }
        }
      }, null, 2)
    },
    { path: '/products', method: 'GET', description: 'Listar produtos, filtrar categorias, obter detalhes e preços', statusCode: '200', responseType: 'json', body: JSON.stringify({
        products: [
          { id: 1, name: "Product 1", category: "Category A", price: 10.00 },
          { id: 2, name: "Product 2", category: "Category B", price: 15.00 },
          { id: 3, name: "Product 3", category: "Category A", price: 20.00 }
        ],
        pagination: { page: 1, perPage: 10, total: 3, pages: 1 }
      }, null, 2)
    },
    { path: '/financeiro/pagamentos', method: 'GET', description: 'Listar transações financeiras', statusCode: '200', responseType: 'json', body: JSON.stringify({
        transacoes: [
          { id: 1, valor: 1500.50, data: "{{date}}", status: "liquidado" },
          { id: 2, valor: 750.00, data: "{{date}}", status: "pendente" }
        ]
      }, null, 2)
    },
    { path: '/estoque/itens', method: 'GET', description: 'Listar itens de estoque', statusCode: '200', responseType: 'json', body: JSON.stringify({
        itens: [
          { id: 1, produto: "Camiseta", quantidade: 100, localizacao: "A1" },
          { id: 2, produto: "Calça", quantidade: 50, localizacao: "B2" }
        ]
      }, null, 2)
    },
    { path: '/crm/contatos', method: 'GET', description: 'Listar contatos do CRM', statusCode: '200', responseType: 'json', body: JSON.stringify({
        contatos: [
          { id: 1, nome: "Ana", email: "ana@empresa.com", empresa: "ACME" },
          { id: 2, nome: "Bruno", email: "bruno@empresa.com", empresa: "Globex" }
        ]
      }, null, 2)
    },
    { path: '/rh/folha_ponto', method: 'GET', description: 'Dados de folha de ponto de funcionários', statusCode: '200', responseType: 'json', body: JSON.stringify({
        registros: [
          { funcionarioId: 1, data: "{{date}}", entrada: "08:00", saida: "17:00" },
          { funcionarioId: 2, data: "{{date}}", entrada: "09:00", saida: "18:00" }
        ]
      }, null, 2)
    },
    { path: '/webhook/pagamentos', method: 'POST', description: 'Receber notificações de pagamentos', statusCode: '200', responseType: 'json', body: JSON.stringify({
        sucesso: true, evento: "pagamento_recebido", transacaoId: "{{uuid}}", valor: 99.90, data: "{{date}}"
      }, null, 2)
    }
  ];

  const cards = document.querySelectorAll('#templates-tab .cursor-pointer');
  cards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      const spec = templateSpecs[idx];
      ['path','method','description','statusCode','responseType'].forEach(field => {
        const el = document.getElementById(field);
        if (el) el.value = spec[field];
      });
      const bodyEl = document.getElementById('body');
      if (bodyEl) bodyEl.value = spec.body;
      // After applying template, switch to the Configuração tab
      const configBtn = document.querySelector('[data-tab="config"]');
      if (configBtn) configBtn.click();
    });
  });
}); 