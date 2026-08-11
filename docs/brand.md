# WISK — Brand System

Last updated: July 2026

## Logo
- Wordmark: PNG-MAIN-WISK-LOGO-WHITE.png (public/ in command centre repo)
- CSS filter for dark mode (lime): brightness(0) saturate(100%) invert(93%) sepia(55%) saturate(900%) hue-rotate(33deg) brightness(105%)
- CSS filter for light mode (lilac): brightness(0) saturate(100%) invert(65%) sepia(40%) saturate(600%) hue-rotate(200deg) brightness(110%)
- W mark: PNG-WISK-LOGO-MARK-WHITE.png

## Colour Palette

### Primary Brand Colours
- WISK Lime: #c3ff32 (dark mode primary, logo, CTAs)
- WISK Turquoise: #016c81 (light mode primary, secondary accent)
- WISK Pink: #fea9e0
- WISK White: #fefffe
- WISK Dark: #141b27 (background)

### Secondary Brand Colours
- WISK Lilac: #aca0ff (light mode logo, Projects section)
- WISK Orange: #ff5d00 (Leads section dark, warnings)
- WISK Mint: #baf7e1 (Goals section dark, success states)
- WISK Ferrari Red: #e8001d dark / #cc0016 light (Properties package accent)

### Section Accent Colours
Dark mode → Light mode:
- Projects: #aca0ff → #4a3db0
- Tasks: #2dd4bf → #016c81
- Goals: #baf7e1 → #085041
- Ideas: #fea9e0 → #c4207e
- Leads: #ff5d00 → #cc3d00
- Content: #0066ff → #0044cc
- Calendar: #00c4b4 → #007a70
- Winston/AI: #8b00ff → #6200b3
- Properties: #e8001d → #cc0016 (Ferrari red)

### CSS Tokens (globals.css)
--wisk-lime, --wisk-turquoise, --wisk-pink, --wisk-lilac
--wisk-orange, --wisk-mint, --wisk-ferrari, --wisk-dark
--wisk-section-projects, --wisk-section-tasks, --wisk-section-goals
--wisk-section-ideas, --wisk-section-leads, --wisk-section-content
--wisk-section-calendar, --wisk-section-winston

### Light/Dark Mode Rules
- Lime (#c3ff32) is dark mode only — use turquoise in light mode for UI accents
- Lilac (#aca0ff) for logo in light mode
- All section colours have light variants defined in SECTION_COLOURS_LIGHT
- Use useTheme() to switch between variants in client components
- Never use color-mix() in inline styles — use rgba() instead (causes hydration errors)

## Typography
- Body: system font stack (-apple-system, BlinkMacSystemFont, Segoe UI)
- Display: same stack, heavier weights
- Wordmark has distinctive rounded custom letterforms

## Marketing Aesthetic
- Target audience: young entrepreneurs, creators, landlords (fashion-coded, ambitious)
- Tone: confident, direct, premium but not corporate
- Dark backgrounds preferred (dark mode as default)
- Lifestyle imagery: candid, real working environments, fashion-aware
- Avoid: generic SaaS look, purple/teal gradients (old brand), corporate stock photos
