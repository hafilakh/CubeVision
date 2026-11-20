import { useState } from 'react'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Learn', href: '#learn' },
  { label: 'Scan', href: '#scan' },
  { label: 'Progress', href: '#progress' },
  { label: 'Help', href: '#help' },
]

const markColors = [
  'white', 'red', 'blue',
  'orange', 'green', 'yellow',
  'blue', 'white', 'red',
]

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  function toggleMenu() {
    setIsOpen((open) => !open)
  }

  function closeMenu() {
    setIsOpen(false)
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a href="#home" className="navbar-brand" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">
            {markColors.map((color, index) => (
              <span key={index} className={`brand-cell cell-${color}`} />
            ))}
          </span>
          CubeVision
        </a>

        <button
          type="button"
          className="menu-button"
          onClick={toggleMenu}
          aria-expanded={isOpen}
          aria-controls="main-nav"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="menu-icon" aria-hidden="true" />
        </button>

        <nav
          id="main-nav"
          className={`navbar-nav ${isOpen ? 'is-open' : ''}`}
          aria-label="Main navigation"
        >
          <ul className="navbar-links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={closeMenu}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Navbar