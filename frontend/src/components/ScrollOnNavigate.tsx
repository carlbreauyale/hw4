import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// On every page change, show the top of the new page's content. When the chat results shelf is
// on screen, scroll just past it (under the sticky header) so e.g. a product page opened from a
// shelf card is immediately visible, while the shelf stays one scroll away.
export default function ScrollOnNavigate() {
  const { pathname } = useLocation()

  useEffect(() => {
    const content = document.getElementById('page-content')
    const shelf = document.querySelector('.results-shelf')
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!content || !shelf) {
      window.scrollTo({ top: 0 })
      return
    }
    const top = content.getBoundingClientRect().top + window.scrollY - (header?.offsetHeight ?? 0)
    window.scrollTo({ top })
  }, [pathname])

  return null
}
