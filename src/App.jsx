import { BrowserRouter, Routes, Route, useInRouterContext } from "react-router-dom";
import Navbar from "./Navbar";
import Hero from "./Hero";
import About from "./About";
import Courses from "./Courses";

import Contact from "./Contact";
import Webinar from "./Webinar";
import "./App.css";

// Home = one long scrolling page: Hero + the other sections stacked.
// data-nav-section lets the Navbar underline follow the section while you scroll.
function HomePage() {
  return (
    <main>
      <section id="home" data-nav-section="home">
        <Hero />
      </section>
      <section id="about" data-nav-section="about">
        <About />
      </section>
      <section id="courses" data-nav-section="courses">
        <Courses />
      </section>
      <section id="webinar" data-nav-section="webinar">
        <Webinar />
      </section>
      <section id="contact" data-nav-section="contact">
        <Contact />
      </section>
    </main>
  );
}

function Shell() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/webinar" element={<Webinar />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </>
  );
}

export default function App() {
  // Works whether <BrowserRouter> is already in main.jsx or not
  const inRouter = useInRouterContext();
  return inRouter ? (
    <Shell />
  ) : (
    <BrowserRouter basename="/sc-academy">
      <Shell />
    </BrowserRouter>
  );
}