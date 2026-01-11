# CRITERIO - Design Guidelines

## Design Approach
**Legal-First Professional Interface** - Drawing inspiration from enterprise legal software with emphasis on trust, clarity, and information hierarchy. Think Westlaw/LexisNexis professional tone meets modern web app cleanliness.

## Core Design Principles
1. **Legal Trust** - Professional, conservative, court-safe aesthetic
2. **Clarity Over Cleverness** - Information hierarchy trumps visual flair
3. **Reading Optimization** - Legal text readability is paramount

## Typography
- **Primary Font**: Inter or IBM Plex Sans (Google Fonts)
- **Legal Text Font**: Georgia or Merriweather for body_full content
- **Hierarchy**:
  - H1: 2.5rem, font-bold (page titles)
  - H2: 1.875rem, font-semibold (section headers)
  - H3: 1.5rem, font-medium (card titles, tesis titles)
  - Body: 1rem, leading-relaxed (general content)
  - Legal Text: 1.125rem, leading-loose (jurisprudence body)
  - Labels: 0.875rem, font-medium, uppercase tracking-wide

## Layout System
- **Spacing**: Use Tailwind units of 3, 4, 6, 8, 12, 16, 20 (e.g., p-4, mt-8, gap-6)
- **Max Width**: max-w-7xl for main content containers
- **Legal Text**: max-w-4xl for optimal readability

## Component Library

### Navigation
- Clean top bar with CRITERIO logo (text-based, professional)
- Secondary nav: "Nuevo Análisis" | "Historial"
- Minimal, no hamburger menus

### Cards (Jurisprudence Results)
- White background, subtle border (border-gray-200)
- Rounded corners (rounded-lg)
- Hover: subtle shadow elevation
- Internal spacing: p-6
- Clear visual separation between metadata and content

### Badges/Labels
- **Fuerza Alta**: Green tint (subtle, not bright)
- **Fuerza Media**: Yellow/amber tint
- **Fuerza Baja**: Gray tint
- Pill shape (rounded-full), px-3 py-1, text-xs

### Tabs (Detail View)
- Underline style, not pills
- Active: border-b-2, darker text
- Inactive: lighter text, no border

### Buttons
- **Primary CTA**: Solid, professional blue, px-6 py-3, rounded-lg
- **Secondary**: Border style, same rounding
- **Text buttons**: For minor actions

### Input Fields
- Large, comfortable text areas for case descriptions
- Border on focus, not always visible
- Placeholder text: gray-400, helpful examples

### Modal (Argument Generation)
- Centered overlay, max-w-2xl
- Dark backdrop (bg-black/50)
- White content area, rounded-xl, p-8

## Visual Hierarchy Patterns

### Home Screen
- Centered layout, max-w-2xl
- Large heading with subtitle
- Prominent textarea (min-h-48)
- Example prompts as subtle suggestion cards below
- Generous whitespace

### Analysis Screen (Core)
**Section A - Problema Jurídico**
- Boxed area, light blue background tint
- Icon: scales or legal symbol
- Bold statement text

**Section B - Jurisprudencia Cards**
- Grid: 1 column (no multi-column, vertical stack)
- Each card shows: title, metadata row (tipo | instancia | materia), strength badge, brief explanation
- Ranked visually by position

**Section C - Insight Jurídico**
- Distinct section, possibly bordered callout
- Professional tone, helper text style

### Detail View
- Two-column on desktop: left sidebar (metadata), right content (tabs)
- Mobile: stacked
- Metadata: clean key-value pairs, proper spacing

### History
- Table or list view
- Date, case title, number of tesis used
- Click to reopen

## Color Palette References
(Engineer will define exact hex values)
- Professional blues (think law firm)
- Neutral grays for backgrounds
- White primary surfaces
- Subtle accent colors for strength indicators
- No bright, flashy colors

## Animations
**Minimal to none**. Focus on instant feedback:
- Subtle hover states (shadow, border)
- No loading spinners except for analysis
- No slide/fade animations

## Images
**No hero images**. This is a professional tool, not marketing.
- Optional: Small legal icon/illustration on empty states
- All value is in content and functionality

## Critical UX Notes
- Legal text must be **highly readable** - generous line-height, proper contrast
- Metadata should be scannable - use labels, not paragraphs
- CTAs must be obvious but not garish
- Trust indicators (strength labels) prominently displayed
- Conservative spacing - lawyers expect information density but also clarity