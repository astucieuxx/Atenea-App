# Atenea - Copiloto de Jurisprudencia en México

## Overview
Atenea is a Mexican LegalTech MVP that helps lawyers analyze legal cases, identify relevant jurisprudence (tesis), and generate conservative legal arguments. It is NOT a generic chatbot but a "senior Mexican lawyer guiding your reasoning on jurisprudence and tesis."

## Tech Stack
- **Frontend**: React + Tailwind CSS + shadcn/ui components
- **Backend**: Node.js + Express
- **Data**: CSV-loaded Mexican jurisprudence (7000+ tesis)
- **Reasoning**: Rule-based legal scoring algorithm (no LLM calls)

## Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── theme-provider.tsx
│   │   ├── header.tsx
│   │   ├── fuerza-badge.tsx
│   │   ├── tesis-card.tsx
│   │   ├── argument-modal.tsx
│   │   └── loading-skeleton.tsx
│   ├── pages/
│   │   ├── home.tsx         # Case input screen
│   │   ├── analysis.tsx     # Analysis results
│   │   ├── tesis-detail.tsx # Tesis detail view
│   │   ├── history.tsx      # Case history
│   │   └── not-found.tsx
│   ├── hooks/
│   ├── lib/
│   └── App.tsx
server/
├── csv-loader.ts            # Parses CSV jurisprudence data
├── legal-reasoning.ts       # Scoring and argument generation
├── storage.ts               # In-memory storage
├── routes.ts                # API endpoints
└── index.ts
shared/
└── schema.ts                # TypeScript types and Zod schemas
```

## Key Features
1. **Case Analysis**: User describes a legal problem, system identifies the legal issue
2. **Jurisprudence Search**: Scores and ranks relevant tesis from CSV data
3. **Strength Labels**: Fuerza Alta/Media/Baja based on type, instancia, epoca
4. **Detail View**: Tabbed view with executive summary, official text, usage guidance
5. **Argument Generation**: Creates conservative legal paragraphs with proper citations
6. **Case History**: Stores analyzed cases for future reference

## API Endpoints
- `POST /api/analyze` - Analyze a legal case description
- `GET /api/analysis/:id` - Get analysis by ID
- `GET /api/tesis/:id` - Get tesis details
- `POST /api/arguments` - Generate legal argument
- `GET /api/history` - Get case history
- `GET /api/tesis` - Search all tesis

## Legal Reasoning Algorithm
The scoring system considers:
- **Type**: Jurisprudencia (+40) vs Tesis Aislada (+15)
- **Instancia**: SCJN/Pleno (+30), Salas (+25), Tribunales Colegiados (+20)
- **Época**: Décima/Onceava (+20), Novena (+10), Earlier (+5)
- **Materia Match**: Exact (+25), Partial (+10)
- **Antigüedad**: <10 years (+10), 10-25 years (+5), >25 years (+0)

## Design Guidelines
- Professional, conservative, law-firm-grade aesthetic
- Dark blue primary color palette
- White/light gray backgrounds
- Merriweather serif font for legal text
- IBM Plex Sans for UI text
- Minimal animations, focus on readability

## Development
- Run: `npm run dev`
- Frontend: http://localhost:5000
- Backend: Express on same port with Vite proxy

## User Preferences
- Language: Spanish (Mexican legal terminology)
- Target users: Mexican litigating lawyers
- Priority: Legal trust > UX clarity > Reasoning flow > Tech sophistication
