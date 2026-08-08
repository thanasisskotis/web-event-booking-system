import { createTheme } from "@mantine/core";

// One brand theme every Mantine component inherits from, so the whole app
// reads as a single ticketing product instead of default-Mantine blue.
export const theme = createTheme({
  primaryColor: "violet",
  primaryShade: { light: 6 },
  defaultRadius: "md",
  fontFamily:
    "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  headings: {
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "700",
  },
  components: {
    Card: { defaultProps: { shadow: "sm", radius: "md", withBorder: true } },
    Paper: { defaultProps: { radius: "md" } },
    Button: { defaultProps: { radius: "md" } },
    Badge: { defaultProps: { radius: "sm" } },
  },
});
