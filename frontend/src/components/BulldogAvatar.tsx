// H1: "Bulldog Bot", a simple bulldog face drawn in SVG (no image files).
export default function BulldogAvatar({ size = 34 }: { size?: number }) {
  return (
    <svg className="bulldog-avatar" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Bulldog Bot">
      <circle cx="32" cy="32" r="31" fill="#00366b" />
      {/* ears */}
      <path d="M13 20 Q10 9 21 12 L24 22Z" fill="#cfd8e3" />
      <path d="M51 20 Q54 9 43 12 L40 22Z" fill="#cfd8e3" />
      {/* head */}
      <ellipse cx="32" cy="35" rx="20" ry="18" fill="#eef2f7" />
      {/* brow wrinkle */}
      <path d="M24 25 Q32 21 40 25" fill="none" stroke="#b7c3d1" strokeWidth="1.8" strokeLinecap="round" />
      {/* eyes */}
      <circle cx="25" cy="31" r="3" fill="#1d1d1d" />
      <circle cx="39" cy="31" r="3" fill="#1d1d1d" />
      <circle cx="26" cy="30" r="0.9" fill="#fff" />
      <circle cx="40" cy="30" r="0.9" fill="#fff" />
      {/* muzzle */}
      <ellipse cx="32" cy="42" rx="12" ry="8.5" fill="#dfe6ee" />
      <ellipse cx="32" cy="37.5" rx="4.2" ry="3" fill="#1d1d1d" />
      <path d="M32 40.5 V43 M26 44 Q32 49 38 44" fill="none" stroke="#1d1d1d" strokeWidth="1.6" strokeLinecap="round" />
      {/* underbite teeth */}
      <path d="M27 45.5 l1.5 -2.5 l1.5 2.5 M34 45.5 l1.5 -2.5 l1.5 2.5" fill="#fff" stroke="#fff" strokeWidth="0.8" />
      {/* collar with Y tag */}
      <path d="M17 52 Q32 60 47 52" fill="none" stroke="#f04f36" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="32" cy="57" r="4" fill="#ffb000" />
      <text x="32" y="59.3" textAnchor="middle" fontSize="6" fontWeight="700" fill="#00366b" fontFamily="Georgia, serif">
        Y
      </text>
    </svg>
  )
}
