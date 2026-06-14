# PesaRoute MaliPrime Design System

MaliPrime is the PesaRoute design language for a premium, modern fintech product that stays calm, trustworthy, and mobile-first. It replaces the earlier glass-style visual direction completely.

## Product Principles

- Calm over flashy.
- Trust over hype.
- Professional over futuristic.
- Education over trading.
- Privacy over data hunger.
- Kenyan context with global polish.
- Mobile-first readability.
- No fake precision in investment data.
- No design that makes investing feel like gambling.

## Visual Direction

Use solid surfaces, subtle borders, soft shadows, and restrained accent gradients. Do not use glassmorphism, translucent glass panels, heavy blur, neon trading visuals, crypto/casino energy, AI robots, neural network graphics, or overly futuristic dashboards.

The UI should feel closer to a premium banking and education product than a trading app. It should reinforce:

- "Before you invest, understand the route."
- "Plan privately. Share only when ready."
- "Use ranges if you do not want to enter exact amounts."
- "This is an educational simulation, not investment advice."
- "No M-Pesa PIN. No bank passwords. No execution."
- "Learn first. Compare clearly. Get guidance when needed."

Avoid phrases and UI patterns that imply guaranteed outcomes, market beating, investment recommendations, trading urgency, or execution.

## Color Palette

| Token | Hex | Usage |
| --- | --- | --- |
| `background` | `#F7F8FB` | App/page background |
| `surface` | `#FFFFFF` | Cards, sheets, input surfaces |
| `surfaceAlt` | `#F1F4F9` | Secondary panels, empty states |
| `textPrimary` | `#0B1220` | Main text |
| `textSecondary` | `#5B6472` | Supporting text |
| `border` | `#E5EAF0` | Subtle borders and dividers |
| `primary` | `#2457FF` | Primary actions and active states |
| `primaryDark` | `#0B1B33` | Deep hero/navy surfaces |
| `emerald` | `#0FA36B` | Wealth/trust positive accent |
| `amber` | `#F59E0B` | Warnings and review states |
| `danger` | `#E5484D` | Errors and high-risk flags |
| `purpleAccent` | `#6D5DFB` | Rare premium accent only |

Use gradients only for hero cards, primary CTAs, and small premium highlights. Never use gradients as the whole product personality.

## Typography

Use system sans-serif fonts. Do not download, bundle, or redistribute Apple SF font files.

Web font stack:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "Inter",
  "Geist",
  "Segoe UI",
  Roboto,
  Helvetica,
  Arial,
  sans-serif;
```

Mobile:

- iOS: native system font.
- Android: Roboto by default.
- Add Inter or Geist only if already configured safely and needed.

Type rules:

- Use strong, compact headings for screen titles.
- Keep body copy readable at 14-16px with generous line height.
- Do not scale fonts directly with viewport width.
- Letter spacing should be `0` except small uppercase eyebrow labels.

## Spacing Scale

| Token | Value | Usage |
| --- | --- | --- |
| `xs` | `4px` | Tight icon/text spacing |
| `sm` | `8px` | Compact internal gaps |
| `md` | `12px` | Form and chip gaps |
| `lg` | `16px` | Card padding minimum |
| `xl` | `20px` | Hero/card padding |
| `xxl` | `24px` | Section spacing |

Mobile screens should generally use 16-20px horizontal padding.

## Radius Scale

| Token | Value | Usage |
| --- | --- | --- |
| `sm` | `12px` | Small controls |
| `md` | `16px` | Buttons, inputs, pills |
| `lg` | `20px` | Standard cards |
| `xl` | `24px` | Hero cards and major panels |
| `pill` | `999px` | Chips and badges |

Cards should be solid, not glass. Use 16-24px radius for MaliPrime cards unless a compact control needs less.

## Shadow And Elevation

Default card shadow:

```css
box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
```

Use shadows sparingly:

- Cards: subtle shadow plus `#E5EAF0` border.
- Buttons: optional soft primary shadow for important CTAs.
- Avoid stacked heavy shadows.
- Avoid blur-heavy or frosted-glass effects.

## Component Rules

Core web components live in `apps/web/app/components/maliprime.tsx`.

Core mobile components live in `apps/mobile/src/components/maliprime.tsx`.

Base components:

- `AppShell`
- `PageShell`
- `Screen`
- `PremiumCard`
- `HeroCard`
- `PrimaryButton`
- `SecondaryButton`
- `AmountRangeSelector` / `AmountRangeButton`
- `GoalChip`
- `RiskBadge`
- `LiquidityBadge`
- `PrivacyPromiseCard`
- `SimulatorCard`
- `ProductPassportCard`
- `ProfessionalCard`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `SectionHeader`
- `TrustBadge`

Component behavior:

- Primary actions use cobalt blue.
- Secondary actions use solid white or light blue-grey with borders.
- Cards use solid white, not translucency.
- Warning cards use amber-tinted backgrounds.
- Danger/error states use red-tinted backgrounds.
- Risk and liquidity badges must be plain language, not trading signals.

## Accessibility Rules

- Maintain readable contrast for text and buttons.
- Use clear button labels.
- Use accessibility roles for pressable controls.
- Do not rely on color alone for risk or status.
- Keep touch targets at least 44px high.
- Avoid tiny text in dense financial contexts.
- Make hidden/range amount modes visually obvious.

## Mobile-First Rules

- The first screen should be usable without login.
- Amount ranges and goals must be easy to tap.
- Keep cards scannable and compact.
- Avoid horizontal overflow except controlled tab bars.
- Forms should use clear labels and safe placeholders.
- Offline fallback and loading states must not crash or feel broken.

## Iconography Rules

Use simple line icons for:

- financial planning
- education
- security
- privacy
- document/product passports
- route discovery
- professional review

Avoid:

- AI robot icons
- neural network graphics
- crypto-style glowing visuals
- casino/trading energy
- hype symbols that imply winning, betting, or prediction

## Illustration Rules

Use minimal professional illustrations only when useful. Prefer:

- product screenshots
- clean empty states
- meaningful icons
- simple geometric accents
- real contextual workspace/product imagery

Avoid:

- generated-looking 3D blobs
- AI brain visuals
- futuristic cyber visuals
- generic AI startup imagery
- huge decorative images that slow mobile screens

## Performance Rules

- Keep UI lightweight.
- Avoid heavy blur and large images.
- Avoid heavy animation libraries.
- Avoid heavy chart libraries.
- Lazy-load charts if added later.
- Keep mobile screens fast and responsive.
