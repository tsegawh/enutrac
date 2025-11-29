import { useState, useEffect } from "react";
import { Link as ScrollLink, animateScroll as scroll } from "react-scroll";
import { MapPin, Menu, X } from "lucide-react";

type MenuItem = {
  name: string;
  id: string;
};

const menuItems: MenuItem[] = [
  { name: "Home", id: "home" },
  { name: "About Us", id: "about" },
  { name: "Supported Devices", id: "supported-devices" },
  { name: "FAQs & Support", id: "faq" },
  { name: "Pricing", id: "pricing" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>("home");

  // Handle active menu highlight on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;

      menuItems.forEach((item) => {
        const section = document.getElementById(item.id);
        if (!section) return;

        const top = section.offsetTop;
        const height = section.offsetHeight;

        if (scrollPosition >= top && scrollPosition < top + height) {
          setActiveSection(item.id);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu if clicked outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest(".mobile-menu")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <nav className="fixed top-0 w-full z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* LOGO */}
          <div
            onClick={() => scroll.scrollToTop()}
            className="flex items-center gap-2 cursor-pointer"
          >
            <MapPin className="w-8 h-8 text-primary-600" />
            <span className="font-bold text-lg text-gray-900 tracking-wide">
              EnuTrac
            </span>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex gap-6 items-center">
            {menuItems.map((item) => (
              <ScrollLink
                key={item.id}
                to={item.id}
                smooth
                duration={400}
                offset={-64}
                spy
                className={`cursor-pointer font-medium transition-colors ${
                  activeSection === item.id
                    ? "text-primary-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {item.name}
              </ScrollLink>
            ))}
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="md:hidden mobile-menu">
            <button
              aria-label="Toggle Menu"
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              {isOpen ? (
                <X className="w-6 h-6 text-gray-800" />
              ) : (
                <Menu className="w-6 h-6 text-gray-800" />
              )}
            </button>
          </div>
        </div>
      </div>

{/* MOBILE DROPDOWN */}
{isOpen && (
  <div className="md:hidden absolute left-0 top-16 w-full bg-white shadow-md border-t z-50">
    <div className="flex flex-col gap-1 p-3">
      {menuItems.map((item) => (
        <div key={item.id} onClick={() => setMenuOpen(false)}>
          <ScrollLink
            to={item.id}
            smooth={true}
            duration={400}
            offset={-64}
            spy={true}
            className={`px-4 py-3 rounded-md font-medium cursor-pointer block ${
              activeSection === item.id
                ? "bg-primary-50 text-primary-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {item.name}
          </ScrollLink>
        </div>
      ))}
    </div>
  </div>
)}



    </nav>
  );
}
