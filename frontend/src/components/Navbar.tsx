import { useState, useEffect } from "react";
import { Link as ScrollLink, animateScroll as scroll } from "react-scroll";
import { MapPin } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const menuItems = [
    { name: "Home", id: "home" },
    { name: "About Us", id: "about" },
    { name: "Supported Devices", id: "supported-devices" },
    { name: "FAQs & Support", id: "faq" },
    { name: "Pricing", id: "pricing" },
  ];

  // Update active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200; // offset for navbar
      for (const item of menuItems) {
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= scrollPos && el.offsetTop + el.offsetHeight > scrollPos) {
          setActiveSection(item.id);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="bg-white shadow-sm border-b fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => scroll.scrollToTop()}>
          <MapPin className="w-8 h-8 text-primary-600" />
          <span className="font-bold text-xl text-gray-900">EnuTrac</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6 items-center">
          {menuItems.map((item, idx) => (
            <ScrollLink
              key={idx}
              to={item.id}
              smooth={true}
              duration={500}
              offset={-64} // navbar height
              className={`cursor-pointer font-medium ${
                activeSection === item.id ? "text-primary-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {item.name}
            </ScrollLink>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            {isOpen ? "✖" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t shadow-sm">
          <div className="flex flex-col space-y-2 p-4">
            {menuItems.map((item, idx) => (
              <ScrollLink
                key={idx}
                to={item.id}
                smooth={true}
                duration={500}
                offset={-64}
                className={`cursor-pointer font-medium ${
                  activeSection === item.id ? "text-primary-600" : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setIsOpen(false)}
                {...({} as any)} 
              >
                {item.name}

              </ScrollLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
