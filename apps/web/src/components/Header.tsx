'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { siteConfig, navigation } from '@/lib/config';

/** Icon beside each mega-menu column heading, matched on the heading text. */
function columnIcon(title?: string): string {
  const t = (title ?? '').toLowerCase();
  if (t.includes('sql server')) return 't-database';
  if (t.includes('open source')) return 't-layers';
  if (t.includes('zealand') || t.includes('pacific')) return 't-network';
  if (t.includes('cloud')) return 't-cloud';
  if (t.includes('software') || t.includes('ai')) return 't-code';
  return 't-server';
}

/** The strip along the bottom of each panel: one next step, plus the phone. */
const MENU_FOOTER: Record<string, { lead: string; label: string; href: string }> = {
  database: {
    lead: 'Not sure where to start?',
    label: 'Get the free 20-point SQL Server health check',
    href: '/free-20-point-sql-server-health-check',
  },
  technology: {
    lead: 'Looking for something else?',
    label: 'See every service we offer',
    href: '/other-services',
  },
};

function Chevron() {
  return (
    <svg className="caret" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg className="mm-arrow" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" />
    </svg>
  );
}

/**
 * Header ported from the approved mockup. The mega-menu is hover-driven on
 * desktop (CSS) and click/keyboard-driven below 1024px (this component), which
 * is what keeps it operable for keyboard and screen-reader users.
 */
export function Header() {
  const [navOpen, setNavOpen] = useState(false);
  /**
   * Which mega menu is expanded on mobile, by key — not a boolean.
   *
   * There are two panels now, and a shared boolean would open both at once,
   * doubling the scroll length on exactly the screen where that hurts most.
   */
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  /**
   * Which desktop panel is suppressed after a click inside it.
   *
   * The panel opens on :hover, and a client-side navigation does not move the
   * cursor — so after clicking a link the pointer is still over the trigger,
   * :hover is still true, and the menu hangs over the page just navigated to
   * until the mouse happens to move away. Suppressing it until the pointer
   * leaves and comes back is what a full page load used to do for free.
   */
  const [suppressed, setSuppressed] = useState<string | null>(null);
  const pathname = usePathname();

  /** Adds a shadow and tightens the bar once the page has scrolled. */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close everything on navigation.
  useEffect(() => {
    setNavOpen(false);
    setOpenMenu(null);
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
        setOpenMenu(null);
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

  /**
   * Below 1024px there is no hover, so the trigger toggles its accordion
   * instead of navigating. Above it, the panel is CSS hover-driven and the
   * click falls through to the section hub — a top-level nav item that cannot
   * be followed is a dead end for keyboard and touch users alike.
   */
  const handleMegaTrigger = useCallback((e: React.MouseEvent<HTMLAnchorElement>, key: string) => {
    if (window.innerWidth <= 1024) {
      e.preventDefault();
      setOpenMenu((current) => (current === key ? null : key));
    }
  }, []);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <p className="topbar-note">
            <span className="topbar-live" aria-hidden="true" />
            24/7 senior DBA support · Australia, New Zealand &amp; Pacific
          </p>
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
              Book a call
            </a>
          </div>
        </div>
      </div>

      <header className={scrolled ? 'is-scrolled' : undefined}>
        <div className="wrap nav">
          <Link className="logo" href="/" aria-label={`${siteConfig.name} home`}>
            {/* Intrinsic dimensions, not display ones: CSS sizes this to
                64px tall with width:auto, and declaring a ratio that does not
                match the file makes the browser reserve the wrong width and
                shift the header once the image loads. */}
            <Image
              src={siteConfig.logoHeader}
              alt={siteConfig.name}
              width={745}
              height={239}
              priority
            />
          </Link>

          <a className="nav-call" href={`tel:${siteConfig.phoneE164}`} aria-label={`Call ${siteConfig.phone}`}>
            <svg aria-hidden="true">
              <use href="#i-phone" />
            </svg>
          </a>

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
                {navigation.main.map((item) => {
                  const columns = item.menu
                    ? navigation.menus[item.menu as keyof typeof navigation.menus]
                    : null;

                  if (!columns) {
                    return (
                      <li key={item.label}>
                        <Link href={item.href} className={isActive(item.href) ? 'active' : undefined}>
                          {item.label}
                        </Link>
                      </li>
                    );
                  }

                  const isOpen = openMenu === item.menu;
                  const isSuppressed = suppressed === item.menu;

                  return (
                    <li
                      key={item.label}
                      className={`has-mega${isOpen ? ' open' : ''}${isSuppressed ? ' suppressed' : ''}`}
                      onMouseLeave={() => setSuppressed((c) => (c === item.menu ? null : c))}
                    >
                      {/* A real link, not href="#". On desktop the panel opens
                          on hover and this still navigates to the section hub;
                          below 1024px the click is intercepted to expand the
                          accordion instead, because there is no hover there. */}
                      <Link
                        href={item.href}
                        className={`mega-trigger${isActive(item.href) ? ' active' : ''}`}
                        onClick={(e) => handleMegaTrigger(e, item.menu!)}
                        onMouseDown={() => {
                          if (window.innerWidth > 1024) setSuppressed(item.menu!);
                        }}
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                      >
                        {item.label}
                        <Chevron />
                      </Link>

                      <div className="megamenu" style={{ '--mm-cols': columns.length } as React.CSSProperties}>
                        <div className="mm-grid">
                          {columns.map((col, ci) => {
                            // Single-column menus omit the heading: it would only
                            // repeat the trigger label sitting directly above it.
                            const title = 'title' in col ? (col.title as string) : undefined;
                            return (
                              <div
                                className={`mm-col${col.links.some((l) => l.label.length > 30) ? ' mm-col--wide' : ''}${col.links.length <= 2 ? ' mm-col--short' : ''}`}
                                key={title ?? ci}
                              >
                                {title && (
                                  <h5>
                                    <span className="mm-ic" aria-hidden="true">
                                      <svg>
                                        <use href={`#${columnIcon(title)}`} />
                                      </svg>
                                    </span>
                                    {title}
                                  </h5>
                                )}
                                {col.links.map((link) => (
                                  <Link
                                    key={link.label}
                                    href={link.href}
                                    className={pathname === link.href ? 'current' : undefined}
                                    onClick={(e) => {
                                      setSuppressed(item.menu!);
                                      setOpenMenu(null);
                                      // Focus would otherwise stay on a link inside
                                      // a panel that is about to be hidden.
                                      e.currentTarget.blur();
                                    }}
                                  >
                                    <span className="mm-text">
                                      {link.label}
                                      {link.sub ? <small>{link.sub}</small> : null}
                                    </span>
                                    <Arrow />
                                  </Link>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                        {MENU_FOOTER[item.menu!] && (
                          <div className="mm-foot">
                            <span>{MENU_FOOTER[item.menu!].lead}</span>
                            <Link
                              href={MENU_FOOTER[item.menu!].href}
                              className="mm-foot-link"
                              onClick={(e) => {
                                setSuppressed(item.menu!);
                                setOpenMenu(null);
                                e.currentTarget.blur();
                              }}
                            >
                              {MENU_FOOTER[item.menu!].label}
                              <Arrow />
                            </Link>
                            <a className="mm-foot-call" href={`tel:${siteConfig.phoneE164}`}>
                              <svg aria-hidden="true">
                                <use href="#i-phone" />
                              </svg>
                              {siteConfig.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="navcta">
              {siteConfig.portalEnabled && (
                <a className="btn btn-outline btn-sm" href="/client-portal">
                  Client Login
                </a>
              )}
              <Link className="btn btn-primary btn-sm nav-cta-main" href="/free-20-point-sql-server-health-check">
                Free health check
              </Link>
            </div>

            {/* Phones and tablets: the topbar is hidden there, so its contact
                routes move to the bottom of the menu. */}
            <div className="nav-contact">
              <a className="btn btn-outline" href={siteConfig.bookingUrl}>
                <svg aria-hidden="true">
                  <use href="#i-calendar" />
                </svg>
                Book a call
              </a>
              <a className="nav-contact-line" href={`tel:${siteConfig.phoneE164}`}>
                <svg aria-hidden="true">
                  <use href="#i-phone" />
                </svg>
                {siteConfig.phone}
              </a>
              <a className="nav-contact-line" href={`mailto:${siteConfig.email}`}>
                <svg aria-hidden="true">
                  <use href="#i-mail" />
                </svg>
                {siteConfig.email}
              </a>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
