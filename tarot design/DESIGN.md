---
name: Celestial Arcana
colors:
  surface: '#111415'
  surface-dim: '#111415'
  surface-bright: '#373a3b'
  surface-container-lowest: '#0c0f10'
  surface-container-low: '#191c1d'
  surface-container: '#1d2021'
  surface-container-high: '#272a2b'
  surface-container-highest: '#323536'
  on-surface: '#e1e3e4'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e1e3e4'
  inverse-on-surface: '#2e3132'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#dbb9fa'
  on-secondary: '#3e235a'
  secondary-container: '#563a72'
  on-secondary-container: '#c9a8e8'
  tertiary: '#cdcecf'
  on-tertiary: '#2e3132'
  tertiary-container: '#b1b3b4'
  on-tertiary-container: '#434546'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#dbb9fa'
  on-secondary-fixed: '#280c43'
  on-secondary-fixed-variant: '#563a72'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#444748'
  background: '#111415'
  on-background: '#e1e3e4'
  surface-variant: '#323536'
  celestial-gold: '#D4AF37'
  midnight-purple: '#2E1A47'
  starlight-white: '#E1E3E4'
  parchment: '#D8C4A8'
  nebula-blue: '#1A237E'
typography:
  display-lg:
    fontFamily: EB Garamond
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: EB Garamond
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  title-md:
    fontFamily: EB Garamond
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 40px
  gutter: 24px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

This design system establishes a **Modern Mystical** aesthetic, blending the ancient art of Tarot with a premium, digital-first interface. The brand personality is enigmatic yet accessible, sophisticated yet intuitive. It aims to evoke a sense of calm, introspection, and wonder.

The visual style is a hybrid of **Minimalism** and **Glassmorphism**, set against a deep, nocturnal backdrop. We utilize high-fidelity translucent layers, subtle background blurs, and precise "ethereal" glows to simulate a deck of cards laid out under starlight. Interactions should feel fluid and lightweight, moving away from heavy physical metaphors toward a digital "aura" that guides the user through their spiritual journey.

## Colors

The palette is anchored in the deep shadows of the night. The primary color, **Celestial Gold**, is used sparingly for interactive elements, highlights, and spiritual iconography, symbolizing enlightenment and value. 

**Midnight Purple** and **Nebula Blue** are used for depth and gradients, creating a sense of infinite space within the interface. The background is a layered composition of near-black neutrals, ensuring that the "glowing" elements have maximum impact. Text defaults to **Starlight White** for high legibility, while **Parchment** is used for secondary information to provide a subtle, organic warmth reminiscent of ancient manuscripts.

## Typography

The typography system uses a dual-font strategy to balance elegance with utility. 

**EB Garamond** (Serif) is the voice of the oracle. It is used for all headlines, titles, and card names. It should be typeset with generous leading and occasionally slight negative letter-spacing for large displays to feel authoritative and classical.

**Hanken Grotesk** (Sans-Serif) serves as the functional backbone. It provides exceptional readability for card interpretations, user settings, and interface labels. Labels should use uppercase styling with increased letter-spacing to create a clean, modern "architectural" feel within the mystical context.

## Layout & Spacing

This design system employs a **Fixed Grid** on desktop (12 columns, 1200px max-width) and a **Fluid Grid** on mobile (4 columns). The layout philosophy emphasizes "breathing room"—ample whitespace (or "dark space") is essential to maintain the premium, calm atmosphere.

Vertical rhythm is managed through a modular 8px scale. Content blocks should be separated by large gutters to allow the glassmorphic background blurs to create visual separation without heavy dividers. 

- **Mobile:** 20px side margins, single-column stacks for interpretations.
- **Tablet:** 32px side margins, 8-column grid.
- **Desktop:** Centered 12-column grid, multi-column layouts for complex spreads.

## Elevation & Depth

Depth is conveyed through **Glassmorphism** rather than traditional shadows. Surfaces use a hierarchy of transparency:

1.  **Level 0 (Base):** Deep neutral `#111415` with a subtle radial gradient of `#2E1A47` in the center.
2.  **Level 1 (Cards/Containers):** Semi-transparent surfaces (approx 10-15% opacity white/purple) with a `backdrop-filter: blur(12px)`.
3.  **Level 2 (Active/Floating):** Higher opacity glass with a thin (1px) inner border in `Celestial Gold` at 30% opacity.

Instead of black shadows, use "Glows." Active cards or primary buttons should emit a soft, diffused outer glow (20px-40px spread) using a tinted primary or secondary color at very low opacity (15%).

## Shapes

The shape language is sophisticated and soft. Standard components use a **0.5rem (8px)** corner radius to feel approachable. Larger cards, such as Tarot cards or featured reading containers, should utilize **1rem (16px)** to emphasize their importance and provide a more "tactile" hand-held feel. 

Interactive icons and buttons that are strictly functional (like close buttons) can use a circular/pill shape to distinguish them from content-driven elements.

## Components

### Buttons
Primary buttons use a solid **Celestial Gold** fill with dark text. Secondary buttons use a glassmorphic background with a gold ghost-border. On hover, buttons should exhibit a subtle "pulse" glow effect.

### Tarot Cards
Cards are the hero component. In a face-down state, they feature an intricate gold-line pattern on a deep purple background. In a face-up state, they use a subtle glass overlay to ensure text is readable over the card art. 

### Input Fields
Inputs are minimal: a single bottom border in a low-opacity white, which glows in gold upon focus. Placeholders use the **Parchment** color at 50% opacity.

### Chips & Tags
Used for "Zodiac Signs" or "Element Categories." These should be pill-shaped with a faint purple tint and no border, using **label-sm** typography.

### Progress Indicators
Instead of standard bars, use concentric circles or "moon phase" animations to represent loading states or journey progression.

### Glowing Borders
For highlighted items (like the "Card of the Day"), apply a 1px solid gold border with an `add` blend mode and an outer shadow-glow using the primary gold color.