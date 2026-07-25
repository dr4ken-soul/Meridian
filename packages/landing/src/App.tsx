import './styles/globals.css'
import GridBackground from './components/ui/GridBackground'
import Nav from './components/layout/Nav'
import Hero from './components/sections/Hero'
import Mechanism from './components/sections/Mechanism'
import SignozDepth from './components/sections/SignozDepth'
import Statement from './components/sections/Statement'
import FinalCta from './components/sections/FinalCta'
/** Composes the Meridian landing page. */
export default function App() { return <main className="relative"><GridBackground /><Nav /><Hero /><Mechanism /><SignozDepth /><Statement /><FinalCta /></main> }
