import type { ComponentType } from "react";

/* Colour as meaning, from the Mediaflow accent families (css/brand.css --tone-*). Apps map their
 * own areas or groups to a tone; this file only holds the tones and their class sets.
 * Class names are written out in full so Tailwind can find them (the app needs an @source
 * line for this package, see README). */

export type Tone = "blue" | "pink" | "green" | "purple" | "orange" | "sand" | "grey";

/** Icon / mark colour (key colour). */
export const TONE_ICON: Record<Tone, string> = {
  blue: "text-tone-blue",
  pink: "text-tone-pink",
  green: "text-tone-green",
  purple: "text-tone-purple",
  orange: "text-tone-orange",
  sand: "text-tone-sand",
  grey: "text-tone-grey",
};

/** Chip or tile: tint background, dark text. */
export const TONE_CHIP: Record<Tone, string> = {
  blue: "bg-tone-blue-tint text-tone-blue-ink",
  pink: "bg-tone-pink-tint text-tone-pink-ink",
  green: "bg-tone-green-tint text-tone-green-ink",
  purple: "bg-tone-purple-tint text-tone-purple-ink",
  orange: "bg-tone-orange-tint text-tone-orange-ink",
  sand: "bg-tone-sand-tint text-tone-sand-ink",
  grey: "bg-tone-grey-tint text-tone-grey-ink",
};

/** Solid fill for a selected toggle (chips, coverage buttons): the tone's ink step with white text
 * (light) or Brand Black text (dark, where the ink steps are light); AA in both modes. */
export const TONE_SOLID: Record<Tone, string> = {
  blue: "border-tone-blue-ink bg-tone-blue-ink text-on-tone",
  pink: "border-tone-pink-ink bg-tone-pink-ink text-on-tone",
  green: "border-tone-green-ink bg-tone-green-ink text-on-tone",
  purple: "border-tone-purple-ink bg-tone-purple-ink text-on-tone",
  orange: "border-tone-orange-ink bg-tone-orange-ink text-on-tone",
  sand: "border-tone-sand-ink bg-tone-sand-ink text-on-tone",
  grey: "border-tone-grey-ink bg-tone-grey-ink text-on-tone",
};

/** Unselected toggle that still shows its colour faintly (coverage buttons): tinted border and text, tint on hover. */
export const TONE_OUTLINE: Record<Tone, string> = {
  blue: "border-tone-blue/50 bg-surface text-tone-blue-ink hover:bg-tone-blue-tint",
  pink: "border-tone-pink/50 bg-surface text-tone-pink-ink hover:bg-tone-pink-tint",
  green: "border-tone-green/50 bg-surface text-tone-green-ink hover:bg-tone-green-tint",
  purple: "border-tone-purple/50 bg-surface text-tone-purple-ink hover:bg-tone-purple-tint",
  orange: "border-tone-orange/50 bg-surface text-tone-orange-ink hover:bg-tone-orange-tint",
  sand: "border-tone-sand/50 bg-surface text-tone-sand-ink hover:bg-tone-sand-tint",
  grey: "border-tone-grey/50 bg-surface text-tone-grey-ink hover:bg-tone-grey-tint",
};

/** Hover tint of a quiet (unselected, grey) toggle chip in the target area's tone. */
export const TONE_HOVER: Record<Tone, string> = {
  blue: "hover:bg-tone-blue-tint",
  pink: "hover:bg-tone-pink-tint",
  green: "hover:bg-tone-green-tint",
  purple: "hover:bg-tone-purple-tint",
  orange: "hover:bg-tone-orange-tint",
  sand: "hover:bg-tone-sand-tint",
  grey: "hover:bg-tone-grey-tint",
};

/** Coloured icon tile in front of a page title. Takes any icon component (e.g. from lucide-react). */
export function TitleMark({ icon: Icon, tone }: { icon: ComponentType<{ size?: number }>; tone: Tone }) {
  return (
    <span aria-hidden className={`flex size-9 shrink-0 items-center justify-center rounded-control ${TONE_CHIP[tone]}`}>
      <Icon size={20} />
    </span>
  );
}
