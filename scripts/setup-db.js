// Cria a tabela de respostas do Formulário A, se ainda não existir.
// Uso: npx dotenv -e .env.local -- node scripts/setup-db.js
const { neon } = require('@neondatabase/serverless');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não encontrada no ambiente (rode via dotenv -e .env.local)');
  }
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS responses (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      consent TEXT,
      payload JSONB NOT NULL
    )
  `;

  console.log('Tabela "responses" pronta.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
