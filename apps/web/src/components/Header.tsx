'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { siteConfig, navigation } from '@/lib/config';

/**
 * Header ported from the approved mockup. The mega-menu is hover-driven on
 * desktop (CSS) and click/keyboard-driven below 1024px (this component), which
 * is what keeps it operable for keyboard and screen-reader users.
 */
export function Header() {
  const [navOpen, setNavOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const pathname = usePathname();

  // Close everything on navigation.
  useEffect(() => {
    setNavOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  /**
   * Flag the open panel on <body> so unrelated fixed-position UI can get out of
   * its way — the chat launcher sits at z-index 200 and would otherwise cover
   * the last menu item.
   */
  useEffect(() => {
    document.body.classList.toggle('nav-open', navOpen);
    return () => document.body.classList.remove('nav-open');
  }, [navOpen]);

  /**
   * Publish the space actually left below the header so the panel can size
   * itself to it. The header only sits at viewport top once the page has
   * scrolled past the topbar; before that it is pushed down by however many
   * lines the topbar has wrapped to, and a CSS-only max-height would run the
   * panel off the bottom of the screen with no way to scroll to the last item.
   */
  useEffect(() => {
    if (!navOpen) {
      document.documentElement.style.removeProperty('--nav-avail');
      return;
    }
    const measure = () => {
      const header = document.querySelector('header');
      if (!header) return;
      const available = window.innerHeight - header.getBoundingClientRect().bottom;
      document.documentElement.style.setProperty('--nav-avail', `${Math.max(available, 200)}px`);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [navOpen]);

  // Reset mobile state when we cross back to the desktop breakpoint.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1024) {
        setNavOpen(false);
        setMegaOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Escape closes the panel and returns focus to the toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && navOpen) {
        setNavOpen(false);
        document.getElementById('navToggle')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const handleMegaTrigger = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.innerWidth <= 1024) {
      e.preventDefault();
      setMegaOpen((v) => !v);
    }
  }, []);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <div className="topbar-right">
            <a className="topbar-link" href={`mailto:${siteConfig.email}`}>
              <svg aria-hidden="true">
                <use href="#i-mail" />
              </svg>
              {siteConfig.email}
            </a>
            <a className="topbar-link" href={`tel:${siteConfig.phoneE164}`}>
              <svg aria-hidden="true">
                <use href="#i-phone" />
              </svg>
              {siteConfig.phone}
            </a>
            <a className="topbar-cta" href={siteConfig.bookingUrl}>
              <svg aria-hidden="true">
                <use href="#i-calendar" />
              </svg>
              BOOK A CALL
            </a>
          </div>
        </div>
      </div>

      <header>
        <div className="wrap nav">
          <Link className="logo" href="/" aria-label={`${siteConfig.name} home`}>
            <Image src={siteConfig.logo} alt={siteConfig.name} width={220} height={64} priority />
          </Link>

          <button
            className="nav-toggle"
            id="navToggle"
            aria-label="Toggle navigation menu"
            aria-expanded={navOpen}
            aria-controls="navPanel"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`nav-panel${navOpen ? ' open' : ''}`} id="navPanel">
            <nav className="mainnav" aria-label="Main navigation">
              <ul>
                <li>
                  <Link href="/" className={isActive('/') ? 'active' : undefined}>
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/products" className={isActive('/products') ? 'active' : undefined}>
                    Products
                  </Link>
                </li>
                <li className={`has-mega${megaOpen ? ' open' : ''}`}>
                  <a
                    href="#"
                    className="mega-trigger"
                    onClick={handleMegaTrigger}
                    aria-expanded={megaOpen}
                    aria-haspopup="true"
                  >
                    Services{' '}
                    <span className="caret" aria-hidden="true">
                      ▾
                    </span>
                  </a>
                  <div className="megamenu">
                    {navigation.mega.map((col) => (
                      <div className="mm-col" key={col.title}>
                        <h5>{col.title}</h5>
                        {col.links.map((link) => (
                          <Link
                            key={link.label}
                            href={link.href}
                            style={
                              'highlight' in link && link.highlight
                                ? { color: 'var(--orange-dark)', marginTop: 6 }
                                : undefined
                            }
                          >
                            {link.label}
                            {link.sub ? <small>{link.sub}</small> : null}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </li>
                <li>
                  <Link href="/expertise" className={isActive('/expertise') ? 'active' : undefined}>
                    Expertise
                  </Link>
                </li>
                <li>
                  <Link href="/pricing-and-plans" className={isActive('/pricing-and-plans') ? 'active' : undefined}>
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className={isActive('/contact') ? 'active' : undefined}>
                    Contact
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="navcta">
              <a className="btn btn-outline" href="/client-portal">
                Client Login
              </a>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
