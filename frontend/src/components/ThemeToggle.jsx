import React, { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

const ThemeToggle = () => {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle Theme"
            style={{
                background: "var(--accent-soft)",
                color: "var(--accent-primary)",
                padding: "0.5rem",
                borderRadius: "var(--radius-full)",
                width: "40px",
                height: "40px",
                fontSize: "1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--accent-primary)",
                boxShadow: "var(--shadow-sm)"
            }}
        >
            {theme === "light" ? "🌙" : "☀️"}
        </button>
    );
};

export default ThemeToggle;
