import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import { MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AI RAG Lab",
  description: "Local AI search and RAG demo built with Next.js, Node.js, and Mantine.",
};

const colorSchemeScript = `try {
  var _colorScheme = window.localStorage.getItem("mantine-color-scheme-value");
  var colorScheme = _colorScheme === "light" || _colorScheme === "dark" || _colorScheme === "auto" ? _colorScheme : "auto";
  var computedColorScheme = colorScheme !== "auto" ? colorScheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-mantine-color-scheme", computedColorScheme);
} catch (e) {}`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <Script
          id="mantine-color-scheme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: colorSchemeScript }}
        />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto">
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
