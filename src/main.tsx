import UploadHttpLink from "apollo-upload-client/UploadHttpLink.mjs";
import { ApolloClient, InMemoryCache } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { ApolloProvider } from "@apollo/client/react";
import { setContext } from "@apollo/client/link/context";
import { from } from "@apollo/client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { ThemeProvider } from "./lib/theme";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./routes";
import { clearAuth, getAuthorizationHeader } from "./utils/auth";

const uploadLink = new UploadHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_BACKEND_URL,
});

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    authorization: getAuthorizationHeader(),
    "Apollo-Require-Preflight": "true",
  },
}));

const errorLink = onError(
  ({ graphQLErrors, networkError, forward, operation }: any) => {
    const isUnauth =
      graphQLErrors?.some(
        (e: any) => (e.extensions?.code as string) === "UNAUTHENTICATED",
      ) || (networkError as { statusCode?: number })?.statusCode === 401;

    if (isUnauth) {
      clearAuth();
      window.location.replace("/login");
    }
    return forward(operation);
  },
);

const client = new ApolloClient({
  link: from([errorLink, authLink, uploadLink]),
  cache: new InMemoryCache(),
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error - connectToDevTools is supported at runtime but missing in TS types
  connectToDevTools: import.meta.env.DEV,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light">
      <ApolloProvider client={client}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ApolloProvider>
    </ThemeProvider>
  </StrictMode>,
);
