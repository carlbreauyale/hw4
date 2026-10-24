// A small Labubu-inspired monster (original drawing): tall bunny ears, big eyes, a mischievous
// toothy grin, and a Yale tee. Its right arm waves when the credit link is hovered or focused.
export default function LabubuBuddy({ size = 46 }: { size?: number }) {
  return (
    <svg className="labubu" width={size} height={size * 1.25} viewBox="0 0 64 80" aria-hidden="true">
      {/* ears */}
      <g fill="#c8b6a4" stroke="#8a7462" strokeWidth="1.2">
        <path d="M18 30 C10 18 11 4 17 2 C23 0 25 16 24 28Z" />
        <path d="M46 30 C54 18 53 4 47 2 C41 0 39 16 40 28Z" />
      </g>
      <path d="M19 27 C14 18 15 8 17.5 6 C20 5 22 16 22 26Z" fill="#f2b8bf" />
      <path d="M45 27 C50 18 49 8 46.5 6 C44 5 42 16 42 26Z" fill="#f2b8bf" />

      {/* other arm resting */}
      <path d="M17 52 C12 56 11 61 13 64" fill="none" stroke="#c8b6a4" strokeWidth="5" strokeLinecap="round" />

      {/* body in a Yale tee */}
      <path d="M18 50 C18 46 46 46 46 50 L48 70 C48 75 16 75 16 70Z" fill="#00366b" />
      <text x="32" y="66" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="Georgia, serif">
        Y
      </text>
      {/* feet */}
      <ellipse cx="24" cy="76" rx="6" ry="3" fill="#c8b6a4" stroke="#8a7462" strokeWidth="1" />
      <ellipse cx="40" cy="76" rx="6" ry="3" fill="#c8b6a4" stroke="#8a7462" strokeWidth="1" />

      {/* fuzzy head */}
      <path
        d="M12 36 C10 24 20 20 32 20 C44 20 54 24 52 36 C54 42 50 50 32 50 C14 50 10 42 12 36Z"
        fill="#c8b6a4"
        stroke="#8a7462"
        strokeWidth="1.2"
      />
      <ellipse cx="32" cy="38" rx="15" ry="10" fill="#efe3d4" />

      {/* big eyes */}
      <ellipse cx="24.5" cy="34" rx="4.2" ry="5" fill="#1d1d1d" />
      <ellipse cx="39.5" cy="34" rx="4.2" ry="5" fill="#1d1d1d" />
      <circle cx="25.8" cy="32.2" r="1.4" fill="#fff" />
      <circle cx="40.8" cy="32.2" r="1.4" fill="#fff" />
      <circle cx="18.5" cy="40" r="2.4" fill="#f2b8bf" opacity="0.8" />
      <circle cx="45.5" cy="40" r="2.4" fill="#f2b8bf" opacity="0.8" />

      {/* mischievous grin with pointy teeth */}
      <path d="M22 41 Q32 49 42 41 Q32 46 22 41Z" fill="#5a2d2d" />
      <path
        d="M23.5 41.8 l1.6 2.6 l1.6 -1.9 l1.6 2.6 l1.6 -2 l1.6 2.7 l1.6 -2 l1.6 2.6 l1.6 -2 l1.6 2.4 l1.4 -2.6"
        fill="#fff"
        stroke="#fff"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* waving arm, drawn in front; pivots at the shoulder */}
      <g className="labubu-arm">
        <path d="M45 53 C52 52 57 47 58.5 41" fill="none" stroke="#8a7462" strokeWidth="6.4" strokeLinecap="round" />
        <path d="M45 53 C52 52 57 47 58.5 41" fill="none" stroke="#c8b6a4" strokeWidth="4.6" strokeLinecap="round" />
        <circle cx="59" cy="39" r="4" fill="#c8b6a4" stroke="#8a7462" strokeWidth="1" />
        <path d="M57.2 35.6 v2 M59 35.2 v2.2 M60.8 35.6 v2" stroke="#8a7462" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    </svg>
  )
}
