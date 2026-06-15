# MaliPrime Liquid Design System

MaliPrime Liquid is PesaRoute's UI direction for mobile and web. It is Apple Human Interface Guidelines-inspired, light-first, quiet, and trust-oriented. It should feel premium and professional without looking like a crypto dashboard, trading terminal, betting app, or AI product.

## Product Boundaries

PesaRoute helps users learn, simulate, compare investment routes, keep a private journal, manually mirror a portfolio, and request review from verified professionals.

PesaRoute does not hold user investment money, execute investments, ask for M-Pesa PINs, ask for bank passwords, ask for broker credentials, promise returns, or provide unlicensed advice.

## Visual Language

- Light mode first.
- Soft grey page backgrounds.
- White elevated panels.
- Thin borders.
- Very subtle translucent or liquid accents only where useful.
- No busy transparent cards over complex backgrounds.
- No neon, robot, neural network, casino, or trading-terminal visuals.
- Crisp typography with system fonts.
- Calm financial trust over decorative spectacle.

## Typography

Use system fonts only. Do not download, bundle, or redistribute Apple SF Pro or New York font files.

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

Mobile uses native system font on iOS and Roboto/Expo fallback on Android.

## Tokens

Colors:

- `pageBackground`: `#F5F5F7`
- `surface`: `#FFFFFF`
- `surfaceElevated`: `#FFFFFF`
- `surfaceSubtle`: `#F2F4F7`
- `textPrimary`: `#1D1D1F`
- `textSecondary`: `#6E6E73`
- `textTertiary`: `#86868B`
- `border`: `rgba(0,0,0,0.08)`
- `borderStrong`: `rgba(0,0,0,0.14)`
- `primary`: `#0071E3`
- `primaryPressed`: `#005BBF`
- `success`: `#34C759`
- `warning`: `#FF9500`
- `danger`: `#FF3B30`
- `purple`: `#AF52DE`
- `teal`: `#30B0C7`

Radius:

- `small`: `10`
- `medium`: `16`
- `large`: `22`
- `pill`: `999`

Shadows should be subtle and soft. Cards should feel lightly lifted, not floating.

## Components

Web components live in `apps/web/app/components/maliprime.tsx`.

- `PageShell`
- `AppleLikeNav`
- `LiquidHeroSection`
- `PremiumCard`
- `LiquidPill`
- `TrustBadge`
- `ProductPassportCard`
- `ProfessionalCard`
- `FeatureCard`
- `PricingCard`
- `PortalShell`
- `DashboardCard`
- `EmptyState`
- `LoadingState`
- `ErrorState`

Mobile components live in `apps/mobile/src/components/maliprime.tsx`.

- `Screen`
- `LiquidHero`
- `PremiumCard`
- `LiquidPill`
- `AmountRangeButton`
- `GoalChip`
- `TrustBadge`
- `PrimaryButton`
- `SecondaryButton`
- `RiskBadge`
- `LiquidityBadge`
- `ProductPassportCard`
- `SimulatorCard`
- `ProfessionalCard`
- `PrivacyPromiseCard`
- `EmptyState`
- `LoadingState`
- `ErrorState`

## Accessibility

- Keep text contrast high.
- Do not place body text over gradients or complex visuals.
- Use large tap targets on mobile.
- Preserve keyboard focus visibility on web.
- Prefer clear labels over decorative microcopy.

## Performance

- Avoid heavy animation libraries.
- Avoid blur-heavy long lists.
- Avoid giant hero images.
- Keep mobile screens fast and scrollable.
