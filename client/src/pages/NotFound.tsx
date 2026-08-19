import { ArrowLeft, Orbit, Radio } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return <main className="not-found-page"><div className="not-found-orbit"><div className="not-found-core"><Orbit size={28} /></div><span /><span /><span /></div><div className="eyebrow">SIGNAL LOST / ROUTE UNAVAILABLE</div><h1>That frame is<br /><em>not in this render.</em></h1><p>The route you requested drifted outside the current production timeline. Return to the studio and continue shaping the next scene.</p><Link href="/" className="primary-button"><ArrowLeft size={16} /> Return to studio</Link><div className="not-found-status"><Radio size={14} /> VideoForge routing layer · standing by</div></main>;
}
