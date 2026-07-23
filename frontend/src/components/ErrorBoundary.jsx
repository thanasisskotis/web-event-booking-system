import { Component } from "react";
import { Stack, Title, Text, Button, Code } from "@mantine/core";

// Catches render-time crashes so a single broken component doesn't blank the
// whole app (Nielsen: help users recognize and recover from errors).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Stack align="center" py="xl" gap="sm">
          <Title order={2}>Something went wrong</Title>
          <Text c="dimmed">An unexpected error occurred while rendering this page.</Text>
          <Code>{this.state.error.message}</Code>
          <Button onClick={this.handleReset}>Try again</Button>
        </Stack>
      );
    }
    return this.props.children;
  }
}
