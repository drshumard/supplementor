{
  "design_personality": {
    "brand_attributes": [
      "Apple-internal-tool minimalism (quiet, precise, fast)",
      "Premium medical (trustworthy, calm, non-clinical)",
      "Data-forward (tables first), zero cognitive overhead",
      "Desktop-only efficiency (keyboard-first, muscle memory)"
    ],
    "north_star": "Every screen should feel like a well-crafted spreadsheet meets Apple Settings: crisp type, calm surfaces, subtle depth, and instant feedback."
  },

  "inspiration_refs": {
    "dribbble": [
      {
        "title": "Minimal Dashboard UI Design for Healthcare and Telemedicine (Taqwah)",
        "url": "https://dribbble.com/shots/26448749-Minimal-Dashboard-UI-Design-for-Healthcare-and-Telemedicine",
        "notes": "Use the teal/gray medical palette + calm, minimal panels. Translate into *more Apple-like* by reducing decoration, tightening typography, and making tables the hero." 
      },
      {
        "title": "Healthcare Dashboard Design (Orbix Studio)",
        "url": "https://dribbble.com/shots/27047468-Healthcare-Dashboard-Design",
        "notes": "Soft neutral background + muted green accent. Adapt for enterprise by increasing contrast, making controls smaller, and using an inspector panel pattern." 
      }
    ],
    "apple_design": [
      {
        "title": "Apple Developer Design / HIG (2026 trends noted in search)",
        "url": "https://developer.apple.com/design/",
        "notes": "Borrow: precision spacing, hairline dividers, subtle translucency in chrome/toolbars only, and calm motion. Avoid heavy gradients." 
      }
    ]
  },

  "layout_system": {
    "app_shell": {
      "pattern": "Top command bar + left navigation rail + main canvas + optional right inspector",
      "why": "Plan Editor is a workhorse: keep the table wide, controls predictable, and secondary editing in an inspector.",
      "regions": {
        "top_bar": "72px height; contains: app name, global search, current patient/program, export buttons",
        "left_nav": "240px fixed; Dashboard, Plans, Admin (role gated)",
        "main_canvas": "Max width 1440–1600 with generous gutters; table-first",
        "right_inspector": "360–420px; shows selected supplement details, cost summary (HC), validation warnings"
      }
    },
    "grid_and_spacing": {
      "container": "px-10 (desktop), content max-w-[1560px]",
      "section_spacing": "space-y-8 for pages, space-y-6 inside cards",
      "table_density": {
        "default_row_height": "44px",
        "compact_row_height": "36px (optional toggle)",
        "cell_padding": "px-3 py-2",
        "header_padding": "px-3 py-2.5"
      },
      "divider_style": "1px hairline using border color token; no heavy shadows"
    }
  },

  "typography": {
    "font_pairing": {
      "ui": {
        "name": "Manrope",
        "why": "Crisp and modern, slightly more distinctive than Inter while still Apple-adjacent."
      },
      "mono": {
        "name": "IBM Plex Mono",
        "why": "For SKU/capsule size/cost numbers; makes tabular data scan-friendly."
      }
    },
    "google_fonts_import": {
      "note": "Add to /app/frontend/src/index.css (top) or in public/index.html. Prefer index.css for simplicity.",
      "css": "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');"
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.02em]",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "page_title": "text-xl font-semibold tracking-[-0.01em]",
      "table_header": "text-xs font-semibold tracking-[0.08em] uppercase",
      "body": "text-sm leading-6",
      "small": "text-xs text-muted-foreground",
      "numeric": "font-mono tabular-nums"
    }
  },

  "color_system": {
    "intent": "Refined medical neutrals + one ocean-teal accent. No purple. No loud gradients. Keep surfaces white and separators soft.",
    "palette": {
      "ink": "#0B0D10",
      "slate": "#2B3437",
      "muted": "#61746E",
      "surface": "#FFFFFF",
      "surface_2": "#F6F7F7",
      "surface_3": "#EEF1F1",
      "border": "#DCE3E3",
      "accent_teal": "#0D5F68",
      "accent_teal_2": "#46989D",
      "accent_mint_wash": "#EAF4F3",
      "success": "#147D5A",
      "warning": "#B26A00",
      "danger": "#C53B3B",
      "focus_ring": "rgba(13,95,104,0.28)"
    },
    "semantic_tokens_hsl_for_shadcn": {
      "note": "Update :root tokens in /app/frontend/src/index.css to these HSL values to keep shadcn consistent.",
      "tokens": {
        "--background": "0 0% 100%",
        "--foreground": "220 20% 5%",
        "--card": "0 0% 100%",
        "--card-foreground": "220 20% 5%",
        "--popover": "0 0% 100%",
        "--popover-foreground": "220 20% 5%",
        "--primary": "187 79% 23%",
        "--primary-foreground": "0 0% 100%",
        "--secondary": "180 8% 96%",
        "--secondary-foreground": "220 20% 10%",
        "--muted": "180 8% 96%",
        "--muted-foreground": "190 9% 35%",
        "--accent": "174 35% 93%",
        "--accent-foreground": "220 20% 10%",
        "--destructive": "0 68% 50%",
        "--destructive-foreground": "0 0% 100%",
        "--border": "184 12% 86%",
        "--input": "184 12% 86%",
        "--ring": "187 79% 23%",
        "--radius": "0.75rem"
      }
    },
    "gradients": {
      "allowed_usage": "Only as subtle page background wash in the top 15–20% of viewport (hero-ish). Not on cards/tables.",
      "safe_gradient_examples": [
        {
          "name": "Teal mist",
          "css": "radial-gradient(900px circle at 10% 0%, rgba(13,95,104,0.10), transparent 55%), radial-gradient(700px circle at 85% 10%, rgba(70,152,157,0.08), transparent 55%)"
        }
      ]
    }
  },

  "global_css_tokens": {
    "note": "These are extra CSS variables (beyond shadcn) to make the UI feel Apple-precise.",
    "add_to_index_css": ":root {\n  --font-sans: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n  --font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;\n  --shadow-sm: 0 1px 2px rgba(11,13,16,0.06);\n  --shadow-md: 0 12px 30px rgba(11,13,16,0.10);\n  --hairline: 1px;\n  --focus: 0 0 0 4px rgba(13,95,104,0.18);\n  --focus-strong: 0 0 0 5px rgba(13,95,104,0.24);\n  --table-zebra: rgba(238,241,241,0.45);\n}\nhtml, body { font-family: var(--font-sans); }\n* { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }\n::selection { background: rgba(13,95,104,0.18); }"
  },

  "components": {
    "component_path": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "command_typeahead": "/app/frontend/src/components/ui/command.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "alert_dialog": "/app/frontend/src/components/ui/alert-dialog.jsx",
      "dropdown_menu": "/app/frontend/src/components/ui/dropdown-menu.jsx",
      "sheet_inspector": "/app/frontend/src/components/ui/sheet.jsx",
      "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
      "separator": "/app/frontend/src/components/ui/separator.jsx",
      "sonner_toast": "/app/frontend/src/components/ui/sonner.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx"
    },
    "buttons": {
      "style": "Professional/Corporate leaning Apple-minimal: medium radius, tonal fill, subtle elevation.",
      "variants": {
        "primary": "bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.92)] focus-visible:ring-0 focus-visible:shadow-[var(--focus)]",
        "secondary": "bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary)/0.75)]",
        "ghost": "hover:bg-accent hover:text-accent-foreground",
        "danger": "bg-destructive text-destructive-foreground hover:bg-[hsl(var(--destructive)/0.9)]"
      },
      "sizes": {
        "sm": "h-8 px-3 text-sm",
        "md": "h-9 px-3.5 text-sm",
        "lg": "h-10 px-4 text-sm"
      },
      "micro_interaction": "On hover: subtle lift via shadow-sm; on active: scale-95 (only button) + reduce shadow. Never transition transforms globally."
    },
    "inputs_and_fields": {
      "rules": [
        "Use Input + Select from shadcn, with bg-white, border hairline, and strong focus ring.",
        "Numeric fields in tables must use font-mono tabular-nums.",
        "For dosage units, use right-aligned numeric input and left-aligned unit label inside the cell."
      ],
      "focus": "Use focus-visible:shadow-[var(--focus)] and border-primary/30."
    },
    "tables": {
      "north_star": "Extremely scannable and calm: minimal borders, zebra on hover only, sticky header, column alignment.",
      "styling": {
        "table_wrapper": "rounded-xl border bg-card shadow-[var(--shadow-sm)]",
        "header": "sticky top-0 z-10 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b",
        "header_text": "text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground",
        "row": "hover:bg-[var(--table-zebra)]",
        "cell": "px-3 py-2 text-sm",
        "numeric_cell": "px-3 py-2 text-sm font-mono tabular-nums text-right",
        "divider": "border-b border-border/70",
        "selected_row": "bg-[rgba(13,95,104,0.08)]"
      },
      "column_guidance": {
        "supplement_name": "left aligned, flexible",
        "dosage": "right aligned numeric",
        "frequency": "center or right (keep consistent)",
        "bottles": "right aligned numeric",
        "cost": "right aligned numeric (HC only)",
        "actions": "far right; icon buttons (ghost)"
      },
      "interaction": {
        "keyboard": [
          "Enter: add new row below",
          "Cmd/Ctrl+K: open supplement typeahead",
          "Cmd/Ctrl+S: save (toast confirmation)",
          "Cmd/Ctrl+P: PDF preview"
        ],
        "inline_validation": "Show subtle warning badge in-row; details in right inspector."
      }
    },
    "navigation": {
      "left_rail": "Use Navigation Menu / simple list with active pill highlight (accent_mint_wash).",
      "breadcrumbs": "Use breadcrumb component for Plan Editor: Dashboard / Plans / Patient Name / Program / Step.",
      "tabs_months": "Use Tabs for months. Tabs list should be scrollable if >6 months; add ScrollArea horizontal."
    },
    "dialogs_and_sheets": {
      "use_cases": {
        "sheet_inspector": "Right side sheet for supplement details, notes, and cost breakdown.",
        "dialog": "PDF preview + export options.",
        "alert_dialog": "Destructive actions: delete supplement, remove month, discard changes."
      },
      "motion": "Sheet should slide in 180–220ms ease-out; backdrop fade 160ms."
    },
    "toasts": {
      "library": "sonner",
      "usage": "Use for Save success, Export complete, Validation warnings. Keep copy short and clinical.",
      "examples": [
        "Saved protocol changes",
        "Exported PDF (HC view)",
        "Missing dosage for 2 items"
      ]
    }
  },

  "page_blueprints": {
    "login": {
      "layout": "Centered card on a near-white background with subtle teal mist gradient top (<=15% viewport).",
      "components": ["card", "input", "button"],
      "details": [
        "Left side: clinic mark + short line: 'Protocol Manager'.",
        "Right: form with Email, Password, Sign in.",
        "Add small footer: 'Need access? Contact admin.'"
      ],
      "testids": {
        "email": "login-email-input",
        "password": "login-password-input",
        "submit": "login-submit-button"
      }
    },
    "plans_dashboard": {
      "layout": "Top bar + table of plans; right side quick actions panel optional.",
      "components": ["table", "input", "button", "dropdown_menu"],
      "table_columns": ["Patient", "Program", "Step", "Last edited", "Owner", "Actions"],
      "primary_actions": [
        "Create new plan",
        "Search plans (typeahead)",
        "Filter program"
      ],
      "testids": {
        "create": "plans-create-new-button",
        "search": "plans-search-input",
        "plans_table": "plans-table"
      }
    },
    "new_plan_wizard": {
      "layout": "Single-column form (max-w 920) with a progress indicator and big whitespace.",
      "components": ["select", "calendar", "input", "button"],
      "steps": [
        "Program → Step (template)",
        "Months range (start month + count)",
        "Patient info",
        "Review & Create"
      ],
      "testids": {
        "program": "wizard-program-select",
        "step": "wizard-step-select",
        "months": "wizard-month-count-input",
        "create": "wizard-create-plan-button"
      }
    },
    "plan_editor": {
      "layout": "Main canvas = Month tabs + supplement table. Right inspector = cost summary and selected row details.",
      "components": ["tabs", "table", "command", "sheet", "input", "button", "separator"],
      "key_interactions": [
        "Cmd/Ctrl+K opens supplement search (Command) and inserts selected supplement as new row.",
        "Inline dosage edits recalc bottles + costs instantly (debounced 80–120ms).",
        "Row actions: duplicate, remove (confirm).",
        "Multi-step view: Step switcher in top bar (Select) + view next/prev step."
      ],
      "hc_vs_patient": {
        "hc_view": "Show cost columns and right inspector cost totals.",
        "patient_view": "Hide all cost columns; show a discreet 'Patient PDF view' pill in top bar; export button changes label."
      },
      "testids": {
        "month_tabs": "plan-editor-month-tabs",
        "supplement_typeahead": "plan-editor-supplement-typeahead",
        "add_row": "plan-editor-add-row-button",
        "export_pdf": "plan-editor-export-pdf-button",
        "cost_summary": "plan-editor-cost-summary"
      }
    },
    "admin_master_supplements": {
      "layout": "Table-first CRUD with a pinned top toolbar (Search, Add supplement).",
      "components": ["table", "dialog", "input", "button", "dropdown_menu"],
      "table_columns": ["Name", "Brand", "Form", "Bottle size", "Unit", "Price", "Active", "Actions"],
      "testids": {
        "search": "admin-supplements-search-input",
        "add": "admin-supplements-add-button",
        "table": "admin-supplements-table"
      }
    },
    "admin_protocol_templates": {
      "layout": "Program/Step picker (left) + template editor (main) + preview (right optional).",
      "components": ["select", "tabs", "table", "command", "button"],
      "testids": {
        "program": "admin-templates-program-select",
        "step": "admin-templates-step-select",
        "template_table": "admin-templates-table",
        "save": "admin-templates-save-button"
      }
    },
    "pdf_preview_export": {
      "layout": "Dialog with split view: left preview (scroll), right export settings.",
      "components": ["dialog", "scroll-area", "radio-group", "button"],
      "variants": ["Patient (no costs)", "HC (with costs)"],
      "testids": {
        "variant": "pdf-export-variant-radio",
        "download": "pdf-export-download-button"
      }
    }
  },

  "motion_and_microinteractions": {
    "library": {
      "recommend": "framer-motion",
      "why": "For subtle entrance transitions and sheet/dialog choreography without hand-rolling CSS.",
      "install": "npm i framer-motion",
      "usage_notes": [
        "Use for: table row add/remove animations (height + opacity), wizard step transitions, inspector open/close.",
        "Honor prefers-reduced-motion: disable motion or reduce duration to 0."
      ]
    },
    "durations": {
      "fast": "120–160ms",
      "standard": "180–240ms",
      "slow": "320ms (rare; only for page transitions)"
    },
    "easing": {
      "primary": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      "exit": "cubic-bezier(0.4, 0, 1, 1)"
    },
    "hover": [
      "Buttons: shadow-sm increase + bg tint",
      "Table rows: subtle wash",
      "Icon buttons: bg-accent on hover"
    ]
  },

  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text and essential icons.",
      "All inputs must have visible labels (Label component) or aria-label for icon-only controls.",
      "Use focus-visible styles (ring/shadow) that are clearly visible on white.",
      "Respect prefers-reduced-motion.",
      "Tab order: left nav → top bar → main canvas → inspector."
    ],
    "table_a11y": [
      "Use proper <TableHeader>/<TableHead> structure from shadcn Table.",
      "For inline editable cells, ensure inputs have aria-label like 'Dosage for Magnesium'."
    ]
  },

  "images": {
    "image_urls": [
      {
        "category": "login_background_optional",
        "description": "Use as a very subtle, blurred side panel image on Login (only if needed). Keep opacity 6–10% and add strong white overlay.",
        "url": "https://images.unsplash.com/photo-1570105954248-fa0c1376edfe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxtaW5pbWFsJTIwY2xlYW4lMjBjbGluaWMlMjBpbnRlcmlvciUyMHNvZnQlMjBkYXlsaWdodHxlbnwwfHx8d2hpdGV8MTc3MDkwMjA5OXww&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "empty_state_optional",
        "description": "A neutral clinic texture photo for empty states (e.g., no plans yet). Use tiny thumbnail with grayscale + 70% white overlay.",
        "url": "https://images.unsplash.com/photo-1570427224050-b080ad19e3c4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwyfHxtaW5pbWFsJTIwY2xlYW4lMjBjbGluaWMlMjBpbnRlcmlvciUyMHNvZnQlMjBkYXlsaWdodHxlbnwwfHx8d2hpdGV8MTc3MDkwMjA5OXww&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "about_panel_optional",
        "description": "Optional image for an About/Clinic panel. Keep extremely subtle; do not dominate.",
        "url": "https://images.unsplash.com/photo-1590411255052-ea52fd44c531?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwzfHxtaW5pbWFsJTIwY2xlYW4lMjBjbGluaWMlMjBpbnRlcmlvciUyMHNvZnQlMjBkYXlsaWdodHxlbnwwfHx8d2hpdGV8MTc3MDkwMjA5OXww&ixlib=rb-4.1.0&q=85"
      }
    ]
  },

  "instructions_to_main_agent": {
    "high_priority": [
      "Replace CRA default App.css styles (black centered header) with a neutral app shell. Do NOT center-align the whole app.",
      "Update /app/frontend/src/index.css :root tokens to match the teal medical palette (HSL values provided).",
      "Implement the app shell layout (top bar + left nav + optional inspector) before building pages.",
      "Tables are the product: implement sticky headers, hairline borders, numeric alignment, and keyboard shortcuts.",
      "Role-based views: costs must never render in patient PDF/export view and should be hidden at UI level too.",
      "Every interactive and key informational element must include data-testid in kebab-case.",
      "Use shadcn components from /app/frontend/src/components/ui/*.jsx only (no raw HTML dropdowns/calendars/toasts)."
    ],
    "implementation_notes_js": [
      "This codebase uses .js/.jsx (not .tsx). Keep new components in .jsx and avoid TS-only patterns.",
      "Prefer composition: Page components default export; reusable components named exports.",
      "When creating table cells with inputs, ensure controlled inputs are debounced and calculations are derived from state (not DOM)."
    ],
    "data_testid_convention": {
      "rule": "kebab-case describing role/function, not appearance",
      "examples": [
        "plan-editor-export-pdf-button",
        "admin-supplements-add-button",
        "template-editor-save-button",
        "cost-summary-total-value"
      ]
    }
  },

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
