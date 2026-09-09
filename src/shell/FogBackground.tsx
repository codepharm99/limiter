/** Static fog-tinted background. The WebGL Vanta fog used to live here, but
    it crawled in Firefox (~7fps), so the app now shows the same palette as a
    plain CSS gradient — see --fog-* tokens. */
export function FogBackground() {
  return <div className="fog-background" aria-hidden="true" />
}
