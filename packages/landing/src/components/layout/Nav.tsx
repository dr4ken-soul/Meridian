import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

const repositoryUrl = 'https://github.com/dr4ken-soul/Meridian'

/** Renders the scroll-morph navigation and mobile menu. */
export default function Nav() {
  const { scrollY } = useScroll()
  const [collapsed, setCollapsed] = useState(false)
  const [open, setOpen] = useState(false)
  useMotionValueEvent(scrollY, 'change', (value) => setCollapsed(value >= 80))

  return <>
    <motion.nav layout style={collapsed ? { x: '-50%' } : undefined} className={collapsed ? 'fixed top-4 left-1/2 z-[var(--z-nav)] w-[calc(100%-2rem)] md:w-auto max-w-[380px] flex items-center justify-between gap-4 pl-4 pr-1.5 py-1.5 rounded-[var(--radius-pill)] backdrop-blur-xl bg-[var(--bg-surface)]/80 border border-[color:var(--border-default)]' : 'fixed top-0 inset-x-0 z-[var(--z-nav)] w-full flex items-center justify-between px-6 md:px-12 py-5 bg-transparent'} transition={{ duration: .4, ease: [.16, 1, .3, 1] }}>
      <a href="#top" className="font-display text-lg font-medium tracking-tight">{/* Logo slot: replace with public/logo.svg once provided */}Meridian</a>
      <div className="flex items-center gap-2"><a href={repositoryUrl} className={collapsed ? 'bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium px-4 py-2 rounded-[var(--radius-pill)] hover:bg-[var(--accent-hover)] transition-colors' : 'hidden md:inline-flex border border-[color:var(--border-default)] text-sm font-medium px-4 py-2 rounded-[var(--radius-pill)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors'}>Install Meridian</a><button aria-label="Open menu" className="md:hidden p-2 text-[var(--text-secondary)]" onClick={() => setOpen(true)}><Menu size={20} /></button></div>
    </motion.nav>
    <AnimatePresence>{open && <motion.div initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .25 }} className="fixed inset-0 z-[var(--z-nav)] bg-[var(--bg-primary)]/98 backdrop-blur-xl p-6"><div className="flex items-center justify-between"><span className="font-display text-lg">Meridian</span><button aria-label="Close menu" onClick={() => setOpen(false)}><X size={20} /></button></div><div className="mt-16 flex flex-col gap-6 text-2xl"><a href={repositoryUrl} onClick={() => setOpen(false)}>Install Meridian</a><a href={repositoryUrl} onClick={() => setOpen(false)}>View on GitHub</a></div></motion.div>}</AnimatePresence>
  </>
}
