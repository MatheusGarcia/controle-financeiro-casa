import { prisma } from "@/lib/prisma";

const initialCategories = [
  ["Moradia", "aluguel, condomínio, energia e internet"],
  ["Mercado e alimentação", "mercado, padaria e refeições"],
  ["Transporte e combustível", "combustível, estacionamento e transporte"],
  ["Cadelas", "ração, banho, creche, consulta e medicamentos"],
  ["Lazer e fim de semana", "passeios, restaurantes e entretenimento"],
  ["Assinaturas", "serviços digitais recorrentes"],
  ["Saúde e bem-estar", "saúde, esporte e autocuidado"],
  ["Viagens", "passagens, hospedagem e despesas de viagem"],
  ["Outros", "itens não classificados"],
] as const;

export async function ensureInitialCategories() {
  await prisma.category.createMany({
    data: initialCategories.map(([name, group]) => ({ name, group })),
    skipDuplicates: true,
  });
}
