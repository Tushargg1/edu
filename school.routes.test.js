# EduSync — Design System Steering

## Overview
Style: Clean · Card-based · Professional
Built for Indian schools. Every component communicates reliability and clarity.
Stack: MERN + Tailwind CSS
All colors must be configured as custom tokens in tailwind.config.js.

## Color Palette

### Primary & Brand Colors
- Primary Blue:   #2563EB  — CTAs, links, active states
- Primary Dark:   #1D4ED8  — Hover states on buttons
- Primary Light:  #DBEAFE  — Backgrounds, badges, tints
- Sky Blue:       #0EA5E9  — Secondary accent, charts
- Indigo:         #6366F1  — Performance graphs, highlights

### Semantic Colors
- Success:        #10B981  — Present · Paid · Done
- Success Light:  #DCFCE7  — Badge bg · Alert bg
- Warning:        #F59E0B  — Pending · Fee due soon
- Warning Light:  #FEF3C7  — Badge bg · Alert bg
- Danger:         #EF4444  — Absent · Overdue · Error
- Danger Light:   #FEF2F2  — Badge bg · Alert bg

### Neutrals & Surfaces
- Sidebar / Dark: #0F172A  — Sidebar background
- Text Primary:   #0F172A  — Headings, labels
- Text Secondary: #475569  — Body text, captions
- Text Muted:     #94A3B8  — Hints, placeholders
- Border:         #E2E8F0  — Dividers, input borders
- Surface:        #F8FAFC  — Page background

### Tailwind Config Tokens (add to tailwind.config.js)
```js
colors: {
  primary:      '#2563EB',
  'primary-dk': '#1D4ED8',
  'primary-lt': '#DBEAFE',
  sky:          '#0EA5E9',
  indigo:       '#6366F1',
  success:      '#10B981',
  'success-lt': '#DCFCE7',
  warning:      '#F59E0B',
  'warning-lt': '#FEF3C7',
  danger:       '#EF4444',
  'danger-lt':  '#FEF2F2',
  sidebar:      '#0F172A',
  'text-pri':   '#0F172A',
  'text-sec':   '#475569',
  'text-muted': '#94A3B8',
  border:       '#E2E8F0',
  surface:      '#F8FAFC',
}
```

## Typography

### Fonts (Google Fonts — import all three)
- Display / Headings: Instrument Serif — page titles, hero headings, section headers
- UI / Body:          DM Sans (weights: 300, 400, 500, 600, 700) — all UI, body, buttons, labels
- Data / IDs:         JetBrains Mono — student IDs, codes, statistics, data values

### Type Scale
| Element        | Font            | Size      | Weight | Color Token  |
|----------------|-----------------|-----------|--------|--------------|
| Page title     | Instrument Serif| 32px/2rem | 400    | #0F172A      |
| Section heading| DM Sans         | 20px      | 600    | #0F172A      |
| Card title     | DM Sans         | 14px      | 600    | #0F172A      |
| Body text      | DM Sans         | 14px      | 400    | #475569      |
| Button text    | DM Sans         | 14px      | 500    | Contextual   |
| Label/caption  | DM Sans         | 12px      | 500    | #94A3B8      |
| Data / ID      | JetBrains Mono  | 13px      | 400    | Contextual   |

## UI Components

### Buttons
All buttons: border-radius 10px · font DM Sans 500 · transition 150ms ease · hover: translateY(-1px)
Padding: 9px 18px (default) · 6px 12px (sm) · 13px 28px (lg)

| Variant   | Background | Text    | Border              | Usage                          |
|-----------|------------|---------|---------------------|--------------------------------|
| Primary   | #2563EB    | #FFFFFF | None (blue glow)    | Mark Attendance, Submit, Pay   |
| Secondary | #DBEAFE    | #2563EB | None                | View Report, Export            |
| Ghost     | transparent| #475569 | 1px solid #E2E8F0   | Cancel, dismiss, neutral       |
| Danger    | #FEF2F2    | #EF4444 | 1px solid #FECACA   | Delete, remove, reject         |
| Success   | #DCFCE7    | #10B981 | 1px solid #BBF7D0   | Confirm present, approve       |

Primary button shadow: 0 8px 24px rgba(37,99,235,0.20)
RULE: Never apply this shadow to anything other than the primary CTA on a given screen.

### Input Fields
All inputs: border-radius 10px · padding 10px 14px · background white
Label: DM Sans 500 13px above field · Hint/error: 12px DM Sans below field
Icon-prefix inputs: padding-left 38px + absolute icon at left:12px

| State    | Border               | Shadow/Ring                         |
|----------|----------------------|-------------------------------------|
| Default  | 1.5px solid #E2E8F0  | None                                |
| Focus    | 1.5px solid #2563EB  | 0 0 0 3px rgba(37,99,235,0.10)      |
| Error    | 1.5px solid #EF4444  | 0 0 0 3px rgba(239,68,68,0.10)      |
| Disabled | 1.5px solid #E2E8F0  | None · bg #F8FAFC · opacity 0.6     |

### Stat Cards
Background: #FFFFFF · Border: 1px solid #E2E8F0 · Radius: 16px · Shadow: shadow-sm
Icon box: 44×44px · 12px radius · colored background
Value: DM Sans 700 24px · Trend: semantic color with arrow prefix

### Badges & Status Tags
Shape: pill (border-radius 9999px) · Padding: 3px 10px · Font: DM Sans 500 12px · No border

| Badge     | Background | Text Color | Use Case            |
|-----------|------------|------------|---------------------|
| Present   | #DCFCE7    | #15803D    | Attendance status   |
| Absent    | #FEF2F2    | #B91C1C    | Attendance status   |
| Pending   | #FEF3C7    | #92400E    | Assignment/fee      |
| Submitted | #DBEAFE    | #1E40AF    | Assignment submitted|
| PTM       | #EDE9FE    | #6D28D9    | Calendar event      |
| Holiday   | #F1F5F9    | #475569    | Calendar event      |

### Alert Banners
Left border: 3px solid (semantic color) · No outer border

| Type    | Background | Left Border        | Text Color |
|---------|------------|--------------------|------------|
| Info    | #DBEAFE    | 3px solid #2563EB  | #1E40AF    |
| Success | #DCFCE7    | 3px solid #10B981  | #166534    |
| Warning | #FEF3C7    | 3px solid #F59E0B  | #92400E    |
| Danger  | #FEF2F2    | 3px solid #EF4444  | #B91C1C    |

## Layout & Grid System

### Application Shell
| Zone         | Width/Height           | Color   | Notes                                    |
|--------------|------------------------|---------|------------------------------------------|
| Sidebar      | 240px fixed (desktop)  | #0F172A | Icon-only on tablet, bottom tab on mobile|
| Topbar       | Full width · 56px      | #FFFFFF | Search + notifications + avatar          |
| Content Area | Remaining · max 1280px | #F8FAFC | Padded 24px all sides                    |
| Modal Overlay| Full screen            | rgba(0,0,0,0.4) | Blurred backdrop               |

### 12-Column Grid (gap-6 = 24px gutters)
| Pattern       | Columns   | Tailwind Class | Used For                 |
|---------------|-----------|----------------|--------------------------|
| 4 equal cards | 3+3+3+3   | grid-cols-4    | Stat cards on dashboard  |
| 3 equal cards | 4+4+4     | grid-cols-3    | Feature cards, class list|
| Two halves    | 6+6       | grid-cols-2    | Side-by-side panels      |
| Main+sidebar  | 8+4       | col-span-8/4   | Content + quick info     |
| Full width    | 12        | col-span-12    | Tables, calendar, charts |

### Responsive Breakpoints
| Breakpoint     | Width      | Sidebar              | Grid   |
|----------------|------------|----------------------|--------|
| Mobile (sm)    | < 640px    | Bottom tab bar (5)   | 4-col  |
| Tablet (md)    | 640–1024px | Icon-only collapsed  | 8-col  |
| Desktop (lg)   | > 1024px   | 240px full sidebar   | 12-col |

### Spacing Scale (8px base)
- p-1 / m-1  = 4px   — icon padding, tight gaps
- p-2 / gap-2 = 8px  — badge padding, small gaps
- p-3        = 12px  — input padding, list items
- p-4 / gap-4 = 16px — compact card padding
- p-6 / gap-6 = 24px — standard card padding, grid gap
- p-8        = 32px  — section padding, modal padding
- p-12       = 48px  — page section spacing
- p-16       = 64px  — large section breaks

### Border Radius System
- 4px  (rounded)    — small badges, tiny tags
- 6px  (rounded-md) — small buttons (sm variant)
- 10px (rounded-lg) — inputs, buttons (default), dropdowns
- 16px (rounded-xl) — cards, panels, list containers
- 24px (rounded-2xl)— modals, large overlay panels
- 9999px (rounded-full) — badges, pills, avatar circles

## Elevation & Shadows

RULE: Never mix shadow levels in the same page section.

| Level       | CSS Value                                                                 | Applied To                                 |
|-------------|---------------------------------------------------------------------------|---------------------------------------------|
| shadow-sm   | 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)            | Stat cards, table rows, default cards       |
| shadow-md   | 0 4px 16px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)           | Dropdowns, tooltips, hover state on cards   |
| shadow-lg   | 0 12px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)         | Modals, command palette, overlay panels     |
| shadow-blue | 0 8px 24px rgba(37,99,235,0.20)                                           | Primary CTA buttons ONLY                   |

## User Flow — Login to Dashboard

1. User lands on single login page (/) — enters User ID + password. No role selector.
2. Server: POST /api/auth/login → validate → read role field → issue JWT
3. Invalid credentials → inline error under input. No redirect.
4. Client decodes JWT → role-based redirect:
   - super_admin  → /super-admin/dashboard
   - school_admin → /admin/dashboard
   - teacher      → /teacher/dashboard
   - student      → /student/dashboard
5. Dashboard renders role-filtered sidebar + greeting + pre-fetched stat cards
6. React SPA with react-router-dom — no full page reloads
7. JWT expires (7 days) → server 401 → clear token → redirect /login with "Session expired"
8. Logout: avatar dropdown → clear JWT → /login

## Route Summary
| Screen               | Route                    | Who Sees It   |
|----------------------|--------------------------|---------------|
| Login                | /                        | Everyone      |
| Super Admin Dashboard| /super-admin/dashboard   | Platform owner|
| Admin Dashboard      | /admin/dashboard         | Principal     |
| Teacher Dashboard    | /teacher/dashboard       | Teachers      |
| Student Dashboard    | /student/dashboard       | Student+Parent|
