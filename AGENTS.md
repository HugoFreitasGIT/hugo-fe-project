# Project Instructions

## Project Overview

NOMA is a fictional lifestyle e-commerce storefront focused on modern, functional and minimalist products for the home, kitchen and workspace.

The goal is to build a maintainable, responsive frontend using modern React and Next.js practices.

## Tech Stack

- Next.js with App Router
- React
- TypeScript
- Tailwind CSS
- ESLint

## Development Guidelines

- Use TypeScript for application code.
- Prefer small, reusable components when they provide clear value.
- Use Tailwind CSS for styling.
- Follow the existing Next.js App Router conventions.
- Prefer semantic HTML and accessible UI patterns.
- Ensure layouts work on mobile and desktop.
- Keep implementations simple and avoid unnecessary abstractions.
- Do not add dependencies unless there is a clear requirement.
- Do not introduce `any` unless there is a justified reason.
- Do not modify unrelated files.

## Before Completing a Task

- Run `npm run lint`.
- Run `npm run build` when appropriate.
- Report any checks that could not be completed.
- Summarize the changes and explain relevant implementation decisions.

## General Rule

Inspect the existing code before making changes. Follow the project's current patterns and ask for clarification when requirements are ambiguous.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
