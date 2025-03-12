# WebChat

A modern, real-time chat application built with Next.js, React, Tailwind CSS, and AI capabilities.

![WebChat](https://github.com/user-attachments/assets/ba23ee40-58d0-4d8d-8246-2624bc99fdec)

## Features

- Real-time chat interface
- Multiple AI model support (OpenAI, Groq, Google AI)
- Conversation history and persistence
- Share conversations with others
- Rate limiting protection
- Responsive design for all devices
- Markdown and code syntax highlighting
- Web search capabilities

## Tech Stack

- **Frontend**: React 19, Next.js 15, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **AI Integration**: OpenAI, Groq, Google Generative AI
- **Data Storage**: Upstash Redis
- **Web Scraping**: Puppeteer, Cheerio
- **Authentication**: Custom auth implementation
- **Styling**: Tailwind CSS, Custom CSS animations
- **Deployment**: Vercel

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- API keys for the AI services you plan to use:
  - OpenAI API key
  - Groq API key
  - Google AI API key (optional)
- Upstash Redis account for caching and data persistence

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
RATE_LIMIT_SECRET=your_rate_limit_secret
SESSION_SECRET=your_session_secret
API_KEY=your_api_key
NODE_ENV=development
```

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/faizancodes/web-chat.git
cd web-chat
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Development

### Available Scripts

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run format` - Format code with Prettier

### Project Structure

```
web-chat/
├── public/           # Static assets
├── src/
│   ├── app/          # Next.js App Router
│   │   ├── api/      # API routes
│   │   ├── components/ # React components
│   │   ├── hooks/    # Custom React hooks
│   │   ├── types/    # TypeScript type definitions
│   │   └── page.tsx  # Main page component
│   ├── config/       # Configuration files
│   ├── lib/          # Utility libraries
│   ├── styles/       # Global styles
│   └── utils/        # Utility functions
├── .env              # Environment variables
└── package.json      # Project dependencies
```

## Deployment

This application is configured for deployment on Vercel:

1. Push your code to a GitHub repository
2. Import the repository in Vercel
3. Configure the environment variables
4. Deploy

## License

[MIT](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
