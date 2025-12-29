# SKA ISPAT CHECKLIST V2

This is the SKA ISPAT CHECKLIST application (Version 2).

## Getting Started

### Prerequisites

- Node.js installed on your machine.
- `npm` (Node Package Manager).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/skaispat/SKA-ISPAT-CHECKLIST.git
    cd SKA-ISPAT-CHECKLIST
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Environment Variables

This project requires environment variables to function correctly, specifically for Supabase integration.

1.  Create a `.env` file in the root directory.
2.  Add the following variables:

    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

### Running the Application

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is busy).

## Tech Stack

-   React
-   Vite
-   Supabase
-   Tailwind CSS
