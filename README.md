# Jéssica Laysa Acessórios

Loja online de semi joias e óculos. O catálogo, as categorias e os banners ficam no Supabase. As compras são finalizadas pelo WhatsApp.

## Tecnologias

- **[Vite](https://vite.dev/)**: servidor de desenvolvimento e build de produção.
- **JavaScript em módulos (ES Modules)**: sem framework de UI.
- **[Supabase](https://supabase.com/)**: banco Postgres, login do painel admin e armazenamento de fotos.
- **[SheetJS (xlsx)](https://sheetjs.com/)**: importação e exportação de planilhas no admin. Só é baixado quando usado.
- **ESLint**: verificação do código.
- **Netlify**: hospedagem. O build está configurado em `netlify.toml`.

## Como rodar

Requer **Node.js 20 ou mais recente**.

```bash
npm install       # instala as dependências
npm run dev       # abre o site em http://localhost:5173 com recarga automática
npm run build     # gera a versão de produção na pasta dist/
npm run preview   # serve a pasta dist/ para conferir o build
npm run lint      # verifica o código
```

## Estrutura

```
├── index.html              # marcação das páginas (header, seções, rodapé)
├── public/                 # arquivos servidos como estão (fotos, logo)
├── src/
│   ├── main.js             # ponto de entrada: carrega estilos, módulos e o catálogo
│   ├── styles/
│   │   ├── base.css        # tokens de design (cores, fontes), reset
│   │   ├── components.css  # botões, card de produto, WhatsApp flutuante
│   │   ├── layout.css      # header, menu mobile, seções, rodapé
│   │   ├── home.css        # seções da home
│   │   ├── catalog.css     # catálogo completo
│   │   ├── product.css     # página do produto
│   │   └── admin.css       # painel administrativo
│   └── js/
│       ├── config.js       # número do WhatsApp, Instagram
│       ├── store.js        # estado compartilhado (produtos, categorias, filtros)
│       ├── lib/
│       │   ├── supabase.js # cliente Supabase e upload/compressão de fotos
│       │   └── product.js  # preços, parcelas, variações, subcategorias
│       ├── data/api.js     # leitura e gravação de produtos, categorias e banners
│       ├── ui/
│       │   ├── catalog.js       # cards, filtros, vitrines, categorias
│       │   ├── product-page.js  # página do produto (galeria, zoom, relacionados)
│       │   ├── hero.js          # carrossel do topo
│       │   ├── layout.js        # header, menu mobile, animações, contato
│       │   └── theme.js         # tema claro/escuro
│       └── admin/admin.js  # painel administrativo
├── supabase/schema.sql     # tabelas e permissões do banco
├── docs/                   # logo original
└── netlify.toml            # configuração de build e cache do Netlify
```

## Configuração

O site usa o projeto Supabase **JessicaSemiJoias** por padrão. Para apontar para outro projeto, copie `.env.example` para `.env` e preencha os valores. No Netlify, as mesmas variáveis vão em *Site configuration → Environment variables*.

O número do WhatsApp fica em `src/js/config.js` e nos links do `index.html`.

## Publicação

O Netlify roda `npm run build` e publica a pasta `dist/`. Se o site estiver ligado ao GitHub, cada push no `main` publica automaticamente.
