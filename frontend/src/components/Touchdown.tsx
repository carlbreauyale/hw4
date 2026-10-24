import Confetti from './Confetti'

// D5: one-shot "TOUCHDOWN!" sweep + confetti over the chat results shelf. Mounted with a new key
// for each new result set; the CSS animation plays once and fades out on its own.
export default function Touchdown() {
  return (
    <div className="touchdown" aria-hidden="true">
      <Confetti />
      <span className="touchdown-text">TOUCHDOWN!</span>
    </div>
  )
}
