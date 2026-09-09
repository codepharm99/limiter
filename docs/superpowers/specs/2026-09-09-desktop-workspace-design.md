# Desktop workspace design

## Goal

Make the authenticated Limiter application use the available desktop viewport without introducing new visual patterns or replacing existing components.

## Scope

- Preserve the current mobile and tablet single-column flow.
- At desktop widths of 1024 px and above, place the existing `TimerScreen` and `LowerPanel` side by side below the existing `TopBar`.
- Let the application shell use the full viewport height and substantially more of the available width than the current `max-w-3xl` container.
- Keep the timer column compact and give the panel column the larger share of horizontal space.
- Reuse the existing surfaces, spacing scale, typography, colors, tabs, cards, dialogs, and interaction behavior.
- Do not add a sidebar, new navigation, new cards, decorative filler, or desktop-only product features.

## Layout

The authenticated application remains a single page shell:

1. `TopBar` spans the workspace width at the top.
2. A responsive content area sits below it.
3. Below 1024 px, that content area keeps the current vertical order: `TimerScreen`, then `LowerPanel`.
4. At 1024 px and above, the content area becomes a two-column grid. The timer uses the narrower column; the panel uses the wider column.
5. The desktop content area grows to fill the remaining viewport height. Each existing surface can manage its own overflow where needed, without forcing artificial empty blocks into the page.

The desktop shell keeps a bounded outer gutter so content does not touch the viewport edges, while removing the current narrow `max-w-3xl` constraint.

## Components

No new product components are introduced. The implementation changes only shell/layout classes and narrowly scoped styles required for sizing or overflow. Existing component internals remain unchanged unless a small height or overflow hook is required for the responsive grid.

## Responsive behavior

- Mobile and tablet: current stacked layout and natural document scrolling.
- Desktop: full-height shell, two-column workspace, timer on the left, active panel on the right.
- Very wide screens: columns remain proportionate and usable; the workspace may have a generous maximum width to prevent controls and text from becoming excessively stretched.
- Short desktop viewports: content remains reachable through scrolling and is not clipped.

## Validation

- Verify the authenticated app at representative mobile, tablet, desktop, wide-desktop, and short-desktop viewport sizes.
- Confirm there is no large unused desktop gutter caused by the old narrow container.
- Confirm all timer controls, panel tabs, dialogs, popovers, and panel content remain reachable.
- Run the existing automated test suite and production build.

## Non-goals

- Redesigning the landing page or onboarding flow.
- Changing visual identity, typography, or component styling.
- Adding desktop-only navigation or content.
- Refactoring unrelated application logic.
