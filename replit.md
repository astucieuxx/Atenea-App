# Atenea - Copiloto de Jurisprudencia en México

## Overview
Atenea is a Mexican LegalTech MVP that helps lawyers analyze legal cases, identify relevant jurisprudence (tesis), and generate conservative legal arguments. It is NOT a generic chatbot but a "senior Mexican lawyer guiding your reasoning on jurisprudence and tesis."

## Tech Stack
- **Frontend**: React + Tailwind CSS + shadcn/ui components
- **Backend**: Node.js + Express
- **Data**: CSV-loaded Mexican jurisprudence (7000+ tesis)
- **Reasoning**: Three-dimensional rule-based scoring algorithm (no LLM calls)

## Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn components
│   │   ├── theme-provider.tsx
│   │   ├── header.tsx
│   │   ├── fuerza-badge.tsx
│   │   ├── tesis-card.tsx
│   │   ├── tesis-detail-modal.tsx # Three-tab modal with insights
│   │   ├── argument-modal.tsx
│   │   └── loading-skeleton.tsx
│   ├── pages/
│   │   ├── home.tsx               # Case input screen
│   │   ├── analysis.tsx           # Analysis results
│   │   ├── history.tsx            # Case history
│   │   └── not-found.tsx
│   ├── hooks/
│   ├── lib/
│   └── App.tsx
server/
├── csv-loader.ts                  # Parses CSV jurisprudence data
├── legal-reasoning.ts             # Three-dimensional scoring engine
├── storage.ts                     # In-memory storage
├── routes.ts                      # API endpoints
└── index.ts
shared/
└── schema.ts                      # TypeScript types and Zod schemas
```

## Key Features
1. **Case Classification**: Formal identification of materia, vía procesal, and problema jurídico
2. **Three-Dimensional Scoring**: Pertinence, Authority, and Risk dimensions
3. **Two-Stage Ranking**: Filter by pertinence (top 15) → Rank by authority (top 5)
4. **Risk Flags**: Surface legal weaknesses (tesis_aislada, epoca_antigua, etc.)
5. **Structured Insights**: what_it_says, when_it_applies, main_risk, recommendation
6. **Role-Aware Adjustments**: Light contextual scoring for Actor/Demandado/Quejoso
7. **Argument Generation**: Conservative legal paragraphs with proper citations

## API Endpoints
- `POST /api/analyze` - Analyze a legal case (accepts descripcion and optional rol_procesal)
- `GET /api/analysis/:id` - Get analysis by ID
- `GET /api/tesis/:id` - Get tesis details
- `POST /api/arguments` - Generate legal argument
- `GET /api/history` - Get case history
- `GET /api/tesis` - Search all tesis

## Three-Dimensional Legal Reasoning

### Dimension 1: Pertinence Score (0-100)
Does the tesis address the legal problem?
- **Materia Match**: Exact (+35), Partial (+15)
- **Structural Legal Terms**: Up to +35 for matching dictionaries
- **Detected Concepts**: Up to +20 for case-specific matches
- **Lexical Overlap**: Up to +10 for description tokens

### Dimension 2: Authority Score (0-100)
How strong is this criterion legally?
- **Type**: Jurisprudencia (+40) vs Tesis Aislada (+15)
- **Órgano Emisor**: Pleno (+30), SCJN (+28), Salas (+25), TC (+18)
- **Época**: 11a (+20), 10a (+18), 9a (+12), Earlier (+5)
- **Antigüedad**: <5 años (+10), <10 (+8), <20 (+5), <30 (+3)

### Dimension 3: Risk Flags
Potential legal weaknesses:
- `tesis_aislada` - Not binding jurisprudence
- `epoca_antigua` - From old epoch
- `criterio_no_reiterado` - Has not been consistently applied
- `autoridad_limitada` - From lower court
- `materia_parcial` - Only partial subject matter match

### Two-Stage Ranking
1. **Stage 1 (Pertinence Filter)**: Keep only tesis with pertinence ≥ 25, sort by pertinence, take top 15
2. **Stage 2 (Authority Rank)**: Sort by authority (pertinence as tiebreaker), take top 5

### Role-Aware Adjustments
Light contextual scoring (±5 points):
- **Actor/Quejoso**: Favor procedencia criteria
- **Demandado/Tercero**: Favor improcedencia, exceptions

## UX Labels
- **Fuerza**: Alta/Media/Baja (combined score)
- **Pertinencia**: Alta/Media (only shown if passed threshold)
- **Autoridad**: Alta/Media/Baja (legal strength)
- **Riesgos**: Badge count with warning icon

## Design Philosophy
- Legal confidence > Algorithmic sophistication
- Explainable reasoning > Black box
- Conservative outputs > Aggressive recall
- Never expose numeric scores to users

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
