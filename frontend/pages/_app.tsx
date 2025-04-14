// pages/_app.tsx
import { AppProps } from "next/app"; // Import AppProps for TypeScript support
import "../styles/globals.css"; // Import Tailwind's global styles

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
