'use client';

import { Controller, useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { FileUpload } from '../file-upload';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { ServerForm, serverFormSchema } from '@/lib/schemas';

export const InitialModal = () => {
  const router = useRouter();

  const form = useForm<ServerForm>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      name: '',
      imageUrl: '',
    },
  });

  const isLoading = form.formState.isSubmitting;

  async function onSubmit(values: ServerForm) {
    try {
      await axios.post('/api/servers', values);

      form.reset();
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent className="bg-[#242429] text-white">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Customize Your Server</DialogTitle>
          <DialogDescription className="text-white">
            Give your server a personality with a name and image. You can always change it later.
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
              Create Server
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
