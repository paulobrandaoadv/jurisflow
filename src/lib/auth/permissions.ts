export const ROLES = ["admin", "advogado", "assistente", "consulta"] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "clientes:ler",
  "clientes:escrever",
  "processos:ler",
  "processos:escrever",
  "documentos:ler",
  "documentos:escrever",
  "usuarios:gerenciar",
  "auditoria:ler",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_MATRIX: Record<Role, readonly Permission[]> = {
  admin: [
    "clientes:ler",
    "clientes:escrever",
    "processos:ler",
    "processos:escrever",
    "documentos:ler",
    "documentos:escrever",
    "usuarios:gerenciar",
    "auditoria:ler",
  ],
  advogado: [
    "clientes:ler",
    "clientes:escrever",
    "processos:ler",
    "processos:escrever",
    "documentos:ler",
    "documentos:escrever",
  ],
  assistente: [
    "clientes:ler",
    "clientes:escrever",
    "processos:ler",
    "processos:escrever",
    "documentos:ler",
    "documentos:escrever",
  ],
  consulta: ["clientes:ler", "processos:ler", "documentos:ler"],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  advogado: "Advogado",
  assistente: "Assistente",
  consulta: "Consulta",
};
