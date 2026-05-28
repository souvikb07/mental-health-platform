---

name: MindBridge
colors:
surface: '#fdf8f6'
surface-dim: '#ded9d7'
surface-bright: '#fdf8f6'
surface-container-lowest: '#ffffff'
surface-container-low: '#f8f3f1'
surface-container: '#f2edeb'
surface-container-high: '#ece7e5'
surface-container-highest: '#e6e1e0'
on-surface: '#1c1b1a'
on-surface-variant: '#414943'
inverse-surface: '#32302f'
inverse-on-surface: '#f5f0ee'
outline: '#717973'
outline-variant: '#c1c9c1'
surface-tint: '#3b6750'

primary: '#14422d'
primary-dark: '#002b1a'
on-primary: '#ffffff'
primary-container: '#14422d'
on-primary-container: '#80ae93'
inverse-primary: '#a1d1b4'

secondary: '#735c00'
on-secondary: '#ffffff'
secondary-container: '#fdcc00'
on-secondary-container: '#6e5700'

tertiary: '#00205b'
on-tertiary: '#ffffff'
tertiary-container: '#003488'
on-tertiary-container: '#7ea1ff'

error: '#ba1a1a'
on-error: '#ffffff'
error-container: '#ffdad6'
on-error-container: '#93000a'

primary-fixed: '#bdeed0'
primary-fixed-dim: '#a1d1b4'
on-primary-fixed: '#002112'
on-primary-fixed-variant: '#224f39'

secondary-fixed: '#ffe086'
secondary-fixed-dim: '#efc100'
on-secondary-fixed: '#231a00'
on-secondary-fixed-variant: '#574500'

tertiary-fixed: '#dae2ff'
tertiary-fixed-dim: '#b2c5ff'
on-tertiary-fixed: '#001848'
on-tertiary-fixed-variant: '#0040a2'

background: '#fdf8f6'
on-background: '#1c1b1a'
surface-variant: '#e6e1e0'

sage-green: '#2d5a43'
ink-charcoal: '#2d2c2b'
warm-clay: '#f9f4f2'
soft-white: '#ffffff'
sunny-yellow: '#ffce00'
serene-blue: '#0061ef'

typography:
display-lg:
fontFamily: Manrope
fontSize: 48px
fontWeight: '800'
lineHeight: 56px
letterSpacing: -0.02em
headline-lg:
fontFamily: Manrope
fontSize: 32px
fontWeight: '700'
lineHeight: 40px
letterSpacing: -0.01em
headline-lg-mobile:
fontFamily: Manrope
fontSize: 28px
fontWeight: '700'
lineHeight: 36px
headline-md:
fontFamily: Manrope
fontSize: 24px
fontWeight: '600'
lineHeight: 32px
body-lg:
fontFamily: Manrope
fontSize: 18px
fontWeight: '400'
lineHeight: 28px
body-md:
fontFamily: Manrope
fontSize: 16px
fontWeight: '400'
lineHeight: 24px
label-md:
fontFamily: Manrope
fontSize: 14px
fontWeight: '600'
lineHeight: 20px
letterSpacing: 0.01em
label-sm:
fontFamily: Manrope
fontSize: 12px
fontWeight: '500'
lineHeight: 16px

rounded:
sm: 0.25rem
DEFAULT: 0.5rem
md: 0.75rem
lg: 1rem
xl: 1.5rem
full: 9999px

spacing:
base: 8px
element-gap-sm: 12px
element-gap-md: 24px
container-padding-mobile: 20px
container-padding-desktop: 40px
gutter: 24px
section-gap: 64px
-----------------

# MindBridge Design Reference

This file is the global visual reference for the MindBridge frontend polish work.

It should guide the translation of the Stitch design into the existing Next.js / React frontend. It is not production implementation code. It must not override backend API contracts, safety behavior, or the current product flow.

## Brand & Style

MindBridge uses a **Modern Serene** aesthetic tailored for a mental-health-adjacent clarity product.

The brand personality is:

* empathetic
* professional
* calm
* grounded
* trustworthy
* non-clinical
* clear without feeling cold

The visual style blends **Minimalism** and **Soft Modernism**. It should feel spacious, warm, and safe. The UI should lower the barrier for a user who may be overwhelmed, anxious, unsure, or emotionally tired.

The design should avoid feeling like:

* a hospital dashboard
* a therapy replacement product
* a crisis service interface
* a productivity SaaS tool
* a generic chatbot
* a flashy AI demo

The product should feel like a calm reflection space that helps users organize what they are experiencing and understand possible next support steps.

## Core Visual Direction

Use the Stitch references to guide:

* warm clay background, not harsh white
* sage green primary actions
* ink charcoal text
* soft white elevated surfaces
* subtle tonal layering
* gentle ambient depth
* premium but calm card surfaces
* clear section hierarchy
* accessible contrast
* friendly rounded shapes
* calm, trustworthy mental-health-adjacent tone

The target product direction is a **warm light wellness UI**. Do not introduce a full dark-mode visual system unless explicitly approved later.

Dark or high-contrast Stitch references may inspire depth, glow, spacing, and premium presentation, but the main MindBridge interface should remain grounded in the warm clay / sage green / ink charcoal palette defined in this file.

## Colors

The color palette is grounded in **Sage Green**, **Ink Charcoal**, and **Warm Clay**.

### Primary

Primary action color:

`#14422D`

Use this for:

* primary buttons
* active navigation states
* important progress states
* high-emphasis brand moments
* selected cards or options

Use `#002B1A` only for:

* deeper hover states
* high-contrast dark accents
* rare emphasis moments where `#14422D` does not provide enough contrast

### Secondary

Secondary accent:

`#FFCE00`

Use this sparingly for:

* small highlights
* progress markers
* celebratory but restrained accents
* small visual anchors

Do not overuse yellow. It should not dominate mental-health or safety-sensitive states.

### Tertiary

Information accent:

`#0061EF`

Use this for:

* links
* information cues
* secondary navigation
* non-urgent informational states

Avoid making blue the dominant brand color.

### Background & Surfaces

Primary background:

`#FDF8F6`

Warm clay surface:

`#F9F4F2`

Use warm clay and off-white surfaces instead of pure white where possible. This reduces eye strain and gives the app a softer, more human feel.

Recommended surface hierarchy:

* Page background: `#FDF8F6`
* Major sections/cards: `#FFFFFF` or `#F8F3F1`
* Nested cards: `#F2EDEB`
* Subtle separators/borders: `#C1C9C1` at low opacity

### Text

Primary text:

`#1C1B1A`

Secondary text:

`#414943`

Use ink charcoal for primary text instead of pure black. This keeps the product readable without feeling harsh.

### Safety and Error

Use the defined error colors for validation and error states.

For safety-critical cards, do not rely only on color. Use:

* clear title
* plain-language message
* strong spacing
* visible card treatment
* accessible contrast
* resources/actions when returned by backend

Safety cards must remain prominent and readable.

## Typography

The design system uses **Manrope**.

Manrope should be used for:

* display text
* headings
* body copy
* labels
* buttons
* metadata

### Display & Headlines

Display and headline text should feel confident but calm.

Use:

* `display-lg` for major landing hero statements
* `headline-lg` for page titles and major sections
* `headline-md` for cards, Clarity Map sections, and onboarding step titles

Headlines should use tight but readable letter spacing. Do not make the product feel overly editorial or fashion-like; clarity comes first.

### Body

Body copy should prioritize readability.

Use:

* `body-md` for standard text
* `body-lg` for important explanatory copy
* generous line height
* short paragraphs
* scannable chunks

This product may be used by people who are emotionally overloaded, so dense paragraphs should be avoided.

### Labels

Labels should use smaller Manrope weights for:

* form labels
* tags
* metadata
* section eyebrows
* card labels
* safety/source labels

Labels should be clear, not decorative.

## Layout & Spacing

The layout follows a fixed-grid philosophy on desktop and a fluid, single-column approach on mobile.

### Desktop

Recommended desktop behavior:

* max-width around `1280px`
* centered content
* generous horizontal padding
* clear section breaks
* balanced whitespace
* 2-column or 3-column grids where useful

### Mobile

Recommended mobile behavior:

* single-column layout
* generous tap targets
* no horizontal scrolling
* sticky/fixed elements must not cover safety content
* chat input must remain usable
* safety cards must stay visible and readable

### Vertical Rhythm

Use an 8px base spacing unit.

Recommended spacing:

* small element gap: `12px`
* medium element gap: `24px`
* section gap: `64px`
* mobile page padding: `20px`
* desktop page padding: `40px`

Do not cram the chat or Clarity Map UI. These are the highest-trust parts of the product and need breathing room.

## Elevation & Depth

Depth should come from **ambient shadows** and **tonal layering**, not heavy drop shadows.

Recommended ambient shadow:

`rgba(45, 90, 67, 0.08)` with a large blur radius around `30px`.

Use shadows for:

* primary cards
* hero panels
* onboarding containers
* chat shell
* Clarity Map sections
* resource cards

Do not overuse glow effects. The product should feel calm, not sci-fi.

### Borders

Use subtle borders at low opacity.

Recommended border direction:

* `outline-variant` at low opacity
* soft green-tinted borders for selected states
* stronger borders only for active, selected, safety, or error states

### Motion

Motion should be subtle and functional.

Allowed motion direction:

* gentle fade-up entrances
* small hover lift on primary buttons
* smooth focus/selected transitions
* loading states that feel calm

Avoid:

* bouncy animations
* aggressive motion
* distracting animated gradients
* motion that hides safety or error content

Respect reduced-motion preferences if the existing frontend supports it.

## Shapes

The shape language is **Organic and Rounded**.

### Containers

Use larger radii for major surfaces:

* hero panels
* onboarding cards
* chat shell
* Clarity Map summary cards
* resource sections

Large feature containers may use:

* `rounded-xl` / `1.5rem`
* custom radii up to `40px` when the Stitch reference clearly calls for it

### Standard UI

Standard cards and controls should generally use:

* `rounded-md` / `0.75rem`
* `rounded-lg` / `1rem`

### Buttons

Buttons should be pill-shaped:

* `rounded-full`
* clear focus states
* minimum accessible tap target
* strong but calm contrast

## Components

### Buttons

Primary buttons should use:

* background: `#14422D`
* text: white
* pill shape
* clear hover/focus state
* subtle upward hover translation around `-1.5px`
* expanded ambient shadow on hover

Primary button examples:

* Start reflection
* Continue to chat
* Generate Clarity Map
* Back to chat
* Submit feedback

Safety-related actions must remain clear and must not be visually hidden behind decorative styling.

Secondary buttons should use:

* warm surface background
* ink or sage text
* subtle border
* pill shape

Disabled buttons should look clearly disabled and include supportive context where needed.

### Icons

Icon direction:

* thin
* rounded
* outlined
* simple
* not overly playful

Use the project’s existing icon approach if present.

Do not add a new icon package or external icon font without approval.

Icons associated with steps, features, or reflection prompts may use sage green for emphasis.

### Cards & Feature Blocks

Cards should feel calm and structured.

Recommended card style:

* soft white or warm-clay surface
* subtle border
* large radius
* restrained ambient shadow
* clear heading
* concise body copy
* spacious internal padding

Feature blocks may be borderless when the layout itself provides enough structure.

### Navigation / Top App Bar

The header should feel light and unobtrusive.

Recommended direction:

* fixed or sticky only if it does not interfere with chat/safety content
* subtle background blur if needed
* warm translucent surface
* simple brand mark/text
* clear navigation
* strong mobile behavior

If using a glass effect, keep it subtle and accessible. Do not reduce text contrast.

### Forms

Onboarding forms should feel safe and simple.

Recommended direction:

* clear labels
* large touch targets
* warm card container
* visible selected states
* gentle helper copy
* non-clinical language
* validation messages that are plain and kind

Do not make onboarding feel like a medical intake form.

### Chat

The chat UI is the core product interaction and must feel trustworthy.

Recommended direction:

* centered readable chat width
* calm warm background
* clear assistant/user message distinction
* plain text rendering
* visible loading state
* visible error retry state
* prominent safety/resource cards when returned
* Clarity Map CTA that feels valuable but not pushy

Do not fake user messages.

Do not create a fake assistant opener.

The first assistant opener must come from the real context-intake flow.

### Clarity Map

The Clarity Map should feel like the product’s premium output.

Recommended direction:

* strong but non-clinical summary header
* visible non-diagnostic disclaimer
* Harmony Signal rendered as a reflection signal, not a clinical score
* sections organized into clear cards
* Key Insight, Boundary Focus, Action Plan, and Support Path should be visually distinct
* evidence should be subtle and readable if rendered
* actions should be concrete and scannable

Safety-blocked states must not render a normal Harmony Signal or score.

Boundary-blocked states must not render a diagnosis-like map.

### Safety Cards

Safety/resource cards must stay prominent.

Recommended direction:

* high contrast
* calm, direct wording
* clear title
* strong spacing
* resources immediately visible when returned
* no decorative treatment that reduces urgency
* no hiding behind accordions by default
* no auto-navigation away from safety content

Safety card styling can be visually polished, but the backend message and routing must not be softened or replaced.

### Resources

Resource cards should feel supportive and practical.

Recommended direction:

* clear resource title
* description
* action label
* phone/link when returned
* country/context awareness based on backend response
* no frontend-invented resources

Do not hardcode resources locally in the UI. Render what the backend returns.

### Footer

The footer can use the warm clay background and simple horizontal organization on desktop.

Recommended footer content:

* product positioning
* privacy/safety note if already present
* resources link
* feedback link
* non-crisis disclaimer

Keep it lightweight for the MVP.

## Page-Level Direction

### Landing

Goal: explain MindBridge clearly in under 10 seconds.

Landing should communicate:

* what MindBridge helps with
* what it does not do
* the core flow
* why the Clarity Map is useful
* a clear CTA to start onboarding

Tone:

* calm
* confident
* not clinical
* not exaggerated
* no overpromising

### Onboarding

Goal: establish trust and collect only what is needed.

Onboarding should preserve:

* support location
* age confirmation
* consent acceptance
* main concern category
* optional main concern text if currently supported

Do not add new backend-required fields without approval.

### Chat

Goal: make the conversation feel guided, safe, and context-aware.

Chat should preserve:

* no session context -> onboarding CTA
* one real context-aware opener
* real `/api/chat` responses
* backend safety cards/resources
* backend boundary messages
* Generate Clarity Map behavior from real transcript

### Clarity Map

Goal: make the generated output feel useful and demo-ready.

Clarity Map should preserve:

* sessionStorage-generated map loading
* no old static mock fallback in the real flow
* backend-provided Harmony Signal
* backend-provided structured sections
* non-diagnostic framing

### Resources & Feedback

Goal: close the loop cleanly.

Resources should render app-owned/backend-returned resources.

Feedback should be simple and should not imply clinical review or long-term storage.

### User Profile Reference

The Stitch `user-profile` reference is visual reference only.

Do not implement user profile, auth, account settings, database persistence, or user history from this reference unless explicitly approved later.

The current MVP has no auth, no database writes, and no server-persisted user profile.

## Product Safety Language

MindBridge is not:

* a therapist
* a doctor
* a diagnostic tool
* a treatment tool
* a medication advisor
* a medical device
* a crisis service
* a replacement for professional care
* a guaranteed safety service

MindBridge helps users:

* reflect on what they are experiencing
* organize thoughts
* identify non-diagnostic patterns
* name possible focus areas
* understand support options
* prepare for a conversation with trusted people or qualified professionals

Use wording like:

* “patterns that may be present”
* “what you shared suggests”
* “this is not a diagnosis”
* “based only on this conversation”
* “a qualified professional may be able to help you explore this”
* “reflection”
* “clarity”
* “support options”
* “non-clinical reflection signal”

Avoid wording like:

* “you have depression”
* “you have anxiety disorder”
* “this is PTSD”
* “you need medication”
* “this treatment will fix you”
* “I am your therapist”
* “you are definitely safe”
* “we guarantee”
* “clinically proven” unless actually supported and approved

## Implementation Guardrails

This file is visual reference only.

Codex may translate these styles into existing Next.js / React components, CSS variables, Tailwind-style classes, or local component styles depending on the current frontend architecture.

Codex must not:

* import Stitch HTML into production
* iframe Stitch HTML
* paste Stitch HTML into production components
* use `dangerouslySetInnerHTML`
* render model-generated HTML
* add new packages without approval
* expose API keys or secrets
* change backend API contracts
* change Safety Core behavior
* infer safety client-side
* override backend risk decisions
* soften or hide backend safety messages
* hardcode Clarity Map output
* hardcode Harmony Signal values
* hardcode safety, resources, risk, or boundary decisions
* create auth, profile, persistence, payments, or database-backed flows from design references
* replace the current real product flow with static mock content

## Required Flow Preservation

The frontend must preserve the current product flow:

Landing
→ Onboarding / consent
→ Context-aware guided chat
→ Safety-aware AI conversation
→ Generate Clarity Map from real chat transcript
→ Resources
→ Feedback

Specific behavior to preserve:

* `/chat` must show onboarding CTA if no session context exists.
* `/chat` must start with one context-aware opener.
* The opener must come from `/api/context-intake`.
* Chat messages must go through `/api/chat`.
* Generate Clarity Map must send real `sessionContext` and current chat messages to `/api/clarity-map`.
* Only `type: "clarity_map"` may navigate to `/clarity-map`.
* `insufficient_context`, `safety_blocked`, and `boundary_blocked` must stay inline in chat.
* `/clarity-map` must render generated map data from `sessionStorage`.
* `/clarity-map` must not silently show old static mock content by default.
* If `safety.disableNormalNextStep` is true, Generate Clarity Map should be disabled, paused, or deprioritized.
* Safety/resource messages must remain visible.

## Accessibility Requirements

The visual polish must maintain accessibility.

Minimum expectations:

* readable contrast
* visible focus states
* keyboard-accessible controls
* accessible form labels
* meaningful button text
* no color-only communication
* no hidden safety content on mobile
* no tiny tap targets
* motion should be subtle and not required to understand the UI

## Engineering Philosophy

For this MVP, prioritize:

* preserving the working product
* improving visible polish
* keeping changes small
* making the demo clear
* respecting safety architecture
* avoiding overengineering

Do not rebuild the app from scratch.

Do not introduce a design system package unless approved.

Do not change backend logic for visual polish.

Do not convert reference files into product code.

The frontend should make the existing product feel intentional, premium, and trustworthy without weakening the backend safety and API contracts.
