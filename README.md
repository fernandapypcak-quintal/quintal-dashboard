# 🔥 Quintal do Espeto — Executive Dashboard

Dashboard executivo premium para análise de faturamento, construído com React + Tailwind + Recharts.

---

## 🚀 Rodando Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/quintal-dashboard.git
cd quintal-dashboard

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev

# 4. Acesse em http://localhost:3000
```

---

## 📦 Build para Produção

```bash
npm run build
npm run preview  # testar o build localmente
```

---

## ☁️ Deploy no Vercel

### Opção 1 — Via CLI

```bash
npm install -g vercel
vercel --prod
```

### Opção 2 — Via GitHub

1. Faça push do projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → "New Project"
3. Importe o repositório
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Clique em **Deploy**

---

## 📊 Usando seu CSV Real

O projeto usa dados de exemplo gerados automaticamente. Para usar seu CSV real:

### Método 1 — CSV estático (recomendado)

1. Coloque seu arquivo CSV em `public/data.csv`
2. Edite `src/data/mockData.js`:

```js
import Papa from 'papaparse';

export async function loadData() {
  return new Promise((resolve) => {
    Papa.parse('/data.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
    });
  });
}
```

3. No `src/hooks/useFilters.js`, substitua o import de `rawData` por uma chamada assíncrona com `useState` + `useEffect`.

### Método 2 — Upload pelo usuário

Use o hook `parseCSVFile` de `src/hooks/useCSV.js` com um `<input type="file">` para carregar o CSV dinamicamente.

---

## 🗂️ Estrutura do Projeto

```
quintal-dashboard/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx       # Navegação lateral
│   │   │   └── Header.jsx        # Cabeçalho + filtros globais
│   │   ├── pages/
│   │   │   ├── Overview.jsx      # Visão Geral
│   │   │   ├── Trend.jsx         # Tendência
│   │   │   ├── YoY.jsx           # Ano vs Ano
│   │   │   ├── Weekly.jsx        # Semanal
│   │   │   ├── Stores.jsx        # Por Loja
│   │   │   └── History.jsx       # Histórico
│   │   └── ui/
│   │       ├── KpiCard.jsx       # Cards de KPI
│   │       └── ChartTooltip.jsx  # Tooltips dos gráficos
│   ├── data/
│   │   └── mockData.js           # Dados de exemplo (substitua pelo CSV)
│   ├── hooks/
│   │   ├── useFilters.js         # Context de filtros globais
│   │   └── useCSV.js             # Loader de CSV real
│   ├── utils/
│   │   └── formatters.js         # Formatação BRL, %, cálculos
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── vercel.json
```

---

## 🎨 Design System

| Token | Valor | Uso |
|-------|-------|-----|
| `brand-olive` | `#97A624` | Primário / Casa |
| `brand-yellow` | `#D9CB04` | Destaque |
| `brand-amber` | `#D9B504` | Delivery |
| `brand-crimson` | `#8C1414` | Alertas |
| `brand-black` | `#0D0D0D` | Texto principal |
| `surface-base` | `#FAFAF8` | Fundo da página |
| `surface-card` | `#FFFFFF` | Cards |

---

## 📋 Páginas Disponíveis

| Página | Descrição |
|--------|-----------|
| **Visão Geral** | KPIs principais, gráfico mensal, distribuição canal, dia da semana |
| **Tendência** | Curva histórica, média móvel 3M, taxa de crescimento, últimos 30 dias |
| **Ano vs Ano** | Comparativo YoY mensal, totais anuais, tabela resumo |
| **Semanal** | KPIs semanais, histórico 8 semanas, padrão por dia |
| **Por Loja** | Ranking de lojas, evolução mensal, radar chart |
| **Histórico** | Tabela completa ordenável, exportar CSV |

---

## 📄 Licença

MIT — use à vontade!
