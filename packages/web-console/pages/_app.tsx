import type { AppProps } from "next/app";
import "../styles/globals.css";
import { ApolloProvider } from "../components/ApolloProvider";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}
