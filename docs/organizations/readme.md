# Gestão de Organizações (Multi-Tenant)

O sistema de organizações permite que usuários criem e colaborem em equipes/empresas com isolamento lógico de recursos.

## Rotas do Módulo

*   **Listar Equipes** (`GET /api/teams`): Retorna todas as equipes às quais o usuário logado pertence.
*   **Criar Equipe** (`POST /api/teams`): Cria uma nova organização no banco e vincula o criador com a permissão de proprietário (`owner`).
    *   *Payload:* `{ "name": "Minha Equipe", "slug": "minha-equipe" }`
*   **Membros da Equipe** (`GET /api/teams/[id]/members`): Retorna a lista de membros atuais e convites pendentes.
*   **Convidar Membro** (`POST /api/teams/[id]/members`): Envia um convite (tokenizado e seguro) para um e-mail com papel definido (`admin`, `member`, `viewer`).
    *   *Payload:* `{ "email": "usuario@empresa.com", "role": "member" }`
*   **Remover Membro ou Cancelar Convite** (`DELETE /api/teams/[id]/members`): Permite excluir membros ou cancelar convites pendentes.
    *   *Payload:* `{ "userIdToDelete": "usr_...", "invitationIdToDelete": "inv_..." }`
*   **Aceitar Convite** (`POST /api/teams/[id]/invite/accept`): Permite a um usuário aceitar o convite usando o token seguro gerado.
    *   *Payload:* `{ "token": "secure_invite_token_..." }`

## Controle de Acesso (RBAC)

O papel (`role`) do membro na organização determina as permissões de gerência:
1.  **owner**: Acesso total, pode convidar administradores/membros e excluir a organização. Não pode ser removido por terceiros.
2.  **admin**: Pode convidar e remover membros e visualizadores. Não pode remover o `owner` ou outros administradores.
3.  **member**: Acesso a recursos da equipe, sem permissões administrativas.
4.  **viewer**: Acesso apenas-leitura aos recursos da equipe.
