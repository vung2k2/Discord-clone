'use client';

import { useModal } from '@/hooks/use-modal.store';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { FileUpload } from '../file-upload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ServerForm, serverFormSchema } from '@/lib/schemas';
import { useEffect } from 'react';

export function EditServerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { server } = data;
  const router = useRouter();
  const isModalOpen = isOpen && type === 'editServer';

  const form = useForm<ServerForm>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      name: '',
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (isModalOpen && server) {
      form.reset({
        name: server.name ?? '',
        imageUrl: server.imageUrl ?? '',
      });
    }
  }, [isModalOpen, server, form]);

  const isLoading = form.formState.isSubmitting;

  async function onSubmit(values: ServerForm) {
    try {
      await axios.patch(`/api/servers/${server?.id}`, values);
      form.reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
    }
  }

  function handleClose() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#242429] text-white p-4 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Customize your server
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Give your server a personality with a name and an image. You can always change it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="imageUrl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="form-server-image">Server image</FieldLabel>
                  <FileUpload
                    endpoint="serverImage"
                    value={field.value}
                    onChange={field.onChange}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="form-server-name" className="uppercase text">
                    Server name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-server-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter server name"
                    autoComplete="off"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="bg-[#242429]">
            <Button disabled={isLoading} className="w-full" variant="blue">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
