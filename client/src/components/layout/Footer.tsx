import { Link } from "react-router-dom"

export default function Footer() {
  return (
    <footer className="px-gutter py-8 border-t border-outline-variant flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-headline text-lg text-on-background mb-1">Lumina Journal</p>
        <p className="text-label-md text-on-surface-variant">© 2026 Lumina Journal. Designed for deep thought.</p>
      </div>
      <nav className="flex flex-wrap gap-4 md:gap-6 text-body-md text-on-surface-variant">
        <Link to="/about" className="hover:text-on-surface transition-colors">About</Link>
        <Link to="/privacy" className="hover:text-on-surface transition-colors">Privacy</Link>
        <Link to="/terms" className="hover:text-on-surface transition-colors">Terms</Link>
        <Link to="/contact" className="hover:text-on-surface transition-colors">Contact</Link>
      </nav>
    </footer>
  )
}
