---
name: Celestial Balance System
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
  secondary: '#d8c4a8'
  on-secondary: '#3b2e1b'
  secondary-container: '#52452f'
  on-secondary-container: '#c6b297'
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
  secondary-fixed: '#f5e0c2'
  secondary-fixed-dim: '#d8c4a8'
  on-secondary-fixed: '#241a08'
  on-secondary-fixed-variant: '#52452f'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#444748'
  background: '#111415'
  on-background: '#e1e3e4'
  surface-variant: '#323536'
  wood-green: '#4B6344'
  fire-red: '#924040'
  earth-gold: '#D4AF37'
  metal-white: '#E1E3E4'
  water-blue: '#334155'
typography:
  display-lg:
    fontFamily: notoSerif
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: notoSerif
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: notoSerif
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: notoSerif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  title-lg:
    fontFamily: hankenGrotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.5'
  body-lg:
    fontFamily: hankenGrotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: hankenGrotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: hankenGrotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: hankenGrotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max-width: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is crafted for a platform that bridges ancient Eastern wisdom (Saju) with modern psychological frameworks (MBTI). The brand personality is **mystical yet empirical**, distancing itself from superstitious aesthetics in favor of a **sophisticated, data-driven, and premium** experience.

The visual style is a fusion of **Minimalism** and **Modern Corporate** aesthetics, utilizing a deep dark-mode foundation to evoke the vastness of the cosmos (Heaven), structured layouts to represent stability (Earth), and clear information hierarchy to serve the user (Man). Depth is achieved through tonal layering rather than aggressive borders, creating a seamless, immersive interface that feels like a high-end analytical tool.

## Colors

The palette is anchored by a profound **Neutral Dark (#111415)**, providing a premium canvas that emphasizes content. 

- **Primary Gold (#D4AF37):** Used sparingly for key actions, highlights, and "Heavenly" elements to denote value and wisdom.
- **Secondary Sand (#D8C4A8):** A softer metallic tone used for secondary information and subtle accents.
- **Named Five Elements:** The traditional Wu Xing colors are desaturated and shifted to a professional spectrum. These should be used to categorize Saju data (Wood, Fire, Earth, Metal, Water) without breaking the sophisticated dark-mode harmony.
- **Surface Tiers:** Elevation is handled through the **Tertiary Gray (#1D2021)**, which serves as the color for cards and container backgrounds.

## Typography

This design system employs a sophisticated typographic pairing to balance tradition and modernity. 

- **Headlines (Noto Serif):** Used for primary titles and section headers. The serif typeface provides an authoritative, literary, and "classic" feel that honors the history of Saju.
- **Body & Labels (Hanken Grotesk):** A sharp, contemporary sans-serif used for all functional data, MBTI descriptions, and UI elements. It ensures high legibility and a "tech-forward" impression.
- **Scale:** Maintain generous line-height for body text to ensure readability of complex descriptions. Use uppercase labels for metadata and technical attributes to create a distinct visual hierarchy.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop to maintain a sense of order and "sacred geometry," while transitioning to a fluid model on mobile.

- **The 8pt Rhythm:** All margins, paddings, and component heights are derived from a 4px/8px base unit.
- **Grid System:** A 12-column grid is used for desktop (max-width 1200px). Sections should feel "airy" with significant vertical padding (64px to 120px) to separate the three pillars: Heaven, Earth, and Man.
- **Mobile Reflow:** On mobile devices, use a single-column stack with 16px side margins. Cards should span the full width of the container minus the margins.

## Elevation & Depth

To maintain a modern aesthetic, this design system avoids heavy drop shadows. Instead, it utilizes **Tonal Layers** and **Subtle Inner Glows**.

- **Level 0 (Background):** #111415 - The base space.
- **Level 1 (Cards/Surfaces):** #1D2021 - Used for the primary content containers.
- **Level 2 (Active/Hover):** A subtle tint of the primary gold at 5% opacity applied over the Level 1 surface.
- **Depth Cues:** Rather than shadows, use 1px semi-transparent strokes (#FFFFFF at 5-10% opacity) on the top and left edges of cards to create a "glass-etched" highlight, simulating a light source from the top-left.

## Shapes

The shape language is **Rounded (0.5rem base)**, striking a balance between the organic nature of human personality and the structured nature of cosmic data.

- **Standard Elements:** Buttons, input fields, and small tags use a 0.5rem (8px) radius.
- **Large Containers:** Content cards and section backgrounds use a 1rem (16px) radius to feel more approachable.
- **Interactive States:** Avoid sharp corners entirely to maintain the "gentle wisdom" brand pillar.

## Components

- **Buttons:** Primary buttons use a solid Gold (#D4AF37) fill with dark text. Secondary buttons use a "ghost" style with a thin Gold border. High-action buttons should have a very subtle outer glow of the same color.
- **Saju Chips:** Small, rounded tags used to indicate elemental attributes (e.g., "Wood"). They should feature a low-saturation background of the element color and a high-contrast text color.
- **Data Cards:** Content is housed in Level 1 surfaces with no visible border. Use 24px internal padding and a Noto Serif title to establish hierarchy within the card.
- **Input Fields:** Darker than the surface (#0F1213), with a subtle 1px stroke. The focus state should illuminate the border in Gold.
- **Progress Indicators:** For MBTI scales, use thin, elegant lines rather than chunky bars. Use the Gold/Sand palette to indicate the lean of a personality trait.
- **Selection Controls:** Checkboxes and radio buttons should feel bespoke, using a Gold circular ring for the selected state.