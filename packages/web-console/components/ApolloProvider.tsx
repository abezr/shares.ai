"use client";
import React from "react";
import { ApolloClient, InMemoryCache, ApolloProvider as Provider, HttpLink } from "@apollo/client";

const isServer = typeof window === "undefined";
const publicGraphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:4000";
const internalGraphqlUrl = process.env.INTERNAL_GRAPHQL_URL || "http://api-gateway:4000";

const client = new ApolloClient({
  link: new HttpLink({ uri: isServer ? internalGraphqlUrl : publicGraphqlUrl }),
  cache: new InMemoryCache(),
});

export const ApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider client={client}>{children}</Provider>
);
