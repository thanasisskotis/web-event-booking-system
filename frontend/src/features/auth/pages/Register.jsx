import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextInput, PasswordInput, Button, Paper, Title, Text, Stack, Alert, SimpleGrid } from "@mantine/core";
import { useAuth } from "../AuthContext";

const schema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(8, "At least 8 characters"),
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(6, "Invalid phone number"),
  tax_id: z.string().min(1, "Required"),
});

export default function Register() {
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { registerAccount } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setServerError(null);
    try {
      await registerAccount(values);
      setSuccess(true);
    } catch (err) {
      setServerError(err.response?.data?.detail ?? "Registration failed");
    }
  }

  if (success) {
    return (
      <Paper maw={480} mx="auto" mt="xl" p="lg" withBorder radius="md">
        <Title order={2} mb="xs">
          Registration received
        </Title>
        <Text>
          Your account is pending admin approval. You&apos;ll be able to log in once it&apos;s
          approved.
        </Text>
        <Text mt="md">
          <Link to="/login">Back to login</Link>
        </Text>
      </Paper>
    );
  }

  return (
    <Paper maw={480} mx="auto" mt="xl" p="lg" withBorder radius="md">
      <Title order={2} mb="xs">
        Create an account
      </Title>
      <Text c="dimmed" size="sm" mb="md">
        New accounts require admin approval before you can log in.
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
          <SimpleGrid cols={2}>
            <TextInput label="First name" {...register("first_name")} error={errors.first_name?.message} />
            <TextInput label="Last name" {...register("last_name")} error={errors.last_name?.message} />
          </SimpleGrid>
          <TextInput label="Email" {...register("email")} error={errors.email?.message} />
          <TextInput label="Phone" {...register("phone")} error={errors.phone?.message} />
          <TextInput label="Tax ID (ΑΦΜ)" {...register("tax_id")} error={errors.tax_id?.message} />
          <Button type="submit" loading={isSubmitting} fullWidth mt="sm">
            Register
          </Button>
        </Stack>
      </form>

      <Text size="sm" mt="md">
        Already have an account? <Link to="/login">Log in</Link>
      </Text>
    </Paper>
  );
}
