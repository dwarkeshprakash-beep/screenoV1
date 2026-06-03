# Asset Generation Prompts — Screeno

Use these prompts in Midjourney, Ideogram, or Recraft to generate Screeno assets.

---

## Logo

**Primary logo mark (Ideogram recommended)**
```
Minimalist lettermark for "Screeno" — a tech SaaS company.
The letter S formed by two clean horizontal bars that curve into an S shape,
resembling a sound waveform. Flat design, no gradients, no 3D effects.
Color: deep indigo-purple #5B4FE9. White background.
Clean, geometric, modern. Should work at 24px (favicon) and 200px (navbar).
Output as SVG-style clean vector.
```

**Wordmark**
```
Clean wordmark "screeno" (lowercase) in modern geometric sans-serif.
Letter "s" in brand color #5B4FE9, rest in near-black #0F172A.
No icon — just the wordmark. Suitable for dark sidebar (white version).
Font feel similar to Inter or Geist.
```

---

## Illustrations

Use consistently across the app. Style guide for all:
- Hand-crafted line art with warm fills
- Diverse, Indian-context characters
- Palette: #5B4FE9 (brand), #FF5C35 (accent), muted warm backgrounds
- Friendly and human, not corporate or cold
- No heavy gradients

**1. Empty state — no interviews scheduled (Recraft recommended)**
```
Illustration of a person at a clean desk with a laptop.
On screen: a subtle interview chat interface.
Coffee cup, small plant on desk. Person looks calm and ready.
Warm feeling. Screeno brand purple as accent on screen.
4:3 ratio, space below for text.
```

**2. AI interview loading screen**
```
Abstract friendly face made of geometric circles and lines —
suggesting a face without being a literal robot.
Sound wave lines emanating from the face.
Brand purple and soft blues. Warm, not cold or scary.
Simple enough to animate later. Square ratio.
```

**3. Interview complete**
```
Person standing with a relaxed, confident posture —
subtle "I did it" energy, not over-the-top celebration.
Soft confetti or small star particles in background.
Warm colors. Brand purple accent on clothing.
Square or portrait ratio. Space below for text.
```

**4. Empty pipeline / no candidates**
```
Clean funnel shape with small person-icons floating in from the top.
Geometric, friendly. Inviting, not sad.
Brand purple as accent. Caption space below.
```

**5. Report ready**
```
Clean document with checkmarks and small charts visible.
Sparkle or star accent suggesting AI-generated content.
Subtle "S" watermark for Screeno. Professional but with personality.
```

**6. Something went wrong / error**
```
Small friendly robot looking at a broken connection or tangled wire.
Looks apologetic but not alarming. Warm colors.
"Don't worry, we can fix this" energy.
```

---

## Where to generate

1. **Ideogram** — best for logos with text, lettermarks
2. **Recraft v3** — best for consistent illustration style across multiple images
3. **Midjourney** — detailed illustrations with more artistic control

After generating:
- Refine SVG logos in Figma or Inkscape
- Export as SVG (scalable) + PNG 2x
- Place in `assets/logo/` and `assets/illustrations/`
- Reference in components via public folder

---

## Favicon

```
Simple "S" lettermark on solid brand color #5B4FE9 background.
Rounded square container (app icon shape).
White S mark, bold, centered.
Export at 16×16, 32×32, 192×192.
```
