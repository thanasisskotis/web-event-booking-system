import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Alert,
  SimpleGrid,
  Group,
  ThemeIcon,
} from "@mantine/core";
import { IconTicket } from "@tabler/icons-react";
import { useAuth } from "../AuthContext";
import { getErrorMessage } from "../../../api/errors";

function BrandMark() {
  return (
    <Group gap="xs">
      <ThemeIcon
        variant="gradient"
        gradient={{ from: "violet", to: "indigo", deg: 135 }}
        radius="md"
        size={34}
      >
        <IconTicket size={20} />
      </ThemeIcon>

      <Text fw={800} fz="xl" style={{ letterSpacing: "-0.02em" }}>
        EventHub
      </Text>
    </Group>
  );
}

const schema = z
  .object({
    username: z.string().min(3, "At least 3 characters"),
    password: z.string().min(8, "At least 8 characters"),
    confirm_password: z
      .string()
      .min(1, "Please confirm your password"),
    first_name: z.string().min(1, "Required"),
    last_name: z.string().min(1, "Required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(6, "Invalid phone number"),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    tax_id: z.string().min(1, "Required"),
  })
  .refine(
    (data) => data.password === data.confirm_password,
    {
      message: "Passwords don't match",
      path: ["confirm_password"],
    }
  );

export default function Register() {
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { registerAccount } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values) {
    setServerError(null);

    try {
      // confirm_password is only used for client-side validation.
      // It is not part of the backend UserRegister schema.
      const { confirm_password, ...payload } = values;

      await registerAccount(payload);
      setSuccess(true);
    } catch (err) {
      setServerError(getErrorMessage(err, "Registration failed"));
    }
  }

  if (success) {
    return (
      <Stack align="center" justify="center" mih="100vh">
        <Paper withBorder shadow="md" p="xl" radius="md" maw={500} w="100%">
          <Stack>
            <BrandMark />

            <Title order={2}>Registration received</Title>

            <Text>
              Your account is pending admin approval. You'll be able to log in
              once it's approved.
            </Text>

            <Button component={Link} to="/login" fullWidth>
              Back to login
            </Button>
          </Stack>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack align="center" justify="center" mih="100vh">
      <Paper withBorder shadow="md" p="xl" radius="md" maw={600} w="100%">
        <Stack>
          <BrandMark />

          <Title order={2}>Create an account</Title>

          <Text c="dimmed">
            New accounts require admin approval before you can log in.
          </Text>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack>
              {serverError && (
                <Alert color="red" variant="light">
                  {serverError}
                </Alert>
              )}

              <TextInput
                label="Username"
                {...register("username")}
                error={errors.username?.message}
              />

              <PasswordInput
                label="Password"
                {...register("password")}
                error={errors.password?.message}
              />

              <PasswordInput
                label="Confirm password"
                {...register("confirm_password")}
                error={errors.confirm_password?.message}
              />

              <SimpleGrid cols={2}>
                <TextInput
                  label="First name"
                  {...register("first_name")}
                  error={errors.first_name?.message}
                />

                <TextInput
                  label="Last name"
                  {...register("last_name")}
                  error={errors.last_name?.message}
                />
              </SimpleGrid>

              <TextInput
                label="Email"
                {...register("email")}
                error={errors.email?.message}
              />

              <TextInput
                label="Phone"
                {...register("phone")}
                error={errors.phone?.message}
              />

              <TextInput
                label="Address"
                {...register("address")}
                error={errors.address?.message}
              />

              <SimpleGrid cols={2}>
                <TextInput
                  label="City"
                  {...register("city")}
                  error={errors.city?.message}
                />

                <TextInput
                  label="Country"
                  {...register("country")}
                  error={errors.country?.message}
                />
              </SimpleGrid>

              <TextInput
                label="Tax ID (ΑΦΜ)"
                {...register("tax_id")}
                error={errors.tax_id?.message}
              />

              <Button
                type="submit"
                loading={isSubmitting}
                fullWidth
                mt="sm"
              >
                Register
              </Button>
            </Stack>
          </form>

          <Text size="sm" mt="md">
            Already have an account?{" "}
            <Link to="/login">Log in</Link>
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}
