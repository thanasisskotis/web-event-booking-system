import { useRef } from "react";
import { Modal, SimpleGrid, Image, ActionIcon, Button, Text, Stack, Loader, Center } from "@mantine/core";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { confirmAction } from "../../../components/confirm";
import { useUploadEventPhoto, useDeleteEventPhoto } from "../api";
import { API_BASE_URL } from "../../../api/client";

export default function ManagePhotosModal({ event, onClose }) {
  const fileInputRef = useRef(null);
  const uploadPhoto = useUploadEventPhoto(event?.event_id);
  const deletePhoto = useDeleteEventPhoto(event?.event_id);

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadPhoto.mutateAsync(file);
      notifications.show({ color: "green", message: "Photo uploaded" });
    } catch (err) {
      notifications.show({ color: "red", message: err.response?.data?.detail ?? "Upload failed" });
    } finally {
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  function handleDelete(photoId) {
    confirmAction({
      title: "Delete photo",
      message: "Remove this photo from the event?",
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deletePhoto.mutateAsync(photoId);
          notifications.show({ color: "green", message: "Photo deleted" });
        } catch (err) {
          notifications.show({ color: "red", message: err.response?.data?.detail ?? "Delete failed" });
        }
      },
    });
  }

  if (!event) return null;

  return (
    <Modal opened={!!event} onClose={onClose} title={`Photos — ${event.title}`} size="lg">
      <Stack>
        {!event.photos?.length ? (
          <Text c="dimmed">No photos yet.</Text>
        ) : (
          <SimpleGrid cols={3}>
            {event.photos.map((photo) => (
              <div key={photo.photo_id} style={{ position: "relative" }}>
                <Image src={`${API_BASE_URL}${photo.url}`} radius="sm" h={100} fit="cover" />
                <ActionIcon
                  color="red"
                  variant="filled"
                  size="sm"
                  radius="xl"
                  style={{ position: "absolute", top: 4, right: 4 }}
                  onClick={() => handleDelete(photo.photo_id)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </div>
            ))}
          </SimpleGrid>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={handleFileSelected}
        />
        <Button
          leftSection={uploadPhoto.isPending ? <Loader size={14} color="white" /> : <IconUpload size={16} />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadPhoto.isPending}
        >
          Upload photo
        </Button>
      </Stack>
    </Modal>
  );
}
