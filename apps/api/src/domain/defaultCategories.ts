export type DefaultCategory = {
  name: string;
  kind: "domestic" | "commercial";
  priority: "essential" | "important" | "cuttable";
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Doméstico
  { name: "Moradia", kind: "domestic", priority: "essential" },
  { name: "Alimentação", kind: "domestic", priority: "essential" },
  { name: "Transporte", kind: "domestic", priority: "essential" },
  { name: "Saúde", kind: "domestic", priority: "essential" },
  { name: "Educação", kind: "domestic", priority: "important" },
  { name: "Lazer", kind: "domestic", priority: "cuttable" },
  { name: "Contas", kind: "domestic", priority: "essential" },
  { name: "Assinaturas", kind: "domestic", priority: "important" },
  { name: "Imprevistos", kind: "domestic", priority: "essential" },

  // Comercial
  { name: "Fornecedores", kind: "commercial", priority: "essential" },
  { name: "Marketing", kind: "commercial", priority: "important" },
  { name: "Operação", kind: "commercial", priority: "essential" },
  { name: "Impostos", kind: "commercial", priority: "essential" },
  { name: "Ferramentas", kind: "commercial", priority: "important" },
  { name: "Transporte (Comercial)", kind: "commercial", priority: "important" },
  { name: "Pró-labore", kind: "commercial", priority: "essential" },
  { name: "Estoque", kind: "commercial", priority: "essential" },
  { name: "Serviços", kind: "commercial", priority: "essential" }
];

