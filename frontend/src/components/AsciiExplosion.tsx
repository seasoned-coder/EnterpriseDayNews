import { useEffect, useState } from "react";

const r = String.raw;

/** Pads frames with blank lines at the top so they're all the same height (the ground stays put). */
const sameHeight = (frames: string[]) => {
  const lines = frames.map((frame) => frame.replace(/^\n/, "").split("\n"));
  const height = Math.max(...lines.map((l) => l.length));
  return lines.map((l) => [...Array(height - l.length).fill(""), ...l].join("\n"));
};

/** Frames of the explosion. The last frame stays on screen. */
export const EXPLOSION_FRAMES: string[] = sameHeight([
  r`




                 .




   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
  r`




                \|/
               --*--
                /|\



   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
  r`



               .-~-.
              ( *** )
               '-.-'



   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
  r`


             .-~~~~~-.
            (  *****  )
             '-.___.-'
                | |
                | |

   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
  r`

          .-~~~~~~~~~~~-.
        .~   ~~~~~~~~~   ~.
       (   ~~ ~~~~~~~ ~~   )
        '-._  ~~~~~~~  _.-'
             '|     |'
              |     |
          ___/       \___
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
  r`
          .-~~~~~~~~~~~-.
       .-~   B O O M !   ~-.
      (   ~~~~~~~~~~~~~~~   )
       \_    ~~~~~~~~~    _/
         '-.__       __.-'
              |     |
              |     |
        ____./       \.____
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`,
]);

const FRAME_MS = 280;

/**
 * A little ASCII mushroom cloud that plays once (under two seconds) and then holds its last frame.
 * It deliberately plays even when the device asks for reduced motion: it's a brief swap of text
 * frames in place (no flashing, sliding or zooming), and staff asked for it to move.
 */
export const AsciiExplosion = ({ className }: { className?: string }) => {
  const last = EXPLOSION_FRAMES.length - 1;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frame >= last) return;
    const t = setTimeout(() => setFrame((f) => f + 1), FRAME_MS);
    return () => clearTimeout(t);
  }, [frame, last]);

  return (
    <pre aria-hidden="true" data-frame={frame} className={className}>
      {EXPLOSION_FRAMES[frame]}
    </pre>
  );
};
