# GitHub Explorer

GitHub Explorer is a minimalist Angular application for exploring public GitHub profiles and repositories. Search for a GitHub username to view profile information, browse repositories, sort them by stars, and load more results as you scroll.

## Features

- **GitHub profile search** — Find public GitHub profiles by username.
- **Profile overview** — View the user's avatar, name, username, bio, followers, following, and public repository count.
- **Repository browsing** — Explore public repositories with descriptions, programming languages, fork counts, and star counts.
- **Paginated loading** — Load repositories in pages of 100, with automatic loading as you scroll and a manual **Load more** option.
- **Repository sorting** — Sort the repositories currently loaded by star count in ascending or descending order.
- **In-memory caching** — Reuse profile and repository data while navigating between profiles during the current app session.
- **Error handling** — Present helpful messages for missing users, network failures, unexpected errors, and GitHub API rate limits. Rate-limit responses include a retry time when the API provides one.
- **Light and dark themes** — Switch themes and retain the selected preference in `localStorage`.
- **Responsive interface** — Tailwind CSS styling adapts the layout to different screen sizes.

## Built With

- Angular 20
- TypeScript
- Tailwind CSS v4
- RxJS
- Angular Signals
- GitHub REST API
- Jasmine and Karma for unit testing

## Getting Started

### Prerequisites

- Node.js and npm
- Angular CLI compatible with Angular 20

### Installation

Clone the repository and move into the project directory:

```bash
git clone https://github.com/unaibnaeem/ng-github-explorer.git
cd ng-github-explorer
```

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
ng serve
```

Open `http://localhost:4200/` in your browser. The application reloads automatically when source files change.

## Available Commands

| Command                   | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `ng serve`                | Starts the local development server.                      |
| `ng build`                | Builds the application for production.                    |
| `ng test`                 | Runs the unit test suite.                                 |
| `ng test --code-coverage` | Runs the unit tests and generates a code coverage report. |

## GitHub API and Rate Limits

The application retrieves public profile and repository data from the GitHub REST API. No API key is required for the basic public-data experience.

GitHub applies rate limits to API requests. Unauthenticated requests have a lower allowance, so repeated searches and loading multiple repository pages can exhaust the available quota. When that happens, GitHub Explorer displays a rate-limit message and, when available, the time at which requests can be retried.

For a deployed application that needs a higher request allowance, route authenticated API requests through a backend or serverless function. Do not place a GitHub personal access token in Angular environment files or other frontend code, because values bundled into a browser application can be inspected by users.

## Testing

The project includes unit tests for the application, search components, profile page, profile store, GitHub API service, and API error handling.

The latest recorded test run completed with **75 specs and 0 failures**. The corresponding code coverage was:

| Metric     | Coverage |
| ---------- | -------: |
| Statements |   99.52% |
| Branches   |   94.20% |
| Functions  |     100% |
| Lines      |   99.51% |

Generate an updated coverage report with:

```bash
ng test --code-coverage
```

The report is generated in the `coverage` directory.
