# Surebet Management System

## Overview

A comprehensive web application designed for managing and tracking surebet operations with automated OCR image processing. The system enables users to upload betting screenshots, automatically extract betting data using Mistral AI's OCR service, and manage dual-bet scenarios where one bet wins while the other loses. The application streamlines the entire surebet workflow from data entry to profit tracking and reporting.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **OCR Processing**: Mistral AI API for automated text extraction from betting screenshots
- **Image Processing**: Base64 encoding for API transmission with client-side preview
- **Development Tools**: Replit integration with runtime error overlay and cartographer for debugging

### Key Architectural Decisions

**OCR-First Data Entry**: The system prioritizes automated data extraction over manual entry, reducing human error and processing time. The workflow begins with image upload, processes through Mistral AI's OCR, then presents editable fields for user verification.

**Dual-Bet Structure**: Each surebet operation is modeled as a set containing exactly two opposing bets across different betting houses. This structure enforces the surebet concept where one bet must win while the other loses, guaranteeing profit regardless of outcome.

**Progressive Enhancement**: The application starts with core functionality (manual data entry) and enhances with OCR automation. All features remain accessible even if OCR services are unavailable.

**Financial Precision**: All monetary calculations use decimal data types with specific precision (10,2 for amounts, 8,2 for odds) to prevent floating-point arithmetic errors in financial calculations.

**Responsive Design**: Mobile-first approach with collapsible sidebar navigation and touch-friendly interfaces for bet management on various devices.

**Timezone Handling**: Event dates preserve the exact date/time entered by users without UTC conversion. The system uses `datetime-local` inputs and sends date strings directly to the backend, where Drizzle ORM handles conversion to PostgreSQL timestamps correctly. Fixed October 2025: removed `.toISOString()` conversions from edit mutations that were causing 3-hour timezone offset issues.