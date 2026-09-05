---
name: Nimiq Chip In
colors:
  surface: '#0b0f34'
  surface-dim: '#0b0f34'
  surface-bright: '#32365c'
  surface-container-lowest: '#06092f'
  surface-container-low: '#14183d'
  surface-container: '#181c41'
  surface-container-high: '#23274c'
  surface-container-highest: '#2e3257'
  on-surface: '#dfe0ff'
  on-surface-variant: '#d3c5ad'
  inverse-surface: '#dfe0ff'
  inverse-on-surface: '#292d53'
  outline: '#9b8f79'
  outline-variant: '#4f4633'
  surface-tint: '#f7be25'
  primary: '#ffd062'
  on-primary: '#3f2e00'
  primary-container: '#e9b213'
  on-primary-container: '#5f4600'
  inverse-primary: '#785a00'
  secondary: '#c0c3f5'
  on-secondary: '#292d56'
  secondary-container: '#3f436e'
  on-secondary-container: '#aeb1e3'
  tertiary: '#ffc9c6'
  on-tertiary: '#68000e'
  tertiary-container: '#ffa19d'
  on-tertiary-container: '#921820'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf9c'
  primary-fixed-dim: '#f7be25'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5b4300'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#c0c3f5'
  on-secondary-fixed: '#131740'
  on-secondary-fixed-variant: '#3f436e'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#8d131d'
  background: '#0b0f34'
  on-background: '#dfe0ff'
  surface-variant: '#2e3257'
typography:
  display-currency:
    fontFamily: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-currency-mobile:
    fontFamily: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif
    fontSize: 38px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-xxs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  space-4xl: 3.5rem
  safe-bottom-margin: 4.5rem
---

## Brand & Style

This design system delivers an ultra-refined, anti-slop mobile webview experience for community pooled transactions. Tailored specifically for fast-loading, zero-distraction cryptographic micro-actions, the visual style is strictly utilitarian minimalism grounded in tonal discipline. 

The emotional signature is quiet confidence, absolute transaction clarity, and physical digital honesty. The interface rejects contemporary generic SaaS tropes: no glowing ambient blobs, no decorative gradients, no micro-badges, and no skeuomorphic lighting. Visual authority is established entirely through spatial generosity, pure color purity, and high-legibility tabular typography.

## Colors

The system employs a tightly constrained, single-accent dark palette derived from Nimiq's core navy brand language. There are strictly no secondary color accents, no violet or purple deviations, and zero linear or radial color transitions.

- **Background Canvas (`#1F2348`)**: Deep navy ink. Forms the foundation of every mobile view.
- **Surface Elevation (`#282C55` / `#252A50`)**: Subtly lifted tonal base for cards, bottom sheets, and input fields. Elevation is articulated purely through surface shifts, never through borders, strokes, or outlines.
- **Primary Accent (`#E9B213`)**: Nimiq Gold/Warm Amber. Strictly reserved for active fiscal weight: numeric target balances, contributor progress segments, and primary full-width triggers.
- **Neutral Foreground Text (`#FFFFFF`)**: Pure crisp white for primary headlines, current balances, and critical readouts.
- **Secondary / Muted Text (`#8E92B2` to `#A0A5C5`)**: Low-fatigue slate grey for structural context, timestamps, field hints, and supporting meta descriptions.
- **Error / Failure (`#E05252`)**: Muted warm crimson strictly quarantined to terminal error states, network drops, or rejected transactions.

## Typography

The design system relies on the native system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro", system-ui, sans-serif`) to ensure zero network load, instant frame painting, and native tactile ergonomics in webviews. Web fonts such as Inter, Poppins, or decorative display typefaces are explicitly banned.

- **Tabular Numerics**: All numeric cryptocurrency amounts, fiat equivalencies, and countdown counters must force `font-variant-numeric: tabular-nums` to eliminate layout jittering during balance updates.
- **Body Hierarchy**: Minimum body font size is 16px to prevent viewport auto-zooming on mobile webkit inputs.
- **Sentence Case Only**: All labels, form headers, and navigation cues are formatted in standard sentence case. All-caps styling and uppercase tracking are forbidden.
- **No Eyebrows/Kickers**: Titles are presented cleanly without over-titling, mini-kickers, or superfluous sub-headers.

## Layout & Spacing

The layout is built for dedicated mobile viewports (360px to 430px base width). Layouts prioritize single-column vertical stacks with rigorous adherence to device safe-areas.

- **Screen Margins**: Universal 20px (`1.25rem`) side padding on the primary scroll container.
- **Vertical Hierarchy**: Card-to-card rhythm is set to 12px or 16px. Section spacing is strictly 32px or 40px, creating natural structural breaks without horizontal rules.
- **Bottom Fixed Zone**: The bottom 80px to 100px of the viewport is reserved for single primary actions, offset upward by `env(safe-area-inset-bottom)`.
- **Divider Elimination**: Content sections must never be demarcated with 1px border rules. Tone separation (placing `#282C55` cards on `#1F2348` canvas) and negative vertical spacing fulfill all grouping needs.

## Elevation & Depth

This design system rejects dropshadows, blurs, backdrops, and stroke borders. Depth is 100% flat and tonal:

- **Level 0 (Canvas Base)**: `#1F2348` fills the viewport viewport root.
- **Level 1 (Card & Content Blocks)**: `#282C55` (or `#252A50`) sits flat against `#1F2348`. The contrast ratio between canvas and surface provides clear spatial edges without decorative styling.
- **Level 2 (Active/Pressed Inputs & Action Tracks)**: `#171A37` (recessed darker navy) for empty progress grooves and de-elevated input active states.
- **Outlines**: No borders, no faux ghost lines, no semi-transparent stroke overlays. Separation is driven strictly by geometric silhouette and background contrast.

## Shapes

The shape grammar is structural, functional, and anti-pill:

- **Buttons & Cards**: Unified at `12px` (`0.75rem`) corner radius. This gives an intentional architectural presence without lapsing into rounded-full pills or harsh raw right angles.
- **Progress Track Caps**: The contributor progress bar track uses fully rounded end caps to cleanly contain internal segmented bars.
- **No Floating Circles**: Avatars, user references, and icons are never trapped inside decorative circles, rounded squares, or colored badges.

## Components

### Buttons
- **Primary CTA**: Full-width, minimum height 52px (never less than 48px). Solid `#E9B213` (Nimiq Amber) background with solid `#1F2348` text. Typography is 16px medium/semibold. Corner radius is strictly `12px`. Never use pill shapes (`rounded-full`), drop shadows, glows, or gradients. Anchored above `env(safe-area-inset-bottom)`.
- **Secondary Actions**: Plain text buttons in `#A0A5C5` with no background tile, 16px regular weight, using native touch down-states.

### Progress Bar (Segmented Pool Tracker)
- **Track**: 12px height (8px for dense contexts). Background color is darker navy `#171A37` with fully rounded end caps.
- **Segments**: Contributed amounts are rendered as distinct `#E9B213` block segments. Each contribution segment is separated by a 2px vertical gap tinted to the track base `#171A37`. No animations, no shimmer glimmers, no glowing tips.

### Input Fields
- **Container**: Solid `#282C55` surface, 12px border radius, no borders. Height is 56px with generous horizontal padding (16px).
- **Text & Caret**: Input text is pure `#FFFFFF` tabular numbers (for amounts) or text. Placeholder text is `#8E92B2`. Caret color is `#E9B213`.
- **States**: Focus state does not produce an outline; the background subtly shifts to `#252A50` with an active tabular cursor.

### Lists & Contributor Rows
- **Structure**: Flat list items resting on `#282C55` card surfaces or directly on the canvas with 12px vertical spacing.
- **Identity**: Contributor entries are displayed strictly via textual identifiers (clean Nimiq addresses or display names) paired with tabular transaction amounts. Gradient avatars, circle initials, and colored icon tiles are strictly forbidden.

### Icons & Line Marks
- **Execution**: Naked single-color line marks (1.5px to 2px stroke, geometry matching the native SF Symbols aesthetic).
- **Color**: Tinted directly to `#A0A5C5` or pure `#FFFFFF`.
- **Restrictions**: Never enclose an icon within a tinted circle, badge, or container tile. Never use emojis as iconography.

### Cards & Sheets
- **Construction**: Large monolithic planes of `#282C55` with 16px or 20px internal padding and 12px corner radii. No drop shadows, borders, or hair-thin dividers.