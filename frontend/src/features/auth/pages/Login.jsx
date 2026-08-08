import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextInput, PasswordInput, Button, Paper, Title, Text, Stack, Alert, Group, ThemeIcon } from "@mantine/core";
import { IconTicket } from "@tabler/icons-react";
import { useAuth } from "../AuthContext";
import { getErrorMessage } from "../../../api/errors";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [serverError, setServerError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setServerError(null);
    try {
      await login(values.username, values.password);
      const redirectTo = location.state?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, "Login failed"));
    }
  }

  return (
    <Stack maw={400} mx="auto" mt="xl" gap="lg">
      <Group gap={8} justify="center">
        <ThemeIcon variant="gradient" gradient={{ from: "violet", to: "indigo", deg: 135 }} radius="md" size={34}>
          <IconTicket size={20} />
        </ThemeIcon>
        <Text fw={800} fz="xl" style={{ letterSpacing: "-0.02em" }}>
          EventHub
        </Text>
      </Group>
      <Paper p="lg" withBorder radius="md" shadow="sm">
      <Title order={2} mb="xs">
        Log in
      </Title>
      <Text c="dimmed" size="sm" mb="md">
        Access your bookings, events, and messages.
      </Text>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          {serverError && (
            <Alert color="red" variant="light">
              {serverError}
            </Alert>
          )}
          <TextInput label="Username" {...register("username")} error={errors.username?.message} />
          <PasswordInput label="Password" {...register("password")} error={errors.password?.message} />
          <Button type="submit" loading={isSubmitting} fullWidth mt="sm">
            Log in
          </Button>
        </Stack>
      </form>

      <Text size="sm" mt="md">
        No account? <Link to="/register">Register</Link>
      </Text>
      </Paper>
    </Stack>
  );
}
