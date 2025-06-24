import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import { NewLayout } from "../components/NewLayout.tsx";
import type { Context } from "hono/mod.ts";
import type { JSXNode } from "hono/jsx";

// Layout middleware for non-API, non-HTMX requests
export const layoutMiddleware = jsxRenderer(
  (props: Record<string, unknown>, _c: Context) => {
    const ctx = useRequestContext();
    return NewLayout({
      title: props.title || ctx.get("title") || "MockAPI Studio",
      breadcrumbs: props.breadcrumbs || ctx.get("breadcrumbs"),
      activePath: new URL(ctx.req.url).pathname,
      children: props.children as JSXNode | JSXNode[] | undefined ?? [],
      extraHead: props.extraHead as JSXNode | undefined,
      user: ctx.get('user'),
      isAuthenticated: ctx.get('isAuthenticated'),
    });
  },
  { docType: "<!DOCTYPE html>" }
); 