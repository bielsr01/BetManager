# Surebet Management System

## Overview

A comprehensive web application designed for managing and tracking surebet operations with automated OCR PDF processing. The system enables users to upload betting PDFs (single or batch), automatically extract betting data using pdfplumber, and manage dual-bet scenarios where one bet wins while the other loses. The application streamlines the entire surebet workflow from data entry to profit tracking and reporting, with support for bulk operations.

## User Preferences

Preferred communication style: Simple, everyday language.

**Default Management Page Filters (October 2025)**:
- Management page always opens with "Pendente" status filter pre-selected
- "Ordenar por Data" button is always active by default
- User can still change filters manually after opening the page

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in SPA configuration
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **Design System**: Material Design adaptation with betting-specific color schemes (win/loss/pending states)
- **State Management**: TanStack Query for server state with React hooks for local state
- **Form Handling**: React Hook Form with Zod validation schemas
- **Styling**: Tailwind CSS with custom CSS variables for theme switching (light/dark modes)

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints following resource-based conventions
- **File Handling**: Multer middleware for image upload processing (10MB limit)
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Development**: Vite integration for hot module replacement in development

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM with type-safe queries and migrations
- **Schema Design**: Normalized structure with separate tables for account holders, betting houses, surebet sets, and individual bets
- **Data Types**: Decimal precision for financial calculations, UUID primary keys, proper foreign key relationships

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)
- **Security**: CORS configuration and secure session cookies
- **Access Control**: Route-level protection (implementation pending)

### External Service Integrations
- **OCR Processing**: pdfplumber Python library for automated PDF text extraction from betting screenshots
  - **October 2025 Enhancement**: Improved profit extraction to capture values up to 1000 (previously limited to 100)
  - **October 2025 Enhancement**: Enhanced bet type parsing to preserve numbers after keywords (e.g., "Acima 27.5", "Abaixo 27.5")
  - **October 2025 Enhancement**: Intelligent house name removal - automatically strips betting house names from bet types without removing legitimate terms (preserves "Bet Builder" while removing "EstrelaBet")
  - **October 2025 Enhancement**: Expanded sport detection - supports all major sports with position-anchored fallback for new sports (e.g., "Beisebal / Japão - NPB")
  - Profit now anchors on stake location for precise extraction
  - Bet types preserve all numbers following keywords: acima, abaixo, total, over, under, mais, menos, primeiro, segundo, tempo, extra, 1º, 2º
  - Sport/league extraction uses team line anchor + strict guards to prevent false positives on bet-description lines
- **Image Processing**: Base64 encoding for API transmission with client-side preview
- **Development Tools**: Replit integration with runtime error overlay and cartographer for debugging

### Key Architectural Decisions

**OCR-First Data Entry**: The system prioritizes automated data extraction over manual entry, reducing human error and processing time. The workflow begins with PDF upload, processes through pdfplumber Python library for text extraction, then presents editable fields for user verification.

**Dual-Bet Structure**: Each surebet operation is modeled as a set containing exactly two opposing bets across different betting houses. This structure enforces the surebet concept where one bet must win while the other loses, guaranteeing profit regardless of outcome.

**Progressive Enhancement**: The application starts with core functionality (manual data entry) and enhances with OCR automation. All features remain accessible even if OCR services are unavailable.

**Financial Precision**: All monetary calculations use decimal data types with specific precision (10,2 for amounts, 8,2 for odds) to prevent floating-point arithmetic errors in financial calculations.

**Responsive Design**: Mobile-first approach with collapsible sidebar navigation and touch-friendly interfaces for bet management on various devices.

**Timezone Handling**: Event dates preserve the exact date/time entered by users without UTC conversion. The system uses `datetime-local` inputs and sends date strings directly to the backend, where Drizzle ORM handles conversion to PostgreSQL timestamps correctly. Fixed October 2025 (iterations 1-4): Completely eliminated timezone conversions throughout the stack. Created `formatEventDate()` helper in BetCard that extracts date/time directly from ISO strings using `.substring()` without any `new Date()` conversions. Updated both Dashboard and Management pages to handle date display, editing, and filtering without timezone shifts. Users now see dates exactly as entered (e.g., 04:00 stays 04:00, not converted to 01:00).

**Performance Optimization (October 2025)**: Resolved critical N+1 query pattern in bet loading. Originally, the system made 1 query for bet sets + 1 query per set for bets (resulting in 6.5s load times). Now uses batch queries with `inArray` to fetch all bets in 2 total queries, reducing load time from 6.5s to 0.7s (89% improvement). Added strategic database indexes on `surebet_sets.user_id`, `surebet_sets.created_at`, `bets.surebet_set_id`, and `betting_houses.account_holder_id` for further optimization.

**Real-time Search Feature (October 2025)**: Implemented intelligent instant search on both Dashboard and Management pages. Users can search bets by typing partial matches of team names, sports, or leagues. The search uses case-insensitive filtering with accent-insensitive matching (e.g., "sao paulo" finds "São Paulo") and provides immediate results as users type, no debouncing needed due to local filtering performance.

**Dashboard Visual Redesign (October 2025)**: Completely restructured the Dashboard page to focus on visual analytics rather than bet management. The new Dashboard is purely visual with:
- Simplified filters: Status (Pendente/Resolvida/Todos), Data de Inserção (De/Até), Data do Jogo (De/Até), and Casa de Aposta
- Summary cards showing: Total de Apostas (with pending/resolved breakdown), Investido Total (with pending/resolved split), Lucro Resolvido, Lucro Pendente, and Lucro Total
- Interactive cumulative profit line chart using Recharts that plots daily accumulated profits over time, supporting both positive and negative values
- Dynamic chart that responds to all filter selections
- Removed all bet detail cards and management features from Dashboard (now exclusively in Management page)
- **Profit Consistency Fix (October 2025)**: Dashboard now uses `set.status === "resolved"` filter (matching Management page) instead of `set.bets.every(bet => bet.result)` to ensure identical profit calculations across both pages. Both Dashboard and Management now display exactly the same profit totals using actualProfit from database.

**QR Code Reader Feature (October 2025)**: Added dedicated QR code reader page with fast, client-side processing:
- New "Leitor QR" menu item in sidebar (below "Teste de OCR")
- Supports image upload (JPG/PNG) and paste from clipboard (Ctrl+V)
- Client-side processing using jsQR library for instant results
- Clean interface with image preview, extracted text display, and copy-to-clipboard functionality
- No server processing required, ensuring fast and efficient QR code reading

**Batch Upload Feature (October 2025)**: Added bulk PDF processing for high-volume operations:
- New "Enviar Lote de Apostas" page allowing upload of multiple PDFs simultaneously (up to 50 files)
- Backend endpoint `/api/ocr/process-batch` processes all PDFs in parallel using Promise.all
- Visual interface shows extraction status for each PDF (success/error) with detailed bet information
- **EXACT Layout Match**: Interface replicates the "Nova Aposta" page structure for consistency
- **Fully Editable Data**: All extracted fields are editable before creation - date, sport, league, teams, bet types, odds, stakes, profit percentage
- **House Name Display**: Text input field shows the extracted betting house name from PDF
- **Manual House Selection**: Dropdown "Titular da Conta" with complete list formatted as "Titular - Casa" (matching BetForm behavior)
- Automatic matching suggests the most likely betting house based on extracted name
- Separate Cards for: Event Information, Aposta 1, Aposta 2 (matching single bet workflow)
- All numeric fields support proper decimal precision (odds: 3 decimals, stakes/profits: 2 decimals)
- Bulk creation button adds all successfully extracted bets to the system in one operation
- Comprehensive error handling with individual failure tracking and user feedback
- **Auto-reset workflow**: After successful batch creation, automatically clears all data and returns to empty upload screen for next batch (no navigation/404 errors)
- Full validation ensures only valid bets with selected betting houses are created

**Decimal Precision Update (October 2025)**: Enhanced odds precision to support 3 decimal places:
- Updated `bets.odd` column from `numeric(8,2)` to `numeric(8,3)` using safe ALTER TABLE command
- System now supports odds like 1.875, 2.125, etc.
- CRITICAL: Migration performed via direct SQL ALTER TABLE (non-destructive) to avoid data loss
- NEVER use `npm run db:push --force` as it deletes the session table and causes data corruption
- All 206 existing bets preserved during migration

**Bet Position Stability Fix (October 2025)**: Fixed issue where bets would swap positions (Aposta 1 ↔ Aposta 2) after resolving:
- **Root Cause**: Bets created in same transaction have identical `createdAt`, causing unstable ordering when SQL returned rows in arbitrary order
- **Solution**: Added deterministic SQL ordering with `ORDER BY bets.createdAt ASC, bets.id ASC` in both `getSurebetSets` and `getSurebetSetById`
- **Implementation**: SQL handles ordering with ID as tiebreaker; removed all JavaScript sorting from backend; frontend trusts backend order
- **Result**: Bets maintain 100% stable positions - order guaranteed by database, immune to refetches/updates

**Meio Green Feature (October 2025)**: Added "Meio Green" (half green) bet resolution functionality:
- New light blue button in bet resolution section with dropdown options
- Two resolution types: "Ganho" (half won) and "Devolvido" (half returned)
- **Meio Green - Ganho (half_won)**: Half stake at odd + half stake returned
  - Return calculation: `(stake/2 × odd) + stake/2`
  - Example: stake=2100, odd=1.7 → return = (1050 × 1.7) + 1050 = 2835
- **Meio Green - Devolvido (half_returned)**: Half stake returned only
  - Return calculation: `stake/2`
  - Example: stake=1439.52 → return = 719.76
- **Profit calculation**: Uses simplified helper function
  - Total return = return_bet1 + return_bet2
  - Total invested = stake_bet1 + stake_bet2
  - Actual profit = total_return - total_invested
  - Example: Bet1 half_won (2835) + Bet2 half_returned (719.76) - Total invested (3539.52) = R$ 15.24
- New status badges: "Meio Green - Ganho" (sky blue) and "Meio Green - Devolvido" (light sky blue)
- Supports all combinations with won/lost/returned/half_won/half_returned bets
- **Bug Fix (October 2025)**: Corrected actualProfit calculation and display across the entire application
  - **BetCard Component**: Frontend was recalculating profit incorrectly, showing R$ 735 instead of R$ 15.24 for half_won + half_returned
  - **Dashboard Page**: Was recalculating profit locally instead of using actualProfit from database
  - **Management Page**: Was recalculating profit locally instead of using actualProfit from database
  - **Solution**: All components now prioritize actualProfit from backend (already calculated correctly)
  - Added fallback calculation in BetCard matching backend logic for backward compatibility
  - **Auto-update**: All profit metrics (Total, Resolved, Pending) now update automatically when bets are resolved
    - Mutation injects actualProfit from backend immediately via onSuccess handler
    - Both bets in surebet set receive synced actualProfit value
    - UI updates instantly without waiting for refetch
  - Both backend and frontend now use consistent formula: (return1 + return2) - (stake1 + stake2)