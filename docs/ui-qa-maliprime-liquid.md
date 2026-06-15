# MaliPrime Liquid UI QA Checklist

Use this checklist when reviewing PesaRoute UI changes.

## Visual Direction

- Light grey background is dominant.
- Panels are white with thin borders and soft shadows.
- Gradients are subtle accents only.
- No neon, dark glassmorphism, robot imagery, neural network art, casino cues, or trading-terminal styling.
- No text is placed over complex imagery.

## Typography

- Web uses system font stack with `-apple-system` and `BlinkMacSystemFont` first.
- No Apple font files are bundled or redistributed.
- Headings use restrained weight and clear hierarchy.
- Body copy remains readable at mobile and desktop widths.

## Trust And Privacy

- No screen asks for M-Pesa PINs.
- No screen asks for bank passwords.
- No screen asks for broker or MMF credentials.
- Payment copy says backend confirmation unlocks entitlements.
- Professional sharing copy makes scope, expiry, and revocation clear.

## Interaction

- Buttons are pill-like and have visible focus states on web.
- Cards and controls do not shift layout on hover.
- Mobile tap targets are large enough.
- Error, loading, and empty states use calm language.

## Responsive Checks

- Landing page has no horizontal overflow at mobile widths.
- Hero text wraps cleanly on small screens.
- Product passport cards remain readable in one-column mobile layout.
- Portal pages keep action buttons reachable on small screens.

## Commands

```powershell
cd apps/web; npm run typecheck
cd apps/web; npm run lint
cd apps/web; npm run build
cd apps/mobile; npm run typecheck
cd apps/mobile; npm run test:logic
cd apps/api; ..\..\.venv\Scripts\python.exe -m pytest
```

## Browser QA

- Open `http://127.0.0.1:3000/`.
- Open `http://127.0.0.1:3000/payments/status`.
- Open `http://127.0.0.1:3000/product-passports`.
- Check desktop and mobile viewport widths.
- Confirm no console errors and no horizontal overflow.
