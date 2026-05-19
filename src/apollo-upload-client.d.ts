declare module "apollo-upload-client/UploadHttpLink.mjs" {
  import type { ApolloLink } from "@apollo/client/link";

  export interface UploadHttpLinkOptions {
    uri?: string;
    useGETForQueries?: boolean;
    fetch?: typeof fetch;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    fetchOptions?: RequestInit;
  }

  export default class UploadHttpLink extends ApolloLink {
    constructor(options?: UploadHttpLinkOptions);
  }
}
