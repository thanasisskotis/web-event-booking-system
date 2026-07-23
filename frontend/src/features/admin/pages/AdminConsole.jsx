import { useState } from "react";
import {
  Title,
  Stack,
  Table,
  Badge,
  Button,
  Group,
  SegmentedControl,
  Text,
  Modal,
  Divider,
  Menu,
} from "@mantine/core";
import { IconUsersGroup } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { confirmAction } from "../../../components/confirm";
import EmptyState from "../../../components/EmptyState";
import TableSkeleton from "../../../components/TableSkeleton";
import { useUsers, useApproveUser, useRejectUser, downloadEventsExport } from "../api";

const statusColor = { PENDING: "yellow", APPROVED: "green", REJECTED: "red" };
const FILTERS = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: "ALL" },
];

function UserDetailModal({ user, onClose }) {
  return (
    <Modal opened={!!user} onClose={onClose} title="User details" size="md">
      {user && (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={600}>
              {user.first_name} {user.last_name}
            </Text>
            <Badge color={statusColor[user.status]}>{user.status}</Badge>
          </Group>
          <Divider />
          <Detail label="Username" value={user.username} />
          <Detail label="Email" value={user.email} />
          <Detail label="Phone" value={user.phone} />
          <Detail label="Address" value={user.address} />
          <Detail label="City" value={user.city} />
          <Detail label="Country" value={user.country} />
          <Detail label="Tax ID (ΑΦΜ)" value={user.tax_id} />
          <Detail label="Role" value={user.priviledge} />
        </Stack>
      )}
    </Modal>
  );
}

function Detail({ label, value }) {
  return (
    <Group justify="space-between">
      <Text c="dimmed" size="sm">
        {label}
      </Text>
      <Text size="sm">{value || "—"}</Text>
    </Group>
  );
}

export default function AdminConsole() {
  const [filter, setFilter] = useState("PENDING");
  const [selectedUser, setSelectedUser] = useState(null);
  const { data: users, isLoading } = useUsers(filter === "ALL" ? undefined : filter);
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();

  async function handleAction(mutation, userId, message) {
    try {
      await mutation.mutateAsync(userId);
      notifications.show({ color: "green", message });
    } catch (err) {
      notifications.show({ color: "red", message: err.response?.data?.detail ?? "Action failed" });
    }
  }

  async function handleExport(format) {
    try {
      await downloadEventsExport(format);
    } catch {
      notifications.show({ color: "red", message: "Export failed" });
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Admin console</Title>
        <Menu>
          <Menu.Target>
            <Button variant="default">Export events</Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => handleExport("json")}>Download JSON</Menu.Item>
            <Menu.Item onClick={() => handleExport("xml")}>Download XML</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <SegmentedControl
        data={FILTERS}
        value={filter}
        onChange={setFilter}
        w="fit-content"
      />

      {isLoading ? (
        <TableSkeleton />
      ) : !users?.length ? (
        <EmptyState
          icon={IconUsersGroup}
          message={`No ${filter === "ALL" ? "" : filter.toLowerCase()} users.`}
        />
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Username</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => (
              <Table.Tr key={user.user_id}>
                <Table.Td>{user.username}</Table.Td>
                <Table.Td>
                  {user.first_name} {user.last_name}
                </Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>
                  <Badge color={statusColor[user.status]}>{user.status}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" variant="light" onClick={() => setSelectedUser(user)}>
                      View
                    </Button>
                    {user.status === "PENDING" && (
                      <>
                        <Button
                          size="xs"
                          color="green"
                          onClick={() => handleAction(approveUser, user.user_id, "User approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          onClick={() =>
                            confirmAction({
                              title: "Reject user",
                              message: `Reject the registration of ${user.username}? They won't be able to log in.`,
                              confirmLabel: "Reject",
                              onConfirm: () => handleAction(rejectUser, user.user_id, "User rejected"),
                            })
                          }
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </Stack>
  );
}
