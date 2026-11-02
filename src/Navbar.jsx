import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useInRouterContext, useLocation } from "react-router-dom";
import "./Navbar.css";

// Auto-finds your logo in src/assets (prefers a filename containing "logo" or "sc").
// Works for png / jpg / jpeg / svg / webp, so no filename guessing needed.
const assetImages = import.meta.glob("./assets/*.{png,jpg,jpeg,svg,webp,avif}", {
  eager: true,
  import: "default",
});
const assetPaths = Object.keys(assetImages);
const logoPath =
  assetPaths.find((p) => /logo/i.test(p)) ||
  assetPaths.find((p) => /(^|[\/_-])sc/i.test(p)) ||
  assetPaths[0];
const logo = logoPath ? assetImages[logoPath] : "";

// ⚠️ Change the `to` paths if your router uses different ones
const NAV_ITEMS = [
  { key: "home", label: "Home", to: "/" },
  { key: "about", label: "About", to: "/about" },
  { key: "courses", label: "Courses", to: "/courses" },
  { key: "webinar", label: "Webinar", to: "/webinar" },
  { key: "contact", label: "Contact", to: "/contact" },
];

const getRouteKey = (pathname) => {
  const match = NAV_ITEMS.find(
    (i) => i.to !== "/" && (pathname === i.to || pathname.startsWith(i.to + "/"))
  );
  return match ? match.key : "home";
};

export default function Navbar() {
  // Prevents the blank "Uncaught" crash if Navbar is rendered outside <BrowserRouter>
  const inRouter = useInRouterContext();
  if (!inRouter) {
    console.error(
      "[Navbar] Must be rendered inside <BrowserRouter>. Move <Navbar /> inside it."
    );
    return null;
  }
  return <NavbarInner />;
}

function NavbarInner() {
  const { pathname, hash } = useLocation();
  const routeKey = getRouteKey(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const [sectionKey, setSectionKey] = useState(null);

  const navRef = useRef(null);
  const listRef = useRef(null);
  const indicatorRef = useRef(null);
  const labelRefs = useRef({});
  // Stable ref setters (a ref callback must NOT return a value in React 19)
  const refSetters = useRef({});
  const setLabelRef = (key) => {
    if (!refSetters.current[key]) {
      refSetters.current[key] = (el) => {
        labelRefs.current[key] = el;
      };
    }
    return refSetters.current[key];
  };
  const toggleRef = useRef(null);
  const readyRef = useRef(false);

  // Route decides the page; an in-page section (optional) may refine it.
  const activeKey = sectionKey || routeKey;

  /* ---------- Sliding underline indicator ---------- */
  const positionIndicator = useCallback(() => {
    const label = labelRefs.current[activeKey];
    const list = listRef.current;
    const bar = indicatorRef.current;
    if (!label || !list || !bar || list.offsetParent === null) return;
    const l = list.getBoundingClientRect();
    const e = label.getBoundingClientRect();
    bar.style.width = `${e.width}px`;
    bar.style.transform = `translateX(${e.left - l.left}px)`;
    if (!readyRef.current) {
      readyRef.current = true;
      // Let the first position paint, then enable transitions + draw-in
      requestAnimationFrame(() => bar.classList.add("is-ready"));
    }
  }, [activeKey]);

  useLayoutEffect(() => {
    positionIndicator();
  }, [positionIndicator]);

  useEffect(() => {
    const onResize = () => positionIndicator();
    window.addEventListener("resize", onResize);
    let ro;
    if (typeof ResizeObserver !== "undefined" && listRef.current) {
      ro = new ResizeObserver(() => requestAnimationFrame(onResize));
      ro.observe(listRef.current);
    }
    let cancelled = false;
    try {
      document.fonts?.ready?.then(() => {
        if (!cancelled) onResize();
      });
    } catch (e) {
      /* ignore */
    }
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (ro) ro.disconnect();
    };
  }, [positionIndicator]);

  /* ---------- Scrolled state (no React re-render per scroll) ---------- */
  useEffect(() => {
    let ticking = false;
    const update = () => {
      navRef.current?.classList.toggle("is-scrolled", window.scrollY > 24);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---------- Route change: reset, close menu, fix scroll ---------- */
  useEffect(() => {
    setSectionKey(null);
    setMenuOpen(false);
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  /* ---------- Optional section detection ----------
     On any page, add data-nav-section="about" (etc.) to a section and the
     indicator will follow it while scrolling. Pages without it just use the route. */
  useEffect(() => {
    const sections = document.querySelectorAll("[data-nav-section]");
    if (!sections.length) return undefined;

    const valid = new Set(NAV_ITEMS.map((i) => i.key));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const k = visible.target.getAttribute("data-nav-section");
          if (valid.has(k)) setSectionKey(k);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [pathname]);

  /* ---------- Mobile menu: Escape, outside click, scroll lock, resize ---------- */
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = (e) => e.matches && setMenuOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleLinkClick = (to) => {
    setMenuOpen(false);
    // Clicking the page you're already on → just return to top
    if (to === pathname && !hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const navMarkup = (
    <>
      <div
        className={`sc-nav__backdrop ${menuOpen ? "is-open" : ""}`}
        aria-hidden="true"
      />
      <header className="sc-nav" ref={navRef}>
        <div className="sc-nav__inner">
          <Link
            to="/"
            className="sc-nav__logo"
            aria-label="SC Academy – Home"
            onClick={() => handleLinkClick("/")}
          >
            <img src={logo} alt="SC Academy" />
          </Link>

          {/* Desktop links */}
          <nav className="sc-nav__desktop" aria-label="Primary">
            <ul className="sc-nav__list" ref={listRef}>
              {NAV_ITEMS.map((item, i) => (
                <li key={item.key} style={{ "--i": i }}>
                  <Link
                    to={item.to}
                    className={`sc-nav__link ${activeKey === item.key ? "is-active" : ""}`}
                    aria-current={routeKey === item.key ? "page" : undefined}
                    onClick={() => handleLinkClick(item.to)}
                  >
                    <span ref={setLabelRef(item.key)}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
              <li className="sc-nav__indicator" ref={indicatorRef} aria-hidden="true">
                <i />
              </li>
            </ul>
          </nav>

          {/* Mobile hamburger */}
          <button
            ref={toggleRef}
            type="button"
            className={`sc-nav__toggle ${menuOpen ? "is-open" : ""}`}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="sc-mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Mobile menu */}
        <nav
          id="sc-mobile-menu"
          className={`sc-nav__mobile ${menuOpen ? "is-open" : ""}`}
          aria-label="Mobile"
        >
          <ul>
            {NAV_ITEMS.map((item, i) => (
              <li key={item.key} style={{ "--i": i }}>
                <Link
                  to={item.to}
                  className={`sc-nav__mlink ${activeKey === item.key ? "is-active" : ""}`}
                  aria-current={routeKey === item.key ? "page" : undefined}
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => handleLinkClick(item.to)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );

  return (
    <>
      {/* The navbar is fixed, so non-Home pages get a spacer to avoid content hiding under it.
          Home keeps its full-screen hero starting at the very top. */}
      {pathname !== "/" && <div className="sc-nav-spacer" aria-hidden="true" />}
      {/* Portal to <body>: no parent overflow/transform/z-index can hide the navbar */}
      {createPortal(navMarkup, document.body)}
    </>
  );
}