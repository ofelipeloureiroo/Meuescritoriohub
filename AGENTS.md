# Regras e Diretrizes do Projeto - Meu Escritório Online

## Regra Fundamental: Preservação Absoluta de Dados dos Assinantes (Zero Data Loss Mandate)

Nenhum dado gerado por assinantes/usuários (projetos, propostas, contratos, registros financeiros, clientes, templates da empresa, configurações do escritório, etapas, tarefas, etc.) pode ser perdido ou limpo sem permissão explícita.

### Diretrizes de Persistência e Segurança:

1. **Estratégia de Persistência Híbrida (Dual Persistence Strategy):**
   - Todos os dados criados, editados ou excluídos devem ser sincronizados em tempo real com o **Firebase Firestore**.
   - Em caso de falha de rede ou oscilação de conexão, os dados devem ser mantidos imediatamente e em tempo integral no **`localStorage` do navegador** como fallback resiliente.
   - Operações de leitura/carregamento inicial devem mesclar de forma inteligente os dados locais e os dados do servidor Firestore para evitar que alterações offline sejam sobrescritas por estados vazios.

2. **Proibição de Reset ou Limpeza Automática:**
   - Nunca executar limpezas cegas ou substituições destrutivas (`localStorage.clear()` ou substituição direta de coleções sem merge) durante inicializações ou migrações de versão.
   - Atualizações de estrutura de banco ou esquema (migrations) devem preservar retrospectivamente todas as propriedades legadas existentes.

3. **Confirmação e Soft Delete para Operações Destrutivas:**
   - Ações de exclusão acionadas pelo usuário devem sempre solicitar confirmação explícita no aplicativo.
   - Sempre que aplicável, priorizar o arquivamento ou flags de inatividade em vez de deletar fisicamente registros valiosos do banco.
